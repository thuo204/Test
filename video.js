const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadRateLimiter } = require('../middleware/rateLimiter');
const videoController = require('../controllers/videoController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 524288000 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');
    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// Request signed URL for video access
router.get('/access/:lessonId', authenticate, videoController.requestVideoAccess);

// Stream HLS master playlist (protected by token)
router.get('/stream/:lessonId/master.m3u8', videoController.streamVideo);

// Stream HLS segments (protected by token)
router.get('/stream/:lessonId/:filename', videoController.streamSegment);
router.get('/segment/:lessonId/:filename', videoController.streamSegment);

// Upload video (instructors/admin)
router.post('/upload/:lessonId',
  authenticate,
  authorize('instructor', 'admin'),
  uploadRateLimiter,
  upload.single('video'),
  videoController.uploadVideo
);

module.exports = router;
