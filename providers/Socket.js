const { Server } = require("socket.io")
const { createAdapter } = require("@socket.io/redis-adapter")
const Redis = require("ioredis")
const config = require("../config")

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.origins
    }
  })

  const pubClient = new Redis(config.redisConnection)
  const subClient = pubClient.duplicate()

  pubClient.on('error', handleRedisError)
  subClient.on('error', handleRedisError)

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(socket.id, 'connected')
  })
}

function handleRedisError (error) {
  console.error(error)
}