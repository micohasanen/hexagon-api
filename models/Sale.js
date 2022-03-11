const mongoose = require("mongoose")
const Token = require("../models/Token")
const { addMetadata } = require("../queue/Queue")
const Collection = require("./Collection")

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
  ownerRevenue: Number
}, { timestamps: true })

SaleSchema.post('save', async function () {
  const token = await Token.findOne({ collectionId: this.collectionId, tokenId: this.tokenId })
  token.lastSoldAt = this.timestamp
  token.lastSalePrice = this.value
  token.save()

  addMetadata(token._id)

  const collection = await Collection.findOne({ address: this.collectionId })
  collection.volume.total += this.value
  collection.sales.total += 1
  collection.save()
})

module.exports = mongoose.model('Sale', SaleSchema)