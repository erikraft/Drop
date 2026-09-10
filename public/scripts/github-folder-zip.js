/* GitHub directory downloader. Uses the public Contents REST API; no token is collected or stored. */
(function (root) {
    'use strict';
    function parseGitHubDirectoryUrl(value) {
        const url = new URL(value); const parts = url.pathname.split('/').filter(Boolean);
        if (url.hostname !== 'github.com' || parts.length < 5 || parts[2] !== 'tree') throw new Error('Use a GitHub directory URL: github.com/OWNER/REPOSITORY/tree/REF/path');
        const [owner, repo, , ref, ...path] = parts; if (!owner || !repo || !ref || !path.length) throw new Error('The URL must include an owner, repository, ref, and directory path.');
        return {owner, repo, ref: decodeURIComponent(ref), path: path.map(decodeURIComponent).join('/')};
    }
    async function listDirectory(input, fetcher = fetch) {
        const info = typeof input === 'string' ? parseGitHubDirectoryUrl(input) : input;
        const endpoint = `https://api.github.com/repos/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/contents/${info.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(info.ref)}`;
        const response = await fetcher(endpoint, {headers: {Accept: 'application/vnd.github+json'}});
        if (!response.ok) throw new Error(response.status === 404 ? 'Directory, repository, or ref was not found.' : response.status === 403 ? 'GitHub API rate limit or private repository access denied.' : `GitHub API error (${response.status}).`);
        const entries = await response.json(); if (!Array.isArray(entries)) throw new Error('The URL does not identify a directory.'); return entries;
    }
    async function collectFiles(info, fetcher = fetch, prefix = '') { const entries = await listDirectory(info, fetcher); const files = []; for (const entry of entries) { if (entry.type === 'file') files.push({name: `${prefix}${entry.name}`, url: entry.download_url, size: entry.size}); else if (entry.type === 'dir') files.push(...await collectFiles({...info, path: `${info.path}/${entry.name}`}, fetcher, `${prefix}${entry.name}/`)); } return files; }
    async function downloadDirectoryAsZip(url, {fetcher = fetch, maxBytes = 100 * 1024 * 1024} = {}) { const info = parseGitHubDirectoryUrl(url), files = await collectFiles(info, fetcher); if (!files.length) throw new Error('The GitHub directory is empty.'); const total = files.reduce((n, f) => n + (f.size || 0), 0); if (total > maxBytes) throw new Error('Directory exceeds the browser ZIP safety limit.'); if (!root.zip?.ZipWriter) throw new Error('ZIP support is not available.'); const writer = new root.zip.ZipWriter(new root.zip.BlobWriter('application/zip')); for (const file of files) { const response = await fetcher(file.url); if (!response.ok) throw new Error(`Could not download ${file.name}.`); await writer.add(file.name, new root.zip.BlobReader(await response.blob())); } return {blob: await writer.close(), files, name: `${info.repo}-${info.path.split('/').pop()}.zip`}; }
    root.ErikrafTGitHubFolderZip = {parseGitHubDirectoryUrl, listDirectory, collectFiles, downloadDirectoryAsZip};
    if (typeof module !== 'undefined' && module.exports) module.exports = root.ErikrafTGitHubFolderZip;
})(typeof globalThis !== 'undefined' ? globalThis : window);
