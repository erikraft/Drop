import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync('public/scripts/page-agent-ai.js', 'utf8');
const en = JSON.parse(fs.readFileSync('public/lang/en.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('public/lang/pt-BR.json', 'utf8'));

const cdn = 'https://cdn.jsdelivr.net/npm/page-agent@1.12.4/dist/iife/page-agent.demo.js?lang=en-US&t=';
const mirror = 'https://registry.npmmirror.com/page-agent/1.12.4/files/dist/iife/page-agent.demo.js?lang=en-US&t=';
assert.match(script, /const CDN_BOOKMARKLET = 'javascript:/);
assert.match(script, /const MIRROR_BOOKMARKLET = 'javascript:/);
assert.ok(script.includes(cdn.replace(/\?lang.*/, '')));
assert.ok(script.includes(mirror.replace(/\?lang.*/, '')));
assert.match(script, /integration-title/);
assert.match(script, /integration-cdn/);
assert.match(script, /integration-mirror/);
assert.match(script, /navigator\.clipboard\.writeText/);
assert.match(script, /DevTools/);
assert.match(script, /data-page-agent-provider/);
for (const lang of [en, pt]) {
    for (const key of ['integration-title','integration-description','integration-cdn','integration-mirror','copy-code','copied-code','run-code']) {
        assert.equal(typeof lang.ai?.[key], 'string');
    }
}
console.log('Page Agent browser/IDE integration checks passed.');
