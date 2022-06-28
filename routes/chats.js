const router = require("express").Router()
const Chat = require("../models/Chat")

const { extractUser } = require("../middleware/VerifySignature")

// Get chat history for a given user
router.get('/', [extractUser], async (req, res) => {
  try {
    const { address } = req.user
    const chats = Chat.find({ users: address }).sort('-updatedAt')
    return res.status(200).json({ results: chats })
  } catch (error) {
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }
})

module.exports = router