import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const linuxIcons = [
  {
    label: 'Primary Linux SVG icon',
    path: 'packaging/linux/icons/icon-drop.svg',
  },
  {
    label: 'Linux 512px PNG fallback icon',
    path: 'packaging/linux/icons/android-chrome-512x512.png',
  },
  {
    label: 'Linux 512px maskable PNG fallback icon',
    path: 'packaging/linux/icons/android-chrome-512x512-maskable.png',
  },
];

for (const icon of linuxIcons) {
  await fs.access(path.join(root, icon.path));
  console.log(`${icon.label}: ${icon.path}`);
}
