import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const index = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const shortcuts = fs.readFileSync(new URL('../public/scripts/android-app-shortcuts.js', import.meta.url), 'utf8');

for (const [id, key] of [['android-ftp-shortcut', 'header.android-ftp'], ['android-sftp-shortcut', 'header.android-sftp']]) {
    const markup = index.match(new RegExp('<button\\b[^>]*\\bid="' + id + '"[^>]*>([\\s\\S]*?)<\\/button>'));
    assert.ok(markup, id + ' must be a native button');
    assert.match(markup[0], /type="button"/);
    assert.match(markup[0], /class="[^"]*icon-button/);
    assert.ok(markup[0].includes('data-i18n-key="' + key + '"'), id + ' must have a localization key');
    assert.match(markup[0], /<use xlink:href="#folder-icon">/);
}
assert.doesNotMatch(index, /android-protocols-dialog|android-protocols-shortcut/);

const attrs = new Map();
const handlers = {};
const elements = Object.fromEntries(['tor-config-btn', 'android-ftp-shortcut', 'android-sftp-shortcut'].map(id => [id, {
    hidden: id !== 'tor-config-btn',
    dataset: {},
    removeAttribute: name => attrs.set(id + ':' + name, false),
    setAttribute: (name, value) => attrs.set(id + ':' + name, value),
    addEventListener: (type, listener, capture) => { handlers[id] = { type, listener, capture }; },
    click: () => handlers[id]?.listener({ preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} })
}]));
let onion = 0, ftp = 0, sftp = 0;
vm.runInNewContext(shortcuts, {
    window: { ErikrafTdropAndroid: {
        openOnionTransfer: () => onion++,
        openFtpSettings: () => ftp++,
        openSftpSettings: () => sftp++
    } },
    document: {
        readyState: 'complete',
        getElementById: id => elements[id] || null
    }
});
assert.equal(elements['android-ftp-shortcut'].hidden, false);
assert.equal(elements['android-sftp-shortcut'].hidden, false);
assert.equal(attrs.get('android-ftp-shortcut:aria-hidden'), false);
elements['android-ftp-shortcut'].click();
elements['android-sftp-shortcut'].click();
handlers['tor-config-btn'].listener({ preventDefault() {}, stopImmediatePropagation() {} });
assert.equal(ftp, 1);
assert.equal(sftp, 1);
assert.equal(onion, 1);
console.log('Android native WebView shortcut regressions: PASS');
