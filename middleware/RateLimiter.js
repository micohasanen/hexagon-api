const config = require("../config")
const Redis = require("ioredis")
const redis = new Redis(config.redisConnection)
const { RateLimiterRedis } = require("rate-limiter-flexible")

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit',
  points: 6000, // 6 requests
  duration: 1, // per 1 second by IP
});

module.exports = (req, res, next) => {
  rateLimiter.consume(req.ip).then(() => {
    next()
  }).catch(() => {
    return res.status(429).json({ message: 'Too many requests' })
  })
}