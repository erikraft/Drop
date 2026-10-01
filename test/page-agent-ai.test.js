import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('public/scripts/page-agent-ai.js', 'utf8');

assert.match(source, /PAGE_AGENT_EXT\.execute/);
assert.match(source, /createDialog/);
assert.match(source, /customInstructionDialog/);
assert.match(source, /promptConfig/);
assert.match(source, /PageAgentExtUserAuthToken/);
assert.match(source, /sessionApiKey/);
assert.doesNotMatch(source, /sessionStorage\.getItem\(SESSION_KEY\)/);
assert.doesNotMatch(source, /sessionStorage\\.setItem\\(SESSION_KEY/);
assert.doesNotMatch(source, /value: getApiKey\(\)/);
assert.match(source, /chromewebstore\.google\.com\/detail\/page-agent-ext/);
assert.match(source, /positionMenu/);
assert.match(source, /maxHeight/);
assert.doesNotMatch(source, /window\.prompt/);
assert.doesNotMatch(source, /ai\.improve/);
assert.doesNotMatch(source, /ai\.correct/);
assert.doesNotMatch(source, /ai\.polish/);
assert.doesNotMatch(source, /ai\.code/);
assert.match(source, /data-erikraft-page-agent-target/);
assert.match(source, /Deixe em branco para manter a chave desta sessão/);
console.log('Page Agent dialog/responsive/security static checks passed.');
