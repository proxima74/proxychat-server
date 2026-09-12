const crypto = require("crypto");

const messages = new Map();

function addMessage(chatId, senderId, text) {
    if (!chatId || !senderId) {
        throw new Error("Missing message information");
    }

    const cleanText = String(text || "").trim();

    if (!cleanText || cleanText.length > 5000) {
        throw new Error("Invalid message");
    }

    const message = {
        id: crypto.randomUUID(),
        chatId,
        senderId,
        text: cleanText,
        timestamp: new Date().toISOString(),
        status: "sent"
    };

    if (!messages.has(chatId)) {
        messages.set(chatId, []);
    }

    messages.get(chatId).push(message);

    return message;
}

function getMessages(chatId) {
    return messages.get(chatId) || [];
}

function getMessage(messageId) {
    for (const chatMessages of messages.values()) {
        const message = chatMessages.find(
            item => item.id === messageId
        );

        if (message) {
            return message;
        }
    }

    return null;
}

module.exports = {
    addMessage,
    getMessages,
    getMessage
};
