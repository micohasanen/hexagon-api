const mongoose = require("mongoose")


const TokenLikesSchema = mongoose.Schema({
    user_address: {
        type: String,
        required: true,
        unique: false,
        index: true,
        lowercase: true,
        trim: true
    },
    collection_id: {
        type: String,
        required: true,
        unique: false,
        index: true,
        lowercase: true,
        trim: true
    },
    token_id: {
        type: String,
        required: true,
        unique: false,
        index: true,
        lowercase: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        required: true,
        unique: false,
        index: true,
        lowercase: true,
        trim: true
    }
}, { timestamps: true })

//TokenLikesSchema.index({ user_address: 'text' })

module.exports = mongoose.model('TokenLikes', TokenLikesSchema)