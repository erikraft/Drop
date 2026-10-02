## 🚀 Release Notes — Desktop 10.1.6

**Version:** v10.1.6
**Date:** 2026-10-02

### ✨ New

* Windows desktop updates now use native **WinSparkle** instead of the web/CSS update popup.
* WinSparkle checks a signed release appcast and installs the published Windows installer through its native update flow.
* Windows desktop builds bundle the official WinSparkle 0.9.4 runtime DLL.

### 🛠 Improvements

* The desktop update feed is tied to the published GitHub Release, so update metadata cannot point to a version that has not been published as an installer.
* Added a pinned WinSparkle download step with SHA-256 verification for reproducible Windows packaging.
* Updated desktop bug-report/version documentation to v10.1.6.

### 🧪 Testing

* Unit coverage verifies the 10.1.6 version metadata and WinSparkle integration points.
* A full production updater test still requires a signed v10.1.6 Windows release and a second Windows build to exercise the real install/relaunch path.

---

## 🚀 Release Notes — Chat Notifications & Media Upload Improvements

**Version:** v1.12.4
**Date:** 2026-02-03

### ✨ New

* Chat now supports **image attachments** with in-line preview and a download button.
* Added a **media upload button** (clip icon) next to the message input for faster sharing.
* Browser **title and favicon indicators** now update when there are unread chat messages.
* Web notifications are triggered for **new chat messages when the tab is in background**.
* Chat footer now uses the **full discovery panel layout** (same as the main HTML).
* Chat discovery panel is now **compact and aligned** to match the original UI (no wrapping on the title).

### 🛠 Improvements

* Chat notifications are now properly handled by the `Notifications` service instead of being bound to the wrong UI class.
* Notification triggering logic was standardized using `document.hidden` and `document.visibilityState`.
* Improved visual feedback for **unread messages received while the chat popup is closed** (pinned highlight until reload).
* Better UX consistency with existing notification patterns in the app.
* Download button in chat attachments now uses the **download icon** instead of text.
* Chat discovery footer styling now matches the original spacing and alignment.

### 🐛 Fixes

* Fixed an issue where chat notifications **did not fire** due to the handler being registered in the wrong class (`ChatUI` instead of `Notifications`).
* Fixed cases where messages received while the chat popup was closed **were not rendered when reopening**.
* Disabled **video attachments** in chat upload since delivery was unreliable.

### 📁 Files Changed

* `public/scripts/ui.js`
* `public/scripts/network.js`
* `public/index.html`
* `public/styles/styles-main.css`

### 🧪 Testing

* Not executed (manual testing recommended):

  * Reload the page (Ctrl + F5).
  * Send a message from another device/tab.
  * Keep the chat tab in background to verify browser notifications.
  * Test image upload and rendering in chat.

* uma versão **curta** de Release Notes (pra descrição do GitHub Release), e
* uma versão **super resumida** pra mensagem de update dentro do app.
