const express = require("express");
const cors = require("cors");
const http = require("http");
const { createGroup, getGroup, getUserGroups, isGroupMember, isGroupAdmin, addMembers, removeMember, addAdmin, removeAdmin, updateGroup } = require("./groups");
const { Server } = require("socket.io");

const {
    createUser,
    createSession,
    getUserByToken,
    findUserByPhone,
    getUserById,
    logout
} = require("./auth");

const {
    updateProfile,
    getProfile
} = require("./users");

const {
    createOrGetChat,
    getChat,
    getUserChats
} = require("./chats");

const {
    addMessage,
    getMessages
} = require("./messages");

const {
    createTransfer,
    recordChunk,
    getTransfer,
    getMissingChunks
} = require("./files");

const {
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
    getDisplayName,
} = require("./relationships");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const token = header.slice(7);
    const user = getUserByToken(token);

    if (!user) {
        return res.status(401).json({
            error: "Invalid session"
        });
    }

    req.token = token;
    req.user = user;

    next();
}

app.get("/", (req, res) => {
    res.json({
        app: "ProxyChat",
        status: "online",
        version: "1.0.0"
    });
});

app.post("/auth/login", (req, res) => {
    try {
        const user = createUser(req.body.phone);

        res.json({
            success: true,
            message: "Verification required",
            userId: user.id
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.post("/auth/verify", (req, res) => {
    try {
        const user = createUser(req.body.phone);

        const token = createSession(user.id);

        res.json({
            success: true,
            token,
            user
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/users/search", authMiddleware, (req, res) => {
    const user = findUserByPhone(req.query.phone);

    if (!user || user.id === req.user.id) {
        return res.status(404).json({
            error: "User not found"
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            phone: user.phone,
            name: user.name
        }
    });
});

app.post("/contacts", authMiddleware, (req, res) => {
    try {
        const phone = String(req.body.phone || "").trim();

        if (!phone) {
            return res.status(400).json({
                error: "Phone number is required"
            });
        }

        const user = findUserByPhone(phone);

        if (!user || user.id === req.user.id) {
            return res.status(404).json({
                error: "ProxyChat user not found"
            });
        }

        const contact = addContact(
            req.user.id,
            user.id,
            {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                countryCode: req.body.countryCode,
                phone: user.phone
            }
        );

        res.json({
            success: true,
            contact: {
                ...contact,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/contacts", authMiddleware, (req, res) => {
    const contacts = getContacts(req.user.id).map(contact => {
        const user = findUserByPhone(contact.phone);

        return {
            ...contact,
            user: user ? {
                id: user.id,
                phone: user.phone,
                name: user.name
            } : null,
            displayName: user
                ? getDisplayName(req.user.id, user)
                : (
                    [contact.firstName, contact.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || contact.phone
                )
        };
    });

    res.json({
        success: true,
        contacts
    });
});

app.delete("/contacts/:userId", authMiddleware, (req, res) => {
    removeContact(req.user.id, req.params.userId);

    res.json({
        success: true
    });
});

app.get("/contacts/:userId", authMiddleware, (req, res) => {
    const contact = getContact(
        req.user.id,
        req.params.userId
    );

    if (!contact) {
        return res.status(404).json({
            error: "Contact not found"
        });
    }

    res.json({
        success: true,
        contact
    });
});

app.get("/relationships/:userId", authMiddleware, (req, res) => {
    res.json({
        success: true,
        relationship: getRelationship(
            req.user.id,
            req.params.userId
        )
    });
});

app.post("/blocks/:userId", authMiddleware, (req, res) => {
    try {
        blockUser(
            req.user.id,
            req.params.userId
        );

        res.json({
            success: true
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.delete("/blocks/:userId", authMiddleware, (req, res) => {
    unblockUser(
        req.user.id,
        req.params.userId
    );

    res.json({
        success: true
    });
});

app.get("/blocks", authMiddleware, (req, res) => {
    res.json({
        success: true,
        blockedUsers: getBlockedUsers(req.user.id)
    });
});

app.post("/trust/:userId", authMiddleware, (req, res) => {
    try {
        trustUser(
            req.user.id,
            req.params.userId
        );

        res.json({
            success: true
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.delete("/trust/:userId", authMiddleware, (req, res) => {
    untrustUser(
        req.user.id,
        req.params.userId
    );

    res.json({
        success: true
    });
});

app.get("/trust/:userId", authMiddleware, (req, res) => {
    res.json({
        success: true,
        trusted: isTrusted(
            req.user.id,
            req.params.userId
        )
    });
});

app.post("/profile", authMiddleware, (req, res) => {
    try {
        const user = updateProfile(req.token, req.body.name);

        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/profile", authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: getProfile(req.token)
    });
});

app.post("/auth/logout", authMiddleware, (req, res) => {
    logout(req.token);

    res.json({
        success: true
    });
});

app.post("/chats", authMiddleware, (req, res) => {
    try {
        const chat = createOrGetChat(
            req.user.id,
            req.body.userId
        );

        res.json({
            success: true,
            chat
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.post("/chats/start", authMiddleware, (req, res) => {
    try {
        const chat = createOrGetChat(
            req.user.id,
            req.body.userId
        );

        res.json({
            success: true,
            chat
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/chats", authMiddleware, (req, res) => {
    res.json({
        success: true,
        chats: getUserChats(req.user.id)
    });
});

app.get("/chats/:chatId/messages", authMiddleware, (req, res) => {
    const chat = getChat(req.params.chatId);

    if (!chat || !chat.participants.includes(req.user.id)) {
        return res.status(403).json({
            error: "Access denied"
        });
    }

    res.json({
        success: true,
        messages: getMessages(req.params.chatId)
    });
});


app.post("/groups", authMiddleware, (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const pfp = req.body.pfp || null;
        const memberIds = Array.isArray(req.body.memberIds)
            ? req.body.memberIds
            : [];

        const validMemberIds = [];

        for (const memberId of memberIds) {
            if (memberId === req.user.id) {
                continue;
            }

            if (!getContact(req.user.id, memberId)) {
                return res.status(400).json({
                    error: "You can only add saved contacts to a group"
                });
            }

            validMemberIds.push(memberId);
        }

        const group = createGroup(
            req.user.id,
            name,
            pfp,
            validMemberIds
        );

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/groups", authMiddleware, (req, res) => {
    res.json({
        success: true,
        groups: getUserGroups(req.user.id)
    });
});

app.get("/groups/:groupId", authMiddleware, (req, res) => {
    const group = getGroup(req.params.groupId);

    if (!group || !isGroupMember(group.id, req.user.id)) {
        return res.status(403).json({
            error: "Access denied"
        });
    }

    res.json({
        success: true,
        group
    });
});

app.patch("/groups/:groupId", authMiddleware, (req, res) => {
    try {
        const group = updateGroup(
            req.params.groupId,
            req.user.id,
            req.body
        );

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.post("/groups/:groupId/members", authMiddleware, (req, res) => {
    try {
        const memberIds = Array.isArray(req.body.memberIds)
            ? req.body.memberIds
            : [];

        const group = addMembers(
            req.params.groupId,
            req.user.id,
            memberIds
        );

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.delete("/groups/:groupId/members/:userId", authMiddleware, (req, res) => {
    try {
        const group = removeMember(
            req.params.groupId,
            req.user.id,
            req.params.userId
        );

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.post("/groups/:groupId/admins/:userId", authMiddleware, (req, res) => {
    try {
        const group = addAdmin(
            req.params.groupId,
            req.user.id,
            req.params.userId
        );

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.delete("/groups/:groupId/admins/:userId", authMiddleware, (req, res) => {
    try {
        const group = removeAdmin(
            req.params.groupId,
            req.user.id,
            req.params.userId
        );

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/groups/:groupId/messages", authMiddleware, (req, res) => {
    const group = getGroup(req.params.groupId);

    if (!group || !isGroupMember(group.id, req.user.id)) {
        return res.status(403).json({
            error: "Access denied"
        });
    }

    res.json({
        success: true,
        messages: getMessages(req.params.groupId)
    });
});

app.post("/files/create", authMiddleware, (req, res) => {
    try {
        const transfer = createTransfer(
            req.user.id,
            req.body.fileName,
            req.body.fileSize,
            req.body.sha256
        );

        res.json({
            success: true,
            transfer
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.post("/files/:transferId/chunk", authMiddleware, (req, res) => {
    try {
        const transfer = getTransfer(req.params.transferId);

        if (!transfer || transfer.userId !== req.user.id) {
            return res.status(403).json({
                error: "Access denied"
            });
        }

        const updated = recordChunk(
            req.params.transferId,
            Number(req.body.chunkIndex)
        );

        res.json({
            success: true,
            transfer: updated
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get("/files/:transferId", authMiddleware, (req, res) => {
    const transfer = getTransfer(req.params.transferId);

    if (!transfer || transfer.userId !== req.user.id) {
        return res.status(403).json({
            error: "Access denied"
        });
    }

    res.json({
        success: true,
        transfer
    });
});

app.get("/files/:transferId/missing", authMiddleware, (req, res) => {
    const transfer = getTransfer(req.params.transferId);

    if (!transfer || transfer.userId !== req.user.id) {
        return res.status(403).json({
            error: "Access denied"
        });
    }

    res.json({
        success: true,
        missingChunks: getMissingChunks(req.params.transferId)
    });
});

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("authenticate", (token, callback) => {
        const user = getUserByToken(token);

        if (!user) {
            if (callback) {
                callback({
                    success: false,
                    error: "Invalid session"
                });
            }
            return;
        }

        socket.userId = user.id;

        socket.join(`user:${user.id}`);

        if (callback) {
            callback({
                success: true,
                userId: user.id
            });
        }
    });

    socket.on("join_chat", (chatId, callback) => {
        if (!socket.userId) {
            return;
        }

        const chat = getChat(chatId);

        if (!chat || !chat.participants.includes(socket.userId)) {
            if (callback) {
                callback({
                    success: false,
                    error: "Access denied"
                });
            }
            return;
        }

        socket.join(`chat:${chatId}`);

        if (callback) {
            callback({
                success: true
            });
        }
    });

    socket.on("send_message", (data, callback) => {
        try {
            if (!socket.userId) {
                throw new Error("Not authenticated");
            }

            const chat = getChat(data.chatId);

            if (!chat || !chat.participants.includes(socket.userId)) {
                throw new Error("Access denied");
            }

            const recipientId = chat.participants.find(
                id => id !== socket.userId
            );

            if (!recipientId) {
                throw new Error("Recipient not found");
            }

            // Blocking is directional and pair-specific.
            // If the recipient blocked the sender, the recipient
            // must receive nothing.
            if (isBlocked(recipientId, socket.userId)) {
                const blockedMessage = {
                    id: `msg_${Date.now()}_${Math.random()
                        .toString(36)
                        .slice(2, 8)}`,
                    chatId: data.chatId,
                    senderId: socket.userId,
                    text: String(data.text || ""),
                    createdAt: Date.now(),
                    deliveryStatus: "sent",
                    blockedByRecipient: true
                };

                // Only the sender receives this status.
                // The blocked recipient gets no message event.
                socket.emit(
                    "message_status",
                    blockedMessage
                );

                if (callback) {
                    callback({
                        success: true,
                        blocked: true,
                        deliveryStatus: "sent",
                        message: blockedMessage
                    });
                }

                return;
            }

            const message = addMessage(
                data.chatId,
                socket.userId,
                data.text
            );

            io.to(`chat:${data.chatId}`).emit(
                "receive_message",
                message
            );

            if (callback) {
                callback({
                    success: true,
                    blocked: false,
                    deliveryStatus: "delivered",
                    message
                });
            }
        } catch (error) {
            if (callback) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        }
    });

    socket.on("join_group", (groupId, callback) => {
        if (!socket.userId) {
            return;
        }

        const group = getGroup(groupId);

        if (!group || !isGroupMember(groupId, socket.userId)) {
            if (callback) {
                callback({
                    success: false,
                    error: "Access denied"
                });
            }
            return;
        }

        socket.join(`group:${groupId}`);

        if (callback) {
            callback({
                success: true,
                groupId
            });
        }
    });

    socket.on("send_group_message", (data, callback) => {
        try {
            if (!socket.userId) {
                throw new Error("Not authenticated");
            }

            const group = getGroup(data.groupId);

            if (!group || !isGroupMember(data.groupId, socket.userId)) {
                throw new Error("Access denied");
            }

            const text = String(data.text || "").trim();

            if (!text) {
                throw new Error("Message cannot be empty");
            }

            const message = addMessage(
                data.groupId,
                socket.userId,
                text
            );

            const sender = getUserById(socket.userId);

            const notificationMessage = {
                ...message,
                groupId: group.id,
                groupName: group.name,
                senderName:
                    sender && sender.name
                        ? sender.name
                        : "Unknown"
            };

            for (const memberId of group.members) {
                if (memberId === socket.userId) continue;
                if (isBlocked(memberId, socket.userId)) {
                    continue;
                }

                io.to(`user:${memberId}`).emit(
                    "receive_group_message",
                    notificationMessage
                );
            }

            if (callback) {
                callback({
                    success: true,
                    message
                });
            }
        } catch (error) {
            if (callback) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

const PORT = 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`ProxyChat server running on port ${PORT}`);
});
