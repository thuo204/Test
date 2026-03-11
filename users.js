const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { cacheDelPattern } = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/profile/:username', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, username, full_name, avatar_url, bio, role, created_at FROM users WHERE username = $1 AND is_active = true',
    [req.params.username]
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: result.rows[0] });
}));

router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { full_name, bio, avatar_url } = req.body;
  const result = await query(
    'UPDATE users SET full_name = COALESCE($1, full_name), bio = COALESCE($2, bio), avatar_url = COALESCE($3, avatar_url) WHERE id = $4 RETURNING id, email, username, full_name, avatar_url, bio',
    [full_name, bio, avatar_url, req.user.id]
  );
  await cacheDelPattern(`user:${req.user.id}`);
  res.json({ success: true, data: result.rows[0] });
}));

module.exports = router;
