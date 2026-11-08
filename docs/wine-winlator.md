# Wine and Winlator compatibility

ErikrafT Drop™ for Windows is an x64 Electron application. It can be attempted under Wine and Winlator, but these environments are **best-effort compatibility targets**, not officially certified platforms. A successful launch does not guarantee that every browser, media, GPU, or network feature will work.

## Recommended executable

1. Open the [GitHub Releases page](https://github.com/erikraft/Drop/releases).
2. Prefer the asset whose name ends in `-win-x64-portable.exe`, when that asset is available.
3. If the release only contains `-win-x64.exe`, that file is the NSIS installer. Install it inside the Wine prefix and launch ErikrafT Drop™ from that prefix.
4. Use a 64-bit Wine prefix for the x64 Windows build.

The portable target is configured in `electron-builder.yml` and the release workflow validates and uploads both Windows executables. **The latest published release checked for this documentation update is `v10.1.7` (2026-10-07), and its asset list contains the NSIS installer but no portable executable.** The portable target is available in the current source/build workflow, but users must check the actual assets of each release rather than assume that an older release contains it.

## WinSparkle updater

The native WinSparkle updater is optional. The application skips it for portable builds and when Wine-related environment markers are visible to the process. This avoids loading the optional native updater DLL in compatibility environments; it does not disable file transfers or the main application.

If Wine/Winlator does not pass its environment markers to the Windows process, set one of these variables in the launch environment:

- `ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1`
- `ERIKRAFT_DROP_DISABLE_NATIVE_UPDATER=1`

Both options only disable the native WinSparkle updater. They do not disable application updates from the Releases page.

## Troubleshooting

- **Window opens but stays blank or rendering is unstable:** try adding Chromium's `--disable-gpu` argument to the shortcut/launcher. This is a compatibility workaround and may reduce performance.
- **Camera or microphone does not work:** verify Wine/Winlator permissions and device passthrough. These features depend on the host environment and are not guaranteed.
- **Devices are not discovered:** verify that the environment has network access and that WebSocket/WebRTC traffic is not blocked by its firewall or network translation.
- **Transfers fail over WebRTC:** the server's WebSocket fallback must be enabled for that instance. Fallback can improve connectivity but is not a replacement for a working network path.
- **Installer fails:** use the portable executable if the current release publishes it. Do not run the Windows installer with elevated privileges unless the Wine prefix specifically requires it.

## Known limitations

- Winlator runs Windows software through a layered Android/Linux compatibility stack. GPU drivers, audio/video capture, filesystem permissions, clipboard integration, and WebRTC behavior vary by device and Winlator configuration.
- The application loads the selected ErikrafT Drop™ server over HTTP(S); this desktop wrapper does not make the remote service available offline.
- No Wine or Winlator runtime test is claimed by the repository's Windows packaging CI. The CI validates that Windows installer and portable artifacts are produced on a native Windows runner.

## Related documentation

- [Desktop development and packaging](../ELECTRON_DEVELOPMENT_GUIDE.md)
- [Self-hosting](host-your-own.md)
- [Security policy](../SECURITY.md)
