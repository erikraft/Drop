import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync('public/scripts/localization.js', 'utf8');
const locales = fs.readdirSync('public/lang').filter(name => name.endsWith('.json'));
const english = JSON.parse(fs.readFileSync('public/lang/en.json', 'utf8'));

assert.match(source, /translationRequestId/, 'translation changes must be race-safe');
assert.match(source, /requestId !== Localization\\.translationRequestId/, 'older translation requests must not overwrite a newer app locale');

for (const file of locales) {
    let locale;
    assert.doesNotThrow(() => { locale = JSON.parse(fs.readFileSync(path.join('public/lang', file), 'utf8')); }, file + ' must be valid JSON');
    assert.ok(locale.header, file + ' must include header translations');
    assert.equal(locale.header['android-ftp_title'], 'FTP/FTPS', file + ' must have FTP shortcut title');
    assert.equal(locale.header['android-ftp_aria-label'], 'FTP/FTPS', file + ' must have FTP shortcut accessible name');
    assert.equal(locale.header['android-sftp_title'], 'SFTP', file + ' must have SFTP shortcut title');
    assert.equal(locale.header['android-sftp_aria-label'], 'SFTP', file + ' must have SFTP shortcut accessible name');
}
assert.equal(english.header['android-ftp_title'], 'FTP/FTPS');
assert.equal(english.header['android-sftp_title'], 'SFTP');
console.log('WebView locale synchronization and translation-file checks: PASS');
