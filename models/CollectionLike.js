
const mongoose = require("mongoose")


const CollectionLikeSchema = mongoose.Schema({
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
    }
}, { timestamps: true })

module.exports = mongoose.model('CollectionLike', CollectionLikeSchema)