# ERIKRAFT-QR Optical Transfer Specification (v2.0)

This document defines the official **ERIKRAFT-QR** specification for offline, high-speed, air-gapped optical data transmission across screen-to-camera links between **ErikrafT Drop™ Web**, **ErikrafT Drop™ PWA**, and **ErikrafT Drop™ Android**.

---

## 1. Overview & Guiding Philosophy

**ERIKRAFT-QR** is a networkless, peer-to-peer optical communication protocol. It enables devices to transfer text or files directly through visual light (**Screen ➔ Camera ➔ Bytes**) without requiring Wi-Fi, Cellular Data, Bluetooth, WebRTC, WebSockets, Tor, or intermediate signaling/relay servers.

### Key Characteristics
* **100% Air-Gapped & Offline:** Operates entirely client-side inside the browser/PWA/Android app using WebCam APIs and HTML5 Canvas.
* **Serverless & Networkless Isolation:** When transferring via Animated QR, no WebRTC, WebSocket fallback, or server requests are made.
* **Erasure Coding / Fountain Redundancy:** Uses XOR parity combination chunks (LT/fountain principles) to recover lost, skipped, or out-of-order frames caused by camera motion or frame drops.
* **Dual-Layer Integrity Checking:** Per-frame CRC32 validation prevents corrupted chunks from entering the reassembly pool. SHA-256 validation on the complete reassembled byte stream guarantees exact file integrity.
* **Bi-directional Cross-Platform Support:** Works seamlessly across Chrome, Firefox, Safari, Tor Browser, Android WebView, and PWA environments.

---

## 2. System Architecture & Data Pipeline

```text
               +----------------------------------------+
               |        SENDER (File / Text Input)       |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 1. Payload Serialization & Compression |
               |    (UTF-8 Text or Binary Raw Bytes)    |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 2. Chunking & Fountain/FEC Encoding    |
               |    (Base Chunks + XOR Parity Chunks)   |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 3. Frame Serializer & CRC32 Builder    |
               |    (JSON Payload with Header "EKQR")   |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 4. Animated QR Renderer (Canvas API)   |
               |    (ErikrafT Drop™ Styled QR Stream)   |
               +----------------------------------------+
                                   |
                                   |  [Optical Light Link]
                                   v  (Screen ➔ Camera)
               +----------------------------------------+
               | 5. Optical Capture & QR Frame Detector |
               |    (BarcodeDetector API / jsQR)        |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 6. Per-Frame CRC32 Verification &      |
               |    Deduplication / Order Independent Pool|
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 7. Erasure Decoding & Fountain Parity   |
               |    Iterative XOR Reconstruction Engine |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               | 8. Full Byte Stream SHA-256 Hash Check |
               +----------------------------------------+
                                   |
                                   v
               +----------------------------------------+
               |       RECEIVER (Reassembled File/Text)  |
               +----------------------------------------+
```

---

## 3. Protocol Header & Frame Schema

Each frame displayed as a QR code contains a JSON-encoded string (or Base64 binary frame) representing structural metadata, chunk indexing, parity information, and payload.

### JSON Frame Payload Schema
```json
{
  "h": "EKQR",          // Magic Header (4 bytes string)
  "v": 1,               // Protocol Version (integer)
  "id": "A1B2C3D4",     // Unique Transfer ID (8 alphanumeric chars)
  "t": "file",          // Transfer Type: "text" | "file"
  "name": "doc.pdf",    // Filename (for files)
  "mime": "app/pdf",    // MIME Type (for files)
  "sz": 10240,          // Total Payload Size in bytes
  "i": 12,              // Current Symbol / Chunk Index (0-based)
  "n": 50,              // Total Base Chunks required
  "fec": [10, 11],      // (Optional) XOR Parity Chunk indices combined
  "c": 1,               // (Optional) Compression Flag (1 = Deflate/Gzip, 0 = Uncompressed)
  "crc": 305419896,     // CRC32 Checksum of base64 data payload chunk 'd'
  "sha": "e3b0c442...",  // SHA-256 Checksum of complete reassembled original payload
  "d": "a1b2c3..."     // Base64-encoded Data Payload Chunk
}
```

