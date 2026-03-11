const { query } = require('../config/database');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');
const slugify = require('slugify');

const getArticles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, tag, search, featured } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const cacheKey = `articles:list:${JSON.stringify(req.query)}`;
  
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);
  
  let whereConditions = ["a.status = 'published'"];
  const params = [];
  let paramIdx = 1;
  
  if (category) {
    whereConditions.push(`cat.slug = $${paramIdx++}`);
    params.push(category);
  }
  
  if (search) {
    whereConditions.push(`(a.title ILIKE $${paramIdx} OR a.excerpt ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  
  if (featured === 'true') {
    whereConditions.push('a.is_featured = true');
  }
  
  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
  
  let tagJoin = '';
  if (tag) {
    tagJoin = `
      JOIN article_tags at2 ON a.id = at2.article_id
      JOIN tags t ON at2.tag_id = t.id AND t.slug = $${paramIdx++}
    `;
    params.push(tag);
  }
  
  const dataQuery = `
    SELECT DISTINCT
      a.id, a.title, a.slug, a.excerpt, a.cover_image_url,
      a.view_count, a.read_time, a.is_featured, a.published_at,
      u.full_name AS author_name, u.avatar_url AS author_avatar,
      cat.name AS category_name, cat.slug AS category_slug,
      COALESCE(
        (SELECT json_agg(json_build_object('name', tg.name, 'slug', tg.slug))
         FROM article_tags atg JOIN tags tg ON atg.tag_id = tg.id
         WHERE atg.article_id = a.id), '[]'
      ) AS tags
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    LEFT JOIN categories cat ON a.category_id = cat.id
    ${tagJoin}
    ${whereClause}
    ORDER BY a.published_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  
  params.push(parseInt(limit), offset);
  
  const countQuery = `
    SELECT COUNT(DISTINCT a.id) FROM articles a
    LEFT JOIN categories cat ON a.category_id = cat.id
    ${tagJoin}
    ${whereClause}
  `;
  
  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, params.slice(0, -2))
  ]);
  
  const total = parseInt(countResult.rows[0].count);
  
  const response = {
    success: true,
    data: {
      articles: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    }
  };
  
  await cacheSet(cacheKey, response, 300);
  res.json(response);
});

const getArticle = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `article:${slug}`;
  
  const cached = await cacheGet(cacheKey);
  if (cached) {
    // Increment view count asynchronously
    query('UPDATE articles SET view_count = view_count + 1 WHERE slug = $1', [slug]).catch(() => {});
    return res.json(cached);
  }
  
  const result = await query(`
    SELECT 
      a.*,
      u.full_name AS author_name, u.avatar_url AS author_avatar, u.bio AS author_bio,
      cat.name AS category_name, cat.slug AS category_slug,
      COALESCE(
        (SELECT json_agg(json_build_object('name', tg.name, 'slug', tg.slug))
         FROM article_tags atg JOIN tags tg ON atg.tag_id = tg.id
         WHERE atg.article_id = a.id), '[]'
      ) AS tags
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    LEFT JOIN categories cat ON a.category_id = cat.id
    WHERE a.slug = $1 AND a.status = 'published'
  `, [slug]);
  
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Article not found' });
  }
  
  const article = result.rows[0];
  
  // Get related articles
  const relatedResult = await query(`
    SELECT 
      a.id, a.title, a.slug, a.excerpt, a.cover_image_url,
      a.read_time, a.published_at, a.view_count,
      u.full_name AS author_name
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.id != $1 
      AND a.status = 'published'
      AND (a.category_id = $2 OR EXISTS (
        SELECT 1 FROM article_tags at1
        JOIN article_tags at2 ON at1.tag_id = at2.tag_id
        WHERE at1.article_id = $1 AND at2.article_id = a.id
      ))
    ORDER BY a.published_at DESC
    LIMIT 4
  `, [article.id, article.category_id]);
  
  article.related_articles = relatedResult.rows;
  
  // Get comment count
  const commentCount = await query(
    "SELECT COUNT(*) FROM comments WHERE article_id = $1 AND status = 'approved'",
    [article.id]
  );
  article.comment_count = parseInt(commentCount.rows[0].count);
  
  // Generate schema markup
  article.schema_markup = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.seo_description,
    author: { '@type': 'Person', name: article.author_name },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    image: article.cover_image_url,
  };
  
  // Update view count
  await query('UPDATE articles SET view_count = view_count + 1 WHERE id = $1', [article.id]);
  
  const response = { success: true, data: article };
  await cacheSet(cacheKey, response, 300);
  res.json(response);
});

const createArticle = asyncHandler(async (req, res) => {
  const {
    title, excerpt, content, cover_image_url, category_id,
    status = 'draft', seo_title, seo_description, seo_keywords, tags
  } = req.body;
  
  const slug = slugify(title, { lower: true, strict: true });
  const existing = await query('SELECT id FROM articles WHERE slug = $1', [slug]);
  const finalSlug = existing.rows.length ? `${slug}-${Date.now()}` : slug;
  
  const readTime = Math.ceil(content.split(' ').length / 200);
  
  const result = await query(`
    INSERT INTO articles (
      title, slug, excerpt, content, cover_image_url, author_id,
      category_id, status, read_time, seo_title, seo_description, seo_keywords,
      published_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, [
    title, finalSlug, excerpt, content, cover_image_url, req.user.id,
    category_id, status, readTime, seo_title, seo_description, seo_keywords,
    status === 'published' ? new Date() : null
  ]);
  
  const article = result.rows[0];
  
  // Handle tags
  if (tags && tags.length > 0) {
    for (const tagSlug of tags) {
      const tagResult = await query(
        'SELECT id FROM tags WHERE slug = $1',
        [slugify(tagSlug, { lower: true })]
      );
      if (tagResult.rows.length) {
        await query(
          'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [article.id, tagResult.rows[0].id]
        );
      }
    }
  }
  
  await cacheDelPattern('articles:*');
  
  res.status(201).json({ success: true, data: article });
});

const updateArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await query('SELECT author_id FROM articles WHERE id = $1', [id]);
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Article not found' });
  }
  
  if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  const allowedFields = [
    'title', 'excerpt', 'content', 'cover_image_url', 'category_id',
    'status', 'seo_title', 'seo_description', 'seo_keywords', 'is_featured'
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
  
  if (req.body.content) {
    updates.push(`read_time = $${paramIdx++}`);
    params.push(Math.ceil(req.body.content.split(' ').length / 200));
  }
  
  if (req.body.status === 'published') {
    updates.push(`published_at = COALESCE(published_at, NOW())`);
  }
  
  params.push(id);
  
  const result = await query(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
  );
  
  await cacheDelPattern('articles:*');
  await cacheDel(`article:${result.rows[0].slug}`);
  
  res.json({ success: true, data: result.rows[0] });
});

const deleteArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await query(
    'UPDATE articles SET status = $1 WHERE id = $2',
    ['archived', id]
  );
  
  await cacheDelPattern('articles:*');
  
  res.json({ success: true, message: 'Article archived' });
});

const getPopularArticles = asyncHandler(async (req, res) => {
  const cacheKey = 'articles:popular';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);
  
  const result = await query(`
    SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image_url, 
           a.view_count, a.read_time, a.published_at,
           u.full_name AS author_name
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.status = 'published'
    ORDER BY a.view_count DESC
    LIMIT 6
  `);
  
  const response = { success: true, data: result.rows };
  await cacheSet(cacheKey, response, 600);
  res.json(response);
});

module.exports = { getArticles, getArticle, createArticle, updateArticle, deleteArticle, getPopularArticles };
