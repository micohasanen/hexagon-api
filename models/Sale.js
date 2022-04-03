const mongoose = require("mongoose")
const { addMetadata } = require("../queue/Queue")

// Models
const Token = require("./Token")
const Collection = require("./Collection")
const User = require("./User")

const SaleSchema = mongoose.Schema({
  collectionId: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
    alias: 'contractAddress'
  },
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  saleType: String,
  timestamp: { 
    type: Date, 
    index: true,
    required: true
  },
  seller: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
    alias: 'owner'
  },
  buyer: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true
  },
  value: {
    type: Number,
    required: true
  },
  marketplaceFee: Number,
  creatorFee: Number,
  ownerRevenue: Number,
  blockNumber: Number,
  blockTimestamp: Date,
  transactionHash: String
}, { timestamps: true })

SaleSchema.post('save', async function () {
  const token = await Token.findOne({ collectionId: this.collectionId, tokenId: this.tokenId })
  token.lastSoldAt = this.timestamp
  token.lastSalePrice = this.value
  token.save()

  addMetadata(token._id)

  await Collection.updateOne({ address: this.collectionId }, {
    $inc: { "volume.total": this.value, "sales.total": 1 }
  })

  await User.updateOne({ address: this.seller }, {
    $inc: { "volume.total": this.value, "sales.total": 1 }
  }, { upsert: true })

  await User.updateOne({ address: this.buyer }, {
    $inc: { "volume.total": this.value, "sales.total": 1 }
  }, { upsert: true })
})

module.exports = mongoose.model('Sale', SaleSchema)