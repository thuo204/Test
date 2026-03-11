const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/course/:courseId', authenticate, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const result = await query(`
    SELECT lp.*, l.title AS lesson_title, l.video_duration
    FROM lesson_progress lp
    JOIN lessons l ON lp.lesson_id = l.id
    WHERE lp.user_id = $1 AND lp.course_id = $2
  `, [req.user.id, courseId]);
  
  const enrollment = await query(
    'SELECT progress_percentage FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [req.user.id, courseId]
  );
  
  res.json({ 
    success: true, 
    data: { 
      lessons: result.rows,
      progress_percentage: enrollment.rows[0]?.progress_percentage || 0
    }
  });
}));

router.post('/lesson/:lessonId', authenticate, asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { is_completed, watch_time, last_position, notes } = req.body;
  
  const lesson = await query('SELECT course_id FROM lessons WHERE id = $1', [lessonId]);
  if (!lesson.rows.length) return res.status(404).json({ success: false, message: 'Lesson not found' });
  
  const courseId = lesson.rows[0].course_id;
  
  await query(`
    INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, watch_time, last_position, notes, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
      is_completed = EXCLUDED.is_completed,
      watch_time = GREATEST(lesson_progress.watch_time, EXCLUDED.watch_time),
      last_position = EXCLUDED.last_position,
      notes = COALESCE(EXCLUDED.notes, lesson_progress.notes),
      completed_at = CASE WHEN EXCLUDED.is_completed = true THEN COALESCE(lesson_progress.completed_at, NOW()) ELSE lesson_progress.completed_at END
  `, [
    req.user.id, lessonId, courseId, is_completed || false,
    watch_time || 0, last_position || 0, notes || null,
    is_completed ? new Date() : null
  ]);
  
  // Update enrollment progress
  const progressResult = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE lp.is_completed = true) AS completed,
      COUNT(l.id) AS total
    FROM lessons l
    LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
    WHERE l.course_id = $2 AND l.is_published = true
  `, [req.user.id, courseId]);
  
  const { completed, total } = progressResult.rows[0];
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  await query(
    `UPDATE enrollments SET progress_percentage = $1, 
     completed_at = CASE WHEN $1 = 100 THEN COALESCE(completed_at, NOW()) ELSE completed_at END
     WHERE user_id = $2 AND course_id = $3`,
    [percentage, req.user.id, courseId]
  );
  
  res.json({ success: true, data: { progress_percentage: percentage } });
}));

module.exports = router;
