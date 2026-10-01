const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('public/index.html', 'utf8');
const ui = fs.readFileSync('public/scripts/ui.js', 'utf8');
const main = fs.readFileSync('public/scripts/main.js', 'utf8');
const media = fs.readFileSync('public/scripts/received-media-metadata.js', 'utf8');
const pageAgent = fs.readFileSync('public/scripts/page-agent-ai.js', 'utf8');
const css = fs.readFileSync('public/styles/styles-main.css', 'utf8');

assert(index.includes('id="metadata-btn" class="btn btn-rounded btn-grey"'));
assert(!index.match(/id="metadata-btn"[^>]*hidden/));
assert(media.includes('id=\'ek-actions\''));
assert(media.includes("options.danger?' ek-danger':'"));
assert(media.includes("btn(tr('remove_private'"));
assert(media.includes("btn(tr('remove_all'"));
assert(media.includes('const isMobileDevice='));
assert(media.includes('package=com.instagram.android'));
assert(media.includes("instagram://story-camera"));
assert(media.includes('Create Live/Motion Photo'));
assert(media.includes('createMotionPhotoFromSingle'));
assert(ui.includes('window.__erikrafTReceivedMediaTest?.inspector'));
assert(ui.includes('this.$headerNotificationButton?.classList.add(\'notification-attention\')'));
assert(main.includes('notification-attention'));
assert(css.includes('#notification.notification-attention::after'));
assert(!pageAgent.includes("addAction(t('ai.settings'"));
assert(!pageAgent.includes('const promptConfig ='));
assert(!pageAgent.includes('Configurar LLM e autorização'));

console.log('metadata/media/notifications regression checks passed');
