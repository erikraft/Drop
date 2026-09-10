# ERIKRAFT-QR Optical Transfer Specification

## Optical-transfer modes

**QR Animado — Legacy/Compatibility** is the existing `EKQR` protocol
documented below. It has not been renamed, replaced, or changed by the
experimental **ErikrafT Optical Matrix** option.

Optical Matrix (`EOM/1`) is a separate, browser-native coloured-symbol matrix.
Every tile carries six bits: four by one of sixteen polygon symbols and two by
one of four deliberately high-contrast colours. It includes an integrity
header and CRC32 and can encode/decode a same-geometry canvas locally. It is
an experimental single-frame codec, not a transport replacement: it currently
has no camera/perspective detector, stream framing, Reed-Solomon/interleaving,
or fountain recovery. Consequently it must not be described as Cimbar or CFC
compatible. Cimbar's documented 700px+ in-focus, colour-corrected capture
guidance does not validate this independent implementation.

The UI labels this distinction explicitly so existing QR users keep selecting
the compatibility protocol. Future camera support must prove real round trips
before compatibility claims are added.

## GitHub directory ZIP

`ErikrafTGitHubFolderZip` accepts a public URL in the form
`https://github.com/OWNER/REPOSITORY/tree/REF/path`, recursively lists it via
the GitHub Contents API, and builds a ZIP in the browser with the already
bundled zip.js library. No GitHub token is requested, saved, or sent by this
feature. Private repositories, a 403 rate-limit response, missing refs, and
empty directories produce explicit errors. A 100 MiB declared-size safety cap
protects browser and WebView memory; users needing private access should use a
locally authenticated GitHub client rather than expose a token to this UI.

ERIKRAFT-QR is ErikrafT Drop™'s protocol for **animated QR optical transfer**. It is designed for transferring text and files from a screen to a camera without relying on WebRTC, WebSockets, Tor, or a transfer server during the optical transfer itself.

> **Implementation note:** The current Web implementation uses simple pairwise XOR parity recovery. It does **not** implement a general Fountain Code, Luby Transform, LT Code, or RaptorQ decoder. Do not describe the current FEC as Fountain Coding.

---

## 1. Transfer modes

ERIKRAFT-QR is separate from the project's normal network transfer and from the ecosystem QR scanner.

### Animated QR Transfer

The sender renders a sequence of QR frames. The receiver scans those frames with a camera and reconstructs the original text or file.

### Ecosystem QR Scanner

The normal QR scanner handles static QR codes and URLs such as pairing, room, and ErikrafT ecosystem links. It is not the same protocol as Animated QR Transfer.

---

## 2. Current Web implementation

The main implementation is in:

- `public/scripts/erikraft-qr.js`
- `public/scripts/animated-qr-controls.js`
- `public/scripts/animated-qr-file-size.js`
- `public/scripts/animated-qr-screen-awake.js`
- `public/scripts/qr-helper.js`
- QR-related tests under `test/`

The transmitter exposes `ErikrafTQRTransmitter`; the receiver exposes `ErikrafTQRScanner`.

---

## 3. Protocol frame

Each animated frame is a JSON payload encoded into a QR code. The Web implementation identifies frames with the `EKQR` header.

A normal data frame contains fields equivalent to:

```json
{
  "h": "EKQR",
  "v": 1,
  "id": "A1B2C3D4",
  "t": "file",
  "name": "document.pdf",
  "mime": "application/pdf",
  "sz": 10240,
  "i": 0,
  "n": 4,
  "c": 0,
  "crc": 305419896,
  "sha": "...sha256...",
  "d": "...base64..."
}
```

Where:

- `h` — protocol magic header (`EKQR`).
- `v` — protocol version.
- `id` — transfer/session identifier.
- `t` — transfer type (`text` or `file`).
- `name` — file name or text identifier.
- `mime` — MIME type.
- `sz` — original uncompressed payload size.
- `i` — frame/chunk index.
- `n` — number of base chunks required for reconstruction.
- `c` — compression flag.
- `crc` — CRC32 checksum of the Base64 data field.
- `sha` — SHA-256 digest of the complete original payload.
- `d` — Base64-encoded chunk data.

Parity frames additionally contain a `fec` array identifying the two base chunks that were XORed.

---

## 4. Compression

The Web implementation performs a lightweight entropy check before compression.

- Payloads smaller than 1,000 bytes are not compressed.
- High-entropy payloads are skipped because they are likely already compressed.
- Deflate-raw compression is used when the browser provides `CompressionStream`.
- Compression is kept only when it reduces the payload by at least 5%.
- The receiver uses `DecompressionStream` when the compression flag is set.

Compression is an optimization; it is not required for the protocol itself.

---

## 5. Chunking and XOR-based parity recovery

The current Web transmitter splits the payload into base chunks and then creates additional parity frames.

For each parity frame:

```text
P = Bx XOR By
```

The frame records the two source indexes in `fec: [x, y]`.

During reception:

- If both base chunks are present, the parity frame is unnecessary.
- If exactly one of the two base chunks is present, the missing chunk can be recovered with XOR.
- Recovery can be applied repeatedly as additional parity frames arrive.
- The current implementation therefore provides **pairwise XOR erasure recovery**.

