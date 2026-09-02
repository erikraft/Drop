/**
 * ErikrafT Drop™ Failover Worker
 *
 * This Cloudflare Worker implements automatic failover between Render (primary)
 * and Vercel (fallback) for the ErikrafT Drop™ service.
 *
 * Architecture:
 * - Primary: https://drop.erikraft.com (Render)
 * - Fallback: https://drop-fallback.erikraft.com (Vercel)
 *
 * The worker performs health checks on the primary server and routes traffic
 * to the fallback when the primary is unavailable.
 *
 * IMPORTANT: This worker handles HTTP requests. For WebSocket failover,
 * this implementation uses Cloudflare's native WebSocket proxying capability.
 */

// Configuration
const PRIMARY_HOST = 'drop.erikraft.com';
const FALLBACK_HOST = 'drop-fallback.erikraft.com';
const HEALTH_CHECK_PATH = '/health';
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const FAILURE_THRESHOLD = 3; // Number of consecutive failures before switching
const RECOVERY_THRESHOLD = 2; // Number of consecutive successes before switching back

// State
let isPrimaryHealthy = true;
let consecutiveFailures = 0;
let consecutiveSuccesses = 0;
let lastHealthCheck = 0;

/**
 * Perform health check on the primary server
 */
async function healthCheckPrimary() {
  const now = Date.now();

  // Don't check too frequently
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return isPrimaryHealthy;
  }

  lastHealthCheck = now;

  try {
    const response = await fetch(`https://${PRIMARY_HOST}${HEALTH_CHECK_PATH}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ErikraftT-Drop-Failover-Worker/1.0'
      },
      // Quick timeout to avoid hanging
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok && response.status === 200) {
      consecutiveSuccesses++;
      consecutiveFailures = 0;

      // Consider recovered after threshold successes
      if (consecutiveSuccesses >= RECOVERY_THRESHOLD) {
        if (!isPrimaryHealthy) {
          console.log('Primary server recovered, switching back to primary');
        }
        isPrimaryHealthy = true;
      }
    } else {
      throw new Error(`Health check returned status ${response.status}`);
    }
  } catch (error) {
    consecutiveFailures++;
    consecutiveSuccesses = 0;

    // Consider failed after threshold failures
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      if (isPrimaryHealthy) {
        console.log('Primary server failed, switching to fallback');
      }
      isPrimaryHealthy = false;
    }
  }

  return isPrimaryHealthy;
}

/**
 * Get the target host based on health status
 */
function getTargetHost() {
  const healthy = healthCheckPrimary();
  return healthy ? PRIMARY_HOST : FALLBACK_HOST;
}

/**
 * Handle incoming requests
 */
export default {
  async fetch(request, env, ctx) {
    const targetHost = getTargetHost();
    const url = new URL(request.url);

    // Build target URL
    const targetUrl = new URL(url.pathname + url.search, `https://${targetHost}`);

    // Copy headers, but update Host
    const headers = new Headers(request.headers);
    headers.set('Host', targetHost);
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', url.protocol);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');

    // Add information about which server is handling the request
    headers.set('X-Erikraft-Drop-Server', targetHost === PRIMARY_HOST ? 'primary' : 'fallback');

    try {
      // Handle all requests (HTTP and WebSocket) through standard fetch
      // Cloudflare's fetch API handles WebSocket upgrades transparently
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'manual'
      });

      // Copy response headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-Erikraft-Drop-Server', targetHost === PRIMARY_HOST ? 'primary' : 'fallback');

      // Return response
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      console.error('Proxy error:', error);

      // If primary fails, try fallback immediately
      if (targetHost === PRIMARY_HOST) {
        console.log('Primary proxy failed, trying fallback immediately');
        try {
          const fallbackUrl = new URL(url.pathname + url.search, `https://${FALLBACK_HOST}`);
          headers.set('Host', FALLBACK_HOST);

          const response = await fetch(fallbackUrl.toString(), {
            method: request.method,
            headers: headers,
            body: request.body,
            redirect: 'manual'
          });

          const responseHeaders = new Headers(response.headers);
          responseHeaders.set('X-Erikraft-Drop-Server', 'fallback-emergency');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
          });
        } catch (fallbackError) {
          console.error('Fallback proxy also failed:', fallbackError);
        }
      }

      // Both failed, return error
      return new Response('Service temporarily unavailable', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain',
          'Retry-After': '30'
        }
      });
    }
  }
};