import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import test from 'node:test';
import ErikrafTdropServer from '../server/server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetLinksPath = path.join(root, 'public', '.well-known', 'assetlinks.json');

test('serves public/.well-known/assetlinks.json at the Android Digital Asset Links URL', async () => {
    const expectedAssetLinks = JSON.parse(fs.readFileSync(assetLinksPath, 'utf8'));
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
        const response = await fetch(`http://127.0.0.1:${port}/.well-known/assetlinks.json`);

        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /^application\/json\b/i);
        assert.deepEqual(await response.json(), expectedAssetLinks);
    } finally {
        await new Promise(resolve => server.server.close(resolve));
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
    }
});
