# 🧾 Desktop Packaging — Technical Status Report

**Documentation review:** 2026-11-09

## Scope

This document records the current desktop packaging design in the repository. It replaces the previous report, which described a historical Electron Builder 26.8.1 configuration and included build results that should not be treated as current.

## Current implementation

- Electron application entry point: `desktop/main.cjs`.
- Desktop server selection: `desktop/server-config.cjs` and the server-selector window files.
- Electron Builder configuration: `electron-builder.yml`.
- Windows targets: NSIS installer and portable x64 executable.
- Linux target: x64 Debian package.
- Optional Windows updater: WinSparkle, initialized from the desktop main process.
- Wine/Winlator compatibility: native updater is skipped for portable builds and detected compatibility runtimes.

## Commands

```bash
npm ci
node --test test/desktop-portable.test.js
npm run package:linux
```

On Windows:

```powershell
npm ci
npm run package:windows
```

## Validation status

This repository contains CI workflows for validating Linux and Windows packaging. This document does not assert that a particular current run passed. Consult the workflow run attached to the commit or pull request being reviewed.

No Wine or Winlator runtime test is performed by the Windows packaging CI. The relevant compatibility guide describes these environments as best effort.

## Security and release handling

- Keep Electron renderer isolation enabled.
- Do not enable Node integration in remote content windows.
- Keep the WinSparkle private key in repository Actions secrets.
- Treat the public key embedded in the app as public verification material, not as a secret.
- Inspect release assets and signing output before publishing.

See [SECURITY.md](SECURITY.md), [ELECTRON_DEVELOPMENT_GUIDE.md](ELECTRON_DEVELOPMENT_GUIDE.md), and [docs/wine-winlator.md](docs/wine-winlator.md).
