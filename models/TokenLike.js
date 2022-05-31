const mongoose = require("mongoose")


const TokenLikeSchema = mongoose.Schema({
    userAddress: {
        type: String,
        required: true,
        unique: false,
        index: true,
        lowercase: true,
        trim: true
    },
    collectionId: {
        type: String,
        required: true,
        unique: false,
        index: true
    },
    tokenId: {
        type: Number,
        required: true,
        unique: false,
        index: true,
        lowercase: false,
        trim: false
    }
}, { timestamps: true })

//TokenLikesSchema.index({ user_address: 'text' })

module.exports = mongoose.model('TokenLike', TokenLikeSchema)