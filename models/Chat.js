const { Schema, model } = require("mongoose")

const ChatMessageSchema = Schema({
    chatId: {
        type: Schema.Types.ObjectId, 
        ref: 'Chat',
        required: true,
        lowercase: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    senderId: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        lowercase: true,
        trim: true
    },
    receiverId: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        lowercase: true,
        trim: true
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

const ChatSchema = Schema({
    usersIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
    isRequest: {
        type: Boolean,
        default: true
    },
    isAccepted: {
        type: Boolean,
        default: null // true - means accepted, null - for newly created chat request, false - declined
    },
    creatorId: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        lowercase: true,
        trim: true
    }

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

module.exports = {
    Chat: model("Chat", ChatSchema),
    ChatMessage: model("ChatMessage", ChatMessageSchema),
}