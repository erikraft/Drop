<div align="center">
  <a href="https://github.com/erikraft/Drop">
    <img src="https://biodrop.erikraft.com/images/Logo.png" alt="Logo" width="150" height="150">
  </a>

  <h1><em>Send it</em>, with <a href="https://drop.erikraft.com/">ErikrafT Drop</a></h1>

  <p>
    Local file sharing <a href="https://drop.erikraft.com/"> <img src="https://biodrop.erikraft.com/images/Logo.png" width="14px" style="display:inline;"> <strong>in your web browser</strong></a>.<br>
    Inspired by Apple's AirDrop and Schlagmichdoch's PairDrop.<br>
    Fork of ErikrafT Drop.
  </p>

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/erikraft/Drop)
[![Crowdin](https://badges.crowdin.net/erikraft-drop/localized.svg)](https://crowdin.com/project/erikraft-drop)
![CodeRabbit Reviews](https://img.shields.io/coderabbit/prs/github/erikraft/Drop?label=CodeRabbit+Reviews&labelColor=171717&color=FF570A)

[🤝🏻 Form a Partnership](PARTNERSHIP.md)

<br>

  <p>
    <img src="https://biodrop.erikraft.com/images/Logo.png" width="14px" style="display:inline;"> <a href="https://github.com/erikraft/Drop/issues">Report a bug</a><br />
    <img src="https://biodrop.erikraft.com/images/Logo.png" width="14px" style="display:inline;"> <a href="https://github.com/erikraft/Drop/issues">Request feature</a>
  </p>
</div>

<br>

<p align="center">
 	  Minecraft Community<br>
 	  <a href="https://discord.gg/8ErMwRy4aj"><img src="https://img.shields.io/discord/1121464803941171270?label=discord&style=flat-square&color=5a66f6"></a>
	  &nbsp;
<br>
<br>
<br>
ErikrafT Drop Community
<br>
 	  <a href="https://discord.gg/KWvqwRxjnA"><img src="https://img.shields.io/discord/1372342747494613032?label=discord&style=flat-square&color=5a66f6"></a>
	  &nbsp;
<br>

</p>

<br>

---

🔮｜See possible old or future files that have not yet been released in the source code on Github or that have already been released in the past, which is on my computer in a 2nd public folder here on Mega <img src="https://biodrop.erikraft.com/images/Logo.png" width="14px" style="display:inline;"> [CLICK HERE](https://mega.nz/folder/kgJj2DTQ#uov-pmvrn3ebMdQkLvtdPQ)

---

<br>

<img src="https://developer.android.com/static/images/robot-tiny.png" width="20px" style="display:inline;">｜ErikrafT Drop Available for Android: [CLICK HERE](https://github.com/erikraft/Drop-Android)

<br>

## ⚙️ Features
File sharing on your local network that works on all platforms.

<br>

- **Extensions**
  - [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ErikrafT.erikraft-drop)
  - [Open VSX Registry](https://open-vsx.org/extension/ErikrafT/erikraft-drop)
  - [Opera Add-ons](https://addons.opera.com/en/extensions/details/erikraft-drop/)
  - [Thunderbird Add-ons](https://addons.thunderbird.net/pt-BR/thunderbird/addon/erikraft-drop/)
  - [Firefox Browser Add-ons](https://addons.mozilla.org/pt-BR/firefox/addon/erikraft-drop/)

- **A multi-platform AirDrop-like solution that works.**
  - Send images, documents or text via peer-to-peer connection to devices on the same local network.
- **Internet transfers**
  - Join temporary public rooms to transfer files easily over the Internet.
- **Web-app**
  - Works on all devices with a modern web-browser.
- **Discord integrations**
  - Send files directly from Discord using the example bot located at [`Discord/Bot`](Discord/Bot/README.md). The device appears on the website with a Discord icon, and transfers occur in real time using the official WebSocket fallback.
  - Publish a custom activity from [`Discord/Activities`](Discord/Atividades/README.md) to embed ErikrafT Drop directly inside Discord with automatic device identification.

- **iOS Share Menu integration**
  - Send images, files, folders, URLs, or text directly from the iOS share menu using a custom Shortcut.

  **Download the shortcut:**
  - https://routinehub.co/shortcut/24753/
  - https://www.icloud.com/shortcuts/f81dbac00823445e8feefd0f834b40e7
  - https://github.com/erikraft/Drop/raw/refs/heads/master/Shortcut/ErikrafT%20Drop.shortcut

Send a file from your phone to your laptop?
<br>Share photos in original quality with friends using Android and iOS?
<br>Share private files peer-to-peer between Linux systems?

<br>
<img src="docs/erikraftdrop_screenshot_mobile.gif" alt="Screenshot GIF showing ErikrafT Drop in use" style="width: 300px">

---

## 🌍 Help with Translation

Want to help make ErikrafT Drop available in more languages? You can contribute to the translation efforts at:

**https://crowdin.com/project/erikraft-drop**

Join our community of translators and help bring ErikrafT Drop to users around the world!

---

## 🔀 Differences to the [Snapdrop](https://github.com/RobinLinus/snapdrop) it is based on
<details><summary>👀｜View all differences</summary>

### 📶 Paired Devices and Public Rooms — Internet Transfer
* Transfer files over the Internet between paired devices or by entering temporary public rooms.
* Connect to devices in complex network environments (public Wi-Fi, company network, iCloud Private Relay, VPN, etc.).
* Connect to devices on your mobile hotspot.
* Devices outside of your local network that are behind a NAT are auto-connected via the ErikrafT Drop TURN server.
* Devices from the local network, in the same public room, or previously paired are shown.

#### 🔐 Persistent Device Pairing

Always connect to known devices

* Pair devices via a 6-digit code or a QR-Code.
* Paired devices always find each other via shared secrets independently of their local network.
* Pairing is persistent. You find your devices even after reopening ErikrafT Drop.
* You can edit and unpair devices easily.

#### 🌎 Temporary Public Rooms

Connect to others in complex network situations, or over the Internet.

* Enter a public room via a 5-letter code or a QR-code.
* Enter a public room to temporarily connect to devices outside your local network.
* All devices in the same public room see each other.
* Public rooms are temporary. Closing ErikrafT Drop  leaves all rooms.

### ✨ [Improved UI for Sending/Receiving Files](https://github.com/RobinLinus/snapdrop/issues/560)
* Files are transferred after a request is accepted. Files are auto-downloaded upon completing a transfer, if possible.
* Multiple files are downloaded as a ZIP file
* Download, share or save to gallery via the "Share" menu on Android and iOS.
* Multiple files are transferred at once with an overall progress indicator.

### 💬 Send Files or Text Directly From Share Menu, Context Menu or CLI
* [Send files directly from context menu on Ubuntu (using Nautilus)](docs/how-to.md#send-multiple-files-and-directories-directly-from-context-menu-on-ubuntu-using-nautilus)
* [Send files directly from the context menu on Windows](docs/how-to.md#send-files-directly-from-context-menu-on-windows)
* [Send directly from the "Share" menu on iOS](docs/how-to.md#send-directly-from-share-menu-on-ios)
* [Send directly from the "Share" menu on Android](docs/how-to.md#send-directly-from-share-menu-on-android)
* [Send directly via the command-line interface](docs/how-to.md#send-directly-via-command-line-interface)

### 🌱 Other Changes
* Change your display name to easily differentiate your devices.
* [Paste files/text and choose the recipient afterwards ](https://github.com/RobinLinus/snapdrop/pull/534)
* [Prevent devices from sleeping on file transfer](https://github.com/RobinLinus/snapdrop/pull/413)
* Warn user before ErikrafT Drop is closed on file transfer
* Open ErikrafT Drop on multiple tabs simultaneously (Thanks [@willstott101](https://github.com/willstott101))
* [Video and audio preview](https://github.com/RobinLinus/snapdrop/pull/455) (Thanks [@victorwads](https://github.com/victorwads))
* Switch theme back to auto/system after dark or light mode is on
* Node-only implementation (Thanks [@Bellisario](https://github.com/Bellisario))
* Auto-restart on error (Thanks [@KaKi87](https://github.com/KaKi87))
* Lots of stability fixes (Thanks [@MWY001](https://github.com/MWY001) [@skiby7](https://github.com/skiby7) and [@willstott101](https://github.com/willstott101))
* To host ErikrafT Drop on your local network (e.g. on Raspberry Pi): [All peers connected with private IPs are discoverable by each other](https://github.com/RobinLinus/snapdrop/pull/558)
* When hosting ErikrafT Drop yourself, you can [set your own STUN/TURN servers](docs/host-your-own.md#specify-stunturn-servers)
* Translations.

</details>

---

## 🔨 Built with the following awesome technologies:
* Vanilla HTML5 / JS ES6 / CSS 3 frontend
* [WebRTC](http://webrtc.org/) / WebSockets
* [Node.js](https://nodejs.org/en/) backend
* [Progressive web app (PWA)](https://en.wikipedia.org/wiki/Progressive_web_app) unified functionality
* [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) storage handling
* [zip.js](https://gildas-lormeau.github.io/zip.js/) library
* [cyrb53](https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js) super-fast hash function
* [NoSleep](https://github.com/richtr/NoSleep.js) display sleep, add wake lock ([MIT](licenses/MIT-NoSleep))
* [heic2any](https://github.com/alexcorvi/heic2any) HEIC/HEIF to PNG/GIF/JPEG ([MIT](licenses/MIT-heic2any))
* [Crowdin](https://crowdin.com/) web-based localization tool
* [BrowserStack](https://www.browserstack.com/) This project is tested with BrowserStack

[❓｜FAQ](docs/faq.md)

[📡｜Host your own instance with Docker or Node.js](docs/host-your-own.md).

---

## ⏬ Getting ErikrafT Drop

<div align="center" style="display: inline_block; gap: 10px;"><br>
  <a href="https://drop.erikraft.com/" target="_blank">
    <img alt="Open the Web App" style="height: 80px;" src="./public/images/badges/Get%20it%20on%20WEB.png">
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.erikraft.drop" target="_blank">
    <img alt="Get it on Google Play" height="80" src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png">
  </a>
  <a href="https://f-droid.org/en/packages/com.erikraft.drop/" target="_blank">
    <img alt="Get it on F-Droid" height="80" src="https://fdroid.gitlab.io/artwork/badge/get-it-on.png">
  </a>
  <a href="https://apkpure.com/p/com.erikraft.drop" target="_blank">
    <img alt="Get it on APKPure" style="height: 60px;" src="./public/images/badges/Get_it_on_APKPure_English.png">
  </a>
  <a href="https://github.com/erikraft/Drop-Android/releases/latest/download/Drop-Android.apk" target="_blank">
    <img alt="Download the APK" style="height: 80px;" src="./public/images/badges/Get%20it%20on%20APK.png">
  </a>
  <a href="https://routinehub.co/shortcut/24753/" target="_blank">
    <img alt="Get it on Shortcut" style="height: 60px;" src="./public/images/badges/Get_it_on_Shortcuts_English.png" alt="Get it on Shortcut">
  </a>
  <a href="https://discord.com/oauth2/authorize?client_id=1367869058707492955" target="_blank">
    <img alt="Get it on Discord" style="height: 80px;" src="./public/images/badges/Get it on Discord.png" alt="Get it on Discord">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ErikrafT.erikraft-drop" target="_blank">
    <img alt="Get it on VS Code Marketplace" style="height: 80px;" src="./public/images/badges/Get%20it%20on%20VS%20CODE.png">
  </a>
  <a href="https://open-vsx.org/extension/ErikrafT/erikraft-drop" target="_blank">
    <img alt="Get it on Open VSX Registry" style="height: 80px;" src="./public/images/badges/Get%20it%20on%20Open%20VSX%20Registry.png">
  </a>
  <a href="https://addons.opera.com/en/extensions/details/erikraft-drop/" target="_blank">
    <img alt="Opera Add-ons" style="height: 80px;" src="./public/images/badges/Get-it-from-Opera-Addons.png">
  </a>
  <a href="https://addons.thunderbird.net/pt-BR/thunderbird/addon/erikraft-drop/" target="_blank">
    <img alt="Thunderbird Add-ons" style="height: 60px;" src="./public/images/badges/Get_the_add-on_Thunderbird.png">
  </a>
  <a href="https://addons.mozilla.org/pt-BR/firefox/addon/erikraft-drop/" target="_blank">
    <img alt="Firefox Browser ADD-ONS" style="height: 80px;" src="./public/images/badges/Firefox%20Browser%20ADD-ONS.png">
  </a>
</div>

---

## 🌐 Links

[<img src="https://biodrop.erikraft.com/images/Logo.png" width="20px" style="display:inline;">｜biodrop.erikraft.com](https://biodrop.erikraft.com/)
<br />
[<img src="https://biodrop.erikraft.com/images/Logo.png" width="20px" style="display:inline;">｜drop.erikraft.com](https://drop.erikraft.com/)
<br />
[🛡️｜Privacy Policy](https://drop.erikraft.com/privacy-policy.html)
<br />
[🛡️｜Terms of Use](https://drop.erikraft.com/terms-of-use.html)
<br />
[🛡️｜License](https://github.com/erikraft/Drop/blob/master/LICENSE)
<br />
[🛡️｜Security](https://github.com/erikraft/Drop/blob/master/SECURITY.md)
<br />
[<img src="https://developer.android.com/static/images/robot-tiny.png" width="20px" style="display:inline;">｜ErikrafT Drop Android Github Repository](https://github.com/erikraft/Drop-Android)
<br />

---

## 💰 Support
<a href="https://ko-fi.com/erikraft" target="_blank">
<img src="./public/images/Donate With Ko-fi.png" width="150" alt="Donate"/>
</a>
<br />
<br />

ErikrafT Drop is libre, and always will be. \
If you find it useful and want to support free and open-source software, please consider donating using the button above. \
I footed the bill for the domain and the server, and you can help create and maintain great software by supporting me. \
Thank you very much for your contribution!

---

## 🙏 Thank you everyone's support :)

<a href="https://www.star-history.com/#erikraft/Drop&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=erikraft/Drop&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=erikraft/Drop&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=erikraft/Drop&type=Date" />
 </picture>
</a>
