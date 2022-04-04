module.exports = {
  redisConnection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASS,
    connectTimeout: 10000,
    lazyConnect: true
  },
  marketplaces: {
    '80001': '0xfDBdE84e30e4b8eCf063b98B041925c64B78c798', 
    '137': '0xcd3b66f97B5461318FeDC291c0DBBb2e6590F029'
  }
}