const mongoose = require("mongoose")
const Token = require("../models/Token")

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
  timestamp: Date,
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

SaleSchema.post('save', function () {
  Token.findOne({ collectionId: this.collectionId, tokenId: this.tokenId }).then(function (token) {
    if (token.contractType === 'ERC721') {
      token.owner = this.buyer
      token.save()
    }
  })
})

module.exports = mongoose.model('Sale', SaleSchema)