const { Chat, ChatMessage } = require("../models/Chat")
const User = require("../models/User")

function throwBadPayload() {
    throw new Error('Bad Payload')
}

exports.createChatRequest = async (data) => {
    if (!data.senderAddress || !data.receiverAddress) {
        throwBadPayload();
    }

    const sender = await User.findOne({ address: senderAddress });
    const receiver = await User.findOne({ address: data.receiverAddress });

    if (!sender || !receiver) {
        throwBadPayload();
    }

    const chatRequest = new Chat({
        creatorId: sender._id,
        usersIds: [sender._id, receiver._id]
    });

    await chatRequest.save();
    return Promise.resolve(chatRequest);
}

exports.acceptChatRequest = async (data) => {
    if (!data.chatId) {
        throwBadPayload();
    }

    const chatRequest = await Chat.findOne({ _id: data.chatId })

    if (!chatRequest) {
        throw new Error('No chat request with such identifier :(')
    }

    chatRequest.isRequest = false;
    chatRequest.isAccepted = true;

    await chatRequest.save();
    return Promise.resolve(chatRequest);
}

exports.declineChatRequest = async (data) => {
    if (!data.chatId) {
        throwBadPayload();
    }

    const chatRequest = await Chat.findOne({ _id: data.chatId })

    if (!chatRequest) {
        throw new Error('No chat request with such identifier :(')
    }

    chatRequest.isAccepted = false;

    await chatRequest.save();
    return Promise.resolve(chatRequest);
}

exports.writeMessage = async (data) => {
    if (!data.body || !data.senderId || !data.receiverId || !data.chatId) {
        throwBadPayload();
    }

    const sender = await User.findById(data.senderId);
    const receiver = await User.findOne(data.receiverId);
    const chat = await Chat.findOne(data.chatId);

    if (!sender || !receiver || !chat) {
        throwBadPayload();
    }

    const message = new ChatMessage({
        ...data,
        readBy: [data.senderId]
    })

    await message.save();
    return Promise.resolve(message)
}

exports.markMessageRead = async (data) => {
    if (!data.messageId || !data.userId) {
        throwBadPayload();
    }

    const message = await ChatMessage.findById(data.messageId);

    message.readBy.push(data.userId);

    await message.save();
    return Promise.resolve(message);
}