const contacts = new Map();
const blocked = new Map();
const trusted = new Map();

function contactKey(ownerId, contactId) {
    return `${ownerId}:${contactId}`;
}

function blockKey(blockerId, blockedId) {
    return `${blockerId}:${blockedId}`;
}

function addContact(ownerId, contactId, data = {}) {
    if (!ownerId || !contactId || ownerId === contactId) {
        throw new Error("Invalid contact");
    }

    const key = contactKey(ownerId, contactId);

    const contact = {
        ownerId,
        contactId,
        firstName: String(data.firstName || "").trim(),
        lastName: String(data.lastName || "").trim(),
        countryCode: String(data.countryCode || "").trim(),
        phone: String(data.phone || "").trim(),
        createdAt: Date.now()
    };

    contacts.set(key, contact);

    return contact;
}

function getContacts(ownerId) {
    return Array.from(contacts.values())
        .filter(contact => contact.ownerId === ownerId);
}

function getContact(ownerId, contactId) {
    return contacts.get(contactKey(ownerId, contactId)) || null;
}

function removeContact(ownerId, contactId) {
    contacts.delete(contactKey(ownerId, contactId));
}

function blockUser(blockerId, blockedId) {
    if (!blockerId || !blockedId || blockerId === blockedId) {
        throw new Error("Invalid block request");
    }

    blocked.set(blockKey(blockerId, blockedId), {
        blockerId,
        blockedId,
        createdAt: Date.now()
    });

    return true;
}

function unblockUser(blockerId, blockedId) {
    blocked.delete(blockKey(blockerId, blockedId));
}

function isBlocked(blockerId, blockedId) {
    return blocked.has(blockKey(blockerId, blockedId));
}

function getBlockedUsers(blockerId) {
    return Array.from(blocked.values())
        .filter(item => item.blockerId === blockerId)
        .map(item => item.blockedId);
}

function trustUser(ownerId, otherUserId) {
    if (!ownerId || !otherUserId || ownerId === otherUserId) {
        throw new Error("Invalid trust request");
    }

    trusted.set(contactKey(ownerId, otherUserId), {
        ownerId,
        otherUserId,
        trustedAt: Date.now()
    });

    return true;
}

function untrustUser(ownerId, otherUserId) {
    trusted.delete(contactKey(ownerId, otherUserId));
}

function isTrusted(ownerId, otherUserId) {
    return trusted.has(contactKey(ownerId, otherUserId));
}

function getRelationship(ownerId, otherUserId) {
    return {
        isContact: !!getContact(ownerId, otherUserId),
        isBlockedByMe: isBlocked(ownerId, otherUserId),
        isBlockedByThem: isBlocked(otherUserId, ownerId),
        isTrusted: isTrusted(ownerId, otherUserId)
    };
}

function getDisplayName(ownerId, user) {
    const contact = getContact(ownerId, user.id);

    if (!contact) {
        return user.name || user.phone || "Unknown";
    }

    const savedName = [
        contact.firstName,
        contact.lastName
    ].filter(Boolean).join(" ").trim();

    if (savedName) {
        return savedName;
    }

    return user.name || user.phone || "Unknown";
}

module.exports = {
    addContact,
    getContacts,
    getContact,
    removeContact,

    blockUser,
    unblockUser,
    isBlocked,
    getBlockedUsers,

    trustUser,
    untrustUser,
    isTrusted,

    getRelationship,
    getDisplayName
};
