const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const articleController = require('../controllers/articleController');

router.get('/', apiRateLimiter, articleController.getArticles);
router.get('/popular', articleController.getPopularArticles);
router.get('/:slug', optionalAuth, articleController.getArticle);

router.post('/',
  authenticate,
  authorize('admin', 'instructor'),
  articleController.createArticle
);

router.put('/:id',
  authenticate,
  authorize('admin', 'instructor'),
  articleController.updateArticle
);

router.delete('/:id',
  authenticate,
  authorize('admin', 'instructor'),
  articleController.deleteArticle
);

module.exports = router;
