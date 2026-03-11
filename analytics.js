const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/track', optionalAuth, asyncHandler(async (req, res) => {
  const { event_type, page_url, referrer, data } = req.body;
  await query(
    'INSERT INTO analytics_events (event_type, user_id, session_id, ip_address, user_agent, page_url, referrer, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [event_type, req.user?.id || null, req.fingerprint, req.ip, req.headers['user-agent'], page_url, referrer, JSON.stringify(data || {})]
  );
  res.json({ success: true });
}));

module.exports = router;
