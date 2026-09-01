# ErikrafT Drop™ Failover Architecture

## Overview

This document describes the high-availability failover architecture implemented for ErikrafT Drop™ using Render as the primary server and Vercel as a fallback solution.

## Architecture

### Current Setup

```
                    drop.erikraft.com
                           │
                           ▼
                    Cloudflare Worker
                           │
                 ┌─────────┴─────────┐
                 │                   │
         Health Check          HTTP/WebSocket
                 │                   │
                 ▼                   ▼
          Render Health      Render Healthy
                 │                   │
                 │             ┌────┴────┐
                 │             │         │
           Render OK    WebSocket   HTTP
                 │             │         │
                 │             └────┬────┘
                 │                  │
                 │             ┌────▼────┐
                 │             │  RENDER │
                 │             │ PRIMARY │
                 │             └─────────┘
                 │
           Render FAIL
                 │
                 ▼
           ┌─────▼─────┐
           │  VERCEL   │
           │ FALLBACK  │
           └───────────┘
```

### Components

1. **Render (Primary Server)**
   - Host: `drop.erikraft.com`
   - Platform: Render Free (Docker)
   - Technology: Node.js + Express + WebSocket
   - Features: Full ErikrafT Drop™ functionality including WebSocket signaling, WebRTC, Tor/Onion integration

2. **Vercel (Fallback Server)**
   - Host: `drop-fallback.erikraft.com`
   - Platform: Vercel Free
   - Technology: Static frontend (limited backend)
   - Features: Frontend UI only (WebSocket not functional on current Vercel deployment)

3. **Cloudflare Worker (Failover Layer)**
   - Location: `cloudflare-worker/failover.js`
   - Purpose: Intelligent proxy with health checks
   - Features: Automatic failover, health monitoring, WebSocket proxying

## How It Works

### Normal Operation (Render Healthy)

1. User accesses `https://drop.erikraft.com/`
2. Cloudflare Worker receives the request
3. Worker performs health check on Render (cached result)
4. If Render is healthy, proxies request to Render
5. User gets full ErikrafT Drop™ functionality

### Failover Mode (Render Unavailable)

1. Render hits free tier limits or becomes unavailable
2. Cloudflare Worker health check detects failure (after 3 consecutive failures)
3. Worker automatically switches to Vercel fallback
4. New user requests are proxied to `drop-fallback.erikraft.com`
5. Users get frontend UI (limited functionality)

### Recovery Mode (Render Back Online)

1. Render becomes available again
2. Cloudflare Worker health check detects recovery (after 2 consecutive successes)
3. Worker automatically switches back to Render
4. New user requests are proxied to Render again
5. Full functionality restored

## Configuration

### Cloudflare Worker Configuration

File: `cloudflare-worker/failover.js`

Key settings:
- `PRIMARY_HOST = 'drop.erikraft.com'`
- `FALLBACK_HOST = 'drop-fallback.erikraft.com'`
- `HEALTH_CHECK_INTERVAL = 30000` (30 seconds)
- `FAILURE_THRESHOLD = 3` (consecutive failures before switching)
- `RECOVERY_THRESHOLD = 2` (consecutive successes before switching back)

### Deployment Steps

#### 1. Deploy Cloudflare Worker

```bash
cd cloudflare-worker
npm install -g wrangler
wrangler login
wrangler deploy
```

#### 2. Configure Cloudflare Route

In Cloudflare Dashboard:
1. Go to your domain (erikraft.com)
2. Navigate to Workers → Triggers → Routes
3. Add route: `drop.erikraft.com/*`
4. Select the deployed worker: `erikraft-drop-failover`

#### 3. Update DNS Settings

Ensure `drop.erikraft.com` points to Cloudflare:
- DNS record: `drop` → CNAME → Cloudflare proxy
- Proxy status: Proxied (orange cloud)

### Health Check Endpoint

The `/health` endpoint was added to `server/server.js`:

```javascript
app.get('/health', (req, res) => {
    res.status(200).send('ok');
});
```

This endpoint:
- Returns HTTP 200 with "ok" when server is healthy
- Used by Cloudflare Worker for health monitoring
- Quick and lightweight (no database checks)

## Limitations

### Session Management

**Important**: Sessions are NOT preserved between Render and Vercel.

When Render fails:
- Active sessions on Render are lost
- Users must reconnect
- New sessions work on Vercel (with limited functionality)
- When Render recovers, users on Vercel must reconnect to Render

This is expected behavior due to:
- No shared database (by design)
- In-memory session storage
- No external session synchronization

### Vercel Limitations

The current Vercel deployment has limitations:
- **WebSocket not functional**: Vercel Functions don't support the current WebSocket server architecture
- **Limited backend**: Only frontend UI works
- **No signaling**: WebRTC pairing won't work
- **No file transfer**: P2P file transfer requires WebSocket signaling

### Fallback Functionality

When using Vercel fallback:
- ✅ Frontend UI loads
- ✅ Static content works
- ❌ WebSocket connections fail
- ❌ Device pairing doesn't work
- ❌ File transfer doesn't work
- ❌ QR Code functionality limited

## Testing

### Manual Testing

#### Test 1: Render Primary

```bash
# Test health endpoint
curl https://drop.erikraft.com/health

# Test config endpoint
curl https://drop.erikraft.com/config

# Test WebSocket (requires WebSocket client)
wscat -c wss://drop.erikraft.com/server
```

Expected: All requests succeed, WebSocket connects.

