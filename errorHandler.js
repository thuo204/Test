const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('API Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });
  
  // Postgres errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({ success: false, message: 'Resource already exists' });
      case '23503': // Foreign key violation
        return res.status(400).json({ success: false, message: 'Referenced resource not found' });
      case '23502': // Not null violation
        return res.status(400).json({ success: false, message: 'Required field missing' });
      case '22P02': // Invalid UUID
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size too large' });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Unexpected file field' });
  }
  
  // Validation errors
  if (err.type === 'validation') {
    return res.status(422).json({ success: false, message: err.message, errors: err.errors });
  }
  
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
