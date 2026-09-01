# Cloudflare Worker for ErikrafT Drop™ Failover

This directory contains the Cloudflare Worker implementation for automatic failover between Render (primary) and Vercel (fallback) servers.

## Files

- `failover.js` - Main Worker code with health checking and failover logic
- `wrangler.toml` - Cloudflare Worker configuration
- `README.md` - This file

## Deployment

### Prerequisites

1. Cloudflare account with Workers enabled
2. `wrangler` CLI tool installed
3. Domain configured in Cloudflare

### Installation

```bash
# Install wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Navigate to this directory
cd cloudflare-worker

# Deploy the worker
wrangler deploy
```

### Configuration

Edit `wrangler.toml` to customize:

```toml
name = "erikraft-drop-failover"
main = "failover.js"
compatibility_date = "2024-01-01"

[vars]
PRIMARY_HOST = "drop.erikraft.com"
FALLBACK_HOST = "drop-fallback.erikraft.com"
HEALTH_CHECK_PATH = "/health"
HEALTH_CHECK_INTERVAL = "30000"  # 30 seconds
FAILURE_THRESHOLD = "3"           # consecutive failures before switching
RECOVERY_THRESHOLD = "2"          # consecutive successes before switching back
```

### Route Configuration

After deployment, configure the route in Cloudflare Dashboard:

1. Go to Cloudflare Dashboard → Your Domain → Workers → Triggers → Routes
2. Add custom route: `drop.erikraft.com/*`
3. Select worker: `erikraft-drop-failover`
4. Save

Alternatively, using wrangler:

```bash
# Add route (requires zone ID)
wrangler routes add drop.erikraft.com/* --zone-id YOUR_ZONE_ID
```

## Testing

### Local Testing

```bash
# Start local development server
wrangler dev

# Test health check
curl http://localhost:8787/health

# Test with headers
curl -I http://localhost:8787/
```

### Production Testing

```bash
# Test the deployed worker
curl -I https://drop.erikraft.com/

# Check which server is handling requests
curl -I https://drop.erikraft.com/ | grep -i x-erikraft-drop-server
```

Expected headers:
- `X-Erikraft-Drop-Server: primary` - Using Render
- `X-Erikraft-Drop-Server: fallback` - Using Vercel
- `X-Erikraft-Drop-Server: fallback-emergency` - Immediate fallback after primary failure

## Monitoring

### View Logs

```bash
# Real-time logs
wrangler tail

# Filter by specific worker
wrangler tail --format pretty
```

### Check Health Status

The worker logs important events:
- Primary server health check results
- Failover triggers
- Recovery events
- Emergency fallback activation

## Troubleshooting

### Worker Not Deploying

```bash
# Check authentication
wrangler whoami

# Verify configuration
wrangler config

# Try verbose output
wrangler deploy --verbose
```

### Route Not Working

1. Verify DNS is proxied through Cloudflare (orange cloud)
2. Check route configuration in Cloudflare Dashboard
3. Ensure worker is deployed and active
4. Check worker logs for errors

### Health Check Failing

1. Test primary server health directly:
   ```bash
   curl https://drop.erikraft.com/health
   ```
2. Check Render service status
3. Verify firewall rules allow health checks
4. Adjust thresholds in `wrangler.toml` if needed

## Customization

### Adjust Health Check Intervals

Edit `failover.js` or `wrangler.toml`:

```javascript
// In failover.js
const HEALTH_CHECK_INTERVAL = 30000; // milliseconds
const FAILURE_THRESHOLD = 3;
const RECOVERY_THRESHOLD = 2;
```

### Add Custom Headers

Modify the headers section in `failover.js`:

```javascript
headers.set('X-Custom-Header', 'custom-value');
```

### Change Fallback Behavior

The worker implements immediate fallback on primary failure. To disable this, remove the emergency fallback logic in the `catch` block.

## Architecture

See `../docs/failover-architecture.md` for complete architecture documentation.

## Support

For issues specific to:
- **Cloudflare Workers**: Check [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- **ErikrafT Drop™**: Check main project documentation
- **Deployment issues**: Review Cloudflare Dashboard logs