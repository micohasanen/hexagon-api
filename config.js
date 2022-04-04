module.exports = {
  redisConnection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASS,
    connectTimeout: 10000,
    lazyConnect: true,
    tls: {}
  },
  marketplaces: {
    '80001': process.env.MARKETPLACE_MUMBAI, 
    '137': process.env.MARKETPLACE_POLYGON
  }
}