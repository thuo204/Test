const rateLimit = require('express-rate-limit');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

// Store using Redis or memory
const createStore = () => {
  const redis = getRedis();
  if (redis) {
    return {
      async increment(key) {
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, 900); // 15 min window
        }
        return { totalHits: current };
      },
      async decrement(key) {
        await redis.decr(key);
      },
      async resetKey(key) {
        await redis.del(key);
      }
    };
  }
  return undefined; // Fall back to memory store
};

const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: 15
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes'
  },
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    message: 'API rate limit exceeded'
  },
});

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again in an hour'
  },
});

const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many contact form submissions'
  },
});

module.exports = { 
  globalRateLimiter, 
  authRateLimiter, 
  apiRateLimiter, 
  uploadRateLimiter,
  contactRateLimiter 
};
