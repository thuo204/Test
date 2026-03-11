const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { body } = require('express-validator');

const validateComment = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get('/article/:articleId', optionalAuth, asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const result = await query(`
    SELECT c.id, c.content, c.parent_id, c.like_count, c.created_at,
      COALESCE(u.full_name, c.author_name) AS author_name,
      COALESCE(u.avatar_url, null) AS author_avatar,
      c.user_id
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.article_id = $1 AND c.status = 'approved'
    ORDER BY c.created_at ASC
  `, [articleId]);
  
  // Build nested structure
  const comments = result.rows;
  const nested = comments.filter(c => !c.parent_id).map(parent => ({
    ...parent,
    replies: comments.filter(c => c.parent_id === parent.id)
  }));
  
  res.json({ success: true, data: nested });
}));

router.post('/article/:articleId',
  optionalAuth,
  apiRateLimiter,
  [
    body('content').isLength({ min: 1, max: 2000 }),
    body('author_name').if((value, { req }) => !req.user).notEmpty().isLength({ max: 100 }),
    body('author_email').if((value, { req }) => !req.user).isEmail(),
  ],
  validateComment,
  asyncHandler(async (req, res) => {
    const { articleId } = req.params;
    const { content, author_name, author_email, parent_id } = req.body;
    
    const article = await query('SELECT id FROM articles WHERE id = $1', [articleId]);
    if (!article.rows.length) return res.status(404).json({ success: false, message: 'Article not found' });
    
    // Auto-approve if logged in
    const status = req.user ? 'approved' : 'pending';
    
    const result = await query(`
      INSERT INTO comments (article_id, user_id, parent_id, author_name, author_email, content, status, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [
      articleId, req.user?.id || null, parent_id || null,
      author_name || null, author_email || null,
      content, status, req.ip
    ]);
    
    res.status(201).json({ 
      success: true, 
      message: req.user ? 'Comment posted' : 'Comment submitted for moderation',
      data: result.rows[0]
    });
  })
);

router.put('/:id/approve', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await query("UPDATE comments SET status = 'approved' WHERE id = $1", [req.params.id]);
  res.json({ success: true, message: 'Comment approved' });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const comment = await query('SELECT user_id FROM comments WHERE id = $1', [req.params.id]);
  if (!comment.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
  
  if (comment.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  await query('DELETE FROM comments WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Comment deleted' });
}));

module.exports = router;
