const mongoose = require("mongoose")
const Collection = require("./Collection")
const { Moralis } = require("../utils/Moralis")
const { addMetadata } = require("../queue/Queue")

const TokenSchema = mongoose.Schema({
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  collectionId: { // Collection address, not Mongo ID
    type: String,
    required: true,
    index: true
  },
  name: String,
  image: String,
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
  transfers: Array,
  listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  highestPrice: {
    type: Number,
    default: 0
  },
  lowestPrice: {
    type: Number,
    default: 0
  }
}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } })

TokenSchema.pre('save', function (next) {
  this.collectionId = this.collectionId.toLowerCase()

  if (this.metadata?.attributes) { 
    this.traits = this.metadata.attributes 
  }
  if (this.metadata?.name) this.name = this.metadata.name
  if (this.metadata?.image) this.image = this.metadata.image
  if (this.metadata?.description) this.description = this.metadata.description
  next()
})

TokenSchema.post('save', function () {
  if (!this.metadata) {
    addMetadata(this._id)
  }
})

TokenSchema.virtual('tokenCollection', {
  ref: 'Collection',
  localField: 'collectionId',
  foreignField: 'address',
  justOne: true
})

module.exports = mongoose.model('Token', TokenSchema)