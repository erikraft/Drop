const DEFAULT_SERVER_URL = 'https://drop.erikraft.com/';

const SERVER_INSTANCES = Object.freeze([
  { id: 'primary', label: 'Primary — ErikrafT Drop™', url: DEFAULT_SERVER_URL },
  { id: 'fallback-dash', label: 'Fallback — ErikrafT Drop™', url: 'https://drop-fallback.erikraft.com/' },
  { id: 'fallback-compact', label: 'Fallback 2 — ErikrafT Drop™', url: 'https://dropfallback.erikraft.com/' }
]);

function normalizeServerUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('Only HTTP(S) URLs without embedded credentials are supported.');
  }

  parsed.hash = '';
  return parsed.href;
}

module.exports = { DEFAULT_SERVER_URL, SERVER_INSTANCES, normalizeServerUrl };
