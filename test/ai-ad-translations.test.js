import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const localizationSource = fs.readFileSync('public/scripts/localization.js', 'utf8');
const supportedBlock = localizationSource.match(/Localization\.supportedLocales = \[([\s\S]*?)\];/);
assert.ok(supportedBlock, 'supportedLocales list must exist');
const supportedLocales = [...supportedBlock[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
assert.ok(supportedLocales.length > 0, 'at least one supported locale must exist');

const requiredKeys = ['eyebrow', 'description', 'cta', 'dismiss'];
for (const locale of supportedLocales) {
    const file = path.join('public', 'lang', locale + '.json');
    assert.ok(fs.existsSync(file), locale + ': translation file must exist');
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(doc['promo-ai'], locale + ': promo-ai translations must exist');
    for (const key of requiredKeys) {
        assert.equal(typeof doc['promo-ai'][key], 'string', locale + ': ' + key + ' must be a string');
        assert.ok(doc['promo-ai'][key].trim().length > 0, locale + ': ' + key + ' must not be empty');
    }
}

const ptBR = JSON.parse(fs.readFileSync('public/lang/pt-BR.json', 'utf8'))['promo-ai'];
assert.equal(ptBR.eyebrow, 'PUBLICIDADE');
assert.equal(ptBR.description, 'Transforme suas ideias em imagens com inteligência artificial.');
const en = JSON.parse(fs.readFileSync('public/lang/en.json', 'utf8'))['promo-ai'];
assert.equal(en.eyebrow, 'ADVERTISEMENT');
assert.equal(en.description, 'Turn your ideas into images with AI.');

const html = fs.readFileSync('public/index.html', 'utf8');
for (const key of requiredKeys) {
    assert.ok(html.includes('data-i18n-key="promo-ai.' + key + '"'),
        'popup markup must use localization key promo-ai.' + key);
}
assert.ok(!html.includes('var copy={'), 'popup translations must not be duplicated in inline JavaScript');
assert.ok(!html.includes('data-ai-ad-copy='), 'legacy popup-only translation attributes must be removed');

console.log('ErikrafT AI advertisement translations validated for ' + supportedLocales.length + ' supported locales.');
