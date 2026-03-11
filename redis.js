const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };
}

async function connectRedis() {
  try {
    redisClient = new Redis(getRedisConfig());
    
    redisClient.on('error', (err) => {
      logger.error('Redis error:', err.message);
    });
    
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });
    
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error.message);
    // Continue without Redis in development
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Continuing without Redis cache...');
      return null;
    }
    throw error;
  }
}

function getRedis() {
  return redisClient;
}

// Cache helper functions
async function cacheGet(key) {
  try {
    if (!redisClient) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache get error:', error.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    if (!redisClient) return;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error:', error.message);
  }
}

async function cacheDel(key) {
  try {
    if (!redisClient) return;
    await redisClient.del(key);
  } catch (error) {
    logger.error('Cache delete error:', error.message);
  }
}

async function cacheDelPattern(pattern) {
  try {
    if (!redisClient) return;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.error('Cache delete pattern error:', error.message);
  }
}

module.exports = { 
  connectRedis, 
  getRedis, 
  cacheGet, 
  cacheSet, 
  cacheDel, 
  cacheDelPattern 
};
