const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")
const GetProvider = require("../utils/ChainProvider")
const { addMetadata } = require("../queue/Queue")

const TransferSchema = mongoose.Schema({
  blockTimestamp: {
    type: Date,
    index: true
  },
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
    index: true,
    lowercase: true,
    trim: true
  },
  fromAddress: { 
    type: String, 
    lowercase: true,
    trim: true,
    required: true,
    index: true
  },
  toAddress: {
    type: String, 
    lowercase: true,
    trim: true,
    required: true,
    index: true
  },
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
  contractType: String
}, { timestamps: true })

TransferSchema.pre('save', async function(next) {
  if (this.blockNumber) this.blockNumber = parseInt(this.blockNumber)
  if (this.blockNumber && !this.blockTimestamp) {
    if (this.chain) {
      const { Provider } = GetProvider(this.chain)
      const details = await Provider.eth.getBlock(this.blockNumber)
      if (details) this.blockTimestamp = new Date(details.timestamp * 1000).toISOString()
    }
  }

  next()
})

TransferSchema.post('save', function() {
  TokenController.logTransfer(this).then((token) => {
    if (!token.metadata) addMetadata(token._id)
  })
})

module.exports = mongoose.model('Transfer', TransferSchema)