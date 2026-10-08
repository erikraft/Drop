import assert from 'node:assert/strict';
import fs from 'node:fs';

const controls = fs.readFileSync('public/scripts/animated-qr-controls.js', 'utf8');
const awake = fs.readFileSync('public/scripts/animated-qr-screen-awake.js', 'utf8');
const index = fs.readFileSync('public/index.html', 'utf8');

assert.match(controls, /#animated-qr-send-dialog #qr-send-canvas-container\{?/);
assert.match(controls, /width:min\(360px,calc\(100% - 16px\),calc\(100vw - 48px\),calc\(100dvh - 300px\)\)!important/);
assert.match(controls, /max-width:100%!important/);
assert.match(controls, /min-width:0!important/);
assert.match(controls, /min-width:0!important;\s*min-height:0!important/);
assert.match(controls, /@media\(max-width:600px\)/);
assert.match(controls, /@media\(max-height:700px\)/);
assert.match(controls, /position:relative;\s*z-index:3;\s*isolation:isolate/);
assert.match(controls, /overflow:visible!important/);
assert.match(controls, /height:auto!important/);
assert.match(controls, /aspect-ratio:1 \/ 1/);
assert.match(controls, /overflow:visible!important/);

assert.match(awake, /--text-color/);
assert.match(awake, /--bg-color-secondary/);
assert.match(awake, /var\(--primary-color\)/);
assert.match(awake, /prefers-color-scheme:dark/);
assert.match(awake, /#\$\{BUTTON_ID\}\[hidden\]/);
assert.match(awake, /aria-pressed/);
assert.match(awake, /Não desligar Tela \(Clique aqui\)/);
assert.match(awake, /Screen always on: Enabled/);
assert.match(awake, /isKeepScreenOnEnabled/);
assert.match(awake, /btn btn-rounded btn-dark/);

assert.match(index, /id="qr-send-canvas-container"/);
assert.match(index, /id="qr-send-active-view"[^>]*hidden/);
assert.match(index, /<div class="hr-note">\s*<hr>\s*<div>\s*<span data-i18n-key="dialogs\.hr-or" data-i18n-attrs="text">OU<\/span>/);
assert.doesNotMatch(index, /optical-matrix/);

console.log('Animated QR responsive/theme static checks passed.');
