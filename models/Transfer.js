const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")

const TransferSchema = mongoose.Schema({
  blockTimestamp: String,
  contractType: String,
  transactionType: String,
  value: String,
  amount: String,
  transactionHash: {
    type: String
  },
  tokenAddress: {
    type: String,
    required: true,
    index: true
  },
  fromAddress: String,
  toAddress: String,
  tokenId: {
    type: String,
    required: true,
    index: true
  },
  signature: {
    type: String,
    index: true,
    unique: true
  }
}, { timestamps: true })

TransferSchema.pre('save', function(next) {
  this.token_address = this.tokenAddress.toLowerCase()
  next()
})

TransferSchema.post('save', function() {
  TokenController.logTransfer(this)
})

module.exports = mongoose.model('Transfer', TransferSchema)