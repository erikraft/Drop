import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const transfer = read('public/scripts/webtorrent-transfer.js');
const main = read('public/scripts/main.js');

assert.ok(transfer.length > 0, 'Embedded WebTorrent transfer module must not be empty.');
assert.match(transfer, /const WEBTORRENT_VERSION = '3\.0\.21';/,
    'The embedded transfer must pin the tested WebTorrent version.');
assert.match(transfer, /import\(`https:\/\/esm\.sh\/webtorrent@\$\{WEBTORRENT_VERSION\}`\)/,
    'The WebTorrent constructor must be loaded from the pinned version.');
assert.match(transfer, /const TRACKERS = \[[\s\S]*wss:\/\/tracker\./,
    'WebTorrent must use WebSocket trackers for browser peer discovery.');
assert.match(transfer, /torrentClient\.seed\(Array\.from\(input\.files\), \{ announce: TRACKERS \}/,
    'Sender flow must seed the selected files with the configured trackers.');
assert.match(transfer, /torrentClient\.add\(magnet, \{ announce: TRACKERS \}\)/,
    'Receiver flow must add the shared magnet or torrent metadata with the configured trackers.');
assert.match(transfer, /torrent\.on\('done', async \(\) => \{[\s\S]*file\.blob\(\)/,
    'Completed downloads must be materialized as downloadable file blobs.');
assert.match(transfer, /objectUrls\.forEach\(url => URL\.revokeObjectURL\(url\)\)/,
    'Download object URLs must be released when the page unloads.');
assert.match(transfer, /if \(client\) client\.destroy\(\);/,
    'The WebTorrent client must be destroyed when the page unloads.');
assert.match(main, /'scripts\/webtorrent-transfer\.js'/,
    'The main application must load the embedded WebTorrent module.');

console.log('Embedded WebTorrent transfer contract OK.');
