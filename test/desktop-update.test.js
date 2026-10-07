import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lockfile = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const mainCjs = fs.readFileSync(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
const builderConfig = fs.readFileSync(new URL('../electron-builder.yml', import.meta.url), 'utf8');
const indexHtml = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'));

test('desktop/web release version is 10.1.7', () => {
  assert.equal(packageJson.version, '10.1.7');
  assert.equal(manifest.version, '10.1.7');
  assert.match(serviceWorker, /cacheVersion = 'v10\.1\.7'/);
  assert.match(serviceWorker, /version: '10\.1\.7'/);
  assert.match(indexHtml, /"softwareVersion": "10\.1\.7"/);
  assert.ok(indexHtml.includes('class="font-subheading">v10.1.7</div>'));
});

test('WinSparkle is the Windows desktop update mechanism', () => {
  assert.equal(packageJson.dependencies.koffi, '2.16.3');
  assert.equal(lockfile.packages['node_modules/koffi'].version, '2.16.3');
  assert.match(mainCjs, /WINSPARKLE_APPCAST_URL = 'https:\/\/github\.com\/erikraft\/Drop\/releases\/latest\/download\/winsparkle-appcast\.xml'/);
  assert.match(mainCjs, /WINSPARKLE_PUBLIC_KEY = 'qviSQDE3gE0r4NBLiLlBRMkPWQ7MbNnSZGnP4zlD4XI='/);
  assert.match(mainCjs, /win_sparkle_set_appcast_url/);
  assert.match(mainCjs, /win_sparkle_set_eddsa_public_key/);
  assert.match(mainCjs, /win_sparkle_init/);
  assert.match(mainCjs, /win_sparkle_cleanup/);
  assert.match(builderConfig, /from: desktop\/WinSparkle/);
  assert.doesNotMatch(indexHtml, /desktop-update-popup|raw\.githubusercontent\.com\/erikraft\/Drop\/master\/package\.json|Update Software/);
});
