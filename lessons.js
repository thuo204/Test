const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lesson = await query(`
    SELECT l.*, m.title AS module_title, c.title AS course_title, c.id AS course_id,
      c.instructor_id
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON l.course_id = c.id
    WHERE l.id = $1 AND l.is_published = true
  `, [id]);
  
  if (!lesson.rows.length) return res.status(404).json({ success: false, message: 'Lesson not found' });
  
  const l = lesson.rows[0];
  
  // Check access
  if (!l.is_free_preview) {
    const enrollment = await query(
      "SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'active'",
      [req.user.id, l.course_id]
    );
    if (!enrollment.rows.length && l.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not enrolled' });
    }
  }
  
  // Get prev/next lessons
  const siblings = await query(`
    SELECT l.id, l.title, l.sort_order, l.module_id
    FROM lessons l
    WHERE l.course_id = $1 AND l.is_published = true
    ORDER BY l.sort_order
  `, [l.course_id]);
  
  const currentIdx = siblings.rows.findIndex(s => s.id === id);
  l.prev_lesson = siblings.rows[currentIdx - 1] || null;
  l.next_lesson = siblings.rows[currentIdx + 1] || null;
  
  res.json({ success: true, data: l });
}));

router.post('/:courseId/modules/:moduleId',
  authenticate, authorize('instructor', 'admin'),
  asyncHandler(async (req, res) => {
    const { moduleId, courseId } = req.params;
    const { title, description, content_type, sort_order, is_free_preview } = req.body;
    
    const result = await query(`
      INSERT INTO lessons (module_id, course_id, title, description, content_type, sort_order, is_free_preview)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [moduleId, courseId, title, description, content_type || 'video', sort_order || 0, is_free_preview || false]);
    
    // Update course total_lessons count
    await query(
      'UPDATE courses SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = $1) WHERE id = $1',
      [courseId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  })
);

// Get discussions for a lesson
router.get('/:id/discussions', authenticate, asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT d.*, u.full_name, u.avatar_url
    FROM lesson_discussions d
    JOIN users u ON d.user_id = u.id
    WHERE d.lesson_id = $1 AND d.parent_id IS NULL
    ORDER BY d.is_pinned DESC, d.created_at DESC
    LIMIT 50
  `, [req.params.id]);
  
  res.json({ success: true, data: result.rows });
}));

router.post('/:id/discussions', authenticate, asyncHandler(async (req, res) => {
  const { content, parent_id } = req.body;
  const result = await query(`
    INSERT INTO lesson_discussions (lesson_id, user_id, content, parent_id)
    VALUES ($1,$2,$3,$4) RETURNING *
  `, [req.params.id, req.user.id, content, parent_id || null]);
  res.status(201).json({ success: true, data: result.rows[0] });
}));

module.exports = router;
