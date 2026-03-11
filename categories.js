const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = 'categories:all';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);
  
  const result = await query(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM courses WHERE category_id = c.id AND status = 'published') AS course_count,
      (SELECT COUNT(*) FROM articles WHERE category_id = c.id AND status = 'published') AS article_count
    FROM categories c WHERE c.is_active = true ORDER BY c.sort_order
  `);
  
  const response = { success: true, data: result.rows };
  await cacheSet(cacheKey, response, 3600);
  res.json(response);
}));

module.exports = router;
