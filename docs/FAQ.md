# Frequently Asked Questions

### Instructions / Discussions
* [ErikrafT Drop™](https://drop.erikraft.com) — official web instance
* [ErikrafT Drop™ on GitHub](https://github.com/erikraft/Drop)
* [ErikrafT Drop™ Android](https://github.com/erikraft/Drop-Android)
* [PairDrop](https://github.com/schlagmichdoch/PairDrop) — upstream project that inspired parts of the project
* [Snapdrop](https://github.com/RobinLinus/snapdrop) — original project this ecosystem was historically based on

### Help! I can't install the PWA!
If you are using a Chromium-based browser (Chrome, Edge, Brave, etc.), you can install ErikrafT Drop™ as a PWA when your browser offers the install option while visiting an official ErikrafT Drop™ instance.

If the install option does not appear, make sure you are using a supported Chromium-based browser and that the current site is loaded over HTTPS.

### What about the connection? Is it a P2P-connection directly from device to device or is there any third-party-server?
ErikrafT Drop™ uses a P2P connection when WebRTC is supported by the browser. A signaling server is used to help peers discover and establish the connection, but it is not used to carry the file data after the WebRTC connection has been established.

For public Internet transfers, the connection and signaling path can depend on the network and WebRTC configuration. Local-network transfers are still designed around peer-to-peer communication.

### What about privacy? Will files be saved on third-party-servers?
ErikrafT Drop™ is designed so that files are transferred directly between peers rather than being uploaded to the ErikrafT Drop™ signaling service as a normal file-storage operation.

The official service does not provide a normal file-storage database for transferred files. However, users should still use trusted instances and keep in mind that the signaling infrastructure is part of the connection-establishment process.

### What about security? Are my files encrypted while being sent between the computers?
Yes. When files are transferred through WebRTC, the WebRTC transport provides encryption in transit between the peers.

As with any P2P application, users should verify that they are connected to the intended device before accepting a transfer.

### Which ErikrafT Drop™ instances are official?
The following are the official ErikrafT Drop™ web instances:

* [https://drop.erikraft.com](https://drop.erikraft.com)
* [https://drop-fallback.erikraft.com](https://drop-fallback.erikraft.com)
* [https://dropfallback.erikraft.com](https://dropfallback.erikraft.com)

These are the current ErikrafT Drop™ instances maintained for the project.

### Can I host my own ErikrafT Drop™ server?
Yes. The project is open source, and specialists can host their own compatible server. If you use a self-hosted or third-party instance, verify its source code, configuration, security and privacy practices before transferring sensitive data.

### What happened to Snapdrop?
ErikrafT Drop™ is the current project and service represented by this repository and its official instances above. Snapdrop is listed below only as a legacy/original ecosystem reference; it is not an official ErikrafT Drop™ instance.

The ErikrafT Drop™ Android app no longer uses snapdrop.net as an official server. If you need an official service, use one of the ErikrafT Drop™ instances listed above.

### Why don't you implement feature xyz?
ErikrafT Drop™ aims to remain simple, reliable and focused on fast file and text transfer. Features are evaluated carefully because additional complexity can interfere with existing functionality, compatibility and the user experience.

We prefer changes that provide clear value without unnecessarily making the core transfer experience harder to use or maintain.

### ErikrafT Drop™ is awesome! How can I support it?
* [Report bugs or give feedback](https://github.com/erikraft/Drop/issues)
* Submit improvements through a pull request.
* Share ErikrafT Drop™ with other people.
* Review the code and report security issues responsibly.
* Support the project through the official support options shown on the project website.

## Official ErikrafT Drop™ Instances

Use these instances for the current ErikrafT Drop™ service:

- https://drop.erikraft.com
- https://drop-fallback.erikraft.com
- https://dropfallback.erikraft.com

## “Unofficial” / Legacy Snapdrop Instances

The following names are retained for historical/reference purposes only. They are **not operated, maintained, endorsed, or verified by ErikrafT Drop™**:

- https://snapdrop.net/
- https://pairdrop.net/
- https://snapdrop.k26.ch/
- https://snapdrop.9pfs.repl.co/
- https://filedrop.codext.de/
- https://s.hoothin.com/
- https://www.wulingate.com/
- https://snapdrop.fairysoft.net/
- https://airtransferer.web.app/
- https://drop.wuyuan.dev
- https://share.jck.cx

**DISCLAIMER: WE ARE NOT IN ANY WAY AFFILIATED WITH THE PEOPLE WHO RUN THESE INSTANCES. WE DO NOT KNOW THEM. WE CANNOT VERIFY THE CODE THEY ARE RUNNING.**

## Third-Party / Legacy Snapdrop Apps

These applications are retained as historical references to the Snapdrop ecosystem. They are not official ErikrafT Drop™ applications and are not maintained by this project:

1. [Snapdrop Desktop App](https://github.com/alextwothousand/snapdrop-desktop) built on top of Electron.
2. [Snapdrop Android App](https://github.com/fm-sys/snapdrop-android) allows sharing files from other apps via the Android share action.
3. [Snapdrop Flutter App](https://github.com/congnguyendinh0/snapdrop_flutter)
4. [Snapdrop iOS App](https://github.com/CDsigma/Snapdrop-iOS-App)
5. [Snapdrop Node App](https://github.com/Bellisario/node-snapdrop)
6. [SnapDrop VSCode Extension](https://github.com/Yash-Garg/snapdrop-vsc)

Feel free to create compatible third-party software, but clearly identify it as third-party software and do not imply that it is an official ErikrafT Drop™ application.

[< Back](/README.md)
