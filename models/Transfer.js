const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")
const GetProvider = require("../utils/ChainProvider")

const TransferSchema = mongoose.Schema({
  blockTimestamp: String,
  blockNumber: Number,
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
    type: Number,
    required: true,
    index: true
  },
  signature: {
    type: String,
    index: true,
    unique: true
  },
  chain: String,
}, { timestamps: true })

TransferSchema.pre('save', async function(next) {
  this.tokenAddress = this.tokenAddress.toLowerCase()
  this.tokenId = parseInt(this.tokenId)
  if (this.blockNumber) this.blockNumber = parseInt(this.blockNumber)
  if (this.blockNumber && !this.blockTimestamp) {
    if (this.chain) {
      const { Provider } = GetProvider(this.chain)
      const details = await Provider.eth.getBlock(this.blockNumber)
      this.blockTimestamp = new Date(details.timestamp * 1000).toISOString()
    }
  }

  next()
})

TransferSchema.post('save', function() {
  TokenController.logTransfer(this)
})

module.exports = mongoose.model('Transfer', TransferSchema)