### Schema Field Descriptions
* `h`: Protocol magic identifier, must be `"EKQR"`.
* `v`: Integer version indicator (`1`).
* `id`: Random 8-character string unique to the transmission session.
* `t`: Content type (`"text"` or `"file"`).
* `name`: Name of file or default identifier.
* `mime`: Standard MIME type (`text/plain`, `image/png`, `application/pdf`, etc.).
* `sz`: Complete uncompressed payload size in bytes.
* `i`: Frame chunk index ($0 \le i < N$ for base chunks, $i \ge N$ for parity chunks).
* `n`: Total number $N$ of base chunks required to reconstruct the full payload.
* `fec`: Array of chunk indices XORed together when $i \ge N$.
* `c`: Integer flag indicating payload compression.
* `crc`: 32-bit unsigned Integer representing CRC32 checksum of string `d`.
* `sha`: 64-character hex string representing the SHA-256 digest of the entire uncompressed file/text buffer.
* `d`: Base64 string of the raw byte slice.

---

## 4. Chunking, Compression & Fountain FEC Coding

1. **Serialization & Compression:**
   - Raw binary buffers or UTF-8 text strings are processed client-side.
   - Optional Deflate compression minimizes total chunk count for compressible text or documents.
2. **Base Chunks Split:**
   - Payload is segmented into equal base chunks of length $S$ (default 180-256 bytes per frame for high-speed camera scanning).
3. **Fountain XOR Parity Generation:**
   - For a payload of $N$ base chunks, $M$ fountain parity chunks ($M = \lceil 0.2 \times N \rceil$ minimum) are generated.
   - Parity frame $P_k$ is computed by XORing base chunks $B_x$ and $B_y$:
     $$P_k[b] = B_x[b] \oplus B_y[b]$$
   - When a receiver misses base chunk $B_y$ but captures $B_x$ and parity $P_k$, $B_y$ is immediately recovered:
     $$B_y[b] = B_x[b] \oplus P_k[b]$$
   - Iterative XOR cascade decoding is applied upon receiving every new parity frame.

---

## 5. Deduplication, Order Independence & Integrity Validation

* **Order Independence:** The receiver registers frames by chunk index $i$. Frames can arrive in any sequence, with gaps or duplicates.
* **Deduplication:** Chunks already present in the receiver pool are discarded immediately.
* **Per-Frame Integrity (CRC32):**
  - Before parsing frame data, `crc32(payload.d)` is computed.
  - If `crc32` does not equal `payload.crc`, the frame is dropped silently to prevent buffer corruption.
* **Final Reassembly & SHA-256 Verification:**
  - Once $N$ unique base chunks are collected (or recovered via FEC), chunks are joined in ascending order $i = 0 \dots N-1$.
  - Decompression is applied if flag `c === 1`.
  - Subtle Crypto API computes `SHA-256(reassembledBuffer)`.
  - Reassembly succeeds **only** if calculated SHA-256 strictly equals `payload.sha`. Otherwise, the transfer fails integrity check.

---

## 6. Camera Stream Lifecycle & Scanner Isolation

To ensure stability across desktop, mobile browsers, Android WebViews, and Tor Browser:

### Camera Request & Initialization
1. Video element attributes MUST include `playsinline="true"`, `autoplay="true"`, and `muted=true`.
2. Initial stream acquisition requests `{ video: { facingMode: 'environment' } }`.
3. If environment camera fails or is unavailable, automatic fallback requests generic camera `{ video: true }`.
4. Video stream playback is started via `video.play()` inside `onloadedmetadata` listeners.

### Lifecycle Cleanup
Upon dialog closure or transfer completion:
1. Scanning loops are canceled immediately.
2. All `MediaStreamTrack` tracks in `stream.getTracks()` are explicitly stopped (`track.stop()`).
3. `video.srcObject` is set to `null`.

---

## 7. Ecosystem QR Scanner vs. Animated QR Transfer System

ErikrafT Drop™ differentiates between two distinct QR functionalities:

1. **Animated QR Transfer (`#animated-qr-btn`):**
   - Handles offline file and text payload transmission over animated QR code streams.
   - Independent of network, WebRTC, WebSocket, and servers.

2. **Ecosystem QR Scanner (`#openQRScanner`):**
   - Scans static QR codes and URLs.
   - Supports URL classification and auto-discovery for ErikrafT services:
     - `https://drop.erikraft.com/?room_id=...`
     - `https://drop.erikraft.com/?pair_key=...`
     - `https://docsdrop.erikraft.com/`
     - `https://biodrop.erikraft.com/`
   - Provides security confirmation prompts before navigating to external URLs.
   - Includes manual input fallback ("Cole o conteúdo do QR Code manualmente") when cameras are unavailable or permissions are denied.
