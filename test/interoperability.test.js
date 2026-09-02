import assert from 'assert';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import ErikrafTdropWsServer from '../server/ws-server.js';
import Peer from '../server/peer.js';
import '../public/scripts/pairdrop-adapter.js';

const PairDropAdapter = globalThis.PairDropAdapter;

console.log('==================================================');
console.log('STARTING ERIKRAFT DROP™ INTEROPERABILITY TESTS');
console.log('==================================================\n');

// 1. Setup local test server
const app = express();
const server = http.createServer(app);
const conf = {
    debugMode: false,
    wsFallback: true,
    rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
};

const wsServer = new ErikrafTdropWsServer(server, conf);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const serverUrl = `ws://127.0.0.1:${port}/server`;

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function createClient(originHeader = 'https://drop.erikraft.com', clientType = 'browser', clientId = null, peerId = null) {
    return new Promise((resolve, reject) => {
        let url = `${serverUrl}?client_type=${clientType}&webrtc_supported=false`;
        if (clientId) url += `&client_id=${clientId}`;
        if (peerId) url += `&peer_id=${peerId}`;

        const ws = new WebSocket(url, {
            headers: { 'Origin': originHeader }
        });
        const messages = [];

        ws.on('open', () => {});
        ws.on('message', (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                messages.push(parsed);
                ws.emit('json-message', parsed);
            } catch (e) {
                // binary or malformed
            }
        });

        ws.on('json-message', (msg) => {
            if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
            if (msg.type === 'display-name') {
                resolve({ ws, peerInfo: msg, messages });
            }
        });

        ws.on('error', reject);
    });
}

// TEST A: HTTPS ↔ HTTPS Signaling & Discovery
console.log('-> TEST A: HTTPS ↔ HTTPS signaling and discovery');
const httpsClientA = await createClient('https://drop.erikraft.com');
const httpsClientB = await createClient('https://drop.erikraft.com');

// Join public room to pair
const roomIdA = 'test-room-https';
httpsClientA.ws.send(JSON.stringify({ type: 'create-public-room' }));

const roomCreatedMsg = await new Promise(resolve => {
    httpsClientA.ws.on('json-message', msg => {
        if (msg.type === 'public-room-created') resolve(msg);
    });
});

const publicRoomId = roomCreatedMsg.roomId;
assert.ok(publicRoomId, 'Public room ID should be generated');

httpsClientB.ws.send(JSON.stringify({ type: 'join-public-room', publicRoomId }));

const peerJoinedMsg = await new Promise(resolve => {
    httpsClientA.ws.on('json-message', msg => {
        if (msg.type === 'peer-joined') resolve(msg);
    });
});

assert.strictEqual(peerJoinedMsg.peer.id, httpsClientB.peerInfo.peerId, 'Client B should be discovered by Client A');
console.log('   ✓ HTTPS ↔ HTTPS signaling and discovery passed\n');

// TEST A2: Multi-tab same client discovery and bidirectionality
console.log('-> TEST A2: Multi-tab discovery, shared client identity and bidirectional peer list');
const sharedClientId = 'shared-client-uuid-1234';

const tabA = await createClient('https://drop.erikraft.com', 'browser', sharedClientId);
const tabB = await createClient('https://drop.erikraft.com', 'browser', sharedClientId);

// Both tabs share same displayName seed because they share clientId
assert.strictEqual(tabA.peerInfo.displayName, tabB.peerInfo.displayName, 'Tabs on same client should share displayName');
assert.notStrictEqual(tabA.peerInfo.peerId, tabB.peerInfo.peerId, 'Tabs must have unique peerIds');

// Register listeners BEFORE sending messages
const peersPromiseA = new Promise(resolve => {
    tabA.ws.on('json-message', msg => {
        if (msg.type === 'peers') resolve(msg);
    });
});
tabA.ws.send(JSON.stringify({ type: 'join-ip-room' }));
const peersMsgA = await peersPromiseA;

