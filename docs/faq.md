---
title: "Frequently Asked Questions"
icon: "circle-question"
---

# Frequently Asked Questions

### Instructions / Discussions

- [ErikrafT Drop™](https://drop.erikraft.com) — official web instance
- [ErikrafT Drop™ on GitHub](https://github.com/erikraft/Drop)
- [ErikrafT Drop™ Android](https://github.com/erikraft/Drop-Android)
- [PairDrop](https://github.com/schlagmichdoch/PairDrop) — upstream project that inspired parts of the project
- [Snapdrop](https://github.com/RobinLinus/snapdrop) — original project this ecosystem was historically based on

### Help! I can't install the PWA!

If you are using a Chromium-based browser such as Chrome, Edge, Brave, Vivaldi, or another supported browser, you can install ErikrafT Drop™ as a PWA when the browser provides an installation option.

If the installation option does not appear, make sure that:

- You are using a supported browser.
- The ErikrafT Drop™ instance is loaded over HTTPS.
- The browser can access the PWA manifest and required resources.

#### Desktop

On desktop, Chromium-based browsers such as Chrome, Edge, Brave, and Vivaldi can offer an **Install** option when the ErikrafT Drop™ PWA is installable.

Firefox Desktop can also support PWA installation through compatible extensions.

#### Android

On Android, open ErikrafT Drop™ in a supported browser and use the browser's **Install** or **Add to Home screen** option when available.

#### iOS and iPadOS

On iPhone and iPad, open ErikrafT Drop™ in a browser that supports adding web apps to the Home Screen.

The usual installation process is:

1. Open an official ErikrafT Drop™ instance.
2. Open the browser's share menu.
3. Select **Add to Home Screen**.
4. Confirm by selecting **Add**.

PWA installation capabilities depend on the installed iOS or iPadOS version and the browser being used.

Older iOS versions had more restrictive PWA installation support. Newer iOS and iPadOS versions provide broader support for adding web apps from supported browsers.

### Self-Hosted PWA

If you are hosting your own ErikrafT Drop™ instance, the connection needs to be [established through HTTPS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Installable_PWAs) for PWA-related features.

See the [Host Your Own documentation](host-your-own.md#testing-pwa-related-features) for more information.

### Shortcuts?

Available shortcuts:

- Send a message with `CTRL + ENTER`
- Close all "Send" and "Pair" dialogs by pressing `Esc`
- Copy a received message to the clipboard with `CTRL/⌘ + C`
- Accept file-transfer requests with `Enter`
- Decline file-transfer requests with `Esc`

### How to save images directly to the gallery on iOS?

Older iOS versions had issues with saving images shared from websites directly to the gallery.

This issue was fixed in newer iOS versions. See [WebKit pull request #13111](https://github.com/WebKit/WebKit/pull/13111).

If you are using an older affected iOS version, the original ErikrafT Drop™ shortcut is still available:

- [ErikrafT Drop™ iOS Shortcut on RoutineHub](https://routinehub.co/shortcut/24753/)
- [ErikrafT Drop™ iOS Shortcut on iCloud](https://www.icloud.com/shortcuts/f81dbac00823445e8feefd0f834b40e7)
- [ErikrafT Drop™ iOS Shortcut from GitHub](https://github.com/erikraft/Drop/raw/refs/heads/master/Shortcut/ErikrafT%20Drop.shortcut)

On newer supported iOS versions, you can use the native **Save Image** or **Save X Images** options.

### Is it possible to send files or text directly from the "Context" or "Share" menu?

Yes.

- [Send files directly from the "Context" menu on Windows](/docs/how-to.md#send-files-directly-from-context-menu-on-windows)
- [Send directly from the "Share" menu on iOS](/docs/how-to.md#send-directly-from-share-menu-on-ios)
- [Send directly from the "Share" menu on Android](/docs/how-to.md#send-directly-from-share-menu-on-android)

### Is it possible to send files or text directly via CLI?

Yes.

- [Send directly from a command-line interface](/docs/how-to.md#send-directly-via-command-line-interface)

### Are there any third-party Apps?

These third-party applications are compatible with ErikrafT Drop™:

1. [ErikrafT Drop™ Android App](https://github.com/erikraft/Drop-Android)
2. [ErikrafT Drop™ for Firefox](https://addons.mozilla.org/en-US/firefox/addon/erikraft-drop/)
3. Feel free to create another compatible application.

Third-party applications are not necessarily maintained by the ErikrafT Drop™ web project.

### What about the connection? Is it a P2P connection directly from device to device or is there any third-party server?

ErikrafT Drop™ uses a WebRTC peer-to-peer connection.

A signaling server is used to help peers discover each other and establish the connection.

The signaling server is not used as normal file storage.

When devices can establish a direct WebRTC connection, file data is transferred directly between the peers.

If the devices are on the same network, files can be transferred directly between the devices without using a remote relay.

If the devices are behind different NATs and a direct connection cannot be established, the ErikrafT Drop™ TURN Server can be used to route the connection.

See the [Technical Documentation](technical-documentation.md#encryption-webrtc-stun-and-turn) for more information about STUN, TURN, and WebRTC.

If you host your own instance and want to support devices that do not support WebRTC, you can [enable the WebSocket fallback](host-your-own.md#websocket-fallback-for-vpn).

### What about privacy? Will files be saved on third-party servers?

ErikrafT Drop™ is designed around peer-to-peer file transfer.

Files are not uploaded to a normal file-storage database on the ErikrafT Drop™ signaling service.

ErikrafT Drop™ does not use a database for storing transferred files.

You can inspect the [signaling server source code](https://github.com/erikraft/Drop/blob/master/server/ws-server.js).

When a direct WebRTC connection cannot be established and a TURN server is required, the TURN server can relay the encrypted WebRTC traffic.

See the [Technical Documentation](technical-documentation.md#encryption-webrtc-stun-and-turn) for more information.

Users should still use trusted instances and consider the security and privacy practices of any self-hosted or third-party instance.

### What about security? Are my files encrypted while being sent between the computers?

Yes.

Files transferred through WebRTC are encrypted in transit by the WebRTC transport.

The signaling connection is also protected when using a secure HTTPS/WSS deployment.

As with any P2P application, users should verify that they are connected to the intended device before accepting a transfer.

You should also use an official or trusted ErikrafT Drop™ instance when transferring sensitive information.

For more information about the security architecture, see the [Technical Documentation](technical-documentation.md).

### Transferring many files with paired devices takes too long

If traffic needs to be routed through the TURN server because your devices are behind different NATs, transfer speed can decrease.

One way to avoid unnecessary TURN routing is to connect the devices through the same local network or use a hotspot to bridge the connection.

Examples:

- [How to open a hotspot on Windows](https://support.microsoft.com/en-us/windows/use-your-windows-pc-as-a-mobile-hotspot-c89b0fad-72d5-41e8-f7ea-406ad9036b85#WindowsVersion=Windows_11)
- [How to share an Internet connection on macOS](https://support.apple.com/guide/mac-help/share-internet-connection-mac-network-users-mchlp1540/mac)
- [Linux Wi-Fi Hotspot](https://github.com/lakinduakash/linux-wifi-hotspot)

You can also use a mobile hotspot on a phone to establish a local connection between devices.

## Official ErikrafT Drop™ Instances

Use these instances for the current official ErikrafT Drop™ service:

- [https://drop.erikraft.com](https://drop.erikraft.com)
- [https://drop-fallback.erikraft.com](https://drop-fallback.erikraft.com)
- [https://dropfallback.erikraft.com](https://dropfallback.erikraft.com)

These instances are maintained for the ErikrafT Drop™ project.

### Can I host my own ErikrafT Drop™ server?

Yes.

ErikrafT Drop™ is open source and can be self-hosted.

If you use a self-hosted or third-party instance, verify its source code, configuration, security, and privacy practices before transferring sensitive data.

See the [Host Your Own documentation](host-your-own.md) for installation and configuration information.

### What happened to Snapdrop?

ErikrafT Drop™ is the current project and service represented by this repository and its official instances.

Snapdrop is listed as a historical reference because ErikrafT Drop™ belongs to the same broader ecosystem of browser-based peer-to-peer file-transfer projects.

Snapdrop is **not** an official ErikrafT Drop™ instance.

The ErikrafT Drop™ Android app no longer uses `snapdrop.net` as an official server.

If you need an official ErikrafT Drop™ service, use one of the instances listed in the official instances section above.

### Why don't you implement feature xyz?

ErikrafT Drop™ aims to remain simple, reliable, and focused on fast file and text transfer.

Features are evaluated carefully because additional complexity can interfere with existing functionality, compatibility, performance, and the user experience.

We prefer changes that provide clear value without unnecessarily making the core transfer experience harder to use or maintain.

The project focuses on doing file and text transfer well instead of trying to become a general-purpose communication platform.

### ErikrafT Drop™ is awesome! How can I support it?

- [Report bugs or give feedback](https://github.com/erikraft/Drop/issues)
- Submit improvements through a pull request.
- Share ErikrafT Drop™ with other people.
- Review the code and report security issues responsibly.
- Participate in [GitHub Discussions](https://github.com/erikraft/Drop/discussions)
- Support the project through the official support options shown on the project website.
- [Support ErikrafT Drop™ on Ko-fi](https://ko-fi.com/erikraft)

### How does it work?

ErikrafT Drop™ uses browser technologies including:

- WebRTC for peer-to-peer communication
- WebSockets for signaling
- HTTPS/TLS for secure web communication
- STUN for discovering possible network paths
- TURN as a relay when a direct WebRTC connection cannot be established

See the [Technical Documentation](technical-documentation.md) for detailed information about the implementation.

## “Unofficial” / Legacy Snapdrop Instances

The following names are retained for historical/reference purposes only.

They are **not operated, maintained, endorsed, or verified by ErikrafT Drop™**:

- [https://snapdrop.net/](https://snapdrop.net/)
- [https://pairdrop.net/](https://pairdrop.net/)
- [https://snapdrop.k26.ch/](https://snapdrop.k26.ch/)
- [https://snapdrop.9pfs.repl.co/](https://snapdrop.9pfs.repl.co/)
- [https://filedrop.codext.de/](https://filedrop.codext.de/)
- [https://s.hoothin.com/](https://s.hoothin.com/)
- [https://www.wulingate.com/](https://www.wulingate.com/)
- [https://snapdrop.fairysoft.net/](https://snapdrop.fairysoft.net/)
- [https://airtransferer.web.app/](https://airtransferer.web.app/)
- [https://drop.wuyuan.dev](https://drop.wuyuan.dev)
- [https://share.jck.cx](https://share.jck.cx)

**DISCLAIMER: WE ARE NOT IN ANY WAY AFFILIATED WITH THE PEOPLE WHO RUN THESE INSTANCES. WE DO NOT KNOW THEM. WE CANNOT VERIFY THE CODE THEY ARE RUNNING.**

## Third-Party / Legacy Snapdrop Apps

These applications are retained as historical references to the Snapdrop ecosystem.

They are not official ErikrafT Drop™ applications and are not maintained by this project:

1. [Snapdrop Desktop App](https://github.com/alextwothousand/snapdrop-desktop) — built on top of Electron.
2. [Snapdrop Android App](https://github.com/fm-sys/snapdrop-android) — allows sharing files from other apps via the Android share action.
3. [Snapdrop Flutter App](https://github.com/congnguyendinh0/snapdrop_flutter)
4. [Snapdrop iOS App](https://github.com/CDsigma/Snapdrop-iOS-App)
5. [Snapdrop Node App](https://github.com/Bellisario/node-snapdrop)
6. [SnapDrop VSCode Extension](https://github.com/Yash-Garg/snapdrop-vsc)

Feel free to create compatible third-party software, but clearly identify it as third-party software and do not imply that it is an official ErikrafT Drop™ application.

[\< Back](/README.md)
