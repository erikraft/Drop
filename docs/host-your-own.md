# Host Your Own ErikrafT Drop™

This guide describes the current ErikrafT Drop™ repository. It replaces older examples in this file that used LinuxServer's PairDrop image or PairDrop container names.

## Requirements

- Docker Engine with the Compose plugin, or Node.js >=22.12.0.
- A reverse proxy for public deployments.
- HTTPS/WSS for browser features and secure signaling.
- A TURN server only if your network environment requires TURN for WebRTC connectivity.

## Docker deployment

Clone and build the repository's own Dockerfile:

    git clone https://github.com/erikraft/Drop.git
    cd Drop
    docker build --pull -t erikraft-drop .

Run it bound to localhost so clients cannot bypass the reverse proxy:

    docker run -d --name erikraft-drop --restart unless-stopped \
      -p 127.0.0.1:3000:3000 \
      -e NODE_ENV=production \
      -e RATE_LIMIT=1 \
      -e WS_FALLBACK=false \
      erikraft-drop

For a single local reverse proxy, RATE_LIMIT=1 is the expected starting point. The value is also the trusted proxy hop count; confirm it against the actual proxy chain before relying on IP-based limits.

## Node.js deployment

    git clone https://github.com/erikraft/Drop.git
    cd Drop
    npm ci
    NODE_ENV=production RATE_LIMIT=1 WS_FALLBACK=false npm start

The default port is 3000. Set PORT to use a different port. The server also supports the --localhost-only flag when it must bind only to 127.0.0.1.

## Important environment variables

| Variable | Default | Description |
| --- | --- | --- |
| PORT | 3000 | HTTP and WebSocket listening port. |
| NODE_ENV | unset | Set to production to enable HSTS response headers. |
| RATE_LIMIT | false | Enables the Express HTTP limiter (1,000 requests per IP per five minutes) and sets the trusted proxy hop count. |
| WS_FALLBACK | enabled | Enables file/message relay through the server. Set false to disable it. |
| WS_ALLOWED_ORIGINS | empty | Comma-separated HTTP(S) Origin allowlist for browser WebSocket connections. |
| DEBUG_MODE | false | Diagnostic logs; do not enable in production. |
| RTC_CONFIG | built-in STUN config | Path to a JSON STUN/TURN configuration file. |
| SIGNALING_SERVER | false | Alternate signaling host; cannot be combined with RTC_CONFIG, WS_FALLBACK or IPV6_LOCALIZE. |
| IPV6_LOCALIZE | false | IPv6 peer grouping prefix length, integer 1-7. |

The current server does not read HOST, ALLOW_LOCAL_ONLY or Redis environment variables. Local-only mode is controlled by --localhost-only.

## WebSocket fallback and privacy

WS_FALLBACK is enabled by default. When it is used, file chunks and messages pass through the server; the server can process the relayed payload. Disable it with WS_FALLBACK=false when the deployment must not relay file contents. The trade-off is that clients must establish a working WebRTC connection.

WebRTC DataChannel traffic is encrypted between peers. TURN can relay encrypted WebRTC packets. Do not confuse TURN relay with the WebSocket fallback.

## Reverse proxy requirements

- Terminate TLS at a trusted proxy and use HTTPS/WSS externally.
- Forward WebSocket Upgrade and Connection headers.
- Overwrite/sanitize X-Forwarded-For and CF-Connecting-IP. The application uses these headers for peer IP grouping; never let untrusted clients supply values that the application treats as authoritative.
- Restrict direct access to the application origin where possible.
- Set RATE_LIMIT to the correct proxy hop count. An incorrect value can cause all users to share the proxy IP or trust a spoofable hop.

## Nginx example

    server {
        listen 443 ssl;
        server_name drop.example.com;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header CF-Connecting-IP "";
        }
    }

If Cloudflare is in front of Nginx, configure Nginx real-IP handling with the official Cloudflare proxy ranges before forwarding the resolved client IP. Do not blindly trust a client-supplied CF-Connecting-IP header.

## TURN configuration

Set RTC_CONFIG to a JSON file containing sdpSemantics and iceServers. The configuration is delivered to connected clients, so TURN username and credential values are visible to those clients. Use short-lived TURN credentials and provider-side quotas; do not embed long-lived production credentials in public files.

The coturn example in this repository requires the ports and certificates documented in docker-compose-coturn.yml and turnserver_example.conf. Review the coturn configuration before exposing it publicly.

## Health and discovery endpoints

- GET /health — health check.
- GET /api/v1/capabilities — public API capability metadata, limited to 60 requests per minute.
- GET /api/cli — public CLI protocol metadata.
- GET /api/onion-info — public Onion hostname/status when the gateway is enabled.
- WebSocket /server — signaling and optional fallback relay.

## Render and Onion Gateway

The root Dockerfile includes Tor support and uses the entrypoint in onion-gateway/entrypoint.sh. Configure ONION_PRIVATE_KEY_BASE64 as a secret in the hosting dashboard; do not commit the private key. The entrypoint suppresses the key value and runs the Node application as the node user.

For Render, confirm the deployed RATE_LIMIT setting and proxy hop count in the dashboard after deployment. The repository blueprint is the desired configuration, not proof that the live service has already adopted it.

## Related guides

- [Configuration reference](reference/configuration.mdx)
- [Technical documentation](technical-documentation.md)
- [Wine and Winlator](wine-winlator.md)
- [Security policy](../SECURITY.md)
