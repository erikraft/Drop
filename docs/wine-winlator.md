# Wine and Winlator compatibility

ErikrafT Drop™ for Windows is currently packaged as an **x64 Electron application**. The Windows executable can be attempted with Wine or Winlator, but compatibility is **best effort**: the project does not claim official certification or a successful runtime test on every Wine/Winlator version or Android device.

## Which executable should I use?

1. Open the [ErikrafT Drop™ releases](https://github.com/erikraft/Drop/releases).
2. Prefer the asset ending in `-win-x64-portable.exe`. It does not require the NSIS installation flow.
3. If the portable asset is unavailable, use the `-win-x64.exe` NSIS installer inside a dedicated Wine prefix.
4. Use a 64-bit Wine prefix. The current Windows target is x64; ARM devices depend on the compatibility layer's x64 translation support.

Do not assume older releases contain the portable executable. Check the assets attached to the release you are downloading.

## Wine (Linux)

Example using a dedicated prefix:

```bash
export WINEPREFIX="$HOME/.wine-erikraft-drop"
export WINEARCH=win64
export ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1

wineboot -u
APP_EXE=$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'erikraft-drop-*-win-x64-portable.exe' -print -quit)
if [ -z "$APP_EXE" ]; then
  echo "No portable Windows executable found. Check the release assets."
  exit 1
fi
wine "$APP_EXE"
```

Replace the download path with the exact filename you downloaded. The explicit compatibility variable asks the application to skip its optional native WinSparkle updater. It does **not** disable file transfers or the main application.

If you prefer the installer, run the NSIS `-win-x64.exe` file with Wine and then launch ErikrafT Drop™ from the same prefix.

## Winlator (Android)

1. Create or select a 64-bit container with x64 translation enabled.
2. Copy the `-win-x64-portable.exe` file into the container's accessible storage.
3. Launch it from Winlator's file manager or shortcut.
4. If the container exposes environment-variable settings, set `ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1` before launch.

Winlator configurations differ substantially. A successful process start does not guarantee that GPU rendering, audio/video capture, clipboard, filesystem access, WebRTC, or WebSocket fallback will work on a particular device.

## Optional updater behavior

The desktop application skips WinSparkle when it detects a portable build, a known Wine environment variable, or either explicit compatibility variable:

- `ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1`
- `ERIKRAFT_DROP_DISABLE_NATIVE_UPDATER=1`

The updater is optional. Compatibility mode only disables the native WinSparkle integration; it does not change the server selected by the user or the transfer protocol. If the compatibility layer does not pass its Wine environment markers to the Windows process, use one of the explicit variables above where the launcher supports it.

## Troubleshooting

- **Blank window or unstable rendering:** try launching with Chromium's `--disable-gpu` switch. This may reduce performance.
- **Camera or microphone unavailable:** check host permissions and Wine/Winlator device passthrough.
- **Devices are not discovered:** verify that the container has network access and that its firewall allows WebSocket and WebRTC traffic.
- **WebRTC transfer fails:** the selected server must have its WebSocket fallback configured for fallback transfers to be available. Fallback is not a guarantee that every network path will work.
- **Installer does not start:** prefer the portable executable, if published. Avoid elevated execution unless the prefix specifically requires it.

## Known limitations

- No Wine or Winlator runtime test is performed by the repository's Windows packaging workflow. CI builds and checks the installer and portable artifacts on a native Windows runner.
- The app wrapper loads the selected ErikrafT Drop™ server over HTTP(S); it is not an offline copy of the web application.
- Android CPU architecture, graphics drivers, audio/video permissions, networking, and Winlator translation settings can affect compatibility.
- The x64 Windows executable is not a native Android APK and does not guarantee support on ARM devices.

## Related documentation

- [Desktop development and packaging](../ELECTRON_DEVELOPMENT_GUIDE.md)
- [Self-hosting](host-your-own.md)
- [Security policy](../SECURITY.md)
