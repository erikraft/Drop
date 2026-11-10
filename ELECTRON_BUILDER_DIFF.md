# 📊 Electron Builder — Current Packaging Reference

This file is a current configuration reference, not a historical before/after diff. The old diff documented changes from an earlier Electron Builder version and should not be used to modify the current configuration blindly.

## Windows

The `win` target in `electron-builder.yml` contains:

- `nsis`: interactive installer with installation-directory selection and shortcuts.
- `portable`: separately named portable x64 executable.

Expected artifact patterns:

- `*-win-x64.exe` — NSIS installer.
- `*-win-x64-portable.exe` — portable executable.

The release workflow signs and publishes the installer as the WinSparkle update target. The portable executable remains a separate release asset.

## Linux

The Linux configuration builds an x64 Debian package and uses the dedicated SVG icon under `packaging/linux/icons/`. The Flatpak package has a separate script and manifest.

## Cache configuration in GitHub Actions

GitHub's `runner` context is not valid in workflow-level `env`. Use `runner.temp` only in supported step-level contexts such as a step's `env` or an action's `with` input. The packaging PR workflow places the Electron Builder cache path in those step-level contexts.

## Wine/Winlator

Use the portable x64 Windows executable as the first compatibility attempt. Native updater integration is skipped for portable builds and detected Wine environments. See [the compatibility guide](docs/wine-winlator.md) for limitations.