### What this is not

The current implementation is **not** a general fountain-code system. It does not implement random-degree symbol generation, LT decoding, Luby Transform decoding, or Raptor/RaptorQ decoding.

Future work may investigate stronger erasure codes, but those should not be documented as implemented until the code actually contains them.

---

## 6. Frame integrity and final integrity

Two levels of integrity checking are implemented.

### CRC32

The receiver calculates CRC32 over each frame's Base64 payload. A frame with a mismatching CRC is discarded.

### SHA-256

After all required base chunks have been received or recovered, the receiver reassembles the payload, decompresses it when necessary, and calculates SHA-256 over the reconstructed original bytes.

The transfer is completed only when the calculated digest matches the SHA-256 value carried by the transfer metadata.

---

## 7. Out-of-order frames and duplicates

The receiver stores chunks by index rather than assuming that frames arrive sequentially.

This allows:

- out-of-order frame reception;
- duplicate-frame suppression;
- missing-frame recovery when a matching XOR parity frame is available;
- reconstruction after the required base chunks have been collected or recovered.

---

## 8. Camera and scanner lifecycle

The Web scanner uses the browser camera APIs and prefers the rear/environment camera on mobile devices.

The implementation includes:

- `playsinline` video handling;
- automatic camera fallback when the preferred camera configuration fails;
- `BarcodeDetector` when available;
- `jsQR` as a fallback;
- explicit MediaStream track cleanup when scanning stops;
- localized scanner states and errors.

The scanner does not keep the camera stream alive after the transfer/dialog has been stopped.

---

## 9. Offline behavior

Animated QR Transfer is an **optical, network-independent transfer mode after the required application assets have been loaded**.

The transfer itself does not need:

- WebRTC;
- WebSockets;
- a signaling server;
- a TURN server;
- Wi-Fi or cellular connectivity;
- Bluetooth;
- an intermediate file-storage server.

This does **not** mean that every ErikrafT Drop™ transfer mode is offline. Normal WebRTC/WebSocket transfers still require their respective networking/signaling environment.

---

## 10. PWA support

The service worker precaches the Animated QR implementation and its supporting client assets, including QR rendering/decoding libraries and localization resources.

This allows the QR transfer interface to remain usable offline after the required application resources have been installed/cached.

Offline **application availability** and offline **optical transfer** are separate concepts; neither should be generalized into "all ErikrafT Drop™ transfers work offline."

---

## 11. Android status

The main repository includes an `Android/` Git submodule pointing to the ErikrafT Drop™ Android project.

The pinned Android revision contains a QR transfer activity and an Android-side QR protocol implementation. However, the audited Web and Android implementations are **not currently identical protocol implementations**: the Android code at the pinned revision uses a different frame magic/schema (`EKQR1` and Android-specific fields) from the Web implementation's `EKQR` schema.

Therefore this document does **not** claim that Web ↔ Android Animated QR Transfer interoperability is currently proven. Android QR functionality should be treated as an implementation/integration that requires explicit interoperability testing before being documented as fully cross-platform.

---

## 12. Internationalization

The Web QR implementation obtains user-facing scanner states through the project's localization system. QR-related strings are therefore intended to follow the application's existing i18n mechanism rather than being hard-coded into a separate language system.

The repository contains locale files including English and Brazilian Portuguese, among other languages.

---

## 13. Security and privacy properties

ERIKRAFT-QR is designed so that the optical transfer payload is processed locally by the sender and receiver.

The implementation provides:

- per-frame CRC32 validation;
- final SHA-256 verification;
- file-name sanitization during reconstruction;
- bounded metadata/chunk indexes;
- bounded reconstruction sizes;
- explicit camera permission handling;
- no network dependency for the optical payload transfer itself.

QR transfer should not be described as providing encryption. Integrity verification is not the same as confidentiality.

---

## 14. Current limitations

The current implementation has several deliberate limitations:

- Pairwise XOR parity is less powerful than a true fountain/erasure-code implementation.
- Parity recovery depends on receiving one member of each XOR pair plus the corresponding parity frame.
- QR payloads are JSON + Base64, which adds overhead.
- Camera quality, distance, lighting, focus, QR error-correction level, and frame rate affect throughput and reliability.
- The Web implementation and the pinned Android implementation currently use different protocol schemas, so cross-platform QR interoperability must not be assumed.

---

## 15. Testing expectations

Before documenting a new QR capability as stable, test at least:

- Web sender → Web receiver;
- text transfer with UTF-8 and emoji;
- binary files such as PNG, ZIP, and PDF;
- duplicate frames;
- out-of-order frames;
- recoverable frame loss using XOR parity;
- corrupted frames rejected by CRC32;
- final SHA-256 verification;
- offline transfer after the application is loaded/cached;
- camera permission denial and cleanup;
- mobile camera scanning;
- Web → Android and Android → Web interoperability separately, if the protocol schemas are intentionally aligned in the future.

The current documentation deliberately avoids claiming Android interoperability until the implementations actually use a compatible protocol and that path has been tested.
