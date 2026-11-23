import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const localizationSource = fs.readFileSync('public/scripts/localization.js', 'utf8');
const supportedBlock = localizationSource.match(/Localization\.supportedLocales = \[([\s\S]*?)\];/);
assert.ok(supportedBlock, 'supportedLocales list must exist');
const supportedLocales = [...supportedBlock[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
assert.ok(supportedLocales.length > 0, 'at least one supported locale must exist');

const html = fs.readFileSync('public/index.html', 'utf8');
assert.doesNotMatch(
    html,
    /erikraft-ai-ad|promo-ai\.|data-ai-ad-dismiss|ai-ad-close/,
    'the removed ErikrafT AI advertisement must not remain in the page markup'
);

for (const locale of supportedLocales) {
    const file = path.join('public', 'lang', locale + '.json');
    assert.ok(fs.existsSync(file), locale + ': translation file must exist');
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(
        Object.hasOwn(doc, 'promo-ai'),
        false,
        locale + ': removed advertisement translations must not remain'
    );
}

console.log('Removed ErikrafT AI advertisement markup and translations validated for ' + supportedLocales.length + ' supported locales.');
