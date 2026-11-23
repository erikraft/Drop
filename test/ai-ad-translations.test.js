import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

assert.doesNotMatch(
    html,
    /erikraft-ai-ad|promo-ai\\.|data-ai-ad-dismiss|ai-ad-close/,
    'the removed ErikrafT AI advertisement must not remain in the page markup'
);

console.log('ErikrafT AI advertisement markup removal validated.');
