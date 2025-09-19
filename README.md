<div align="center">
  <a href="https://github.com/erikraft/Drop">
    <img src="https://biodrop.erikraft.com/images/Logo.png" alt="Logo" width="150" height="150">
  </a>

  <h1><em>Send it</em>, with <a href="https://drop.erikraft.com/">ErikrafT Drop</a></h1>

  <p>
    Local file sharing <a href="https://drop.erikraft.com/"> <img src="https://biodrop.erikraft.com/images/Logo.png" width="14px" style="display:inline;"> <strong>in your web browser</strong></a>.<br>
    Inspired by Apple's AirDrop and Schlagmichdoch's PairDrop.<br>
    Fork of PairDrop.
  </p>

  <p>
    <img src="https://img.shields.io/coderabbit/prs/github/erikraft/Drop?utm_source=oss&utm_medium=github&utm_campaign=erikraft%2FDrop&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews" alt="CodeRabbit Pull Request Reviews">
  </p>

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

---

🔮｜See possible future files that have not yet been released in the source code on Github, which is on my computer <img src="https://biodrop.erikraft.com/images/Logo.png" width="14px" style="display:inline;"> [CLICK HERE](https://mega.nz/folder/kgJj2DTQ#uov-pmvrn3ebMdQkLvtdPQ)

---

## ⚙️ Features
File sharing on your local network that works on all platforms.

- A multi-platform AirDrop-like solution that works.
  - Send images, documents or text via peer-to-peer connection to devices on the same local network.
- Internet transfers
  - Join temporary public rooms to transfer files easily over the Internet.
- Web-app
  - Works on all devices with a modern web-browser.

Send a file from your phone to your laptop?
<br>Share photos in original quality with friends using Android and iOS?
<br>Share private files peer-to-peer between Linux systems?

<table>
  <tr>
    <td><img src="docs/erikraft-drop_screenshot_mobile1.gif" alt="Screenshot GIF 1" width="300"/></td>
    <td><img src="docs/erikraft-drop_screenshot_mobile2.gif" alt="Screenshot GIF 2" width="300"/></td>
  </tr>
</table>

---

## 🎨🔀 Differences to the [Snapdrop](https://github.com/RobinLinus/snapdrop) it is based on
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
* [Weblate](https://weblate.org/) web-based localization tool
* [BrowserStack](https://www.browserstack.com/) This project is tested with BrowserStack

[❓｜FAQ](docs/faq.md)

[📡｜Host your own instance with Docker or Node.js](docs/host-your-own.md).

---

## ⏬ Getting ErikrafT Drop

<a href="https://drop.erikraft.com/" target="_blank"><img src="https://i.imgur.com/9uq39iu.png" width="217"/></a><a href="https://github.com/erikraft/App-Drop-Apk/raw/main/ErikrafT%20Drop.apk" target="_blank"><img src="https://i.imgur.com/nxlokSi.png" width="217"/></a><a href="https://marketplace.visualstudio.com/items?itemName=ErikrafT.erikraft-drop" target="_blank"><img src="https://i.imgur.com/fBWr0lN.png" width="217" alt="Open VSX Registry"/><a href="https://open-vsx.org/extension/ErikrafT/erikraft-drop" target="_blank"><img src="https://i.imgur.com/1OJsWQz.png" width="217" alt="Get it on Open VSX Registry"/><a href="https://addons.mozilla.org/pt-BR/firefox/addon/erikraft-drop/" target="_blank"><img src="https://i.imgur.com/2MubKYT.png" width="217" alt="Firefox Browser ADD-ONS"/>

---

## 🌐 Links

[🔗｜biodrop.erikraft.com](https://biodrop.erikraft.com/)
<br />
[🔗｜drop.erikraft.com](https://drop.erikraft.com/)
<br />
[🔗｜drop.erikraft.com/#about](https://drop.erikraft.com/#about)
<br />
[🔗｜drop.erikraft.com/ads.html](https://drop.erikraft.com/ads.html)
<br />
[🛡️｜Privacy Policy](https://drop.erikraft.com/privacy-policy.html)
<br />
[🛡️｜Terms of Use](https://drop.erikraft.com/terms-of-use.html)
<br />
[🛡️｜License](https://github.com/erikraft/Drop/blob/master/LICENSE)
<br />
[🛡️｜Security](https://github.com/erikraft/Drop/blob/master/SECURITY.md)
<br />
[📲｜APK Github Repository](https://github.com/erikraft/App-Drop-Apk)
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
[![Star History Chart](https://api.star-history.com/svg?repos=erikraft/Drop&type=Date)](https://star-history.com/#erikraft/Drop&Date)
