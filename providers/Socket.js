const { Server } = require("socket.io")
const { createAdapter } = require("@socket.io/redis-adapter")
const Redis = require("ioredis")
const config = require("../config")

// Controllers
const ChatController = require("../controllers/ChatController")

// Models
const UserMessageKey = require("../models/UserMessageKey")

// Middleware
const { extractSocketUser } = require("../middleware/VerifySignature")

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

  io.on('connection', async (socket) => {
    const userAddress = await extractSocketUser(socket.handshake.auth.token)
    
    if (userAddress) {
      // Chat Events are emitted to the rooms with the user address
      socket.userAddress = userAddress
      socket.join(userAddress)

      const keys = await UserMessageKey.findOne({ userAddress })
      socket.emit('keys', keys)
    }

    socket.on('joinChat', (chatId) => {
      ChatController.getChatUserPreKeys(chatId, socket.userAddress).then((keys) => {
        socket.emit('chatKeys', keys)
      })
    })

    socket.on('sendMessage', (data) => {
      ChatController.newMessage({ ...data, sender: socket.userAddress }).then(({ chat, message }) => {
        chat.userIds.forEach((id) => {
          console.log('sending message to', id)
          socket.to(id).emit('receiveMessage', { message })
        })
      })
    })

    socket.on('markAsRead', (data) => {
      ChatController.markAsRead(data).then(({ chat, message }) => {
        chat.userIds.forEach((id) => {
          socket.to(id).emit('messageUpdated', { message })
        })
      })
    })
  })
}

function handleRedisError (error) {
  console.error(error)
}