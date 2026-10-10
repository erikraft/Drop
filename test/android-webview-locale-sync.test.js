import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('public/scripts/localization.js', 'utf8');
const regionLocales = ['af-ZA', 'el-GR', 'fi-FI', 'pt-PT', 'sr-SP', 'sv-SE', 'vi-VN'];

const supportedLocalesBlock = source.match(/Localization\.supportedLocales\s*=\s*\[([\s\S]*?)\];/);
assert.ok(supportedLocalesBlock, 'Localization.supportedLocales must be declared');

for (const locale of regionLocales) {
    assert.ok(
        supportedLocalesBlock[1].includes(`"${locale}"`),
        `Expected the WebView locale bridge to support ${locale}`
    );
    assert.ok(
        fs.existsSync(`public/lang/${locale}.json`),
        `Expected a translation file for ${locale}`
    );
}

console.log('Android WebView locale-sync support checks passed.');
