import assert from 'node:assert/strict';
import fs from 'node:fs';

const network=fs.readFileSync(new URL('../public/scripts/network.js',import.meta.url),'utf8');
const uiMain=fs.readFileSync(new URL('../public/scripts/ui-main.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const en=fs.readFileSync(new URL('../public/lang/en.json',import.meta.url),'utf8');
const pt=fs.readFileSync(new URL('../public/lang/pt-BR.json',import.meta.url),'utf8');
const cursor=fs.readFileSync(new URL('../Website About/NEW/js/cursor.js',import.meta.url),'utf8');
const desktopMain=fs.readFileSync(new URL('../desktop/main.cjs',import.meta.url),'utf8');

assert.match(network,/window\.erikrafTDisplayName = msg\.displayName/);
assert.match(uiMain,/window\.erikrafTDisplayName === 'string'/);
assert.match(uiMain,/this\._onDisplayName\(window\.erikrafTDisplayName\)/);
assert.match(uiMain,/placeholder', serverDisplayName/);
assert.match(uiMain,/Could not load the saved device name/);
assert.match(index,/lang\/en\.json" as="fetch" crossorigin="use-credentials"/);

for (const translations of [en,pt]) {
    assert.match(translations,/"optical-matrix-title":/);
    assert.match(translations,/"optical-matrix-experimental":/);
    assert.match(translations,/"optical-matrix-description":/);
    assert.match(translations,/"optical-matrix-open":/);
}

assert.match(cursor,/requestAnimationFrame\(render\)/);
assert.match(desktopMain,/new URL\(url\)/, 'External desktop URLs must be parsed before opening.');
assert.match(desktopMain,/\['http:', 'https:', 'mailto:'\]\.includes\(externalUrl\.protocol\)/);
assert.doesNotMatch(desktopMain,/shell\.openExternal\(url\)/, 'Unvalidated external URLs must never be passed to shell.openExternal.');
assert.doesNotMatch(cursor,/const loop\s*=|requestAnimationFrame\(update\)/, 'BioDrop cursor must not run an idle animation loop.');
console.log('desktop startup regressions: PASS');
