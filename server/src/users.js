const { createUser, getUserByToken } = require("./auth");

function updateProfile(token, name) {
    const user = getUserByToken(token);

    if (!user) {
        throw new Error("Unauthorized");
    }

    const cleanName = String(name || "").trim();

    if (cleanName.length < 2 || cleanName.length > 50) {
        throw new Error("Name must be between 2 and 50 characters");
    }

    user.name = cleanName;

    return user;
}

function getProfile(token) {
    const user = getUserByToken(token);

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user;
}

function findUserByPhone(phone, usersMap) {
    const normalizedPhone = String(phone || "").replace(/\D/g, "");

    if (!normalizedPhone) {
        return null;
    }

    return usersMap.get(normalizedPhone) || null;
}

module.exports = {
    createUser,
    updateProfile,
    getProfile,
    findUserByPhone
};
