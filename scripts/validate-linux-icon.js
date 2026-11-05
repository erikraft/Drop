import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const icon = {
  label: 'Linux .deb source icon (shared ICO)',
  path: 'desktop/assets/icon.ico',
};

await fs.access(path.join(root, icon.path));
console.log(`${icon.label}: ${icon.path}`);
