const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// All admin routes require auth + admin role
router.use(authenticate, authorize('admin'));

// Dashboard stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [users, courses, articles, enrollments, messages, revenue] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query('SELECT COUNT(*) FROM courses'),
    query("SELECT COUNT(*) FROM articles WHERE status = 'published'"),
    query('SELECT COUNT(*) FROM enrollments'),
    query("SELECT COUNT(*) FROM messages WHERE status = 'unread'"),
    query('SELECT COALESCE(SUM(amount_paid), 0) AS total FROM enrollments'),
  ]);
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsers = await query('SELECT COUNT(*) FROM users WHERE created_at > $1', [thirtyDaysAgo]);
  
  res.json({
    success: true,
    data: {
      total_users: parseInt(users.rows[0].count),
      total_courses: parseInt(courses.rows[0].count),
      total_articles: parseInt(articles.rows[0].count),
      total_enrollments: parseInt(enrollments.rows[0].count),
      unread_messages: parseInt(messages.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
      new_users_30d: parseInt(newUsers.rows[0].count),
    }
  });
}));

// Manage users
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let where = [];
  const params = [];
  let idx = 1;
  
  if (search) { where.push(`(email ILIKE $${idx} OR username ILIKE $${idx} OR full_name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (role) { where.push(`role = $${idx++}`); params.push(role); }
  
  const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  
  const [data, count] = await Promise.all([
    query(`SELECT id, email, username, full_name, role, is_active, is_verified, last_login, created_at FROM users ${whereStr} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, parseInt(limit), offset]),
    query(`SELECT COUNT(*) FROM users ${whereStr}`, params)
  ]);
  
  res.json({ success: true, data: { users: data.rows, total: parseInt(count.rows[0].count) }});
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const { role, is_active } = req.body;
  const result = await query(
    'UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active) WHERE id = $3 RETURNING id, email, role, is_active',
    [role, is_active, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// Manage courses
router.get('/courses', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const result = await query(`
    SELECT c.id, c.title, c.slug, c.status, c.price, c.enrollment_count, c.rating_average, c.created_at,
           u.full_name AS instructor_name
    FROM courses c JOIN users u ON c.instructor_id = u.id
    ORDER BY c.created_at DESC LIMIT $1 OFFSET $2
  `, [parseInt(limit), offset]);
  res.json({ success: true, data: result.rows });
}));

// Manage articles
router.get('/articles', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT a.id, a.title, a.slug, a.status, a.view_count, a.is_featured, a.published_at,
           u.full_name AS author_name
    FROM articles a JOIN users u ON a.author_id = u.id
    ORDER BY a.created_at DESC LIMIT 50
  `);
  res.json({ success: true, data: result.rows });
}));

// Manage comments (moderation)
router.get('/comments', asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const result = await query(`
    SELECT c.*, a.title AS article_title, a.slug AS article_slug
    FROM comments c JOIN articles a ON c.article_id = a.id
    WHERE c.status = $1 ORDER BY c.created_at DESC LIMIT 50
  `, [status]);
  res.json({ success: true, data: result.rows });
}));

router.patch('/comments/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  await query('UPDATE comments SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ success: true, message: 'Comment updated' });
}));

// Messages
router.get('/messages', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
  res.json({ success: true, data: result.rows });
}));

router.patch('/messages/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  await query('UPDATE messages SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ success: true });
}));

// Analytics
router.get('/analytics/chart', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const result = await query(`
    SELECT 
      DATE_TRUNC('day', created_at) AS date,
      COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
      COUNT(*) FILTER (WHERE event_type = 'course_view') AS course_views,
      COUNT(DISTINCT user_id) AS unique_users
    FROM analytics_events
    WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date ASC
  `);
  res.json({ success: true, data: result.rows });
}));

module.exports = router;
