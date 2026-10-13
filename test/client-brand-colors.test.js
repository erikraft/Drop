import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/styles/styles-main.css', import.meta.url), 'utf8');

test('client type is exposed as a CSS-safe document attribute', () => {
  assert.match(html, /document\.documentElement\.dataset\.erikraftClientType = clientType/);
});

test('Discord bot and Activity use Discord purple for all default room colors', () => {
  const selector = /html\[data-erikraft-client-type="discord-(?:bot|activity)"\] body[\s\S]*?--public-room-color: #5865F2;/;
  assert.match(css, selector);
  assert.match(css, /--paired-device-color: #5865F2;/);
});

test('Open VSX uses its requested purple gradient for all room/network badges', () => {
  assert.match(css, /--public-room-color: #A60EE5;/);
  assert.match(css, /linear-gradient\(135deg, #C160EF 0%, #A60EE5 100%\)/);
  assert.match(css, /data-erikraft-client-type="open-vsx-registry-extension"\] body \.badge-room-secret/);
});

test('VS Code uses its requested blue gradient for all room/network badges', () => {
  assert.match(css, /--public-room-color: #0084D0;/);
  assert.match(css, /linear-gradient\(135deg, #23AAF2 0%, #0084D0 50%, #0076B8 100%\)/);
  assert.match(css, /data-erikraft-client-type="vs-code-extension"\] body \.badge-room-secret/);
});


test('remote peer UI maps supported client types to peer-scoped branding classes', () => {
  const ui = fs.readFileSync(new URL('../public/scripts/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /const clientType = this\._peer\?\.name\?\.clientType/);
  assert.match(ui, /\['discord-bot', 'discord-activity', 'open-vsx-registry-extension', 'vs-code-extension'\]/);
});

test('remote Discord peers keep Discord branding regardless of room type', () => {
  const deferredCss = fs.readFileSync(new URL('../public/styles/styles-deferred.css', import.meta.url), 'utf8');
  assert.match(deferredCss, /x-peer\.client-discord-bot \.icon-wrapper[\s\S]*?background-color: #5865F2;/);
  assert.match(deferredCss, /x-peer\.client-discord-activity \.device-descriptor \.name[\s\S]*?color: #5865F2;/);
});

test('remote Open VSX and VS Code peers use their gradients on logo backgrounds and names', () => {
  const deferredCss = fs.readFileSync(new URL('../public/styles/styles-deferred.css', import.meta.url), 'utf8');
  assert.match(deferredCss, /x-peer\.client-open-vsx-registry-extension \.icon-wrapper[\s\S]*?linear-gradient\(135deg, #C160EF 0%, #A60EE5 100%\)/);
  assert.match(deferredCss, /x-peer\.client-vs-code-extension \.icon-wrapper[\s\S]*?linear-gradient\(135deg, #23AAF2 0%, #0084D0 50%, #0076B8 100%\)/);
  assert.match(deferredCss, /x-peer\.client-open-vsx-registry-extension \.device-descriptor \.name/);
  assert.match(deferredCss, /x-peer\.client-vs-code-extension \.device-descriptor \.name/);
});


test('official Onion-hosted clients are identified as Onion peers by the server', () => {
  const peer = fs.readFileSync(new URL('../server/peer.js', import.meta.url), 'utf8');
  assert.match(peer, /host\.endsWith\('\.onion'\)/);
  assert.match(peer, /deviceName: 'ErikrafT Drop Onion'/);
});

test('Onion URL overrides stored client type without persisting Onion across clearnet visits', () => {
  assert.match(html, /var isOnionClient = window\.location\.hostname\.toLowerCase\(\)\.endsWith\('\.onion'\)/);
  assert.match(html, /isOnionClient \? 'onion'/);
  assert.match(html, /else if \(!isOnionClient\)/);
});

test('Onion peers use the purple gradient for their remote logo and name', () => {
  const deferredCss = fs.readFileSync(new URL('../public/styles/styles-deferred.css', import.meta.url), 'utf8');
  assert.match(deferredCss, /x-peer\.client-onion \.icon-wrapper[\s\S]*?linear-gradient\(135deg, #7D4698 0%, #59316B 100%\)/);
  assert.match(deferredCss, /x-peer\.client-onion \.device-descriptor \.name/);
});
