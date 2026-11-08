import assert from 'node:assert/strict';
import test from 'node:test';
import { getTargetHost } from '../cloudflare-worker/failover.js';

test('failover waits for health checks and switches after the configured thresholds', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 100_000;
  let primaryHealthy = false;
  let healthChecks = 0;

  Date.now = () => now;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url === 'https://drop.erikraft.com/health') {
      healthChecks += 1;
      return new Response('', { status: primaryHealthy ? 200 : 503 });
    }
    return new Response('ok', { status: 200 });
  };

  try {
    assert.equal(await getTargetHost(), 'drop.erikraft.com');
    now += 30_001;
    assert.equal(await getTargetHost(), 'drop.erikraft.com');
    now += 30_001;
    assert.equal(await getTargetHost(), 'drop-fallback.erikraft.com');

    primaryHealthy = true;
    now += 30_001;
    assert.equal(await getTargetHost(), 'drop-fallback.erikraft.com');
    now += 30_001;
    assert.equal(await getTargetHost(), 'drop.erikraft.com');
    assert.equal(healthChecks, 5);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
