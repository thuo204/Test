const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  const unreadCount = result.rows.filter(n => !n.is_read).length;
  res.json({ success: true, data: { notifications: result.rows, unread_count: unreadCount }});
}));

router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
}));

router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
}));

module.exports = router;
