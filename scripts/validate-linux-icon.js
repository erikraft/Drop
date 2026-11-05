import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const iconPath = 'packaging/linux/icons/icon-drop.svg';
const icon = await fs.readFile(path.join(root, iconPath), 'utf8');

if (!/^\s*<svg\b/.test(icon) || !/\bviewBox="[^"]+"/.test(icon)) {
  throw new Error(`Invalid Linux SVG icon: ${iconPath}`);
}

console.log(`Linux .deb source icon (SVG): ${iconPath}`);
