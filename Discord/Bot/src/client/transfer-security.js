export const MAX_DISCORD_ATTACHMENT_SIZE = 25 * 1024 * 1024;
export const MAX_INCOMING_FILES = 10;
export const MAX_INCOMING_TRANSFER_SIZE = 100 * 1024 * 1024;
export const MAX_BINARY_CHUNK_SIZE = 64_000;

const MAX_BASE64_CHUNK_LENGTH = Math.ceil(MAX_BINARY_CHUNK_SIZE / 3) * 4;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function sanitizeFileName(value, index) {
    if (typeof value !== 'string') return `arquivo-${index + 1}`;
    const sanitized = value
        .replace(/[\\/]/g, '_')
        .replace(/[\\x00-\\x1F\\x7F]/g, '')
        .trim()
        .slice(0, 255);
    return sanitized || `arquivo-${index + 1}`;
}

function sanitizeMimeType(value) {
    return typeof value === 'string' && value.length <= 127
        && /^[A-Za-z0-9.+-]+\\/[A-Za-z0-9.+-]+$/.test(value)
        ? value
        : 'application/octet-stream';
}

export function validateIncomingTransfer(message) {
    if (!message || !Array.isArray(message.header)
            || message.header.length === 0
            || message.header.length > MAX_INCOMING_FILES) {
        return { valid: false, reason: 'invalid-file-count' };
    }

    const files = [];
    let totalSize = 0;

    for (let index = 0; index < message.header.length; index += 1) {
        const item = message.header[index];
        if (!item || !Number.isSafeInteger(item.size) || item.size < 0
                || item.size > MAX_DISCORD_ATTACHMENT_SIZE) {
            return { valid: false, reason: 'invalid-file-size' };
        }

        totalSize += item.size;
        if (!Number.isSafeInteger(totalSize) || totalSize > MAX_INCOMING_TRANSFER_SIZE) {
            return { valid: false, reason: 'transfer-too-large' };
        }

        files.push({
            name: sanitizeFileName(item.name, index),
            size: item.size,
            mime: sanitizeMimeType(item.mime)
        });
    }

    if (!Number.isSafeInteger(message.totalSize) || message.totalSize !== totalSize) {
        return { valid: false, reason: 'invalid-total-size' };
    }

    return { valid: true, files, totalSize };
}

export function validateIncomingFileHeader(message, expectedFile) {
    if (!message || !expectedFile || !Number.isSafeInteger(message.size)
            || message.size !== expectedFile.size
            || message.size > MAX_DISCORD_ATTACHMENT_SIZE) {
        return false;
    }

    return true;
}

export function encodeBinaryChunk(chunk) {
    if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) {
        throw new TypeError('Binary transfer chunk must be a Buffer or Uint8Array.');
    }
    if (chunk.byteLength > MAX_BINARY_CHUNK_SIZE) {
        throw new RangeError('Binary transfer chunk exceeds the configured limit.');
    }

    return {
        type: 'ws-chunk',
        chunk: Buffer.from(chunk).toString('base64')
    };
}

export function decodeBinaryChunk(value) {
    if (typeof value !== 'string' || value.length === 0
            || value.length > MAX_BASE64_CHUNK_LENGTH
            || !BASE64_PATTERN.test(value)) {
        throw new Error('Invalid or oversized WebSocket transfer chunk.');
    }

    const chunk = Buffer.from(value, 'base64');
    if (chunk.length === 0 || chunk.length > MAX_BINARY_CHUNK_SIZE
            || chunk.toString('base64') !== value) {
        throw new Error('Invalid or oversized WebSocket transfer chunk.');
    }

    return chunk;
}

export function isTrustedDiscordAttachmentUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.hostname === 'cdn.discordapp.com'
            && (!url.port || url.port === '443')
            && !url.username
            && !url.password;
    }
    catch {
        return false;
    }
}
