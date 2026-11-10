# 🔍 Electron Builder — Current Configuration Analysis

This document describes the configuration currently present in the repository. The former analysis referred to Electron Builder 26.8.1 and historical icon/desktop-entry changes; those details are not the current source of truth.

## Configuration sources

- `package.json`: application version, Electron dependency, Node.js engine, and packaging scripts.
- `electron-builder.yml`: product identity, packaged files, platform targets, icons, and installer behavior.
- `desktop/main.cjs`: Electron main process, server selection, window security, and optional updater.
- `.github/workflows/packaging-pr-check.yml`: pull-request validation.
- `.github/workflows/desktop-release.yml`: release builds and signing.

## Build targets

| Platform | Target |
|---|---|
| Windows x64 | NSIS installer |
| Windows x64 | Portable executable |
| Linux x64 | DEB |
| Linux | Flatpak script, subject to local Flatpak tooling |

The Windows package script prepares the optional WinSparkle DLL, validates the Linux icon asset, and invokes the configured Electron Builder version. The release workflow runs on a native Windows runner for Windows artifacts.

## Desktop runtime

The desktop main process opens a BrowserWindow and loads the selected ErikrafT Drop™ server. The renderer is configured with context isolation, Node integration disabled, and sandboxing enabled. External links are delegated to the system browser.

The desktop app is therefore a wrapper for a remote or self-hosted web instance; it should not be described as an offline standalone transfer server.

## Wine and Winlator

The portable x64 executable is the preferred artifact to try under Wine/Winlator. The optional WinSparkle integration is skipped for portable builds and detected compatibility runtimes. This avoids loading the native updater in environments where it may not work, but does not certify the remaining Electron runtime.

See [docs/wine-winlator.md](docs/wine-winlator.md).

## Validation

Run the desktop-focused tests and packaging scripts listed in [ELECTRON_DEVELOPMENT_GUIDE.md](ELECTRON_DEVELOPMENT_GUIDE.md). Treat a package as validated only when its corresponding CI job or local build completes successfully. Packaging success does not prove runtime compatibility under Wine or Winlator.
