import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const iconPath = path.join(root, 'public/images/icon-drop.svg');

await fs.access(iconPath);
console.log('Using existing SVG icon: public/images/icon-drop.svg');
