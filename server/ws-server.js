import {WebSocketServer} from "ws";
import crypto from "crypto"

import Peer from "./peer.js";
import {hasher, randomizer} from "./helper.js";
import {isAllowedWebSocketOrigin} from "./websocket-origin.js";

const LOCAL_IPV4_PATTERNS = [
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./
];

function isLocalIp(ip) {
    if (!ip) return false;
    if (ip === '127.0.0.1' || ip === '::1') return true;
    if (!ip.includes(":")) {
        return LOCAL_IPV4_PATTERNS.some(pattern => pattern.test(ip));
    }

    const firstWord = ip.split(":").find(el => !!el);
    if (!firstWord) return false;

    if (/^fe[c-f][0-9a-f]$/.test(firstWord)) return true;
    if (/^fc[0-9a-f]{2}$/.test(firstWord)) return true;
    if (/^fd[0-9a-f]{2}$/.test(firstWord)) return true;
    if (firstWord === "fe80") return true;
    if (firstWord === "100") return true;

    return false;
}

export default class ErikrafTdropWsServer {

    constructor(server, conf) {
        this._conf = conf

        this._rooms = Object.create(null); // { roomId: peers[] }

        this._roomSecrets = Object.create(null); // { pairKey: roomSecret }
        this._keepAliveTimers = Object.create(null);

        // Bound individual frames and validate browser Origin before upgrading.
        // Origin is a browser CSWSH defense, not an authentication mechanism.
        this._wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });
        this._wss.on('connection', (socket, request) => this._onConnection(new Peer(socket, request, conf)));

        server.on('upgrade', (request, socket, head) => {
            if (!isAllowedWebSocketOrigin(
                request.headers.origin,
                request.headers.host,
                this._conf.wsAllowedOrigins
            )) {
                socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
                socket.destroy();
                return;
            }

            this._wss.handleUpgrade(request, socket, head, upgradedSocket => {
                this._wss.emit('connection', upgradedSocket, request);
            });
        });
    }

    _onConnection(peer) {
        if (this._conf.allowLocalOnly && !isLocalIp(peer.ip)) {
            try {
                peer.socket.close(1008, 'LAN only');
            } catch (e) {
                peer.socket.terminate();
            }
            return;
        }

        peer.socket.on('message', message => this._onMessage(peer, message));
        peer.socket.onerror = e => console.error(e);

        this._keepAlive(peer);

        this._send(peer, {
            type: 'ws-config',
            wsConfig: {
                rtcConfig: this._conf.rtcConfig,
                wsFallback: this._conf.wsFallback
            }
        });

        // send displayName
        this._send(peer, {
            type: 'display-name',
            displayName: peer.name.displayName,
            deviceName: peer.name.deviceName,
            clientType: peer.name.clientType,
            peerId: peer.id,
            peerIdHash: hasher.hashCodeSalted(peer.id)
        });
    }

    _onMessage(sender, message) {
        // Try to parse message
        try {
            message = JSON.parse(message);
        } catch (e) {
            console.warn("WS: Received JSON is malformed");
            return;
        }

        if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string') {
            console.warn('WS: Ignoring message with invalid JSON shape');
            return;
        }

        switch (message.type) {
            case 'disconnect':
                this._onDisconnect(sender);
                break;
            case 'pong':
                this._setKeepAliveTimerToNow(sender);
                break;
            case 'join-ip-room':
                this._joinIpRoom(sender);
                break;
            case 'room-secrets':
                this._onRoomSecrets(sender, message);
                break;
            case 'room-secrets-deleted':
                this._onRoomSecretsDeleted(sender, message);
                break;
            case 'pair-device-initiate':
                this._onPairDeviceInitiate(sender);
                break;
            case 'pair-device-join':
                this._onPairDeviceJoin(sender, message);
                break;
            case 'pair-device-cancel':
                this._onPairDeviceCancel(sender);
                break;
            case 'regenerate-room-secret':
                this._onRegenerateRoomSecret(sender, message);
                break;
            case 'create-public-room':
                this._onCreatePublicRoom(sender);
                break;
            case 'join-public-room':
                this._onJoinPublicRoom(sender, message);
                break;
            case 'leave-public-room':
                this._onLeavePublicRoom(sender);
                break;
            case 'signal':
                this._signalAndRelay(sender, message);
                break;
            case 'request':
            case 'header':
            case 'partition':
            case 'partition-received':
            case 'progress':
            case 'files-transfer-response':
            case 'file-transfer-complete':
            case 'message-transfer-complete':
            case 'text':
            case 'display-name-changed':
            case 'ws-chunk':
            case 'chat-message':
            case 'chat-ack':
                // relay ws-fallback
                if (this._conf.wsFallback) {
                    this._signalAndRelay(sender, message);
                }
                else {
                    console.log("Websocket fallback is not activated on this instance.")
                }
        }
    }

    _signalAndRelay(sender, message) {
        const room = message.roomType === 'ip'
            ? sender.ip
            : message.roomId;
        const members = typeof room === 'string' ? this._rooms[room] : null;

        // Relay only when the sender and recipient are both members of the same room.
        if (!members || members[sender.id] !== sender || !message.to || !Peer.isValidUuid(message.to)) return;

        const recipient = members[message.to];
        if (!recipient) return;

        delete message.to;
        message.sender = {
            id: sender.id,
            rtcSupported: sender.rtcSupported
        };
        this._send(recipient, message);
    }

    _onDisconnect(sender) {
        this._disconnect(sender);
    }

    _disconnect(sender) {
        this._removePairKey(sender.pairKey);
        sender.pairKey = null;

        this._cancelKeepAlive(sender);
        delete this._keepAliveTimers[sender.id];

        this._leaveIpRoom(sender, true);
        this._leaveAllSecretRooms(sender, true);
        this._leavePublicRoom(sender, true);

        sender.socket.terminate();
    }

    _onRoomSecrets(sender, message) {
        if (!Array.isArray(message.roomSecrets) || message.roomSecrets.length > 64) return;

        const roomSecrets = message.roomSecrets.filter(roomSecret => {
            return typeof roomSecret === 'string' && /^[\x00-\x7F]{64,256}$/.test(roomSecret);
        });

        this._joinSecretRooms(sender, roomSecrets);
    }

    _onRoomSecretsDeleted(sender, message) {
        if (!Array.isArray(message.roomSecrets) || message.roomSecrets.length > 64) return;

        for (const roomSecret of message.roomSecrets) {
            const room = typeof roomSecret === 'string' ? this._rooms[roomSecret] : null;
            if (room && room[sender.id] === sender) {
                this._deleteSecretRoom(roomSecret);
            }
        }
    }

    _deleteSecretRoom(roomSecret) {
        const room = this._rooms[roomSecret];
        if (!room) return;

        for (const peerId in room) {
            const peer = room[peerId];

            this._leaveSecretRoom(peer, roomSecret, true);

            this._send(peer, {
                type: 'secret-room-deleted',
                roomSecret: roomSecret,
            });
        }
    }

    _onPairDeviceInitiate(sender) {
        let roomSecret = randomizer.getRandomString(256);
        let pairKey = this._createPairKey(sender, roomSecret);

        if (sender.pairKey) {
            this._removePairKey(sender.pairKey);
        }
        sender.pairKey = pairKey;

        this._send(sender, {
            type: 'pair-device-initiated',
            roomSecret: roomSecret,
            pairKey: pairKey
        });
        this._joinSecretRoom(sender, roomSecret);
    }

    _onPairDeviceJoin(sender, message) {
        if (typeof message.pairKey !== 'string' || !/^\d{5}$/.test(message.pairKey)) {
            this._send(sender, { type: 'pair-device-join-key-invalid' });
            return;
        }

        if (sender.rateLimitReached()) {
            this._send(sender, { type: 'join-key-rate-limit' });
            return;
        }

        if (!this._roomSecrets[message.pairKey] || sender.id === this._roomSecrets[message.pairKey].creator.id) {
            this._send(sender, { type: 'pair-device-join-key-invalid' });
            return;
        }

        const roomSecret = this._roomSecrets[message.pairKey].roomSecret;
        const creator = this._roomSecrets[message.pairKey].creator;
        this._removePairKey(message.pairKey);
        this._send(sender, {
            type: 'pair-device-joined',
            roomSecret: roomSecret,
            peerId: creator.id
        });
        this._send(creator, {
            type: 'pair-device-joined',
            roomSecret: roomSecret,
            peerId: sender.id
        });
        this._joinSecretRoom(sender, roomSecret);
        this._removePairKey(sender.pairKey);
    }

    _onPairDeviceCancel(sender) {
        const pairKey = sender.pairKey

        if (!pairKey) return;

        this._removePairKey(pairKey);
        this._send(sender, {
            type: 'pair-device-canceled',
            pairKey: pairKey,
        });
    }

    _onCreatePublicRoom(sender) {
        let publicRoomId = randomizer.getRandomString(5, true).toLowerCase();

        this._send(sender, {
            type: 'public-room-created',
            roomId: publicRoomId
        });

        this._joinPublicRoom(sender, publicRoomId);
    }

    _onJoinPublicRoom(sender, message) {
        if (sender.rateLimitReached()) {
            this._send(sender, { type: 'join-key-rate-limit' });
            return;
        }

        const publicRoomId = typeof message.publicRoomId === 'string' ? message.publicRoomId.toLowerCase() : '';
        if (!/^[a-z]{5}$/.test(publicRoomId)) {
            this._send(sender, { type: 'public-room-id-invalid', publicRoomId: message.publicRoomId });
            return;
        }

        if (!this._rooms[publicRoomId] && message.createIfInvalid !== true) {
            this._send(sender, { type: 'public-room-id-invalid', publicRoomId });
            return;
        }

        this._leavePublicRoom(sender);
        this._joinPublicRoom(sender, publicRoomId);
    }

    _onLeavePublicRoom(sender) {
        this._leavePublicRoom(sender, true);
        this._send(sender, { type: 'public-room-left' });
    }

    _onRegenerateRoomSecret(sender, message) {
        const oldRoomSecret = message.roomSecret;
        if (typeof oldRoomSecret !== 'string' || !/^[\x00-\x7F]{64,256}$/.test(oldRoomSecret)) return;
        const oldRoom = this._rooms[oldRoomSecret];
        if (!oldRoom || oldRoom[sender.id] !== sender) return;

        const newRoomSecret = randomizer.getRandomString(256);

        // notify all other peers
        for (const peerId in oldRoom) {
            const peer = oldRoom[peerId];
            this._send(peer, {
                type: 'room-secret-regenerated',
                oldRoomSecret: oldRoomSecret,
                newRoomSecret: newRoomSecret,
            });
            peer.removeRoomSecret(oldRoomSecret);
        }
        delete this._rooms[oldRoomSecret];
    }

    _createPairKey(creator, roomSecret) {
        let pairKey;
        do {
            // get randomInt until keyRoom not occupied
            pairKey = crypto.randomInt(1000000, 1999999).toString().substring(1); // include numbers with leading 0s
        } while (pairKey in this._roomSecrets)

        this._roomSecrets[pairKey] = {
            roomSecret: roomSecret,
            creator: creator
        }

        return pairKey;
    }

    _removePairKey(pairKey) {
        if (pairKey in this._roomSecrets) {
            this._roomSecrets[pairKey].creator.pairKey = null
            delete this._roomSecrets[pairKey];
        }
    }

    _joinIpRoom(peer) {
        this._joinRoom(peer, 'ip', peer.ip);
    }

    _joinSecretRoom(peer, roomSecret) {
        this._joinRoom(peer, 'secret', roomSecret);

        // add secret to peer
        peer.addRoomSecret(roomSecret);
    }

    _joinPublicRoom(peer, publicRoomId) {
        // prevent joining of 2 public rooms simultaneously
        this._leavePublicRoom(peer);

        this._joinRoom(peer, 'public-id', publicRoomId);

        peer.publicRoomId = publicRoomId;
    }

    _joinRoom(peer, roomType, roomId) {
        // roomType: 'ip', 'secret' or 'public-id'
        if (typeof roomId !== 'string' || roomId.length === 0 || roomId.length > 256) return;

        if (this._rooms[roomId] && this._rooms[roomId][peer.id]) {
            // ensures that otherPeers never receive `peer-left` after `peer-joined` on reconnect.
            this._leaveRoom(peer, roomType, roomId);
        }

        // if room doesn't exist, create it
        if (!this._rooms[roomId]) {
            this._rooms[roomId] = Object.create(null);
        }

        // add peer to room before notifying peers to prevent race conditions during list generation
        this._rooms[roomId][peer.id] = peer;

        this._notifyPeers(peer, roomType, roomId);
    }


    _leaveIpRoom(peer, disconnect = false) {
        this._leaveRoom(peer, 'ip', peer.ip, disconnect);
    }

    _leaveSecretRoom(peer, roomSecret, disconnect = false) {
        this._leaveRoom(peer, 'secret', roomSecret, disconnect)

        //remove secret from peer
        peer.removeRoomSecret(roomSecret);
    }

    _leavePublicRoom(peer, disconnect = false) {
        if (!peer.publicRoomId) return;

        this._leaveRoom(peer, 'public-id', peer.publicRoomId, disconnect);

        peer.publicRoomId = null;
    }

    _leaveRoom(peer, roomType, roomId, disconnect = false) {
        if (!this._rooms[roomId] || !this._rooms[roomId][peer.id]) return;

        // remove peer from room
        delete this._rooms[roomId][peer.id];

        // delete room if empty and abort
        if (!Object.keys(this._rooms[roomId]).length) {
            delete this._rooms[roomId];
            return;
        }

        // notify all other peers that remain in room that peer left
        for (const otherPeerId in this._rooms[roomId]) {
            const otherPeer = this._rooms[roomId][otherPeerId];

            let msg = {
                type: 'peer-left',
                peerId: peer.id,
                roomType: roomType,
                roomId: roomId,
                disconnect: disconnect
            };

            this._send(otherPeer, msg);
        }
    }

    _notifyPeers(peer, roomType, roomId) {
        if (!this._rooms[roomId]) return;

        // notify all other peers that peer joined
        for (const otherPeerId in this._rooms[roomId]) {
            if (otherPeerId === peer.id) continue;
            const otherPeer = this._rooms[roomId][otherPeerId];

            let msg = {
                type: 'peer-joined',
                peer: peer.getInfo(),
                roomType: roomType,
                roomId: roomId
            };

            this._send(otherPeer, msg);
        }

        // notify peer about peers already in the room
        const otherPeers = [];
        for (const otherPeerId in this._rooms[roomId]) {
            if (otherPeerId === peer.id) continue;
            otherPeers.push(this._rooms[roomId][otherPeerId].getInfo());
        }

        let msg = {
            type: 'peers',
            peers: otherPeers,
            roomType: roomType,
            roomId: roomId
        };

        this._send(peer, msg);
    }

    _joinSecretRooms(peer, roomSecrets) {
        for (let i=0; i<roomSecrets.length; i++) {
            this._joinSecretRoom(peer, roomSecrets[i])
        }
    }

    _leaveAllSecretRooms(peer, disconnect = false) {
        for (let i=0; i<peer.roomSecrets.length; i++) {
            this._leaveSecretRoom(peer, peer.roomSecrets[i], disconnect);
        }
    }

    _send(peer, message) {
        if (!peer) return;
        if (this._wss.readyState !== this._wss.OPEN) return;
        message = JSON.stringify(message);
        peer.socket.send(message);
    }

    _keepAlive(peer) {
        this._cancelKeepAlive(peer);
        let timeout = 1000;

        if (!this._keepAliveTimers[peer.id]) {
            this._keepAliveTimers[peer.id] = {
                timer: 0,
                lastBeat: Date.now()
            };
        }

        if (Date.now() - this._keepAliveTimers[peer.id].lastBeat > 5 * timeout) {
            // Disconnect peer if unresponsive for 10s
            this._disconnect(peer);
            return;
        }

        this._send(peer, { type: 'ping' });

        this._keepAliveTimers[peer.id].timer = setTimeout(() => this._keepAlive(peer), timeout);
    }

    _cancelKeepAlive(peer) {
        if (this._keepAliveTimers[peer.id]?.timer) {
            clearTimeout(this._keepAliveTimers[peer.id].timer);
        }
    }

    _setKeepAliveTimerToNow(peer) {
        if (this._keepAliveTimers[peer.id]?.lastBeat) {
            this._keepAliveTimers[peer.id].lastBeat = Date.now();
        }
    }
}

