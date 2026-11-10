# Technical Documentation

## Architecture overview

ErikrafT Drop™ is a browser-based peer-to-peer transfer application. The web server provides the application shell, peer discovery, signaling, and an optional WebSocket transfer fallback. It does not need a user account or a database for the normal transfer flow.

### Discovery and signaling

- Browser clients open a WebSocket connection to the server.
- Clients discover peers through IP-based rooms and optional persistent secret rooms.
- Pairing creates a high-entropy room secret and a short numeric pairing code. The code is temporary; the room secret is the longer-lived capability used for subsequent discovery.
- The server checks room membership before relaying signaling and peer messages.
- IP-based discovery depends on the reverse proxy supplying a trustworthy client IP. A proxy must overwrite, not blindly forward, client-supplied `X-Forwarded-For` or `CF-Connecting-IP` values.

### WebRTC, STUN, and TURN

WebRTC data channels use the browser's WebRTC security mechanisms, including DTLS encryption. The application does not implement a separate custom encryption layer for the data channel.

- **STUN** helps a browser discover the network address candidates it can use for a direct connection.
- **TURN** relays encrypted WebRTC traffic when a direct path cannot be established. A TURN operator can observe connection metadata such as addresses, timing, and traffic volume, but does not receive the decrypted WebRTC data-channel payload.
- **WebSocket fallback** is a separate relay path used when the client cannot use the normal WebRTC transfer path. In this mode, transfer data passes through the ErikrafT Drop™ server and should be treated as server-relayed traffic.

The server sends the configured `rtcConfig` to connected clients in its `ws-config` message. If a self-hosted deployment configures TURN, those credentials are therefore visible to clients. Use short-lived, scoped TURN credentials; do not place a reusable provider master secret in the client configuration.

![WebRTC encryption diagram](https://www.wowza.com/wp-content/uploads/WeRTC-Encryption-Diagrams-01.jpg)

_Diagram reference: Wowza._

## Pairing and room secrets

Persistent pairing uses browser storage and server-side room membership:

1. The initiating client asks the server to create a pairing.
2. The server creates a high-entropy room secret and a temporary numeric pairing code.
3. The joining client submits the numeric code over its WebSocket connection.
4. The server validates the code and joins the peer to the corresponding secret room.
5. Clients persist the room secret locally so they can discover each other in later sessions.

The room secret is a bearer capability: anyone who obtains it may be able to join that room while it remains valid. Do not publish pairing secrets or include them in support screenshots or logs.

## Data handling

- The normal WebRTC path transfers data between peers.
- TURN relays encrypted WebRTC traffic when required.
- WebSocket fallback relays data through the application server.
- The server does not provide a persistent file-upload library or a user file repository for the normal transfer flow.
- Peer names, peer IDs, IP-derived room identifiers, and room secrets are used for discovery and signaling. The deployment operator can observe connection metadata.

## Self-hosting security requirements

- Serve the application over HTTPS.
- Put the server behind a trusted reverse proxy and overwrite client-supplied forwarding headers.
- Do not expose a Render or other origin hostname as a bypass around Cloudflare/WAF controls.
- If TURN is configured, use time-limited credentials and restrict their permissions.
- Keep `ONION_PRIVATE_KEY_BASE64`, TURN provider secrets, and signing keys out of source control and logs.
- Keep the server and dependencies updated.

See [Self-hosting](host-your-own.md), [Failover architecture](failover-architecture.md), and the [Security Policy](../SECURITY.md).
