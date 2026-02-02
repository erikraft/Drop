---

### ✨ New

* Added **LAN room label** in the discovery footer and chat popup, making it clearer when users are discoverable on local networks.
* Introduced **LAN room badge** for better visual identification of local network rooms.
* Prepared new **i18n keys for Crowdin**, allowing missing translations to be completed by the community.

### 🌍 Internationalization (i18n)

* Fixed **PT-BR translations** to proper Portuguese.
* Fixed **EN translations** to proper English.
* Normalized translation keys to avoid mixed-language strings.
* Added empty placeholders for other languages to be completed via Crowdin.

### 🎨 UI Improvements

* Updated room badges to include **LAN mode styling**.
* Improved consistency of badge colors across IP, LAN, and paired/secret rooms.

### 🛠️ Developer Experience

* Improved translation structure to simplify future localization updates.
* Minor cleanup in styles related to room badges.

### 🐞 Fixes

* Fixed mixed-language labels appearing in some UI sections.
* Resolved missing translation keys that caused fallback text to appear incorrectly.

---

### ⚠️ Known Limitations

* LAN mode uses local signaling for WebRTC (no native device discovery due to browser limitations).
* Full offline peer discovery is only available in native desktop builds (e.g., Electron).

---