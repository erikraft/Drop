import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const indexHtml = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'));

test('desktop/web release version is 10.1.6', () => {
  assert.equal(packageJson.version, '10.1.6');
  assert.equal(manifest.version, '10.1.6');
  assert.match(serviceWorker, /cacheVersion = 'v10\.1\.6'/);
  assert.match(serviceWorker, /version: '10\.1\.6'/);
  assert.match(indexHtml, /"softwareVersion": "10\.1\.6"/);
  assert.match(indexHtml, /class="font-subheading">v10\.1\.6<\\/div>/);
});

test('desktop startup exposes an optional update check', () => {
  assert.match(indexHtml, /CURRENT_DESKTOP_VERSION = '10\.1\.6'/);
  assert.match(indexHtml, /raw\.githubusercontent\.com\/erikraft\/Drop\/master\/package\.json/);
  assert.match(indexHtml, /Update Software/);
  assert.match(indexHtml, /Electron\\\\\\//);
  assert.match(indexHtml, /Update checks are optional and must never block startup/);
});
