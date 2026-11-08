import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import ErikrafTdropServer from '../server/server.js';

test('HTTP responses include baseline browser security headers', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const server = new ErikrafTdropServer({
        port: 0,
        localhostOnly: true,
        rateLimit: false,
        debugMode: false,
        signalingServer: '',
        buttons: [],
        wsFallback: false,
        ipv6Localize: 0,
        rtcConfig: null
    });

    try {
        if (!server.server.listening) await once(server.server, 'listening');
        const port = server.server.address().port;
        const response = await fetch(`http://127.0.0.1:${port}/health`);

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('x-frame-options'), 'DENY');
        assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
        assert.equal(response.headers.get('permissions-policy'), 'camera=(self), microphone=(self), geolocation=()');
        assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
        assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000');
    } finally {
        await new Promise(resolve => server.server.close(resolve));
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
    }
});
