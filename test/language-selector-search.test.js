import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync('public/index.html', 'utf8');
const ui = fs.readFileSync('public/scripts/ui.js', 'utf8');
const styles = fs.readFileSync('public/styles/styles-deferred.css', 'utf8');

assert.match(html, /id="language-search-input"[^>]*type="search"/);
assert.match(html, /data-i18n-key="dialogs\.language-search"/);
assert.match(html, /id="language-search-empty"[^>]*data-i18n-key="dialogs\.language-search-empty"/);
assert.match(ui, /this\.\$languageSearch\?\.addEventListener\("input", \(\) => this\.filterLanguages\(\)\)/);
assert.match(ui, /filterLanguages\(\)/);
assert.match(ui, /\.normalize\("NFD"\)/);
assert.match(ui, /visibleCount > 0/);
assert.match(styles, /#language-search-input:focus-visible/);
assert.match(styles, /#language-search-input\s*\{[^}]*top:\s*-2px/s, "Search input should be nudged up to correct its visual vertical alignment");
assert.match(styles, /\.language-buttons > \.btn\[hidden\]/);

const locales = fs.readdirSync('public/lang').filter(file => file.endsWith('.json'));
assert.ok(locales.length >= 70, 'Expected the existing full website locale set');
for (const file of locales) {
    const data = fs.readFileSync(path.join('public/lang', file), 'utf8');
    for (const key of [
        'language-search_placeholder',
        'language-search_aria-label',
        'language-search-empty'
    ]) {
        const keyPattern = new RegExp(`"${key}"\\s*:\\s*"(?:\\\\.|[^"\\\\])*"`);
        assert.match(data, keyPattern, `${file}: missing localized ${key}`);
    }
}

console.log(`Language selector search checks passed for ${locales.length} website locales.`);
