// enrollments.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT e.*, c.title, c.slug, c.cover_image_url, c.total_lessons,
           u.full_name AS instructor_name
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.instructor_id = u.id
    WHERE e.user_id = $1
    ORDER BY e.enrolled_at DESC
  `, [req.user.id]);
  res.json({ success: true, data: result.rows });
}));

router.post('/:courseId', authenticate, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await query(
    "SELECT id, price, is_free FROM courses WHERE id = $1 AND status = 'published'",
    [courseId]
  );
  if (!course.rows.length) return res.status(404).json({ success: false, message: 'Course not found' });
  
  const existing = await query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [req.user.id, courseId]
  );
  if (existing.rows.length) return res.status(409).json({ success: false, message: 'Already enrolled' });
  
  if (!course.rows[0].is_free && course.rows[0].price > 0) {
    return res.status(402).json({ success: false, message: 'Payment required', price: course.rows[0].price });
  }
  
  await query(
    'INSERT INTO enrollments (user_id, course_id, amount_paid) VALUES ($1, $2, 0)',
    [req.user.id, courseId]
  );
  await query('UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1', [courseId]);
  
  res.status(201).json({ success: true, message: 'Enrolled successfully' });
}));

module.exports = router;
