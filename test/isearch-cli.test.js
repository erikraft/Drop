import assert from 'node:assert/strict';
import Peer, { isISearchCliRequest, ISEARCH_CLI_CLIENT_TYPE, ISEARCH_CLI_NAME } from '../server/peer.js';

function request(url, userAgent = 'Mozilla/5.0', headers = {}) {
    return {
        url,
        headers: { 'user-agent': userAgent, ...headers },
        socket: { remoteAddress: '127.0.0.1' },
        connection: { remoteAddress: '127.0.0.1' }
    };
}

function socket() {
    return { on() {}, terminate() {}, close() {} };
}

const cliByType = request('/server?client_type=isearch-cli&version=1.0.0&platform=Windows&architecture=x86_64&webrtc_supported=false');
assert.equal(isISearchCliRequest(cliByType), true);

const cliByUa = request('/server?webrtc_supported=false', 'iSearchCLI/1.0.0 (Windows; x86_64)');
assert.equal(isISearchCliRequest(cliByUa), true);

const cliPeer = new Peer(socket(), cliByType, {});
assert.equal(cliPeer.name.clientType, ISEARCH_CLI_CLIENT_TYPE);
assert.equal(cliPeer.name.deviceName, ISEARCH_CLI_NAME);
assert.equal(cliPeer.name.browser, ISEARCH_CLI_NAME);
assert.equal(cliPeer.name.version, '1.0.0');
assert.equal(cliPeer.name.platform, 'Windows');
assert.equal(cliPeer.name.architecture, 'x86_64');
assert.equal(cliPeer.name.capabilities.cli, true);
assert.equal(cliPeer.name.capabilities.protocolVersion, 1);
assert.equal(cliPeer.name.capabilities.fileTransfer, true);
assert.equal(cliPeer.rtcSupported, false);

const chromePeer = new Peer(socket(), request('/server?client_type=browser&webrtc_supported=true', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'), {});
assert.equal(chromePeer.name.clientType, 'browser');
assert.notEqual(chromePeer.name.deviceName, ISEARCH_CLI_NAME);
assert.equal(chromePeer.rtcSupported, true);

const vscodePeer = new Peer(socket(), request('/server?client_type=vs-code-extension&webrtc_supported=false'), {});
assert.equal(vscodePeer.name.clientType, 'vs-code-extension');
assert.equal(vscodePeer.name.deviceName, 'VS Code Extension');

const invalidPeer = new Peer(socket(), request('/server?client_type=terminal&webrtc_supported=false'), {});
assert.equal(invalidPeer.name.clientType, 'browser');

console.log('iSearch CLI client identification and compatibility tests passed');
