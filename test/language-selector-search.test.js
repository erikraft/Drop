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
assert.match(styles, /\.language-buttons > \.btn\[hidden\]/);

const locales = fs.readdirSync('public/lang').filter(file => file.endsWith('.json'));
assert.ok(locales.length >= 70, 'Expected the existing full website locale set');
for (const file of locales) {
    const data = JSON.parse(fs.readFileSync(path.join('public/lang', file), 'utf8'));
    assert.ok(data.dialogs?.['language-search_placeholder'], `${file}: missing localized search placeholder`);
    assert.ok(data.dialogs?.['language-search_aria-label'], `${file}: missing accessible search label`);
    assert.ok(data.dialogs?.['language-search-empty'], `${file}: missing no-results message`);
}

console.log(`Language selector search checks passed for ${locales.length} website locales.`);
