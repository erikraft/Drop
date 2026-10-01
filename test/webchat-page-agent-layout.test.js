import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('public/index.html', 'utf8');
const styles = fs.readFileSync('public/styles/styles-main.css', 'utf8');
const ui = fs.readFileSync('public/scripts/ui.js', 'utf8');
const pageAgent = fs.readFileSync('public/scripts/page-agent-ai.js', 'utf8');

const chatFormStart = index.indexOf('<form id="chat-form" class="chat-input">');
const chatFormEnd = index.indexOf('</form>', chatFormStart);
assert.ok(chatFormStart >= 0 && chatFormEnd > chatFormStart, 'WebChat form must exist');
const chatForm = index.slice(chatFormStart, chatFormEnd);

assert.match(chatForm, /class="erikraft-page-agent-ai" data-context="chat"/);
assert.match(chatForm, /images\/Page_Agent_Ext\.png/);
assert.ok(chatForm.indexOf('erikraft-page-agent-ai') < chatForm.indexOf('id="chat-send"'), 'Page Agent Ext must stay before Send');
assert.match(chatForm, /accept="image\/\*,image\/heic,image\/heif,\.heic,\.heif,\.mov,video\/quicktime,video\/\*"/);

assert.match(styles, /body\.chat-open > header/);
assert.match(styles, /z-index: 70/);
assert.match(styles, /\.chat-panel \{[\s\S]*?top: var\(--chat-header-height, 56px\)/);
assert.match(styles, /height: calc\(100vh - var\(--chat-header-height, 56px\)\)/);
assert.match(styles, /\.chat-input #chat-input \{[\s\S]*?min-width: 0/);
assert.match(styles, /\.chat-input #chat-send,[\s\S]*?flex: 0 0 36px/);
assert.match(styles, /\.chat-input \.erikraft-page-agent-ai \{[\s\S]*?flex: 0 0 40px[\s\S]*?max-width: 40px/);

assert.match(ui, /_syncChatHeaderHeight/);
assert.match(ui, /ResizeObserver/);
assert.match(ui, /_updateMentionSuggestions/);
assert.match(ui, /_insertMention/);
assert.match(ui, /_mentionCandidates/);
assert.match(ui, /_syncMentionPeers/);
assert.match(ui, /peersUI\?\.peers/);
assert.match(ui, /querySelectorAll\('x-peer\[id\]'\)/);
assert.match(ui, /this\.\$input\.addEventListener\('click'/);
assert.match(ui, /this\.\$input\.addEventListener\('keyup'/);
assert.match(ui, /data-selected/);
assert.match(ui, /kind: 'live-photo'/);
assert.match(ui, /_sameLivePhotoAsset/);
assert.match(ui, /video\/quicktime/);
assert.match(ui, /photoDataUrl/);
assert.match(ui, /videoDataUrl/);

const sendTextDialog = index.slice(
    index.indexOf('<x-dialog id="send-text-dialog">'),
    index.indexOf('</x-dialog>', index.indexOf('<x-dialog id="send-text-dialog">')) + '</x-dialog>'.length
);
assert.match(sendTextDialog, /class="fw textarea"[^>]*contenteditable/);
assert.doesNotMatch(sendTextDialog, /chat-mention-menu/);

const customStart = pageAgent.indexOf('const customInstructionDialog');
const customEnd = pageAgent.indexOf('const waitForExtension', customStart);
assert.ok(customStart >= 0 && customEnd > customStart, 'Custom Page Agent dialog must exist');
const customDialog = pageAgent.slice(customStart, customEnd);
assert.doesNotMatch(customDialog, /erikraft-page-agent-dialog__textarea/);
assert.doesNotMatch(customDialog, /Executar instrução/);
assert.match(customDialog, /textContent = t\('ai\.dialog-close', 'Fechar'\)/);
assert.match(customDialog, /actions\.append\(download, close\)/);
assert.match(pageAgent, /event\.key === 'Escape'/);
assert.match(pageAgent, /dialog\._pageAgentEscapeHandler/);
assert.match(pageAgent, /let wrapper = host\.querySelector\('\.erikraft-page-agent-ai'\)/);
assert.match(pageAgent, /if \(wrapper\.dataset\.pageAgentBound === 'true'\) return;/);
assert.match(pageAgent, /toggle\.addEventListener\('click', openMenu\)/);

console.log('WebChat/Page Agent layout, peer mentions, plain-text dialog, and Live Photo static checks passed.');
