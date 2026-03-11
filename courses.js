const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const courseController = require('../controllers/courseController');

router.get('/', apiRateLimiter, courseController.getCourses);
router.get('/featured', courseController.getFeaturedCourses);
router.get('/:slug', optionalAuth, courseController.getCourse);

router.post('/',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.createCourse
);

router.put('/:id',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.updateCourse
);

router.delete('/:id',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.deleteCourse
);

module.exports = router;
