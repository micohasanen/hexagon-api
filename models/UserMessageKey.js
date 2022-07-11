const { Schema, model } = require("mongoose")

const UserMessageKeySchema = new Schema({
    userAddress: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },
    preKeyBundle: {
        type: Object,
        required: true
    }
});

UserMessageKeySchema.virtual('user', {
    ref: 'User',
    localField: 'userAddress',
    foreignField: 'address',
    justOne: true
})

module.exports = model('UserMessageKey', UserMessageKeySchema)