# ERIKRAFT-QR Optical Transfer Specification (v1.0)

This document defines the official **ERIKRAFT-QR** specification for offline, high-speed optical data transmission across screen-to-camera links between **ErikrafT Drop™ Web** and **ErikrafT Drop™ Android**.

---

## 1. Overview

**ERIKRAFT-QR** is a networkless, peer-to-peer optical communication protocol. It enables devices to transfer text or files directly through visual light (Screen ➔ Camera ➔ Bytes) without requiring Wi-Fi, Cellular Data, Bluetooth, WebRTC, WebSockets, Tor, or intermediate servers.

---

## 2. Protocol Header & Frame Structure

Each animated QR frame consists of a JSON-encoded string (or Base64 binary frame) containing structural metadata and payload chunks.

### JSON Frame Payload Schema
```json
{
  "h": "EKQR",        // Magic Header (4 bytes)
  "v": 1,             // Protocol Version (integer)
  "id": "A1B2C3D4",   // Transfer ID (8 alphanumeric chars)
  "t": "file",        // Transfer Type: "text" | "file"
  "name": "doc.pdf",  // Name (for files)
  "mime": "app/pdf",  // MIME Type (for files)
  "sz": 10240,        // Total Payload Size in bytes
  "i": 12,            // Current Symbol / Chunk Index (0-based)
  "n": 50,            // Total Symbols / Chunks required
  "crc": 305419896,   // CRC32 Checksum of payload chunk
  "sha": "e3b0c442...",// SHA-256 Checksum of complete original payload
  "d": "a1b2c3..."   // Payload Chunk (Base64 or Hex)
}
```

---

## 3. Transmission & Error Correction Coding

1. **Chunking & Fountain/FEC Redundancy:**
   - Raw data is split into $N$ base chunks of equal size (default payload size ~128–256 bytes per QR frame for rapid camera decoding).
   - Additional fountain/XOR parity symbols ($N+1, N+2, \dots$) are generated dynamically so receivers can recover lost or out-of-order frames.

2. **Deduplication & Order Independence:**
   - Receiver registers frames by index $i$. Duplicate frames are ignored.
   - Reconstruction proceeds continuously as soon as all $N$ unique chunks (or equivalent parity combinations) are captured.

3. **Integrity Validation:**
   - **Per-Frame Validation:** Frame is verified against `crc` (CRC32). Corrupted frames are discarded immediately.
   - **Final Validation:** Upon collecting 100% of required chunks, the total reassembled payload is hashed with SHA-256 and compared against the `sha` field. The transfer is declared "Transfer Completed" only if hashes match.

---

## 4. State Transitions & UX Flow

### Receiver Flow
1. **Searching for QR...** (Camera active, scanning canvas)
2. **QR Detected** (First valid `EKQR` frame captured)
3. **Receiving...** (Tracking "Recovered Data: XX%" and "Symbols Received: X/N")
4. **Reconstructing...** (Assembling chunks)
5. **Verifying Integrity...** (Validating SHA-256)
6. **Transfer Completed** (Prompt file download or copy text)

---

## 5. Offline Execution Requirement

The entire ERIKRAFT-QR encoder/decoder pipeline operates client-side using JavaScript, Canvas, and HTML5 WebCam API. All resources are cached via PWA Service Workers to ensure 100% offline functionality.
