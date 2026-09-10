import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const serviceWorker = fs.readFileSync(path.join(publicDir, 'service-worker.js'), 'utf8');
const main = fs.readFileSync(path.join(publicDir, 'scripts', 'main.js'), 'utf8');

const match = serviceWorker.match(/const relativePathsToCache = \[([\s\S]*?)\n\];/);
assert.ok(match, 'Service Worker cache manifest must be present.');

const paths = [...match[1].matchAll(/[\'\"]([^\'\"]+)[\'\"]/g)].map(result => result[1]);
assert.ok(paths.length > 0, 'Service Worker cache manifest must contain resources.');

for (const resource of paths) {
    const absolutePath = path.join(publicDir, resource);
    assert.ok(fs.existsSync(absolutePath), `Service Worker references missing resource: ${resource}`);
}

for (const required of [
    'index.html',
    'scripts/main.js',
    'scripts/network.js',
    'scripts/animated-qr-controls.js',
    'scripts/animated-qr-file-size.js',
    'scripts/animated-qr-screen-awake.js',
    'scripts/optical-matrix.js',
    'scripts/github-folder-zip.js'
]) {
    assert.ok(paths.includes(required), `Critical runtime resource is not pre-cached: ${required}`);
}

assert.match(serviceWorker, /const cacheVersion = 'v10\.1\.4';/);
assert.match(serviceWorker, /Promise\.allSettled\(/, 'Service Worker installation must tolerate individual cache failures.');
assert.match(main, /updateViaCache: 'none'/, 'Client registration should bypass the HTTP cache for SW updates.');
assert.match(serviceWorker, /const createManifestFallback = \(\) => new Response\(/,
    'Service Worker must provide a valid local manifest when a same-origin manifest cannot be fetched.');
assert.match(serviceWorker, /'Content-Type': 'application\/manifest\+json'/,
    'Manifest fallback must retain the manifest MIME type.');
assert.match(serviceWorker, /requestUrl\.pathname\.endsWith\('\/manifest\.json'\)/,
    'Manifest fallback must apply only to manifest requests.');

console.log(`Service Worker cache manifest OK: ${paths.length} resources verified.`);
