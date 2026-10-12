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
