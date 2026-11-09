# 📋 ErikrafT Drop™ Desktop — Current Status

**Last documentation review:** 2026-11-09

## Executive summary

The desktop client is an Electron wrapper around a selected ErikrafT Drop™ web server. It is not an offline server or a self-contained peer-to-peer backend. The user can select one of the configured server instances or verify a custom HTTP(S) server.

## Current packaging

| Platform | Target | Output |
|---|---|---|
| Windows x64 | NSIS installer | `*-win-x64.exe` |
| Windows x64 | Portable | `*-win-x64-portable.exe` |
| Linux x64 | Debian package | `erikraft-drop-linux-amd64.deb` |
| Linux | Flatpak | Built through `npm run package:flatpak` when Flatpak tooling is available |

See [electron-builder.yml](electron-builder.yml) and [package.json](package.json) for the source of truth.

## Wine and Winlator

The Windows x64 portable executable is the preferred artifact to try with Wine or Winlator. The app disables the optional native WinSparkle updater for portable builds and detected compatibility environments. This is not a guarantee that GPU, audio/video, WebRTC, or filesystem integration works on every host.

See [docs/wine-winlator.md](docs/wine-winlator.md).

## Build and test

```bash
npm ci
node --test test/desktop-portable.test.js
npm run package:linux
```

For Windows, run `npm run package:windows` on a Windows host or use the Windows CI job. Do not infer successful runtime compatibility from a successful packaging build.

## Release and updates

The desktop release workflow creates Windows and Linux artifacts. The NSIS installer is the signed WinSparkle update target; the portable executable is distributed as a separate asset. The private signing key must remain in GitHub Actions secrets.

## Important distinction

This file is a current overview, not a historical claim that every package or runtime was tested. Check the latest release and GitHub Actions results before distributing an artifact.
