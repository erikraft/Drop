# PairDrop Interoperability Specification & Compatibility Layer

This document details the interoperability design and compatibility layer between **ErikrafT Drop™** and **PairDrop** (https://pairdrop.net).

---

## 1. Overview

ErikrafT Drop™ maintains its native peer-to-peer signaling and communication protocol as its primary core. To enable seamless file transfers between **ErikrafT Drop™ Web** and **PairDrop Web** without requiring server forks or third-party extensions, ErikrafT Drop™ provides an isolated **PairDrop Compatibility Adapter** (`public/scripts/pairdrop-adapter.js`).

---

## 2. Compatibility Matrix

| Interoperability Direction | Transport Method | Discovery & Pairing | SHA-256 / File Integrity | Status |
| :--- | :---: | :---: | :---: | :---: |
| **HTTPS ↔ HTTPS** | WebRTC DataChannel / WSPeer | IP Room, Public Room, Pairing Key | ✅ Verified | Supported ✅ |
| **ONION ↔ ONION** | WSPeer Relay / WebRTC | Public Room, Pairing Key | ✅ Verified | Supported ✅ |
| **ONION → HTTPS** | WSPeer Relay / WebRTC | Public Room, Pairing Key | ✅ Verified | Supported ✅ |
| **HTTPS → ONION** | WSPeer Relay / WebRTC | Public Room, Pairing Key | ✅ Verified | Supported ✅ |
| **ErikrafT Drop™ ↔ PairDrop** | PairDrop Adapter + WebRTC | Public Room, Pairing Key, Signal Adapter | ✅ Verified | Supported ✅ |

---

## 2.1 Tor Network & Cross-Origin Transport Details

- **WebRTC & Tor Browser Privacy:** Tor Browser restricts UDP and STUN requests to protect user IP addresses. When WebRTC ICE candidate gathering fails or is blocked by Tor Browser policies, ErikrafT Drop™ automatically falls back to `WSPeer` (WebSocket server relay) when `WS_FALLBACK` is enabled.
- **Cross-Origin Signaling:** The server handles signaling dynamically across `https://drop.erikraft.com` and `http://nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion` without hardcoding WebSocket endpoints.
- **Tor UI Badges:** Onion clients retain the "Na Rede Tor" badge, while standard network clients retain "nesta rede", preserving Tor user privacy and transparency.

---

## 3. Protocol & Message Schema Mapping

### Signaling Messages
The PairDrop protocol uses JSON signaling payloads over WebSockets. The adapter normalizes incoming and outgoing messages as follows:

- **Peer Discovery / Join:**
  - *PairDrop:* `{ type: 'peer-joined', peer: { id, name, rtcSupported } }`
  - *ErikrafT Drop™ Adapter:* Maps PairDrop peer objects directly into internal peer state while preserving native metadata structures.
- **WebRTC Signaling (`sdp` & `ice`):**
  - *PairDrop:* Sends `{ type: 'signal', sdp }` or `{ type: 'signal', ice }`.
  - *ErikrafT Drop™ Adapter:* Wraps/unwraps offer/answer SDPs and ICE candidates to ensure DataChannel establishment.
- **File Transfer Header:**
  - *PairDrop:* Transmits file metadata containing array of file descriptors `[{ name, size, type }]`.
  - *ErikrafT Drop™ Adapter:* Translates metadata to match ErikrafT Drop™ `request` and `header` signals.

---

## 4. Chunk & Data Channel Compatibility

- **Chunk Size:** Standardized at 64 KB (65,536 bytes) per binary chunk for optimal WebRTC DataChannel buffer management.
- **Backpressure Handling:** DataChannel `bufferedAmountLowThreshold` is monitored to prevent buffer overflow across browser implementations.

---

## 5. Architectural Isolation

The compatibility adapter is completely isolated inside `public/scripts/pairdrop-adapter.js`. The core application (`public/scripts/network.js`) delegates PairDrop signaling handling through event hooks without cluttering the native signaling logic.
