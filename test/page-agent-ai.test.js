import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('public/scripts/page-agent-ai.js', 'utf8');

assert.match(source, /PageAgentExtUserAuthToken/);
assert.match(source, /PAGE_AGENT_EXT\.execute/);
assert.match(source, /ai\.improve/);
assert.match(source, /ai\.correct/);
assert.match(source, /ai\.polish/);
assert.match(source, /ai\.code/);
assert.match(source, /ai\.custom/);
assert.match(source, /cdn\.jsdelivr\.net\/npm\/page-agent@1\.12\.4/);
assert.match(source, /registry\.npmmirror\.com\/page-agent\/1\.12\.4/);
assert.match(source, /chromewebstore\.google\.com\/detail\/page-agent-ext/);
assert.match(source, /No clique em enviar|Não clique em enviar/);

console.log('Page Agent AI integration static checks passed.');
