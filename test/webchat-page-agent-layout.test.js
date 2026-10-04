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
assert.match(chatForm, /erikraft-page-agent-logo erikraft-page-agent-logo--icon/);
assert.doesNotMatch(chatForm, /<img[^>]+Page_Agent_Ext\.png/);
assert.ok(chatForm.indexOf('erikraft-page-agent-ai') < chatForm.indexOf('id="chat-send"'), 'Page Agent Ext must stay before Send');
assert.match(chatForm, /accept="image\/\*,image\/heic,image\/heif,\.heic,\.heif,\.mov,video\/quicktime,video\/\*"/);

assert.match(styles, /body\.chat-open \{[\\s\\S]*?padding-right: 0/);
assert.match(styles, /body\.chat-open > header/);
assert.match(styles, /body\.chat-open > header \{[\\s\\S]*?padding-right: 12px/);
assert.match(styles, /z-index: 70/);
assert.match(styles, /\.chat-panel \{[\s\S]*?top: var\(--chat-header-height, 56px\)/);
assert.match(styles, /height: calc\(100vh - var\(--chat-header-height, 56px\)\)/);
assert.match(styles, /\.chat-input #chat-input \{[\s\S]*?min-width: 0/);
assert.match(styles, /html\[lang="ar"\] body\.chat-open \{[\s\S]*?padding-left: var\(--chat-sidebar-width\)/);
assert.match(styles, /html\[lang="ar"\] body\.chat-open > header \{[\s\S]*?padding-left: calc\(var\(--chat-sidebar-width\) \+ 12px\)/);
assert.match(styles, /html\[lang="ar"\] \.chat-panel \{[\s\S]*?right: auto;[\s\S]*?left: 0;[\s\S]*?border-left: 0;[\s\S]*?border-right:/);
assert.match(styles, /@media \(max-width: 768px\) \{[\s\S]*?html\[lang="ar"\] body\.chat-open \{[\s\S]*?padding-left: 0;[\s\S]*?html\[lang="ar"\] body\.chat-open > header \{[\s\S]*?padding-left: 12px;/);

assert.match(styles, /\.chat-input #chat-send,[\s\S]*?flex: 0 0 36px/);
assert.match(styles, /\.chat-input \.erikraft-page-agent-ai \{[\s\S]*?flex: 0 0 40px[\s\S]*?max-width: 40px/);
assert.match(styles, /@media \(max-width: 768px\) \{[\s\S]*?\.chat-input \.erikraft-page-agent-ai \{[\s\S]*?display: none !important/);

assert.match(ui, /_syncChatHeaderHeight/);
assert.match(ui, /ResizeObserver/);
assert.match(ui, /_updateMentionSuggestions/);
assert.match(ui, /_insertMention/);
assert.match(ui, /_mentionCandidates/);
assert.match(ui, /_syncMentionPeers/);
assert.match(ui, /querySelectorAll\('x-peer\[id\]'\)/);
assert.match(ui, /this\.\$input\.addEventListener\('click'/);
assert.match(ui, /this\.\$input\.addEventListener\('keyup'/);
assert.match(ui, /data-selected/);
assert.match(ui, /kind: 'live-photo'/);
assert.match(ui, /_sameLivePhotoAsset/);

const chatUiStart = ui.indexOf('class ChatUI');
const chatUiEnd = ui.indexOf('class ', chatUiStart + 'class ChatUI'.length);
const pairDeviceStart = ui.indexOf('class PairDevice');
assert.ok(chatUiStart >= 0 && chatUiEnd > chatUiStart, 'ChatUI class must exist');
assert.ok(pairDeviceStart >= 0 && pairDeviceStart < chatUiStart, 'PairDevice must remain before ChatUI');
const chatUi = ui.slice(chatUiStart, chatUiEnd);
const pairDevice = ui.slice(pairDeviceStart, chatUiStart);

assert.match(chatUi, /_mentionToken\(value\)/);
assert.match(chatUi, /_mentionCandidates\(query\)/);
assert.match(chatUi, /_updateMentionSuggestions\(\)/);
assert.match(chatUi, /_onMentionKeyDown\(event\)/);
assert.match(chatUi, /_highlightMention\(\)/);
assert.match(chatUi, /_insertMention\(candidate\)/);
assert.match(chatUi, /this\.\$input\.addEventListener\('input'/);
assert.match(chatUi, /this\.\$input\.addEventListener\('keydown'/);
assert.match(chatUi, /event\.key === 'ArrowDown'/);
assert.match(chatUi, /event\.key === 'ArrowUp'/);
assert.match(chatUi, /event\.key === 'Enter'/);
assert.match(chatUi, /event\.key === 'Escape'/);
assert.doesNotMatch(pairDevice, /_mentionToken\(value\)/);
assert.doesNotMatch(pairDevice, /_updateMentionSuggestions\(\)/);
assert.match(chatForm, /id="chat-input"[^>]*type="text"[^>]*autocomplete="off"[^>]*spellcheck="true"/);
assert.match(chatForm, /id="chat-mention-menu" class="chat-mention-menu" hidden/);
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
assert.doesNotMatch(customDialog, /erikraft-page-agent-dialog__bookmarklet-use/);
assert.doesNotMatch(customDialog, /Executar nesta página/);
assert.match(customDialog, /actions\.append\(copy\);/);
assert.match(styles, /\.chat-input \.erikraft-page-agent-ai > button \.erikraft-page-agent-logo \{[\s\S]*?display: inline-block/);

assert.match(pageAgent, /event\.key === 'Escape'/);
assert.match(pageAgent, /dialog\._pageAgentEscapeHandler/);
assert.match(pageAgent, /let wrapper = host\.querySelector\('\.erikraft-page-agent-ai'\)/);
assert.match(pageAgent, /if \(wrapper\.dataset\.pageAgentBound === 'true'\) return;/);
assert.match(pageAgent, /toggle\.addEventListener\('click', openMenu\)/);
assert.match(pageAgent, /createProtectedLogo\('horizontal'/);
assert.match(pageAgent, /erikraft-page-agent-logo--icon/);
assert.match(pageAgent, /contextmenu.*preventDefault/);
assert.doesNotMatch(pageAgent, /<img[^>]+page_agent_js_horizontal_logo\.png/);
assert.doesNotMatch(pageAgent, /<img[^>]+Page_Agent_Ext\.png/);
assert.match(pageAgent, /\.erikraft-page-agent-logo \{[\s\S]*?user-select:none[\s\S]*?-webkit-user-drag:none[\s\S]*?pointer-events:none/);
assert.match(pageAgent, /\.erikraft-page-agent-logo--icon \{[\s\S]*?Page_Agent_Ext\.png/);
assert.match(pageAgent, /\.erikraft-page-agent-logo--horizontal \{[\s\S]*?page_agent_js_horizontal_logo_light_theme\.png/);
assert.match(pageAgent, /body\.dark-theme \.erikraft-page-agent-logo--horizontal \{[\s\S]*?page_agent_js_horizontal_logo\.png/);
assert.match(pageAgent, /@media \(prefers-color-scheme: dark\)[\s\S]*?body:not\(\.light-theme\) \.erikraft-page-agent-logo--horizontal \{[\s\S]*?page_agent_js_horizontal_logo\.png/);
assert.match(pageAgent, /\.erikraft-page-agent-logo--mirror \{[\s\S]*?Page_Agent_Ext_NPMmirror\.png/);
assert.match(pageAgent, /\.erikraft-page-agent-logo--cdn \{[\s\S]*?Page_Agent_Ext_jsdelivr\.png/);
assert.match(pageAgent, /button\.querySelector\('\.erikraft-page-agent-logo'\)/);
assert.doesNotMatch(index, /<img[^>]+Page_Agent_Ext_(NPMmirror|jsdelivr)\.png/);

console.log('WebChat/Page Agent layout, peer mentions, plain-text dialog, and Live Photo static checks passed.');
