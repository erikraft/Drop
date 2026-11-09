import test from 'node:test';
import assert from 'node:assert/strict';
import DropTransferClient from '../src/client/dropClient.js';

function createClient() {
    const client = new DropTransferClient({
        baseUrl: 'https://drop.erikraft.com/',
        pairKey: '123456'
    });
    client._remotePeerId = '11111111-1111-4111-8111-111111111111';
    return client;
}

test('accepts a well-formed incoming file request', () => {
    const client = createClient();

    client._onIncomingRequest({
        sender: { id: '11111111-1111-4111-8111-111111111111' },
        header: [{ name: 'example.txt', size: 5, mime: 'text/plain' }],
        totalSize: 5,
        sender: { id: '11111111-1111-4111-8111-111111111111' }
    });

    assert.equal(client._completed, false);
    assert.equal(client._expectedFiles.length, 1);
    assert.equal(client._totalBytesExpected, 5);
});

test('rejects an incoming request without file metadata', () => {
    const client = createClient();

    client._onIncomingRequest({ header: [], totalSize: 0 });

    assert.equal(client._completed, true);
});


test('rejects requests with more than ten files', () => {
    const client = createClient();
    const header = Array.from({ length: 11 }, (_, index) => ({
        name: `file-${index}.txt`,
        size: 1,
        mime: 'text/plain'
    }));

    client._onIncomingRequest({ header, totalSize: 11 });

    assert.equal(client._completed, true);
    assert.equal(client._expectedFiles.length, 0);
});

test('rejects a file larger than the Discord attachment budget before accepting', () => {
    const client = createClient();
    const size = 25 * 1024 * 1024 + 1;

    client._onIncomingRequest({
        sender: { id: '11111111-1111-4111-8111-111111111111' },
        header: [{ name: 'large.bin', size, mime: 'application/octet-stream' }],
        totalSize: size
    });

    assert.equal(client._completed, true);
    assert.equal(client._expectedFiles.length, 0);
});

test('rejects an aggregate transfer larger than 100 MiB before accepting', () => {
    const client = createClient();
    const size = 25 * 1024 * 1024;
    const header = Array.from({ length: 5 }, (_, index) => ({
        name: `file-${index}.bin`,
        size,
        mime: 'application/octet-stream'
    }));

    client._onIncomingRequest({ header, totalSize: size * 5 });

    assert.equal(client._completed, true);
    assert.equal(client._expectedFiles.length, 0);
});

test('rejects a declared total size that does not match the file headers', () => {
    const client = createClient();

    client._onIncomingRequest({
        sender: { id: '11111111-1111-4111-8111-111111111111' },
        header: [{ name: 'example.txt', size: 5, mime: 'text/plain' }],
        totalSize: 4
    });

    assert.equal(client._completed, true);
    assert.equal(client._expectedFiles.length, 0);
});

test('rejects an incoming file header that changes the announced size', () => {
    const client = createClient();
    client._expectedFiles = [{ name: 'example.txt', size: 5, mime: 'text/plain' }];

    client._onIncomingFileHeader({
        name: 'example.txt',
        size: 6,
        mime: 'text/plain'
    });

    assert.equal(client._completed, true);
    assert.equal(client._currentIncomingFile, null);
});

test('rejects a binary chunk before buffering bytes beyond the announced file size', () => {
    const client = createClient();
    client._currentIncomingFile = {
        index: 0,
        expectedSize: 5,
        name: 'example.txt',
        mime: 'text/plain',
        received: 4,
        chunks: [Buffer.from('1234')]
    };
    client._bytesReceived = 4;

    client._handleBinaryChunk(Buffer.from('xx'));

    assert.equal(client._completed, true);
    assert.equal(client._bytesReceived, 4);
    assert.equal(client._currentIncomingFile, null);
});
