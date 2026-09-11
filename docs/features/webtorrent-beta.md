# WebTorrent (Beta)

ErikrafT Drop™ includes an optional **WebTorrent transfer mode (Beta)** for compatible modern browsers. It is an additional transfer path and does not replace the normal PairDrop-derived WebRTC/WebSocket transfer architecture.

## How it works

1. The sender selects a file in the WebTorrent panel.
2. ErikrafT Drop™ loads the WebTorrent browser client **on demand**.
3. The current browser client is WebTorrent `3.0.21`, loaded dynamically from `esm.sh` when the feature is used.
4. The selected file is published as a WebTorrent torrent and a **magnet URI** is generated.
5. The magnet URI can be copied or shared with the receiving device.
6. The receiver adds the magnet URI and discovers the torrent through the configured WebSocket trackers.
7. File pieces are transferred directly between compatible peers using WebRTC.

The configured WebSocket trackers are:

- `wss://tracker.openwebtorrent.com`
- `wss://tracker.fastcast.nz`

The WebTorrent client is not loaded during normal ErikrafT Drop™ startup. This keeps the optional beta feature separate from the standard P2P/WebRTC/WebSocket initialization path.

## Beta limitations

WebTorrent support is experimental. A transfer can fail or remain waiting for peers because of:

- Browser WebRTC/WebTorrent compatibility.
- NAT, firewall, or restrictive network policies.
- Tracker availability or tracker connection failures.
- No compatible peer being online and reachable.
- Browser/WebView restrictions affecting dynamic JavaScript module loading, WebRTC, networking, or generated downloads.
- Large-file memory or storage constraints in the browser or embedded WebView.

WebTorrent availability is **not** a prerequisite for normal ErikrafT Drop™ transfers.

## Privacy and architecture

WebTorrent is a peer-to-peer transfer mechanism. ErikrafT Drop™ does **not** upload the transferred file to a central file-storage database for this mode.

WebTorrent trackers participate in peer discovery. The magnet URI and tracker/peer-discovery traffic are therefore part of establishing the connection. Users should understand and trust the tracker infrastructure used by their client/network.

The two transfer paths are separate:

- **Normal transfer:** PairDrop-derived signaling over WebSocket/WebSocket fallback establishes WebRTC peers; file data then travels over the WebRTC connection, directly or through the configured TURN infrastructure when required.
- **WebTorrent Beta:** magnet-based torrent discovery uses the configured WebTorrent trackers, with file pieces transferred between WebRTC peers.

## Android WebView compatibility

The Android application may use WebTorrent when its Advanced WebView provides the required WebRTC, JavaScript module, network, and download capabilities. ErikrafT Drop™'s Android WebView integration can route generated `blob:`/`data:` downloads through the native bridge when necessary.

WebTorrent is **not** required for Android-to-Web transfers or for the normal WebRTC/WebSocket transfer flow. If WebTorrent cannot load in a particular WebView, the standard ErikrafT Drop™ transfer path should remain available.

## Relationship with local discovery

WebTorrent is different from the normal local-network discovery experience. Local discovery, pairing, and public-room features use the PairDrop-derived signaling architecture, while WebTorrent uses magnet-based peer discovery through its trackers.

WebTorrent should therefore be considered an optional experimental transfer mode, not a replacement for ErikrafT Drop™'s standard P2P transfer architecture.
