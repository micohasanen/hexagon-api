const mongoose = require("mongoose")
const { Moralis } = require("../utils/Moralis")

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
  transfers: Array
}, { timestamps: true })

TokenSchema.pre('save', function (next) {
  this.collectionId = this.collectionId.toLowerCase()
  this.tokenId = parseInt(this.tokenId)

  if (this.metadata?.attributes) { 
    this.traits = this.metadata.attributes 
  }
  if (this.metadata?.name) this.name = this.metadata.name
  if (this.metadata?.image) this.image = this.metadata.image
  if (this.metadata?.description) this.description = this.metadata.description
  next()
})

module.exports = mongoose.model('Token', TokenSchema)