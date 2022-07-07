const { Schema, model } = require("mongoose")

const ChatMessageSchema = Schema({
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
})

const ChatSchema = Schema({
    usersIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
})

const ChatRequestSchema = Schema({
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
    messages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
    isAccepted: {
        type: Boolean,
        default: null
    }
})

module.exports = {
    Chat: model("Chat", ChatSchema),
    ChatMessage: model("ChatMessage", ChatMessageSchema),
    ChatRequest: model("ChatRequest", ChatRequestSchema)
}