const peersPromiseB = new Promise(resolve => {
    tabB.ws.on('json-message', msg => {
        if (msg.type === 'peers') resolve(msg);
    });
});
const peerJoinedPromiseA = new Promise(resolve => {
    tabA.ws.on('json-message', msg => {
        if (msg.type === 'peer-joined') resolve(msg);
    });
});

tabB.ws.send(JSON.stringify({ type: 'join-ip-room' }));

const [peersMsgB, peerJoinedOnA] = await Promise.all([peersPromiseB, peerJoinedPromiseA]);

// Verify Tab A sees Tab B, and Tab B sees Tab A
assert.strictEqual(peerJoinedOnA.peer.id, tabB.peerInfo.peerId, 'Tab A should see Tab B join');
assert.ok(peersMsgB.peers.some(p => p.id === tabA.peerInfo.peerId), 'Tab B should receive Tab A in peers list');

// Tab A closes/disconnects
tabA.ws.close();

const peerLeftOnB = await new Promise(resolve => {
    tabB.ws.on('json-message', msg => {
        if (msg.type === 'peer-left') resolve(msg);
    });
});

assert.strictEqual(peerLeftOnB.peerId, tabA.peerInfo.peerId, 'Tab B should observe Tab A disconnecting');

// Tab A reconnects
const tabAReconnected = await createClient('https://drop.erikraft.com', 'browser', sharedClientId);
tabAReconnected.ws.send(JSON.stringify({ type: 'join-ip-room' }));

const peerRejoinedOnB = await new Promise(resolve => {
    tabB.ws.on('json-message', msg => {
        if (msg.type === 'peer-joined') resolve(msg);
    });
});

assert.strictEqual(peerRejoinedOnB.peer.id, tabAReconnected.peerInfo.peerId, 'Tab B should see reconnected Tab A');

tabAReconnected.ws.close();
tabB.ws.close();
console.log('   ✓ Multi-tab discovery and bidirectional peer list passed\n');

// TEST B: ONION ↔ ONION Signaling & Transfer
console.log('-> TEST B: ONION ↔ ONION signaling and transfer with WSPeer fallback');
const onionClientA = await createClient('http://nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion');
const onionClientB = await createClient('http://nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion');

onionClientA.ws.send(JSON.stringify({ type: 'create-public-room' }));
const onionRoomCreated = await new Promise(resolve => {
    onionClientA.ws.on('json-message', msg => {
        if (msg.type === 'public-room-created') resolve(msg);
    });
});

const onionRoomId = onionRoomCreated.roomId;
onionClientB.ws.send(JSON.stringify({ type: 'join-public-room', publicRoomId: onionRoomId }));

await new Promise(resolve => {
    onionClientA.ws.on('json-message', msg => {
        if (msg.type === 'peer-joined') resolve(msg);
    });
});

// File transfer ONION A -> ONION B via WSPeer fallback
const testContentB = Buffer.from('ErikrafT Drop .onion to .onion file payload ' + Date.now());
const testHashB = sha256(testContentB);

// Request transfer
onionClientA.ws.send(JSON.stringify({
    type: 'request',
    to: onionClientB.peerInfo.peerId,
    roomId: onionRoomId,
    roomType: 'public-id',
    header: [{ name: 'onion-test.txt', mime: 'text/plain', size: testContentB.length }],
    totalSize: testContentB.length
}));

const reqMsgB = await new Promise(resolve => {
    onionClientB.ws.on('json-message', msg => {
        if (msg.type === 'request') resolve(msg);
    });
});

assert.strictEqual(reqMsgB.totalSize, testContentB.length, 'Request size should match');

// Accept transfer
onionClientB.ws.send(JSON.stringify({
    type: 'files-transfer-response',
    to: onionClientA.peerInfo.peerId,
    roomId: onionRoomId,
    roomType: 'public-id',
    accepted: true
}));

await new Promise(resolve => {
    onionClientA.ws.on('json-message', msg => {
        if (msg.type === 'files-transfer-response') resolve(msg);
    });
});

// Send file header and chunks
onionClientA.ws.send(JSON.stringify({
    type: 'header',
    to: onionClientB.peerInfo.peerId,
    roomId: onionRoomId,
    roomType: 'public-id',
    name: 'onion-test.txt',
    mime: 'text/plain',
    size: testContentB.length
}));

