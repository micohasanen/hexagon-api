const { Schema, model } = require("mongoose")

const ChatMessageSchema = new Schema({
  chatId: Schema.Types.ObjectId,
  body: {
    type: Object,
    required: true
  },
  /*
    Example Body:
    {
      '0x8909d377be96e7288228b97a1133480444e00bfc': 'encrypted message for this address',
      '0x71c7656ec7ab88b098defb751b7401b5f6d8976f': 'encrypted message for another address'
    }
  */
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

ChatMessageSchema.virtual('chat', {
  ref: 'Chat',
  localField: 'chatId',
  foreignField: '_id',
  justOne: true
})

module.exports = new model('ChatMessage', ChatMessageSchema)