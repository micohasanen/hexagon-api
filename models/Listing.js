const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")
const Token = require("./Token")

const ListingSchema = mongoose.Schema({
  contractAddress: {
    type: String,
    required: true,
    alias: 'collectionId',
    lowercase: true,
    trim: true,
    index: true
  },
  userAddress: {
    type: String,
    required: true,
    alias: 'owner',
    lowercase: true,
    trim: true,
    index: true
  },
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true
  },
  pricePerItem: {
    type: Number, // <- We allow BigNumbers to be stored
    required: true
  },
  expiry: {
    type: Number,
    required: true
  },
  nonce: {
    type: Number,
    required: true,
    index: true
  },
  r: {
    type: String,
    required: true
  },
  s: {
    type: String,
    required: true
  },
  v: {
    type: Number,
    required: true
  },
  chain: String,
  active: {
    type: Boolean,
    default: true
  },
  canceled: {
    type: Boolean,
    default: false
  },
  accepted: {
    type: Boolean,
    default: false
  },
  blockNumber: Number,
  blockTimestamp: Date,
  transactionHash: {
    type: String,
    lowercase: true,
    trim: true
  }
}, { timestamps: true })

ListingSchema.post('save', function () {
  TokenController.logListing(this)
})

module.exports = mongoose.model('Listing', ListingSchema)