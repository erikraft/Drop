import test from "node:test";
import assert from "node:assert/strict";

import ErikrafTdropWsServer from "../server/ws-server.js";

function createPeer(id) {
    const messages = [];
    return {
        id,
        ip: "203.0.113.10",
        rtcSupported: true,
        roomSecrets: [],
        pairKey: null,
        publicRoomId: null,
        messages,
        socket: {
            readyState: 1,
            send(payload) {
                messages.push(JSON.parse(payload));
            },
            terminate() {}
        },
        getInfo() {
            return { id: this.id, rtcSupported: this.rtcSupported };
        },
        addRoomSecret(secret) {
            if (!this.roomSecrets.includes(secret)) this.roomSecrets.push(secret);
        },
        removeRoomSecret(secret) {
            this.roomSecrets = this.roomSecrets.filter(value => value !== secret);
        },
        rateLimitReached() {
            return false;
        }
    };
}

function createServer() {
    const server = Object.create(ErikrafTdropWsServer.prototype);
    server._conf = { wsFallback: true };
    server._rooms = Object.create(null);
    server._roomSecrets = Object.create(null);
    server._keepAliveTimers = Object.create(null);
    server._wss = { OPEN: 1, readyState: 1 };
    return server;
}

test("existing room join behavior notifies peers without crossing rooms", () => {
    const server = createServer();
    const alice = createPeer("11111111-1111-4111-8111-111111111111");
    const bob = createPeer("22222222-2222-4222-8222-222222222222");
    const carol = createPeer("33333333-3333-4333-8333-333333333333");

    server._joinRoom(alice, "secret", "a".repeat(64));
    server._joinRoom(bob, "secret", "a".repeat(64));
    server._joinRoom(carol, "secret", "b".repeat(64));

    assert.equal(alice.messages.some(message => message.type === "peer-joined" && message.peer.id === bob.id), true);
    assert.equal(bob.messages.some(message => message.type === "peers" && message.peers.some(peer => peer.id === alice.id)), true);
    assert.equal(carol.messages.some(message => message.type === "peer-joined" || message.type === "peers" && message.peers.length > 0), false);
});

test("room removal leaves unrelated rooms and peers intact", () => {
    const server = createServer();
    const alice = createPeer("11111111-1111-4111-8111-111111111111");
    const bob = createPeer("22222222-2222-4222-8222-222222222222");
    const carol = createPeer("33333333-3333-4333-8333-333333333333");

    server._joinRoom(alice, "secret", "a".repeat(64));
    server._joinRoom(bob, "secret", "a".repeat(64));
    server._joinRoom(carol, "secret", "b".repeat(64));

    server._leaveSecretRoom(alice, "a".repeat(64));

    assert.equal(server._rooms["a".repeat(64)][bob.id], bob);
    assert.equal(server._rooms["b".repeat(64)][carol.id], carol);
    assert.equal(server._rooms["a".repeat(64)][alice.id], undefined);
});


test("room identifiers cannot collide with object prototype properties", () => {
    const server = createServer();
    const first = createPeer("11111111-1111-4111-8111-111111111111");
    const second = createPeer("22222222-2222-4222-8222-222222222222");

    server._joinRoom(first, "secret", "__proto__");
    server._joinRoom(second, "secret", "constructor");

    assert.equal(Object.getPrototypeOf(server._rooms), null);
    assert.equal(server._rooms["__proto__"][first.id], first);
    assert.equal(server._rooms.constructor[second.id], second);
});

test("a peer cannot relay a message into a room it has not joined", () => {
    const server = createServer();
    const sender = createPeer("11111111-1111-4111-8111-111111111111");
    const recipient = createPeer("22222222-2222-4222-8222-222222222222");
    const senderRoom = "a".repeat(64);
    const recipientRoom = "b".repeat(64);

    server._joinRoom(sender, "secret", senderRoom);
    server._joinRoom(recipient, "secret", recipientRoom);

    server._signalAndRelay(sender, {
        type: "text",
        roomType: "secret",
        roomId: recipientRoom,
        to: recipient.id,
        text: "cross-room"
    });

    assert.equal(recipient.messages.some(message => message.type === "text"), false);
});

test("malformed room-secret deletion requests do not throw or delete another peer's room", () => {
    const server = createServer();
    const owner = createPeer("11111111-1111-4111-8111-111111111111");
    const outsider = createPeer("22222222-2222-4222-8222-222222222222");
    const roomSecret = "a".repeat(64);

    server._joinSecretRoom(owner, roomSecret);

    assert.doesNotThrow(() => server._onRoomSecretsDeleted(outsider, {}));
    server._onRoomSecretsDeleted(outsider, { roomSecrets: [roomSecret] });

    assert.equal(server._rooms[roomSecret][owner.id], owner);
});

test("a non-member cannot regenerate another peer's secret room", () => {
    const server = createServer();
    const owner = createPeer("11111111-1111-4111-8111-111111111111");
    const outsider = createPeer("22222222-2222-4222-8222-222222222222");
    const roomSecret = "a".repeat(64);

    server._joinSecretRoom(owner, roomSecret);
    server._onRegenerateRoomSecret(outsider, { roomSecret });

    assert.equal(server._rooms[roomSecret][owner.id], owner);
    assert.equal(owner.messages.some(message => message.type === "room-secret-regenerated"), false);
});
