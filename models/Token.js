const mongoose = require("mongoose")

const TokenSchema = mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    index: true
  },
  collectionId: { // Collection address, not Mongo ID
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  traits: {
    type: Array, 
    index: true
  },
  transfers: Array
}, { timestamps: true })

TokenSchema.pre('save', function (next) {
  this.collectionId = this.collectionId.toLowerCase()
  if (this.metadata?.attributes) {
    this.traits = this.metadata.attributes
  }
  next()
})

module.exports = mongoose.model('Token', TokenSchema)