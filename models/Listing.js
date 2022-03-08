const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")
const Token = require("./Token")

const ListingSchema = mongoose.Schema({
  collectionId: {
    type: String,
    required: true,
    alias: 'contractAddress',
    lowercase: true,
    trim: true
  },
  owner: {
    type: String,
    required: true,
    alias: 'userAddress',
    lowercase: true,
    trim: true
  },
  tokenId: {
    type: Number,
    required: true
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
    required: true
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
  }
}, { timestamps: true })

ListingSchema.pre('save', function (next) {
  this.tokenId = parseInt(this.tokenId)
  next()
})

ListingSchema.post('save', function () {
  if (this.active) TokenController.addListing(this)
  else TokenController.removeListing(this)
})

module.exports = mongoose.model('Listing', ListingSchema)