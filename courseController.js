const { query } = require('../config/database');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');
const slugify = require('slugify');

const getCourses = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 12, category, difficulty, 
    search, sort = 'popular', min_price, max_price, free
  } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const cacheKey = `courses:list:${JSON.stringify(req.query)}`;
  
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);
  
  let whereConditions = ["c.status = 'published'"];
  const params = [];
  let paramIdx = 1;
  
  if (category) {
    whereConditions.push(`cat.slug = $${paramIdx++}`);
    params.push(category);
  }
  
  if (difficulty) {
    whereConditions.push(`c.difficulty = $${paramIdx++}`);
    params.push(difficulty);
  }
  
  if (search) {
    whereConditions.push(`(c.title ILIKE $${paramIdx} OR c.short_description ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  
  if (free === 'true') {
    whereConditions.push('c.is_free = true');
  } else if (min_price !== undefined) {
    whereConditions.push(`c.price >= $${paramIdx++}`);
    params.push(parseFloat(min_price));
  }
  
  if (max_price !== undefined) {
    whereConditions.push(`c.price <= $${paramIdx++}`);
    params.push(parseFloat(max_price));
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const sortMap = {
    popular: 'c.enrollment_count DESC',
    newest: 'c.published_at DESC',
    rating: 'c.rating_average DESC',
    price_low: 'c.price ASC',
    price_high: 'c.price DESC',
  };
  
  const orderBy = sortMap[sort] || sortMap.popular;
  
  const dataQuery = `
    SELECT 
      c.id, c.title, c.slug, c.short_description, c.cover_image_url,
      c.price, c.original_price, c.is_free, c.difficulty, c.language,
      c.enrollment_count, c.rating_average, c.rating_count,
      c.total_duration, c.total_lessons, c.is_featured,
      c.published_at,
      u.full_name AS instructor_name, u.avatar_url AS instructor_avatar,
      cat.name AS category_name, cat.slug AS category_slug
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  
  params.push(parseInt(limit), offset);
  
  const countQuery = `
    SELECT COUNT(*) FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    ${whereClause}
  `;
  
  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, params.slice(0, -2))
  ]);
  
  const total = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(total / parseInt(limit));
  
  const response = {
    success: true,
    data: {
      courses: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      }
    }
  };
  
  await cacheSet(cacheKey, response, 300);
  res.json(response);
});

const getCourse = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `course:${slug}`;
  
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);
  
  const result = await query(`
    SELECT 
      c.*,
      u.full_name AS instructor_name,
      u.avatar_url AS instructor_avatar,
      u.bio AS instructor_bio,
      cat.name AS category_name,
      cat.slug AS category_slug,
      (
        SELECT json_agg(json_build_object(
          'id', m.id,
          'title', m.title,
          'description', m.description,
          'sort_order', m.sort_order,
          'is_free_preview', m.is_free_preview,
          'lessons', (
            SELECT json_agg(json_build_object(
              'id', l.id,
              'title', l.title,
              'content_type', l.content_type,
              'video_duration', l.video_duration,
              'is_free_preview', l.is_free_preview,
              'sort_order', l.sort_order
            ) ORDER BY l.sort_order)
            FROM lessons l WHERE l.module_id = m.id AND l.is_published = true
          )
        ) ORDER BY m.sort_order)
        FROM modules m WHERE m.course_id = c.id
      ) AS curriculum
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.slug = $1 AND c.status = 'published'
  `, [slug]);
  
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }
  
  const course = result.rows[0];
  
  // Get reviews
  const reviewsResult = await query(`
    SELECT r.*, u.full_name, u.avatar_url 
    FROM reviews r 
    JOIN users u ON r.user_id = u.id 
    WHERE r.course_id = $1 
    ORDER BY r.created_at DESC 
    LIMIT 10
  `, [course.id]);
  
  course.reviews = reviewsResult.rows;
  
  const response = { success: true, data: course };
  await cacheSet(cacheKey, response, 600);
  res.json(response);
});

const createCourse = asyncHandler(async (req, res) => {
  const {
    title, short_description, description, price, original_price,
    difficulty, language, category_id, requirements, what_you_learn,
    target_audience, certificate_enabled
  } = req.body;
  
  const slug = slugify(title, { lower: true, strict: true });
  
  // Check slug uniqueness
  const existing = await query('SELECT id FROM courses WHERE slug = $1', [slug]);
  const finalSlug = existing.rows.length ? `${slug}-${Date.now()}` : slug;
  
  const result = await query(`
    INSERT INTO courses (
      title, slug, short_description, description, price, original_price,
      difficulty, language, category_id, instructor_id, requirements,
      what_you_learn, target_audience, certificate_enabled, is_free, status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft')
    RETURNING *
  `, [
    title, finalSlug, short_description, description, price || 0, original_price,
    difficulty || 'beginner', language || 'English', category_id,
    req.user.id, requirements, what_you_learn, target_audience,
    certificate_enabled || false, (price === 0 || !price)
  ]);
  
  res.status(201).json({ success: true, data: result.rows[0] });
});

const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Verify ownership or admin
  const existing = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }
  
  if (existing.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  const allowedFields = [
    'title', 'short_description', 'description', 'price', 'original_price',
    'difficulty', 'language', 'category_id', 'requirements', 'what_you_learn',
    'target_audience', 'certificate_enabled', 'status', 'seo_title', 'seo_description'
  ];
  
  const updates = [];
  const params = [];
  let paramIdx = 1;
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      params.push(req.body[field]);
    }
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  
  // If publishing, set published_at
  if (req.body.status === 'published') {
    updates.push(`published_at = COALESCE(published_at, NOW())`);
  }
  
  params.push(id);
  
  const result = await query(
    `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
  );
  
  await cacheDelPattern('courses:*');
  await cacheDel(`course:${result.rows[0].slug}`);
  
  res.json({ success: true, data: result.rows[0] });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    'UPDATE courses SET status = $1 WHERE id = $2 AND (instructor_id = $3 OR $4 = true) RETURNING id',
    ['archived', id, req.user.id, req.user.role === 'admin']
  );
  
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }
  
  await cacheDelPattern('courses:*');
  
  res.json({ success: true, message: 'Course archived' });
});

const getFeaturedCourses = asyncHandler(async (req, res) => {
  const cacheKey = 'courses:featured';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);
  
  const result = await query(`
    SELECT 
      c.id, c.title, c.slug, c.short_description, c.cover_image_url,
      c.price, c.original_price, c.is_free, c.difficulty,
      c.enrollment_count, c.rating_average, c.rating_count,
      u.full_name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.status = 'published' AND c.is_featured = true
    ORDER BY c.enrollment_count DESC
    LIMIT 8
  `);
  
  const response = { success: true, data: result.rows };
  await cacheSet(cacheKey, response, 600);
  res.json(response);
});

module.exports = { getCourses, getCourse, createCourse, updateCourse, deleteCourse, getFeaturedCourses };
