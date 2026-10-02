import assert from 'node:assert/strict';
import fs from 'node:fs';

const network=fs.readFileSync(new URL('../public/scripts/network.js',import.meta.url),'utf8');
const uiMain=fs.readFileSync(new URL('../public/scripts/ui-main.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const en=fs.readFileSync(new URL('../public/lang/en.json',import.meta.url),'utf8');
const pt=fs.readFileSync(new URL('../public/lang/pt-BR.json',import.meta.url),'utf8');

assert.match(network,/window\.erikrafTDisplayName = msg\.displayName/);
assert.match(uiMain,/window\.erikrafTDisplayName === 'string'/);
assert.match(uiMain,/this\._onDisplayName\(window\.erikrafTDisplayName\)/);
assert.match(index,/lang\/en\.json" as="fetch" crossorigin="use-credentials"/);

for (const translations of [en,pt]) {
    assert.match(translations,/"torrent":/);
    assert.match(translations,/"torrent_aria-label":/);
    assert.match(translations,/"optical-matrix-title":/);
    assert.match(translations,/"optical-matrix-experimental":/);
    assert.match(translations,/"optical-matrix-description":/);
    assert.match(translations,/"optical-matrix-open":/);
}

console.log('desktop startup regressions: PASS');
