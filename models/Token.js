const mongoose = require("mongoose")
const { addMetadata } = require("../queue/Queue")
const Comment = require("./Comment")

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
  name: {
    type: String, 
    index: true
  },
  image: { 
    type: String,
    index: true
  },
  imageHosted: {
    type: String, 
    index: true
  },
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
  rarity: {
    type: Number,
    index: true
  },
  rarityRank: Number,
  transfers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' }],
  listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  bids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bid' }],
  auctions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Auction' }],
  highestPrice: {
    type: Number,
    default: 0,
    index: true
  },
  lowestPrice: {
    type: Number,
    default: 0,
    index: true
  },
  highestBid: {
    type: Number,
    default: 0,
    index: true
  },
  lowestBid: {
    type: Number,
    default: 0,
    index: true
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
  lastSoldAt: { 
    type: Date, 
    index: true
  },
  lastSalePrice: { 
    type: Number
  },
  lastListedAt: {
    type: Date,
    index: true 
  },
  tokenHash: {
    type: String,
    unique: true,
    index: true
  },
  chain: String,
  likes: {
    count: {
     type: Number,
     default: 0
   }
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

TokenSchema.post('find', function (results) {
  results.forEach((result) => {
    if (!result.imageHosted) {
      addMetadata(result._id)
    }
  })
})

TokenSchema.virtual('tokenCollection', {
  ref: 'Collection',
  localField: 'collectionId',
  foreignField: 'address',
  justOne: true
})

TokenSchema.virtual('comments').get(async function () {
  const query = {
    collectionId: this.collectionId,
    tokenId: this.tokenId,
  };

  const total = await Comment.countDocuments(query)
  return {
    total
  }
});

TokenSchema.index({ name: 'text' })

module.exports = mongoose.model('Token', TokenSchema)