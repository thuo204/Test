require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { requestFingerprint } = require('./middleware/security');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const lessonRoutes = require('./routes/lessons');
const articleRoutes = require('./routes/articles');
const categoryRoutes = require('./routes/categories');
const commentRoutes = require('./routes/comments');
const enrollmentRoutes = require('./routes/enrollments');
const progressRoutes = require('./routes/progress');
const videoRoutes = require('./routes/video');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const bookmarkRoutes = require('./routes/bookmarks');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const seoRoutes = require('./routes/seo');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "*.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "*.yourdomain.com"],
      connectSrc: ["'self'", "*.yourdomain.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Security middleware
app.use(globalRateLimiter);
app.use(requestFingerprint);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/courses`, courseRoutes);
app.use(`${API}/lessons`, lessonRoutes);
app.use(`${API}/articles`, articleRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/comments`, commentRoutes);
app.use(`${API}/enrollments`, enrollmentRoutes);
app.use(`${API}/progress`, progressRoutes);
app.use(`${API}/video`, videoRoutes);
app.use(`${API}/messages`, messageRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/bookmarks`, bookmarkRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/upload`, uploadRoutes);
app.use(`${API}/seo`, seoRoutes);

// Static files for uploads
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Resource not found' 
  });
});

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 EduStream API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = app;
