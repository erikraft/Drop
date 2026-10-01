import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('public/scripts/page-agent-ai.js', 'utf8');

assert.match(source, /PAGE_AGENT_EXT\.execute/);
assert.match(source, /createDialog/);
assert.match(source, /customInstructionDialog/);
assert.match(source, /promptConfig/);
assert.match(source, /PageAgentExtUserAuthToken/);
assert.match(source, /chromewebstore\.google\.com\/detail\/page-agent-ext/);
assert.match(source, /positionMenu/);
assert.match(source, /maxHeight/);
assert.doesNotMatch(source, /window\.prompt/);
assert.doesNotMatch(source, /ai\.improve/);
assert.doesNotMatch(source, /ai\.correct/);
assert.doesNotMatch(source, /ai\.polish/);
assert.doesNotMatch(source, /ai\.code/);
assert.match(source, /data-erikraft-page-agent-target/);
console.log('Page Agent dialog/responsive static checks passed.');
