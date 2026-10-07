import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const pageAgent = fs.readFileSync(path.join(publicDir, 'scripts', 'page-agent-ai.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(publicDir, 'service-worker.js'), 'utf8');
const main = fs.readFileSync(path.join(publicDir, 'scripts', 'main.js'), 'utf8');
const index = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const enTranslations = fs.readFileSync(path.join(publicDir, 'lang', 'en.json'), 'utf8');
const ptBrTranslations = fs.readFileSync(path.join(publicDir, 'lang', 'pt-BR.json'), 'utf8');

const match = serviceWorker.match(/const relativePathsToCache = \[([\s\S]*?)\n\];/);
assert.ok(match, 'Service Worker cache manifest must be present.');

const paths = [...match[1].matchAll(/[\'\"]([^\'\"]+)[\'\"]/g)].map(result => result[1]);
assert.ok(paths.length > 0, 'Service Worker cache manifest must contain resources.');

assert.doesNotThrow(() => JSON.parse(enTranslations), 'English translations must be valid JSON.');
assert.doesNotThrow(() => JSON.parse(ptBrTranslations), 'Brazilian Portuguese translations must be valid JSON.');
assert.doesNotMatch(index, /scripts\/content-moderation\.js/,
    'Index must not load the removed content moderation script.');

for (const resource of paths) {
    const absolutePath = path.join(publicDir, resource);
    assert.ok(fs.existsSync(absolutePath), `Service Worker references missing resource: ${resource}`);
}

for (const required of [
    'index.html',
    'scripts/main.js',
    'scripts/network.js',
    'scripts/page-agent-ai.js',
    'scripts/animated-qr-controls.js',
    'scripts/animated-qr-file-size.js',
    'scripts/animated-qr-screen-awake.js',
    'scripts/android-app-shortcuts.js',
    'scripts/github-folder-zip.js'
]) {
    assert.ok(paths.includes(required), `Critical runtime resource is not pre-cached: ${required}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const applicationVersion = index.match(/<meta name="application-version" content="([^"]+)"/)?.[1];
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));

assert.equal(packageJson.version, '10.1.7');
assert.equal(applicationVersion, packageJson.version, 'Index application version must match package.json.');
assert.equal(manifest.version, packageJson.version, 'Manifest version must match package.json.');
assert.match(serviceWorker, new RegExp(`const cacheVersion = 'v${packageJson.version.replaceAll('.', '\\.')}'`));
assert.match(main, /service-worker\.js\?v=\$\{encodeURIComponent\(applicationVersion\)\}/,
    'Service Worker registration must include the published application version.');
assert.match(serviceWorker, /Promise\.allSettled\(/, 'Service Worker installation must tolerate individual cache failures.');
assert.match(pageAgent, /PAGE_AGENT_EXT\.execute/);
assert.match(main, /updateViaCache: 'none'/, 'Client registration should bypass the HTTP cache for SW updates.');
assert.match(serviceWorker, /const createManifestFallback = \(\) => new Response\(/,
    'Service Worker must provide a valid local manifest when a same-origin manifest cannot be fetched.');
assert.match(serviceWorker, /'Content-Type': 'application\/manifest\+json'/,
    'Manifest fallback must retain the manifest MIME type.');
assert.match(serviceWorker, /requestUrl\.pathname\.endsWith\('\/manifest\.json'\)/,
    'Manifest fallback must apply only to manifest requests.');

console.log(`Service Worker cache manifest OK: ${paths.length} resources verified.`);