#### Test 2: Vercel Fallback

```bash
# Test health endpoint
curl https://drop-fallback.erikraft.com/health

# Test config endpoint
curl https://drop-fallback.erikraft.com/config

# Test WebSocket (expected to fail)
wscat -c wss://drop-fallback.erikraft.com/server
```

Expected: HTTP requests succeed, WebSocket fails.

#### Test 3: Failover Behavior

1. Check current server:
```bash
curl -I https://drop.erikraft.com/
# Look for X-Erikraft-Drop-Server header
```

2. Simulate Render failure (temporary):
- Stop Render service or block access
- Wait for health check failures (90 seconds: 3 × 30s)
- Test requests again
- Should see `X-Erikraft-Drop-Server: fallback`

3. Restore Render:
- Start Render service
- Wait for health check successes (60 seconds: 2 × 30s)
- Test requests again
- Should see `X-Erikraft-Drop-Server: primary`

### Automated Testing

You can create a test script to monitor failover:

```bash
#!/bin/bash
while true; do
  response=$(curl -s -I https://drop.erikraft.com/ | grep -i "x-erikraft-drop-server")
  echo "$(date): $response"
  sleep 10
done
```

## Troubleshooting

### Issue: Requests always go to Vercel

**Possible causes:**
1. Render health check failing
2. Cloudflare Worker not deployed
3. Route not configured correctly

**Solutions:**
1. Check Render logs for errors
2. Verify Render is responding to `/health`
3. Check Cloudflare Worker logs
4. Verify route configuration in Cloudflare Dashboard

### Issue: WebSocket connections fail

**Possible causes:**
1. Render WebSocket server not running
2. Cloudflare not proxying WebSocket correctly
3. Using Vercel fallback (expected limitation)

**Solutions:**
1. Check Render logs for WebSocket errors
2. Verify you're on Render (check `X-Erikraft-Drop-Server` header)
3. If on Vercel, this is expected - use Render for full functionality

### Issue: Frequent switching between servers (flapping)

**Possible causes:**
1. Health check threshold too low
2. Network issues causing intermittent failures
3. Render performance degradation

**Solutions:**
1. Increase `FAILURE_THRESHOLD` and `RECOVERY_THRESHOLD` in Worker
2. Increase `HEALTH_CHECK_INTERVAL`
3. Check Render performance metrics

### Issue: Health check passes but server not functional

**Possible causes:**
1. Health check too simple
2. Server responding but WebSocket not working

**Solutions:**
1. Improve health check to verify WebSocket server
2. Add more comprehensive health checks
3. Monitor WebSocket connections separately

## Monitoring

### Cloudflare Worker Logs

View real-time logs:
```bash
wrangler tail
```

### Render Logs

Monitor Render service logs in Render Dashboard for:
- Health check requests
- WebSocket connection attempts
- Error rates
- Performance metrics

### Headers to Monitor

All responses include:
- `X-Erikraft-Drop-Server`: Indicates which server handled the request
  - `primary`: Render
  - `fallback`: Vercel
  - `fallback-emergency`: Immediate fallback after primary failure

## Future Improvements

### Potential Enhancements

1. **Vercel WebSocket Support**
   - Migrate to Vercel Functions with WebSocket support
   - Requires significant code refactoring
   - Would need external state management (Redis) for multi-instance coordination

2. **Enhanced Health Checks**
   - Verify WebSocket server health
   - Check database connectivity (if added)
   - Monitor memory usage and performance

3. **Geographic Load Balancing**
   - Route users to nearest available server
   - Deploy multiple Render instances
   - Use Cloudflare Traffic for intelligent routing

4. **Session Migration**
   - Implement session synchronization
   - Would require database or Redis
   - Allow seamless migration between servers

### Alternative Architectures

If Vercel WebSocket support is needed in the future:

1. **Vercel Functions with WebSocket**
   - Convert WebSocket server to Vercel Functions
   - Use `@vercel/functions` WebSocket APIs
   - Implement external state management

2. **Separate Signaling Server**
   - Deploy dedicated WebSocket server on another platform
   - Use `SIGNALING_SERVER` environment variable
   - Keep frontend on both Render and Vercel

3. **Multiple Render Instances**
   - Deploy to multiple regions
   - Use Cloudflare Load Balancing
   - Avoid Render free tier limitations

## Maintenance

### Regular Tasks

1. **Monitor health check logs** - Watch for frequent failures
2. **Review failover events** - Check if switching is appropriate
3. **Test fallback functionality** - Verify Vercel deployment works
4. **Update Worker configuration** - Adjust thresholds if needed
5. **Keep dependencies updated** - Regular security updates

### Emergency Procedures

If both servers fail:
1. Check Cloudflare status
2. Verify DNS configuration
3. Check domain registration
4. Have emergency static page ready
5. Communicate with users via social media

## Conclusion

This failover architecture provides:
- ✅ Automatic switching between Render and Vercel
- ✅ Health monitoring with configurable thresholds
- ✅ Anti-flapping protection
- ✅ WebSocket proxy support
- ✅ Zero code changes to ErikrafT Drop™ core
- ✅ Minimal configuration required

The main limitation is that Vercel currently only provides frontend functionality. For full failover with WebSocket support, either Vercel needs to be upgraded to support the current WebSocket architecture, or the code needs to be refactored to work with Vercel's WebSocket Functions model.

The priority remains: **Preserve the current Render functionality while adding automatic failover for when Render is unavailable.**