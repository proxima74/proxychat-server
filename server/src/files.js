const crypto = require("crypto");

const transfers = new Map();

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const CHUNK_SIZE = 1024 * 1024; // 1 MB

function createTransfer(userId, fileName, fileSize, sha256) {
    if (!userId) {
        throw new Error("Unauthorized");
    }

    const size = Number(fileSize);

    if (!Number.isSafeInteger(size) || size <= 0) {
        throw new Error("Invalid file size");
    }

    if (size > MAX_FILE_SIZE) {
        throw new Error("File is too large");
    }

    if (!fileName || String(fileName).length > 255) {
        throw new Error("Invalid file name");
    }

    if (!/^[a-fA-F0-9]{64}$/.test(String(sha256 || ""))) {
        throw new Error("Invalid SHA-256 hash");
    }

    const transfer = {
        id: crypto.randomUUID(),
        userId,
        fileName: String(fileName),
        fileSize: size,
        sha256: String(sha256).toLowerCase(),
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(size / CHUNK_SIZE),
        receivedChunks: new Set(),
        status: "created",
        createdAt: new Date().toISOString()
    };

    transfers.set(transfer.id, transfer);

    return {
        id: transfer.id,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
        chunkSize: transfer.chunkSize,
        totalChunks: transfer.totalChunks,
        status: transfer.status
    };
}

function recordChunk(transferId, chunkIndex) {
    const transfer = transfers.get(transferId);

    if (!transfer) {
        throw new Error("Transfer not found");
    }

    if (
        !Number.isInteger(chunkIndex) ||
        chunkIndex < 0 ||
        chunkIndex >= transfer.totalChunks
    ) {
        throw new Error("Invalid chunk index");
    }

    transfer.receivedChunks.add(chunkIndex);
    transfer.status = "uploading";

    if (transfer.receivedChunks.size === transfer.totalChunks) {
        transfer.status = "ready_for_verification";
    }

    return getTransfer(transferId);
}

function getTransfer(transferId) {
    const transfer = transfers.get(transferId);

    if (!transfer) {
        return null;
    }

    return {
        id: transfer.id,
        userId: transfer.userId,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
        sha256: transfer.sha256,
        chunkSize: transfer.chunkSize,
        totalChunks: transfer.totalChunks,
        receivedChunks: Array.from(transfer.receivedChunks).sort(
            (a, b) => a - b
        ),
        status: transfer.status,
        createdAt: transfer.createdAt
    };
}

function getMissingChunks(transferId) {
    const transfer = transfers.get(transferId);

    if (!transfer) {
        throw new Error("Transfer not found");
    }

    const missing = [];

    for (let i = 0; i < transfer.totalChunks; i++) {
        if (!transfer.receivedChunks.has(i)) {
            missing.push(i);
        }
    }

    return missing;
}

module.exports = {
    createTransfer,
    recordChunk,
    getTransfer,
    getMissingChunks,
    CHUNK_SIZE,
    MAX_FILE_SIZE
};
