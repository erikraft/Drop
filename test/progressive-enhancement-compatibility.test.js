#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'public/styles/styles-main.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const failures = [];

if (/header:has\(/.test(css) && !/@supports\s+not\s+selector\(\s*:has\(/.test(css)) {
  failures.push('styles-main.css uses header:has() without an explicit unsupported-:has() feature-query fallback.');
}

if (/width:\s*var\(--x-peers-width\)/.test(css) && /--x-peers-width:\s*min\(/.test(css)) {
  failures.push('styles-main.css uses min() for peer width without a legacy width declaration/fallback.');
}

if (!/styles\/styles-main\.css/.test(html)) {
  failures.push('styles-main.css is no longer loaded by the application shell.');
}

if (failures.length) {
  console.error('Compatibility audit failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('Compatibility audit passed.');