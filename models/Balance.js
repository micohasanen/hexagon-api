const mongoose = require("mongoose")
const crypto = require("crypto")

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
  },
  hash: { 
    type: String,
    unique: true
  }
}, { timestamps: true })

BalanceSchema.pre('save', function () {
  if (!this.hash) {
    const hash = crypto.createHash('sha256')
    hash.update(`${this.address}:${this.collectionId}:${this.tokenId}`)
    this.hash = hash.digest('hex')
  }
})

module.exports = mongoose.model('Balance', BalanceSchema)