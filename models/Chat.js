const { Schema, model } = require("mongoose")

const ChatSchema = new Schema({
  users: [{
    type: String,
    index: true,
    lowercase: true,
    trim: true
  }],
  messages: [{
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
  }]
}, { timestamps: true })

module.exports = new model('Chat', ChatSchema)
