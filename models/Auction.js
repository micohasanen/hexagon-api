const mongoose = require("mongoose")

const AuctionSchema = mongoose.Schema({
  collectionAddress: {
    alias: 'collectionId',
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
  owner: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    index: true
  },
  expiry: {
    type: Number,
    required: true
  },
  minBid: {
    type: Number,
    required: true
  },
  percentIncrement: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  highestBid: {
    type: Number,
    default: 0
  },
  highestBidder: {
    type: String,
    lowercase: true,
    trim: true,
    default: '0x0000000000000000000000000000000000000000'
  },
  bids: Array,
  active: {
    type: Boolean,
    default: false
  },
  ended: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

module.exports = mongoose.model('Auction', AuctionSchema)