const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Base configuration for Redis-backed rate limiting
const createLimiter = (windowMs, max, message) => {
  // If rate limiting is explicitly disabled in .env, return a pass-through
  if (String(process.env.ENABLE_RATE_LIMIT).toLowerCase().trim() === 'false') {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    message: { error: message, code: 'RATE_LIMIT_EXCEEDED' },
  });
};

// Strict limiter for Auth (Login/Register) - 5 attempts per 15 mins
const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts. Please try again after 15 minutes.'
);

// Limiter for Expense Submission - 20 per hour
const submissionLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Submission limit reached. Please wait an hour before submitting more expenses.'
);

// Limiter for K_session requests (privileged) - 50 per hour
const sessionKeyLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  'Too many session key requests. Access limited to prevent bulk data scraping.'
);

// General API limiter - 100 requests per minute
const apiLimiter = createLimiter(
  60 * 1000,
  100,
  'Too many requests to the API.'
);

module.exports = {
  authLimiter,
  submissionLimiter,
  sessionKeyLimiter,
  apiLimiter
};
