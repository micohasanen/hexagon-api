const { Schema, model } = require("mongoose")

const CommentSchema = new Schema({
  message: { 
    type: String, 
    required: true
  },
  timestamp: Date,
  collectionId: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  tokenId: {
    type: Number,
    index: true,
    default: null
  },
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

CommentSchema.virtual('user', {
  ref: 'User',
  localField: 'userAddress',
  foreignField: 'address',
  justOne: true
})

module.exports = model('Comment', CommentSchema)