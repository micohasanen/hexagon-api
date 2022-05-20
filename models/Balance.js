const mongoose = require("mongoose")

const BalanceSchema = mongoose.Schema({
  address: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  collectionId: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  chain: {
    type: String,
    index: true
  },
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    default: 0,
    index: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Balance', BalanceSchema)