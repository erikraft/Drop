import assert from 'node:assert/strict';
import test from 'node:test';
import {
    MAX_BINARY_CHUNK_SIZE,
    MAX_DISCORD_ATTACHMENT_SIZE,
    MAX_INCOMING_FILES,
    decodeBinaryChunk,
    encodeBinaryChunk,
    isTrustedDiscordAttachmentUrl,
    validateIncomingFileHeader,
    validateIncomingTransfer
} from '../src/client/transfer-security.js';

test('accepts a well-formed transfer within file and aggregate limits', () => {
    const result = validateIncomingTransfer({
        totalSize: 5,
        header: [{ name: 'note.txt', size: 5, mime: 'text/plain' }]
    });

    assert.equal(result.valid, true);
    assert.equal(result.totalSize, 5);
    assert.deepEqual(result.files, [{ name: 'note.txt', size: 5, mime: 'text/plain' }]);
});

test('rejects invalid file counts, unsafe sizes, and aggregate size mismatches', () => {
    assert.equal(validateIncomingTransfer({ totalSize: 0, header: [] }).valid, false);
    assert.equal(validateIncomingTransfer({
        totalSize: 0,
        header: Array.from({ length: MAX_INCOMING_FILES + 1 }, () => ({ name: 'x', size: 0 }))
    }).valid, false);
    assert.equal(validateIncomingTransfer({
        totalSize: Number.MAX_SAFE_INTEGER + 1,
        header: [{ name: 'x', size: 1 }]
    }).valid, false);
    assert.equal(validateIncomingTransfer({
        totalSize: 2,
        header: [{ name: 'x', size: 1 }]
    }).valid, false);
});

test('rejects files above Discord per-attachment and aggregate limits', () => {
    assert.equal(validateIncomingTransfer({
        totalSize: MAX_DISCORD_ATTACHMENT_SIZE + 1,
        header: [{ name: 'large.bin', size: MAX_DISCORD_ATTACHMENT_SIZE + 1 }]
    }).valid, false);

    const tooLarge = Array.from({ length: 5 }, (_, index) => ({
        name: `file-${index}.bin`,
        size: MAX_DISCORD_ATTACHMENT_SIZE
    }));
    assert.equal(validateIncomingTransfer({
        totalSize: tooLarge.reduce((sum, file) => sum + file.size, 0),
        header: tooLarge
    }).valid, false);
});

test('requires each incoming file header to match its validated request', () => {
    const expected = { name: 'safe.txt', size: 12, mime: 'text/plain' };
    assert.equal(validateIncomingFileHeader({ size: 12 }, expected), true);
    assert.equal(validateIncomingFileHeader({ size: 13 }, expected), false);
    assert.equal(validateIncomingFileHeader({ size: Number.MAX_SAFE_INTEGER + 1 }, expected), false);
});

test('encodes and decodes bounded WebSocket binary chunks', () => {
    const original = Buffer.alloc(MAX_BINARY_CHUNK_SIZE, 0x41);
    const encoded = encodeBinaryChunk(original);
    assert.equal(encoded.type, 'ws-chunk');
    assert.deepEqual(decodeBinaryChunk(encoded.chunk), original);
    assert.throws(() => encodeBinaryChunk(Buffer.alloc(MAX_BINARY_CHUNK_SIZE + 1)), /limit/);
    assert.throws(() => decodeBinaryChunk('not base64!'), /Invalid/);
    assert.throws(() => decodeBinaryChunk('A'.repeat(100_000)), /Invalid/);
});

test('only accepts HTTPS URLs on the Discord attachment CDN', () => {
    assert.equal(isTrustedDiscordAttachmentUrl('https://cdn.discordapp.com/attachments/1/2/file.bin'), true);
    assert.equal(isTrustedDiscordAttachmentUrl('http://cdn.discordapp.com/attachments/1/2/file.bin'), false);
    assert.equal(isTrustedDiscordAttachmentUrl('https://cdn.discordapp.com.evil.invalid/attachments/1/2/file.bin'), false);
    assert.equal(isTrustedDiscordAttachmentUrl('https://attacker.invalid/file.bin'), false);
    assert.equal(isTrustedDiscordAttachmentUrl('https://user:pass@cdn.discordapp.com/file.bin'), false);
});
