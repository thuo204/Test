const crypto = require('crypto');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

// Suspicious user agents to block
const BLOCKED_USER_AGENTS = [
  'scrapy', 'crawler', 'spider', 'python-requests', 'curl/7',
  'wget', 'libwww-perl', 'go-http-client', 'java/', 'okhttp',
  'headlesschrome', 'phantomjs', 'selenium', 'playwright'
];

// Request fingerprinting middleware
function requestFingerprint(req, res, next) {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  
  // Block suspicious user agents for API endpoints
  if (req.path.startsWith('/api/') && !req.path.includes('/health')) {
    const isBlocked = BLOCKED_USER_AGENTS.some(agent => userAgent.includes(agent));
    if (isBlocked) {
      logger.warn('Blocked user agent:', { userAgent, ip: req.ip, path: req.path });
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden' 
      });
    }
  }
  
  // Generate request fingerprint
  const fingerprint = crypto
    .createHash('sha256')
    .update([
      req.ip,
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
    ].join('|'))
    .digest('hex')
    .substring(0, 16);
  
  req.fingerprint = fingerprint;
  next();
}

// IP throttling middleware (more aggressive than rate limiting)
async function ipThrottle(req, res, next) {
  const redis = getRedis();
  if (!redis) return next();
  
  const key = `throttle:${req.ip}`;
  
  try {
    const requests = await redis.incr(key);
    
    if (requests === 1) {
      await redis.expire(key, 1); // 1 second window
    }
    
    // Max 20 requests per second per IP
    if (requests > 20) {
      logger.warn('IP throttled:', { ip: req.ip, requests });
      return res.status(429).json({ 
        success: false, 
        message: 'Request rate too high' 
      });
    }
    
    next();
  } catch (error) {
    next(); // Don't block on Redis errors
  }
}

// Validate request headers
function validateHeaders(req, res, next) {
  // Require content-type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return res.status(415).json({ 
        success: false, 
        message: 'Unsupported media type' 
      });
    }
  }
  next();
}

// Input sanitization
function sanitizeInput(req, res, next) {
  const xss = require('xss');
  
  function sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return xss(obj, {
        whiteList: {
          h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
          p: [], br: [], strong: [], em: [], u: [], s: [],
          ul: [], ol: [], li: [],
          blockquote: [],
          code: [], pre: [],
          a: ['href', 'target'],
          img: ['src', 'alt'],
        },
        stripIgnoreTag: true,
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

module.exports = { requestFingerprint, ipThrottle, validateHeaders, sanitizeInput };
