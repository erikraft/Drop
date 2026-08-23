# PairDrop Interoperability Specification & Compatibility Layer

This document details the interoperability design and compatibility layer between **ErikrafT Drop™** and **PairDrop** (https://pairdrop.net).

---

## 1. Overview

ErikrafT Drop™ maintains its native peer-to-peer signaling and communication protocol as its primary core. To enable seamless file transfers between **ErikrafT Drop™ Web** and **PairDrop Web** without requiring server forks or third-party extensions, ErikrafT Drop™ provides an isolated **PairDrop Compatibility Adapter** (`public/scripts/pairdrop-adapter.js`).

---

## 2. Compatibility Matrix

| Feature | Native ErikrafT Drop™ | PairDrop Web | Interoperable via Adapter |
| :--- | :---: | :---: | :---: |
| **Peer Discovery (Local IP Room)** | ✅ | ✅ | Yes (WebRTC / Signaling Mapping) |
| **Public Room Pairing** | ✅ | ✅ | Yes (Room Code Normalization) |
| **Pairing Key Exchange** | ✅ | ✅ | Yes (Key Mapping) |
| **WebRTC DataChannel File Transfer** | ✅ | ✅ | Yes (Chunk & Header Conversion) |
| **Progress & Integrity Reporting** | ✅ | ✅ | Yes |
| **Native WebChat** | ✅ | ❌ / Different | No (ErikrafT Drop™ Native Chat preserved) |
| **Tor .onion Routing** | ✅ | ❌ | Restricted to ErikrafT Drop™ Tor Nodes |

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
