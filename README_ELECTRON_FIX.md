# 🖥️ ErikrafT Drop™ Desktop — Quick Start

This page describes the **current desktop packaging workflow**. It replaces the older Electron Builder 26.8.1 instructions, which no longer match the repository.

## 🚀 Requirements

- Node.js **22.12.0 or newer** (CI currently uses Node.js 22.23.4).
- npm and network access to download the pinned Electron/Electron Builder artifacts.
- Windows for the native Windows packaging job; Linux for the Debian package job.

The current package version, Electron version, and scripts are defined in [package.json](package.json). Packaging targets are defined in [electron-builder.yml](electron-builder.yml).

## 📦 Build packages

```bash
npm ci
npm run package:linux
```

On Windows:

```powershell
npm ci
npm run package:windows
```

Artifacts are written to `dist/desktop/`. The Windows build produces an NSIS installer (`*-win-x64.exe`) and a portable executable (`*-win-x64-portable.exe`). The Linux build produces `erikraft-drop-linux-amd64.deb`.

## 🍷 Wine and Winlator

Prefer the portable Windows executable when running under Wine or Winlator. The desktop app skips its optional native WinSparkle updater for portable builds and detected compatibility runtimes. Compatibility remains best effort and is not certified by CI.

See [Wine and Winlator compatibility](docs/wine-winlator.md) for setup and troubleshooting.

## 🧪 Validation

```bash
node --test test/desktop-portable.test.js
npm run test:desktop-version
npm run test:desktop-update
```

The packaging PR workflow also runs `npm test` and builds both Linux and Windows packages. A test or build is considered passed only when the corresponding GitHub Actions run reports success.

## 🔐 Security notes

- Electron windows use context isolation, disabled Node integration, and sandboxing.
- External links are handed to the system browser.
- The native WinSparkle updater verifies updates using its configured Ed25519 public key.
- Never publish the WinSparkle private signing key or store it in source control.

Related: [Desktop development guide](ELECTRON_DEVELOPMENT_GUIDE.md) · [Security policy](SECURITY.md).
