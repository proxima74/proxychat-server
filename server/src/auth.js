const crypto = require("crypto");

const users = new Map();
const sessions = new Map();

function normalizePhone(phone) {
    let value = String(phone || "").trim();

    value = value.replace(/[^\d+]/g, "");

    if (value.startsWith("00")) {
        value = "+" + value.substring(2);
    }

    if (value.startsWith("+")) {
        value = value.substring(1);
    }

    value = value.replace(/\D/g, "");

    /*
     * Pakistan local format:
     *
     * 03116023852
     * 3116023852
     *
     * Both become:
     * 923116023852
     */
    if (value.startsWith("0")) {
        value = value.substring(1);
    }

    /*
     * If a Pakistan number is supplied locally,
     * add Pakistan country code.
     */
    if (
        value.length >= 10 &&
        value.length <= 11 &&
        !value.startsWith("92")
    ) {
        value = "92" + value;
    }

    return value;
}

function createUser(phone) {
    const normalizedPhone =
        normalizePhone(phone);

    if (
        !normalizedPhone ||
        normalizedPhone.length < 7
    ) {
        throw new Error(
            "Invalid phone number"
        );
    }

    if (users.has(normalizedPhone)) {
        return users.get(normalizedPhone);
    }

    const user = {
        id: crypto.randomUUID(),
        phone: normalizedPhone,
        name: "",
        createdAt:
            new Date().toISOString()
    };

    users.set(
        normalizedPhone,
        user
    );

    return user;
}

function createSession(userId) {
    const token =
        crypto.randomBytes(32).toString("hex");

    sessions.set(
        token,
        {
            userId,
            createdAt: Date.now()
        }
    );

    return token;
}

function getUserByToken(token) {
    const session =
        sessions.get(token);

    if (!session) {
        return null;
    }

    for (
        const user of users.values()
    ) {
        if (
            user.id === session.userId
        ) {
            return user;
        }
    }

    return null;
}

function findUserByPhone(phone) {
    const normalizedPhone =
        normalizePhone(phone);

    return (
        users.get(normalizedPhone) ||
        null
    );
}

function getUserById(userId) {
    for (
        const user of users.values()
    ) {
        if (
            user.id === userId
        ) {
            return user;
        }
    }

    return null;
}

function logout(token) {
    sessions.delete(token);
}

module.exports = {
    normalizePhone,
    createUser,
    createSession,
    getUserByToken,
    findUserByPhone,
    getUserById,
    logout
};
