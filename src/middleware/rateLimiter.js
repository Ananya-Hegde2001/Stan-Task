const { RateLimiterRedis } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Initialize rate limiter without Redis client initially
let rateLimiter = null;

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Initialize rate limiter with Redis client if available and not already initialized
    if (!rateLimiter && req.app.locals.redis) {
      rateLimiter = new RateLimiterRedis({
        storeClient: req.app.locals.redis,
        keyPrefix: 'rl_stan_chatbot',
        points: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Number of requests
        duration: parseInt(process.env.RATE_LIMIT_WINDOW) || 900, // Per 15 minutes
        blockDuration: 60 * 15, // Block for 15 minutes if limit exceeded
      });
    }

    // Skip rate limiting if Redis is not available
    if (!rateLimiter) {
      logger.warn('Redis not available, skipping rate limiting');
      return next();
    }

    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs
    });
  }
};

module.exports = rateLimiterMiddleware;
