const { Schema, model } = require("mongoose")

const ChatSchema = new Schema({
  name: String,
  userIds: [{
    type: String,
    index: true,
    lowercase: true,
    trim: true
  }],
  creatorId: {
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  messages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }]
}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } })

ChatSchema.virtual('users', {
  ref: 'User',
  localField: 'userIds',
  foreignField: 'address'
})

module.exports = new model('Chat', ChatSchema)
