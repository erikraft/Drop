import assert from 'assert';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
await import(path.join(root, 'public/scripts/optical-matrix.js'));
await import(path.join(root, 'public/scripts/github-folder-zip.js'));

const { OpticalMatrixEncoder, protocol, capabilities } = globalThis.ErikrafTOpticalMatrix;
const { parseGitHubDirectoryUrl, listDirectory, collectFiles } = globalThis.ErikrafTGitHubFolderZip;

console.log('Starting Optical Matrix, QR layout and GitHub folder ZIP tests...');
const encoder = new OpticalMatrixEncoder({columns: 8, rows: 8});
const frame = encoder.encode(new TextEncoder().encode('matrix'));
assert.strictEqual(protocol, 'EOM/1');
assert.strictEqual(capabilities.cimbarCompatible, false, 'Do not claim unproven Cimbar compatibility');
assert.strictEqual(capabilities.cfcCompatible, false, 'Do not claim unproven CFC compatibility');
assert.strictEqual(frame.payload[0], 0x45);
assert.throws(() => encoder.encode(new Uint8Array(100)), /supports/);

const qrLayoutCss = fs.readFileSync(path.join(root, 'public/styles/animated-qr-android-fixes.css'), 'utf8');
assert.match(qrLayoutCss, /#animated-qr-send-dialog #qr-send-canvas-container\s*\{[\s\S]*overflow:\s*visible;/,
    'Animated QR container must preserve the complete generated SVG viewport.');
assert.match(qrLayoutCss, /#animated-qr-send-dialog #qr-send-canvas-container svg\s*\{[\s\S]*overflow:\s*visible;/,
    'Animated QR SVG must not clip its background rect or quiet zone.');
assert.match(qrLayoutCss, /@media \(prefers-reduced-motion: reduce\)/,
    'QR dialogs must respect reduced-motion preferences.');

assert.deepStrictEqual(parseGitHubDirectoryUrl('https://github.com/owner/repo/tree/main/a%20folder/lib'), {owner: 'owner', repo: 'repo', ref: 'main', path: 'a folder/lib'});
assert.throws(() => parseGitHubDirectoryUrl('https://github.com/owner/repo/blob/main/a.js'), /directory URL/);
const calls = [];
const fakeFetch = async url => { calls.push(url); return {ok: true, json: async () => url.includes('/nested?') ? [{type: 'file', name: 'b.txt', size: 2, download_url: 'https://files/b'}] : [{type: 'file', name: 'a.txt', size: 1, download_url: 'https://files/a'}, {type: 'dir', name: 'nested'}]}; };
const info = parseGitHubDirectoryUrl('https://github.com/o/r/tree/v1/root');
assert.strictEqual((await listDirectory(info, fakeFetch)).length, 2);
assert.deepStrictEqual((await collectFiles(info, fakeFetch)).map(file => file.name), ['a.txt', 'nested/b.txt']);
assert(calls.every(url => url.startsWith('https://api.github.com/')), 'Only GitHub API is used for listing');
console.log('✓ Optical Matrix, QR layout and GitHub folder ZIP tests passed');
