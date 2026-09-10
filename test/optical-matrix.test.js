import assert from 'assert';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
await import(path.join(here, '../public/scripts/optical-matrix.js'));
await import(path.join(here, '../public/scripts/github-folder-zip.js'));

const { OpticalMatrixEncoder, protocol, capabilities } = globalThis.ErikrafTOpticalMatrix;
const { parseGitHubDirectoryUrl, listDirectory, collectFiles } = globalThis.ErikrafTGitHubFolderZip;

console.log('Starting Optical Matrix and GitHub folder ZIP tests...');
const encoder = new OpticalMatrixEncoder({columns: 8, rows: 8});
const frame = encoder.encode(new TextEncoder().encode('matrix'));
assert.strictEqual(protocol, 'EOM/1');
assert.strictEqual(capabilities.cimbarCompatible, false, 'Do not claim unproven Cimbar compatibility');
assert.strictEqual(frame.payload[0], 0x45);
assert.throws(() => encoder.encode(new Uint8Array(100)), /supports/);

assert.deepStrictEqual(parseGitHubDirectoryUrl('https://github.com/owner/repo/tree/main/a%20folder/lib'), {owner: 'owner', repo: 'repo', ref: 'main', path: 'a folder/lib'});
assert.throws(() => parseGitHubDirectoryUrl('https://github.com/owner/repo/blob/main/a.js'), /directory URL/);
const calls = [];
const fakeFetch = async url => { calls.push(url); return {ok: true, json: async () => url.includes('/nested?') ? [{type: 'file', name: 'b.txt', size: 2, download_url: 'https://files/b'}] : [{type: 'file', name: 'a.txt', size: 1, download_url: 'https://files/a'}, {type: 'dir', name: 'nested'}]}; };
const info = parseGitHubDirectoryUrl('https://github.com/o/r/tree/v1/root');
assert.strictEqual((await listDirectory(info, fakeFetch)).length, 2);
assert.deepStrictEqual((await collectFiles(info, fakeFetch)).map(file => file.name), ['a.txt', 'nested/b.txt']);
assert(calls.every(url => url.startsWith('https://api.github.com/')), 'Only GitHub API is used for listing');
console.log('✓ Optical Matrix and GitHub folder ZIP tests passed');
