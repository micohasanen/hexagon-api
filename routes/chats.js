const router = require("express").Router()
const Chat = require("../models/Chat")
const ChatMessage = require("../models/ChatMessage")

const { extractUser } = require("../middleware/VerifySignature")

// Get chat history for a given user
router.get('/', [extractUser], async (req, res) => {
  try {
    const { address } = req.user
    const chats = await Chat.find({ userIds: address }).populate('messages users').sort('-updatedAt')
    return res.status(200).json({ results: chats })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }
})

// Endpoint just for testing, normal functionality through sockets
router.post('/', [extractUser], async (req, res) => {
  try {
    const { to, body, chatId } = req.body
    const { address } = req.user
    if (!to?.length || !body) return res.status(400).json({ message: 'Missing required parameters.' })

    const message = new ChatMessage({
      body,
      timestamp: new Date(),
      sender: address
    })

    await message.save()

    let chat

    if (chatId) {
      chat = await Chat.updateOne({ _id: chatId }, { $push: { messages: message._id }})
    } else {
      chat = new Chat({ userIds: [...to, address], messages: [message._id] })
      await chat.save()
    }

    return res.status(200).json({ chat })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }
})

module.exports = router