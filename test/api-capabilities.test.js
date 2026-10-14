import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import ErikrafTdropServer from '../server/server.js';

test('public API capabilities endpoint returns versioned, non-secret metadata', async () => {
    const instance = new ErikrafTdropServer({
        port: 0,
        localhostOnly: true,
        rateLimit: false,
        debugMode: false,
        wsFallback: true,
        signalingServer: false,
        buttons: {}
    });

    try {
        await once(instance.server, 'listening');
        const address = instance.server.address();
        assert.ok(address && typeof address === 'object');

        const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/capabilities`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /application\/json/);

        const body = await response.json();
        assert.equal(body.apiVersion, 'v1');
        assert.equal(body.endpoints.capabilities, '/api/v1/capabilities');
        assert.equal(body.endpoints.signalingWebSocket, '/server');
        assert.equal(body.integrations.cli.clientType, 'isearch-cli');
        assert.equal(body.integrations.cli.websocketFallbackConfigured, true);
        assert.equal(body.security.apiKeyRequired, false);
        assert.equal(body.security.filesStoredByThisService, false);
        assert.equal(Object.hasOwn(body, 'roomSecrets'), false);
        assert.equal(Object.hasOwn(body, 'transferContents'), false);
    } finally {
        await new Promise((resolve, reject) => instance.server.close(error => error ? reject(error) : resolve()));
    }
});
