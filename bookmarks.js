const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ success: true, data: result.rows });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { content_type, content_id } = req.body;
  await query(
    'INSERT INTO bookmarks (user_id, content_type, content_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
    [req.user.id, content_type, content_id]
  );
  res.status(201).json({ success: true, message: 'Bookmarked' });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true, message: 'Bookmark removed' });
}));

module.exports = router;
