const { snapshotConstructor } = require("firebase-functions/v1/firestore")
const Chat = require("../models/Chat")
const ChatMessage = require("../models/ChatMessage")
const UserMessageKey = require("../models/UserMessageKey")

exports.newMessage = async ({ to, body, chatId, sender }) => {
  try {
    if (!to?.length || !body) return Promise.reject('Missing required parameters.')

    // TODO: Check receiver validity

    const message = new ChatMessage({
      body,
      timestamp: new Date(),
      sender,
      readTimes: [{ user: sender, timestamp: new Date() }]
    })

    let chat

    if (chatId) {
      chat = await Chat.updateOne({ _id: chatId }, { $push: { messages: message._id }})
    } else {
      chat = new Chat({ 
        userIds: [...to, sender],
        messages: [message._id],
        creatorId: sender
      })
      await chat.save()
    }

    message.chatId = chat._id
    await message.save()

    return Promise.resolve({ chat, message })
  } catch (error) {
    console.error(error)
    return Promise.reject('Something went wrong.')
  }
}

exports.markAsRead = async ({ user, messageId }) => {
  try {
    const message = await ChatMessage
                    .findOne({ _id: messageId })
                    .populate('chat')
                    .exec()
    
    message.readTimes.push({ user, timestamp: new Date() })
    await message.save()

    return Promise.resolve({ message, chat: message.chat })
  } catch (error) {
    console.error(error)
    return Promise.reject('Something went wrong.')
  }
}

exports.getChatUserPreKeys = async (chatId, requester) => {
  try {
    const chat = await Chat.findOne({ _id: chatId })
    if (!chat) return Promise.reject('No chat found.')

    // Return all pre key bundles but not the users own
    const ids = chat.userIds.slice()
    const i = ids.findIndex(id => id === requester.toLowerCase())

    if (i !== -1) ids.splice(i, 1)

    const keys = await UserMessageKey.find({ userAddress: { $in: ids } })

    return Promise.resolve(keys)
  } catch (error) {
    console.error(error)
    return Promise.reject('Something went wrong.')
  }
}