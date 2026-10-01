import assert from 'node:assert/strict';
import fs from 'node:fs';

const controls = fs.readFileSync('public/scripts/animated-qr-controls.js', 'utf8');
const awake = fs.readFileSync('public/scripts/animated-qr-screen-awake.js', 'utf8');
const index = fs.readFileSync('public/index.html', 'utf8');

assert.match(controls, /#animated-qr-send-dialog #qr-send-canvas-container\{?/);
assert.match(controls, /width:min\(360px,calc\(100vw - 48px\),calc\(100dvh - 300px\)\)!important/);
assert.match(controls, /max-width:calc\(100vw - 48px\)!important/);
assert.match(controls, /min-width:0!important/);
assert.match(controls, /min-width:0!important;\s*min-height:0!important/);
assert.match(controls, /@media\(max-width:600px\)/);
assert.match(controls, /@media\(max-height:700px\)/);
assert.match(controls, /overflow:hidden/);
assert.match(controls, /height:100%!important/);

assert.match(awake, /--text-color/);
assert.match(awake, /--bg-color-secondary/);
assert.match(awake, /var\(--primary-color\)/);
assert.match(awake, /prefers-color-scheme:dark/);
assert.match(awake, /#\$\{BUTTON_ID\}\[hidden\]/);
assert.match(awake, /aria-pressed/);
assert.match(awake, /btn btn-rounded btn-dark/);

assert.match(index, /id="qr-send-canvas-container"/);
assert.match(index, /id="qr-send-active-view"[^>]*hidden/);

console.log('Animated QR responsive/theme static checks passed.');
