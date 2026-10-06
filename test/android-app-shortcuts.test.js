import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const androidShortcuts=fs.readFileSync(new URL('../public/scripts/android-app-shortcuts.js',import.meta.url),'utf8');
const torMarkup=index.match(/<button\b[^>]*\bid="tor-config-btn"[^>]*>([\s\S]*?)<\/button>/);
assert.ok(torMarkup, 'The Tor shortcut must be a native button');
assert.match(torMarkup[0], /type="button"/);
assert.match(torMarkup[1], /<use xlink:href="#tor-icon">/);

const torAttributes=new Map();
let torContents=torMarkup[1];
let torClick;
let languageChanged;
let onionTransfers=0;
const torButton={
    matches: selector => selector==='button',
    set textContent(value) { torContents=value; },
    setAttribute: (name,value) => torAttributes.set(name,value),
    addEventListener: (type,listener,capture) => {
        assert.equal(type,'click');
        assert.equal(capture,true);
        torClick=listener;
    }
};
const protocolsShortcut={matches: () => false,removeAttribute() {}};
const documentElement={lang:'en'};
vm.runInNewContext(androidShortcuts, {
    window: {ErikrafTdropAndroid: {
        openOnionTransfer: () => onionTransfers++,
        openFtpSettings() {},
        openSftpSettings() {}
    }},
    navigator: {language:'en'},
    document: {
        readyState:'complete',
        documentElement,
        getElementById: id => ({'tor-config-btn':torButton,'android-protocols-shortcut':protocolsShortcut}[id])
    },
    MutationObserver: class {
        constructor(callback) { languageChanged=callback; }
        observe(target,options) {
            assert.equal(target,documentElement);
            assert.equal(options.attributes,true);
            assert.deepEqual(Array.from(options.attributeFilter),['lang']);
        }
    }
});

for (const [lang,label] of [
    ['en','Tor Network (Onion Service)'],
    ['pt-BR','Transferência via Onion'],
    ['fr','Réseau Tor (service Onion)'],
    ['unknown','Tor Network (Onion Service)']
]) {
    documentElement.lang=lang;
    languageChanged();
    assert.equal(torButton.title,label);
    assert.equal(torAttributes.get('aria-label'),label);
    assert.equal(torContents,torMarkup[1], 'Translation must preserve the Tor icon');
}

let defaultPrevented=false;
let propagationStopped=false;
torClick({
    preventDefault: () => { defaultPrevented=true; },
    stopImmediatePropagation: () => { propagationStopped=true; }
});
assert.equal(onionTransfers,1);
assert.equal(defaultPrevented,true);
assert.equal(propagationStopped,true);

console.log('Android shortcut accessibility regressions: PASS');
