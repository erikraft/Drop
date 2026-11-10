# 🚀 ErikrafT Drop™ Desktop — Development and Packaging Guide

## 1. Requirements

- Node.js 22.12.0 or newer.
- npm.
- Windows for a native Windows package build.
- Linux and `dpkg-deb` for validating the Debian package.
- Network access for npm and Electron Builder artifact downloads.

The exact versions are defined in `package.json` and `package-lock.json`.

## 2. Install dependencies

From the repository root:

```bash
npm ci
```

Use `npm ci` to install the exact dependency tree recorded in the lockfile. Do not replace it with an unpinned global Electron Builder install.

## 3. Run desktop-focused tests

```bash
node --test test/desktop-portable.test.js
npm run test:desktop-version
npm run test:desktop-update
```

The full repository test suite is available through:

```bash
npm test
```

## 4. Build for Linux

On a supported Linux host:

```bash
npm run package:linux
```

Expected artifact: `dist/desktop/erikraft-drop-linux-amd64.deb`.

Validate it:

```bash
test -s dist/desktop/erikraft-drop-linux-amd64.deb
dpkg-deb --info dist/desktop/erikraft-drop-linux-amd64.deb
```

## 5. Build for Windows

On Windows:

```powershell
npm ci
npm run package:windows
```

The command generates both the NSIS installer and portable executable in `dist/desktop/`. CI validates that both expected artifact patterns exist and are non-empty.

## 6. Wine and Winlator

Prefer the `-win-x64-portable.exe` asset. The app skips its optional native WinSparkle updater for portable builds and detected Wine environments. Wine/Winlator runtime compatibility is best effort; the packaging CI runs on native Windows and does not test those compatibility layers.

See [docs/wine-winlator.md](docs/wine-winlator.md).

## 7. Release workflow

The desktop release workflow builds Linux and Windows artifacts. The WinSparkle private signing key is read from the GitHub Actions secret `WINSPARKLE_ED25519_PRIVATE_KEY`; never commit or print that key. The updater's public verification key in the app is not secret.

## 8. GitHub Actions cache context

Do not reference `runner.temp` in workflow-level `env`. The runner context is available in supported step-level contexts. The packaging PR workflow uses the runner temporary directory for the Electron Builder helper cache.

## 9. Troubleshooting

- **Missing WinSparkle DLL:** run `npm run prepare:winsparkle`; the preparation script checks the downloaded archive's SHA-256 before extracting the DLL.
- **Windows package fails on Linux:** use the native Windows CI job or a supported Windows build host; do not assume Wine-based packaging is equivalent.
- **Blank window under Wine/Winlator:** try Chromium's `--disable-gpu` switch.
- **Transfer discovery fails:** verify network access, WebSocket connectivity, and WebRTC support in the host environment.
- **Build output missing:** inspect the relevant GitHub Actions log and confirm the script completed before looking for files in `dist/desktop/`.

