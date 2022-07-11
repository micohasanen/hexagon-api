const { Schema, model } = require("mongoose")

const ErrorSchema = new Schema({
  error: { 
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
  sourceId: {
    type: String,
    index: true,
    default: null
  }
}, { timestamps: true })



module.exports = model('Error', ErrorSchema)