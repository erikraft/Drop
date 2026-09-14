import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const icons = [
  {
    label: 'Official desktop/Windows ICO',
    path: 'desktop/assets/icon.ico',
  },
  {
    label: 'Linux SVG customization asset',
    path: 'packaging/linux/icons/icon-drop.svg',
  },
  {
    label: 'Linux 512px PNG customization asset',
    path: 'packaging/linux/icons/android-chrome-512x512.png',
  },
  {
    label: 'Linux 512px maskable PNG customization asset',
    path: 'packaging/linux/icons/android-chrome-512x512-maskable.png',
  },
  {
    label: 'Linux ICO source asset',
    path: 'packaging/linux/icons/ErikrafT_Drop_Linux.ico',
  },
];

for (const icon of icons) {
  await fs.access(path.join(root, icon.path));
  console.log(`${icon.label}: ${icon.path}`);
}
