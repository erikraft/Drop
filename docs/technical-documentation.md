# Technical Documentation

## Scope and architecture

ErikrafT Drop™ is a browser-based peer-to-peer transfer application with a Node.js/Express HTTP server and a WebSocket signaling server. It does not require user accounts and does not use a central database for file storage. The server keeps transient peer and room state in process memory.

Main implementation areas:

- server/index.js: configuration parsing and process startup.
- server/server.js: HTTP routes, static assets, response headers and optional HTTP rate limiting.
- server/ws-server.js: WebSocket upgrade, peer discovery, pairing, rooms and optional relay fallback.
- server/peer.js: peer identity, client metadata, IP derivation and per-peer rate counters.
- public/scripts/network.js: browser-side signaling and WebRTC transfer protocol.
- desktop/main.cjs: Electron wrapper; it loads the selected web instance rather than starting a local copy of the server.

## Data flow

### WebRTC

The normal transfer path uses WebRTC. Signaling messages travel through the WebSocket server; the browser then establishes a DataChannel between peers. WebRTC applies DTLS encryption to DataChannel traffic. A TURN server may relay encrypted packets when a direct route is unavailable; TURN can observe connection metadata and traffic volume but does not decrypt the WebRTC payload.

### WebSocket fallback

The server enables WebSocket fallback by default unless WS_FALLBACK=false is set. When fallback is used, file chunks and messages are relayed through the Drop server. TLS protects the network connection to the server, but the fallback protocol does not provide the same end-to-end confidentiality guarantee as the WebRTC DataChannel. The server can process the relayed payload.

For deployments that must keep file payloads away from the signaling server, disable fallback with WS_FALLBACK=false and ensure clients can establish WebRTC connections.

## Pairing and room authorization

Pairing uses a short six-digit code to exchange a high-entropy room secret. The secret acts as a bearer capability: possession grants access to the corresponding secret room. The server stores room membership and pairing state in memory; the browser persists the paired secret in origin-scoped IndexedDB.

The room secret is not an encrypted database record. Protect access to the browser profile and the origin that stores it. A pairing code is temporary and should only be shared with the intended peer.

The WebSocket server checks that both sender and recipient belong to the same room before relaying peer-to-peer signaling or fallback messages. Browser Origin validation is a CSWSH defense, not authentication; native clients may omit Origin.

## Server limits and trust boundaries

- Individual WebSocket frames are limited to 8 MiB by the ws server configuration.
- Pairing and public-room operations use a per-peer request counter. A new WebSocket connection creates a new peer and therefore a new per-peer counter; this is not a global connection or IP-level rate limiter.
- The Express HTTP limiter is optional and limits up to 1,000 HTTP requests per five-minute window when RATE_LIMIT is enabled. WebSocket upgrades are handled separately and do not pass through that Express middleware.
- Peer IP discovery currently reads CF-Connecting-IP or X-Forwarded-For before falling back to the socket address. These headers must be overwritten/sanitized by the trusted reverse proxy. Do not expose an origin that allows clients to supply trusted forwarding headers unchanged.

## HTTP and WebSocket surfaces

| Path | Purpose |
| --- | --- |
| / and static files | Web application assets |
| /.well-known/assetlinks.json | Android asset links |
| /api/onion-info | Public Onion hostname/status |
| /api/v1/capabilities | Public, rate-limited API capability metadata |
| /api/cli | Public CLI protocol metadata |
| /config | Public client configuration and button links |
| /health | Health check |
| /ip | Debug-only IP diagnostic, when debug and HTTP rate limiting are enabled |

The WebSocket endpoint is /server. It handles discovery, room membership, pairing, WebRTC signaling and—when enabled—fallback transfer relays.

## Privacy and operational assumptions

No file database or account database is present in this repository. The server still processes connection metadata such as source IP, user agent, display name, peer IDs and transient room identifiers. TURN credentials configured in RTC_CONFIG are delivered to clients in the WebSocket configuration message; do not treat static TURN credentials as secret once published to clients. Use short-lived TURN credentials and provider-side quotas for production.

The server's debug mode prints diagnostic configuration and peer information. Keep DEBUG_MODE=false in production. Deploy behind a reverse proxy that overwrites forwarding headers, restrict direct access to the origin where possible, and use HTTPS/WSS.

## Desktop compatibility

The Windows desktop artifact is x64. Wine and Winlator compatibility is best-effort. The portable target skips the native WinSparkle updater; the installer retains the updater integration. The packaging workflow validates artifact creation on native runners and does not certify Wine/Winlator runtime behavior.
