import test from 'node:test';
import assert from 'node:assert/strict';
import DropTransferClient from '../src/client/dropClient.js';

function createClient() {
    return new DropTransferClient({
        baseUrl: 'https://drop.erikraft.com/',
        pairKey: '123456'
    });
}

test('accepts a well-formed incoming file request', () => {
    const client = createClient();

    client._onIncomingRequest({
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