onionClientA.ws.send(JSON.stringify({
    type: 'ws-chunk',
    to: onionClientB.peerInfo.peerId,
    roomId: onionRoomId,
    roomType: 'public-id',
    chunk: testContentB.toString('base64')
}));

const chunkMsgB = await new Promise(resolve => {
    onionClientB.ws.on('json-message', msg => {
        if (msg.type === 'ws-chunk') resolve(msg);
    });
});

const receivedBufB = Buffer.from(chunkMsgB.chunk, 'base64');
assert.strictEqual(sha256(receivedBufB), testHashB, 'SHA-256 hash must match for ONION ↔ ONION transfer');
console.log('   ✓ ONION ↔ ONION transfer passed (SHA-256 verified)\n');

// TEST C: ONION → HTTPS File Transfer & SHA-256 Integrity
console.log('-> TEST C: ONION → HTTPS file transfer and SHA-256 integrity');
const onionSender = await createClient('http://nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion');
const httpsReceiver = await createClient('https://drop.erikraft.com');

onionSender.ws.send(JSON.stringify({ type: 'create-public-room' }));
const crossRoomCreated = await new Promise(resolve => {
    onionSender.ws.on('json-message', msg => {
        if (msg.type === 'public-room-created') resolve(msg);
    });
});

const crossRoomId = crossRoomCreated.roomId;
httpsReceiver.ws.send(JSON.stringify({ type: 'join-public-room', publicRoomId: crossRoomId }));

await new Promise(resolve => {
    onionSender.ws.on('json-message', msg => {
        if (msg.type === 'peer-joined') resolve(msg);
    });
});

const crossPayloadC = Buffer.from('Onion to HTTPS cross-origin payload data ' + Date.now());
const crossHashC = sha256(crossPayloadC);

onionSender.ws.send(JSON.stringify({
    type: 'request',
    to: httpsReceiver.peerInfo.peerId,
    roomId: crossRoomId,
    roomType: 'public-id',
    header: [{ name: 'cross-onion-https.bin', mime: 'application/octet-stream', size: crossPayloadC.length }],
    totalSize: crossPayloadC.length
}));

const crossReqC = await new Promise(resolve => {
    httpsReceiver.ws.on('json-message', msg => {
        if (msg.type === 'request') resolve(msg);
    });
});

httpsReceiver.ws.send(JSON.stringify({
    type: 'files-transfer-response',
    to: onionSender.peerInfo.peerId,
    roomId: crossRoomId,
    roomType: 'public-id',
    accepted: true
}));

await new Promise(resolve => {
    onionSender.ws.on('json-message', msg => {
        if (msg.type === 'files-transfer-response') resolve(msg);
    });
});

onionSender.ws.send(JSON.stringify({
    type: 'ws-chunk',
    to: httpsReceiver.peerInfo.peerId,
    roomId: crossRoomId,
    roomType: 'public-id',
    chunk: crossPayloadC.toString('base64')
}));

const crossChunkC = await new Promise(resolve => {
    httpsReceiver.ws.on('json-message', msg => {
        if (msg.type === 'ws-chunk') resolve(msg);
    });
});

const receivedCrossC = Buffer.from(crossChunkC.chunk, 'base64');
assert.strictEqual(sha256(receivedCrossC), crossHashC, 'SHA-256 hash must match for ONION → HTTPS transfer');
console.log('   ✓ ONION → HTTPS file transfer passed (SHA-256 verified)\n');

// TEST D: HTTPS → ONION File Transfer & SHA-256 Integrity
console.log('-> TEST D: HTTPS → ONION file transfer and SHA-256 integrity');
const httpsSender = await createClient('https://drop.erikraft.com');
const onionReceiver = await createClient('http://nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion');

httpsSender.ws.send(JSON.stringify({ type: 'create-public-room' }));
const crossRoomCreatedD = await new Promise(resolve => {
    httpsSender.ws.on('json-message', msg => {
        if (msg.type === 'public-room-created') resolve(msg);
    });
});

