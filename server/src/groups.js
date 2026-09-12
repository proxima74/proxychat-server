const groups = new Map();

function createGroup(creatorId, name, pfp, memberIds = []) {
    const cleanName = String(name || "").trim();

    if (!creatorId) {
        throw new Error("Creator is required");
    }

    if (!cleanName) {
        throw new Error("Group name is required");
    }

    const members = new Set(
        [creatorId, ...memberIds]
            .map(id => String(id).trim())
            .filter(Boolean)
    );

    const group = {
        id: `group_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,

        type: "group",

        name: cleanName,

        // PFP value can later become an uploaded image URL/path.
        pfp: pfp || null,

        creatorId,

        admins: [creatorId],

        members: Array.from(members),

        createdAt: Date.now(),

        updatedAt: Date.now()
    };

    groups.set(group.id, group);

    return group;
}

function getGroup(groupId) {
    return groups.get(groupId) || null;
}

function getUserGroups(userId) {
    return Array.from(groups.values())
        .filter(group => group.members.includes(userId));
}

function isGroupMember(groupId, userId) {
    const group = getGroup(groupId);

    return !!(
        group &&
        group.members.includes(userId)
    );
}

function isGroupAdmin(groupId, userId) {
    const group = getGroup(groupId);

    return !!(
        group &&
        group.admins.includes(userId)
    );
}

function addMembers(groupId, requesterId, memberIds = []) {
    const group = getGroup(groupId);

    if (!group) {
        throw new Error("Group not found");
    }

    if (!isGroupAdmin(groupId, requesterId)) {
        throw new Error("Only group admins can add members");
    }

    for (const memberId of memberIds) {
        if (!group.members.includes(memberId)) {
            group.members.push(memberId);
        }
    }

    group.updatedAt = Date.now();

    return group;
}

function removeMember(groupId, requesterId, memberId) {
    const group = getGroup(groupId);

    if (!group) {
        throw new Error("Group not found");
    }

    if (!isGroupAdmin(groupId, requesterId)) {
        throw new Error("Only group admins can remove members");
    }

    if (memberId === group.creatorId) {
        throw new Error("Group creator cannot be removed");
    }

    group.members = group.members.filter(
        id => id !== memberId
    );

    group.admins = group.admins.filter(
        id => id !== memberId
    );

    group.updatedAt = Date.now();

    return group;
}

function addAdmin(groupId, requesterId, memberId) {
    const group = getGroup(groupId);

    if (!group) {
        throw new Error("Group not found");
    }

    if (!isGroupAdmin(groupId, requesterId)) {
        throw new Error("Only group admins can add admins");
    }

    if (!group.members.includes(memberId)) {
        throw new Error("User is not a group member");
    }

    if (!group.admins.includes(memberId)) {
        group.admins.push(memberId);
    }

    group.updatedAt = Date.now();

    return group;
}

function removeAdmin(groupId, requesterId, memberId) {
    const group = getGroup(groupId);

    if (!group) {
        throw new Error("Group not found");
    }

    if (!isGroupAdmin(groupId, requesterId)) {
        throw new Error("Only group admins can remove admins");
    }

    if (memberId === group.creatorId) {
        throw new Error("Group creator must remain admin");
    }

    group.admins = group.admins.filter(
        id => id !== memberId
    );

    group.updatedAt = Date.now();

    return group;
}

function updateGroup(groupId, requesterId, data = {}) {
    const group = getGroup(groupId);

    if (!group) {
        throw new Error("Group not found");
    }

    if (!isGroupAdmin(groupId, requesterId)) {
        throw new Error("Only group admins can edit the group");
    }

    if (data.name !== undefined) {
        const name = String(data.name).trim();

        if (!name) {
            throw new Error("Group name cannot be empty");
        }

        group.name = name;
    }

    if (data.pfp !== undefined) {
        group.pfp = data.pfp || null;
    }

    group.updatedAt = Date.now();

    return group;
}

module.exports = {
    createGroup,
    getGroup,
    getUserGroups,
    isGroupMember,
    isGroupAdmin,
    addMembers,
    removeMember,
    addAdmin,
    removeAdmin,
    updateGroup
};
