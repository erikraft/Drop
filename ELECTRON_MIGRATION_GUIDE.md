# 🔄 Desktop Packaging and Migration Guide

This guide describes how to work with the current desktop packaging configuration. It replaces the old Electron Builder 24.x/25.x/26.x migration checklist.

## 1. Check the current versions

Before changing Electron or Electron Builder, inspect:

- `package.json` for the Electron dependency, package version, scripts, and Node.js engine.
- `package-lock.json` for the exact resolved dependency versions.
- `electron-builder.yml` for the platform targets and packaging options.
- The two desktop workflows under `.github/workflows/`.

Do not infer the current version from old reports or release notes.

## 2. Keep artifact names stable

The current Windows release includes two distinct assets:

- `*-win-x64.exe`: NSIS installer.
- `*-win-x64-portable.exe`: portable executable.

The release workflow uses the installer as the WinSparkle update target. Do not sign or publish the portable artifact as if it were the installer.

The Linux x64 artifact is `erikraft-drop-linux-amd64.deb`.

## 3. Validate changes

```bash
npm ci
node --test test/desktop-portable.test.js
npm run test:desktop-version
npm run test:desktop-update
```

Then run the appropriate platform package script and inspect the matching GitHub Actions job. The packaging PR workflow runs the repository test suite and validates both platform packages.

## 4. Wine and Winlator

The x64 portable executable is the recommended first attempt. The desktop app skips the optional native WinSparkle updater for portable builds and detected Wine environments. This is a compatibility measure, not a promise that all Electron, GPU, media, or networking features work.

See [docs/wine-winlator.md](docs/wine-winlator.md).

## 5. Updating Electron or Electron Builder safely

1. Review upstream release notes and security advisories.
2. Update the dependency in `package.json` and regenerate `package-lock.json` with the supported Node/npm toolchain.
3. Run the desktop-focused tests and full test suite.
4. Build the Windows installer, Windows portable executable, and Linux package.
5. Check the updater signing and appcast workflow.
6. Test upgrades from the previous supported release before publishing.

Do not change the public WinSparkle verification key without a coordinated signing-key migration. A mismatch can prevent clients from accepting future signed updates.

## 6. Rollback

If a packaging update breaks a release, revert the packaging change in a new commit/PR and publish a corrected release using the previously supported signing configuration. Do not overwrite or rotate the WinSparkle private key as an ad-hoc rollback.
