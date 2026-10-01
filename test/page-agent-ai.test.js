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
assert.doesNotMatch(source, /sessionStorage\.setItem\(SESSION_KEY/);
assert.doesNotMatch(source, /value: getApiKey\(\)/);
assert.match(source, /chromewebstore\.google\.com\/detail\/page-agent-ext/);
assert.match(source, /positionMenu/);
assert.match(source, /maxHeight/);
assert.match(source, /is-fullscreen/);
assert.match(source, /ai\.fullscreen/);
assert.match(source, /ai\.exit-fullscreen/);
assert.doesNotMatch(source, /window\.prompt/);
assert.doesNotMatch(source, /ai\.improve/);
assert.doesNotMatch(source, /ai\.correct/);
assert.doesNotMatch(source, /ai\.polish/);
assert.doesNotMatch(source, /ai\.code/);

assert.match(source, /data-erikraft-page-agent-target/);
assert.match(source, /Deixe em branco para manter a chave desta sessão/);
console.log('Page Agent dialog/responsive/security static checks passed.');

assert.match(source, /CDN_BOOKMARKLET/);
assert.match(source, /drag-to-bookmarks/);
assert.match(source, /draggable = true/);
assert.match(source, /background-color:var\\(--dialog-bg-color\\)/);
assert.doesNotMatch(source, /navigator\\.clipboard\\.writeText/);
assert.doesNotMatch(source, /ai\\.copy/);
assert.match(source, /MIRROR_BOOKMARKLET/);
assert.match(source, /data-context="send-text"/);
assert.match(source, /prefers-color-scheme/);
assert.doesNotMatch(source, /rgb\\(var\\(--dialog-bg-color\\)\\)/);
assert.match(source, /var\\(--dialog-bg-color\\)/);
assert.match(source, /var\\(--bg-color-secondary\\)/);
assert.match(source, /useBookmarklet/);
assert.match(source, /ai\\.use/);
assert.match(source, /ai\\.bookmarklet-loaded/);
console.log('Page Agent bookmarklet/theme/send-dialog checks passed.');
