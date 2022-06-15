const redisConnection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASS,
  clientTimeout: 10000,
  lazyConnect: true
}

if (process.env.NODE_ENV === 'production') redisConnection.tls = {}

module.exports = {
  redisConnection,
  mongoConnection: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`,
  marketplaces: {
    '80001': process.env.MARKETPLACE_MUMBAI, 
    '137': process.env.MARKETPLACE_POLYGON,
    '1': process.env.MARKETPLACE_ETH,
    '43114': process.env.MARKETPLACE_AVAX,
    '56': process.env.MARKETPLACE_BSC,
    '250': process.env.MARKETPLACE_FTM,
    '42161': process.env.MARKETPLACE_ARB,
    '25': process.env.MARKETPLACE_CRO
  },
  smtp: {
    host: 'smtp-relay.sendinblue.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  chains: [
      { label: 'eth', id: 1, rpcEndpoints: [process.env.RPC_ETH] },
      { label: 'polygon', id: 137, rpcEndpoints: [process.env.RPC_POLYGON] },
      { label: 'avalanche', id: 43114, rpcEndpoints: [process.env.RPC_AVAX] },
      { label: 'bsc', id: 56, rpcEndpoints: [process.env.RPC_BSC] },
      { label: 'fantom', id: 250, rpcEndpoints: [process.env.RPC_FTM] },
      { label: 'arbitrum', id: 42161, rpcEndpoints: ['https://rpc.ankr.com/arbitrum', 'https://arb1.arbitrum.io/rpc', 'https://arbitrum.public-rpc.com'] },
      { label: 'cronos', id: 25, rpcEndpoints: ['https://evm.cronos.org/', 'https://evm-cronos.crypto.org'] },
      { label: 'mumbai', id: 80001, testnet: true, rpcEndpoints: [process.env.RPC_MUMBAI] }
  ]
}