import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DEFAULT_SERVER_URL, SERVER_INSTANCES, SERVER_MENU_LABELS, getServerMenuLabel, normalizeServerUrl } = require('../desktop/server-config.cjs');
const main = fs.readFileSync(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
const selector = fs.readFileSync(new URL('../desktop/server-selector.html', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../desktop/server-selector-preload.cjs', import.meta.url), 'utf8');
const serverConfig = fs.readFileSync(new URL('../desktop/server-config.cjs', import.meta.url), 'utf8');

test('Desktop server list contains the three official instances', () => {
  assert.equal(DEFAULT_SERVER_URL, 'https://drop.erikraft.com/');
  assert.deepEqual(SERVER_INSTANCES.map(({ url }) => url), [
    'https://drop.erikraft.com/',
    'https://drop-fallback.erikraft.com/',
    'https://dropfallback.erikraft.com/'
  ]);
});

test('provides localized server menu labels for all supported app locales', () => {
  assert.equal(Object.keys(SERVER_MENU_LABELS).length, 38);
  assert.equal(getServerMenuLabel('pt_BR'), 'Alterar servidor…');
  assert.equal(getServerMenuLabel('zh-TW'), '更改伺服器…');
  assert.equal(getServerMenuLabel('en-US'), 'Change server…');
});

test('normalizes valid HTTP(S) custom server URLs', () => {
  assert.equal(normalizeServerUrl(' https://example.com/path#fragment '), 'https://example.com/path');
  assert.equal(normalizeServerUrl('http://192.168.1.20:3000'), 'http://192.168.1.20:3000/');
});

test('rejects empty, malformed, unsupported, or credential-bearing URLs', () => {
  for (const value of ['', '   ', 'not a URL', 'file:///etc/passwd', 'javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com']) {
    assert.throws(() => normalizeServerUrl(value), { message: /HTTP|URL/i }, value);
  }
  assert.throws(() => normalizeServerUrl('https://' + 'a'.repeat(2049) + '.com'), /HTTP|URL/i);
});

test('Desktop startup uses the selected remote origin rather than starting a bundled server', () => {
  assert.doesNotMatch(main, /function startBundledServer/);
  assert.doesNotMatch(main, /await startBundledServer\(/);
  assert.match(main, /await mainWindow\.loadURL\(selectedServer\)/);
  assert.match(main, /app\.getPath\('userData'\)/);
  assert.match(main, /desktop-server:save/);
  assert.match(main, /async function verifyCustomServer/);
  assert.match(main, /<x-peers\(\?:\\s\|>\)/);
  assert.match(main, /getServerMenuLabel\(app\.getLocale\(\)\)/);
  assert.match(main, /new URL\(webContents\.getURL\(\)\)\.origin === new URL\(selectedServer\)\.origin/);
});

test('server selector exposes only a narrow IPC bridge and supports custom URLs', () => {
  assert.match(preload, /contextBridge\.exposeInMainWorld\('desktopServerSelector'/);
  assert.match(preload, /ipcRenderer\.invoke\('desktop-server:save', url\)/);
  assert.match(selector, /type="url"/);
  assert.match(serverConfig, /https:\/\/drop-fallback\.erikraft\.com\//);
  assert.match(selector, /desktopServerSelector\.saveServer\(url/);
});
