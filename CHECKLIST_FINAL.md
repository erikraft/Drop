# ✅ Desktop Packaging Checklist — ErikrafT Drop™

Use this checklist for the current desktop packaging configuration. It supersedes the old Electron Builder 26.8.1 checklist.

## Source of truth

- [ ] Confirm the application version in `package.json`.
- [ ] Confirm the Electron version and Node.js engine in `package.json`.
- [ ] Review the Windows and Linux targets in `electron-builder.yml`.
- [ ] Confirm the release workflow and packaging PR workflow match the expected artifact names.

## Local preparation

- [ ] Use Node.js 22.12.0 or newer.
- [ ] Run `npm ci` from the repository root.
- [ ] Run `node --test test/desktop-portable.test.js`.
- [ ] Run `npm run test:desktop-version`.
- [ ] Run `npm run test:desktop-update`.

## Linux package

- [ ] Run `npm run package:linux` on a supported Linux build host.
- [ ] Confirm `dist/desktop/erikraft-drop-linux-amd64.deb` exists and is non-empty.
- [ ] Validate the package with `dpkg-deb --info`.

## Windows packages

- [ ] Run `npm run package:windows` on Windows or use the Windows CI job.
- [ ] Confirm the NSIS installer matching `*-win-x64.exe` exists.
- [ ] Confirm the portable executable matching `*-win-x64-portable.exe` exists.
- [ ] Keep the WinSparkle private key in GitHub Actions secrets only.
- [ ] Verify the release workflow signs the installer and does not confuse the portable artifact with the installer.

## Wine and Winlator

- [ ] Prefer the `-win-x64-portable.exe` artifact.
- [ ] Use a 64-bit Wine prefix / x64-capable Winlator container.
- [ ] If required, set `ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1` in the launch environment.
- [ ] Test networking, WebSocket, WebRTC, audio/video permissions, and filesystem behavior on the target host.
- [ ] Record the Wine/Winlator version and device/container settings when reporting a failure.

## Release gate

- [ ] Confirm all required GitHub Actions jobs passed.
- [ ] Inspect the release assets and checksums before publishing.
- [ ] Do not claim Wine or Winlator support as certified without runtime tests on those environments.

Related: [Development guide](ELECTRON_DEVELOPMENT_GUIDE.md) · [Wine/Winlator guide](docs/wine-winlator.md).
