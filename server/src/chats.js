const crypto = require("crypto");

const chats = new Map();

function getChatKey(userA, userB) {
    return [userA, userB].sort().join(":");
}

function createOrGetChat(userA, userB) {
    if (!userA || !userB || userA === userB) {
        throw new Error("Invalid chat participants");
    }

    const key = getChatKey(userA, userB);

    if (!chats.has(key)) {
        chats.set(key, {
            id: crypto.randomUUID(),
            participants: [userA, userB],
            createdAt: new Date().toISOString()
        });
    }

    return chats.get(key);
}

function getChat(chatId) {
    for (const chat of chats.values()) {
        if (chat.id === chatId) {
            return chat;
        }
    }

    return null;
}

function getUserChats(userId) {
    const result = [];

    for (const chat of chats.values()) {
        if (chat.participants.includes(userId)) {
            result.push(chat);
        }
    }

    return result;
}

module.exports = {
    createOrGetChat,
    getChat,
    getUserChats
};
