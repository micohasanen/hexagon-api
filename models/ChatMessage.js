const { Schema, model } = require("mongoose")

const ChatMessageSchema = new Schema({
  chatId: Schema.Types.ObjectId,
  body: {
    type: String,
    required: true
  },
  timestamp: Date,
  sender: {
    type: String,
    lowercase: true,
    trim: true 
  },
  readTimes: [{
    user: {
      type: String, 
      lowercase: true,
      trim: true
    },
    timestamp: Date
  }]
})

module.exports = new model('ChatMessage', ChatMessageSchema)