const crossRoomIdD = crossRoomCreatedD.roomId;
onionReceiver.ws.send(JSON.stringify({ type: 'join-public-room', publicRoomId: crossRoomIdD }));

await new Promise(resolve => {
    httpsSender.ws.on('json-message', msg => {
        if (msg.type === 'peer-joined') resolve(msg);
    });
});

const crossPayloadD = Buffer.from('HTTPS to Onion payload data ' + Date.now());
const crossHashD = sha256(crossPayloadD);

httpsSender.ws.send(JSON.stringify({
    type: 'request',
    to: onionReceiver.peerInfo.peerId,
    roomId: crossRoomIdD,
    roomType: 'public-id',
    header: [{ name: 'https-to-onion.bin', mime: 'application/octet-stream', size: crossPayloadD.length }],
    totalSize: crossPayloadD.length
}));

await new Promise(resolve => {
    onionReceiver.ws.on('json-message', msg => {
        if (msg.type === 'request') resolve(msg);
    });
});

onionReceiver.ws.send(JSON.stringify({
    type: 'files-transfer-response',
    to: httpsSender.peerInfo.peerId,
    roomId: crossRoomIdD,
    roomType: 'public-id',
    accepted: true
}));

await new Promise(resolve => {
    httpsSender.ws.on('json-message', msg => {
        if (msg.type === 'files-transfer-response') resolve(msg);
    });
});

httpsSender.ws.send(JSON.stringify({
    type: 'ws-chunk',
    to: onionReceiver.peerInfo.peerId,
    roomId: crossRoomIdD,
    roomType: 'public-id',
    chunk: crossPayloadD.toString('base64')
}));

const crossChunkD = await new Promise(resolve => {
    onionReceiver.ws.on('json-message', msg => {
        if (msg.type === 'ws-chunk') resolve(msg);
    });
});

const receivedCrossD = Buffer.from(crossChunkD.chunk, 'base64');
assert.strictEqual(sha256(receivedCrossD), crossHashD, 'SHA-256 hash must match for HTTPS → ONION transfer');
console.log('   ✓ HTTPS → ONION file transfer passed (SHA-256 verified)\n');

// TEST E & F: PairDrop Compatibility Adapter Normalization
console.log('-> TEST E & F: ErikrafT Drop™ ↔ PairDrop adapter normalization & translation');

const rawPairDropHeader = [
    { fileName: 'document.pdf', fileSize: 102400, fileType: 'application/pdf' },
    { name: 'photo.jpg', size: 50000, type: 'image/jpeg' }
];

const normalized = PairDropAdapter.normalizeHeader(rawPairDropHeader);
assert.strictEqual(normalized.length, 2, 'Should normalize 2 items');
assert.strictEqual(normalized[0].name, 'document.pdf', 'Name should be mapped from fileName');
assert.strictEqual(normalized[0].size, 102400, 'Size should be mapped from fileSize');
assert.strictEqual(normalized[0].mime, 'application/pdf', 'Mime should be mapped from fileType');

const formattedSignal = PairDropAdapter.formatRequestSignal(rawPairDropHeader);
assert.strictEqual(formattedSignal.type, 'request', 'Signal type should be request');
assert.strictEqual(formattedSignal.pairDropCompatible, true, 'Flag should be set');
assert.strictEqual(formattedSignal.totalSize, 152400, 'Total size should be sum of files');

const chunkSizeBytes = PairDropAdapter.getChunkSize();
assert.strictEqual(chunkSizeBytes, 65536, 'Chunk size should be 64 KB');

console.log('   ✓ PairDrop Adapter normalization tests passed\n');

// Cleanup
httpsClientA.ws.close();
httpsClientB.ws.close();
onionClientA.ws.close();
onionClientB.ws.close();
onionSender.ws.close();
httpsReceiver.ws.close();
httpsSender.ws.close();
onionReceiver.ws.close();

server.close();

console.log('==================================================');
console.log('ALL INTEROPERABILITY TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');

process.exit(0);
