const redisConnection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASS,
  lazyConnect: true
}

if (process.env.NODE_ENV === 'production') redisConnection.tls = {}
redisConnection.tls = {}

module.exports = {
  redisConnection,
  marketplaces: {
    '80001': process.env.MARKETPLACE_MUMBAI, 
    '137': process.env.MARKETPLACE_POLYGON
  },
  smtp: {
    host: 'smtp-relay.sendinblue.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }
}