const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Generate signed video token
function generateVideoToken(userId, lessonId, ipAddress) {
  const expiry = Math.floor(Date.now() / 1000) + (parseInt(process.env.VIDEO_TOKEN_EXPIRY) || 3600);
  const payload = `${userId}:${lessonId}:${expiry}:${ipAddress}`;
  const signature = crypto
    .createHmac('sha256', process.env.VIDEO_SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return { token, expiry };
}

// Verify signed video token
function verifyVideoToken(token, ipAddress) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    
    if (parts.length !== 5) return null;
    
    const [userId, lessonId, expiry, tokenIp, signature] = parts;
    
    // Check expiry
    if (parseInt(expiry) < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    // Verify signature
    const payload = `${userId}:${lessonId}:${expiry}:${tokenIp}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.VIDEO_SECRET_KEY)
      .update(payload)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    
    return { userId, lessonId };
  } catch {
    return null;
  }
}

// Request signed video URL
const requestVideoAccess = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  
  // Check lesson exists
  const lessonResult = await query(
    'SELECT id, course_id, video_hls_url, is_free_preview FROM lessons WHERE id = $1 AND is_published = true',
    [lessonId]
  );
  
  if (!lessonResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }
  
  const lesson = lessonResult.rows[0];
  
  // Check if free preview or user is enrolled
  if (!lesson.is_free_preview) {
    const enrollmentResult = await query(
      "SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'active'",
      [req.user.id, lesson.course_id]
    );
    
    const isInstructor = await query(
      'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
      [lesson.course_id, req.user.id]
    );
    
    if (!enrollmentResult.rows.length && !isInstructor.rows.length && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Please enroll to access this lesson' 
      });
    }
  }
  
  const ipAddress = req.ip;
  const { token, expiry } = generateVideoToken(req.user.id, lessonId, ipAddress);
  
  // Store token in DB for tracking
  await query(`
    INSERT INTO video_tokens (token, user_id, lesson_id, expires_at, ip_address)
    VALUES ($1, $2, $3, to_timestamp($4), $5)
    ON CONFLICT DO NOTHING
  `, [token, req.user.id, lessonId, expiry, ipAddress]);
  
  const signedUrl = `/api/v1/video/stream/${lessonId}/master.m3u8?token=${token}`;
  
  res.json({
    success: true,
    data: {
      signedUrl,
      token,
      expiresAt: new Date(expiry * 1000).toISOString(),
      watermark: {
        email: req.user.email,
        timestamp: new Date().toISOString(),
      }
    }
  });
});

// Serve HLS master playlist
const streamVideo = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { token } = req.query;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Video token required' });
  }
  
  const decoded = verifyVideoToken(token, req.ip);
  
  if (!decoded || decoded.lessonId !== lessonId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired video token' });
  }
  
  const lessonResult = await query(
    'SELECT video_hls_url, course_id FROM lessons WHERE id = $1',
    [lessonId]
  );
  
  if (!lessonResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }
  
  const videoPath = path.join(
    process.env.HLS_STORAGE_PATH || '/app/uploads/videos',
    lessonId,
    'master.m3u8'
  );
  
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ success: false, message: 'Video not found' });
  }
  
  // Read and modify playlist to add token to segment URLs
  let playlist = fs.readFileSync(videoPath, 'utf8');
  playlist = playlist.replace(
    /^(playlist_\w+\.m3u8)$/gm,
    (match) => `/api/v1/video/stream/${lessonId}/${match}?token=${token}`
  );
  
  res.set({
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Cache-Control': 'no-store, no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': process.env.APP_URL,
  });
  
  res.send(playlist);
});

// Serve HLS segment
const streamSegment = asyncHandler(async (req, res) => {
  const { lessonId, filename } = req.params;
  const { token } = req.query;
  
  if (!token) {
    return res.status(401).send('Unauthorized');
  }
  
  const decoded = verifyVideoToken(token, req.ip);
  if (!decoded || decoded.lessonId !== lessonId) {
    return res.status(401).send('Invalid token');
  }
  
  const segmentPath = path.join(
    process.env.HLS_STORAGE_PATH || '/app/uploads/videos',
    lessonId,
    filename
  );
  
  if (!fs.existsSync(segmentPath)) {
    return res.status(404).send('Segment not found');
  }
  
  // Anti-hotlinking
  const referer = req.headers.referer || '';
  if (referer && !referer.includes(process.env.APP_URL)) {
    logger.warn('Hotlinking attempt:', { referer, ip: req.ip, lessonId });
    return res.status(403).send('Forbidden');
  }
  
  const isPlaylist = filename.endsWith('.m3u8');
  
  if (isPlaylist) {
    let content = fs.readFileSync(segmentPath, 'utf8');
    // Add token to .ts segment URLs
    content = content.replace(
      /^(segment_\w+\.ts)$/gm,
      (match) => `/api/v1/video/segment/${lessonId}/${match}?token=${token}`
    );
    
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(content);
  } else {
    res.set({
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(segmentPath).pipe(res);
  }
});

// Upload video and convert to HLS
const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video file provided' });
  }
  
  const { lessonId } = req.params;
  
  // Verify instructor owns this lesson
  const lessonResult = await query(`
    SELECT l.id, c.instructor_id 
    FROM lessons l 
    JOIN courses c ON l.course_id = c.id 
    WHERE l.id = $1
  `, [lessonId]);
  
  if (!lessonResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }
  
  if (lessonResult.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  const outputDir = path.join(
    process.env.HLS_STORAGE_PATH || '/app/uploads/videos',
    lessonId
  );
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Convert to HLS using ffmpeg (async)
  const { convertToHLS } = require('../services/videoService');
  
  res.json({ 
    success: true, 
    message: 'Video upload accepted. Processing started.',
    data: { lessonId, status: 'processing' }
  });
  
  // Process in background
  convertToHLS(req.file.path, outputDir, lessonId)
    .then(async (duration) => {
      await query(
        'UPDATE lessons SET video_hls_url = $1, video_duration = $2 WHERE id = $3',
        [`/api/v1/video/stream/${lessonId}/master.m3u8`, duration, lessonId]
      );
      logger.info(`Video processing complete for lesson: ${lessonId}`);
    })
    .catch((err) => {
      logger.error('Video processing failed:', err);
    });
});

module.exports = { requestVideoAccess, streamVideo, streamSegment, uploadVideo };
