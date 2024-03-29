const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")
const GetProvider = require("../utils/ChainProvider")
const Listing = require("./Listing")

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
      const { Provider } = await GetProvider(this.chain)
      const details = await Provider.eth.getBlock(this.blockNumber)
      if (details) this.blockTimestamp = new Date(details.timestamp * 1000).toISOString()
    }
  }

  next()
})

TransferSchema.post('save', async function () {
  console.log("Transfer Saved for", this.tokenId)
  TokenController.logTransfer(this)

  // Remove all listings on transfer
  const listings = await Listing.find({
    collectionId: this.tokenAddress,
    tokenId: this.tokenId,
    userAddress: this.fromAddress,
    active: true
  })
  
  for (const listing of listings) {
   // console.log(listing)
    listing.active = false
    await listing.save()
  }
})

module.exports = mongoose.model('Transfer', TransferSchema)