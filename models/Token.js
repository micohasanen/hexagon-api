const mongoose = require("mongoose")
const Auction = require("./Auction")

const TokenSchema = mongoose.Schema({
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  collectionId: { // Collection address, not Mongo ID
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true
  },
  name: String,
  image: String,
  imageHosted: String,
  description: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  tokenUri: {
    type: String
  },
  traits: {
    type: Array, 
    index: true
  },
  rarity: Number,
  rarityRank: Number,
  transfers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' }],
  listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  bids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bid' }],
  auctions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Auction' }],
  highestPrice: {
    type: Number,
    default: 0
  },
  lowestPrice: {
    type: Number,
    default: 0
  },
  highestBid: {
    type: Number,
    default: 0
  },
  lowestBid: {
    type: Number,
    default: 0
  },
  highestBidder: {
    type: String,
    lowercase: true,
    trim: true
  },
  contractType: String,
  owner: {
    type: String,
    lowercase: true,
    trim: true
  },
  lastSoldAt: Date,
  lastSalePrice: { 
    type: Number
  }
}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } })

TokenSchema.pre('save', function (next) {
  if (this.metadata?.attributes?.length && !this.traits?.length) { 
    this.traits = this.metadata.attributes 
  }
  if (this.metadata?.name) this.name = this.metadata.name
  if (this.metadata?.image) this.image = this.metadata.image
  if (this.metadata?.description) this.description = this.metadata.description

  next()
})

TokenSchema.virtual('tokenCollection', {
  ref: 'Collection',
  localField: 'collectionId',
  foreignField: 'address',
  justOne: true
})

TokenSchema.methods.syncAuctions = async function () {
  const auctions = await Auction.find({ 
    active: true,
    collectionAddress: this.collectionId,
    tokenId: this.tokenId
  }).distinct('_id')

  if (auctions?.length) { 
    this.auctions = auctions 
    await this.save()
  }

  return true
}

module.exports = mongoose.model('Token', TokenSchema)