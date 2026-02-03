

## 🚀 Release Notes — Chat Notifications & Media Upload Improvements

**Version:** v1.12.1
**Date:** 2026-02-03

### ✨ New

* Chat now supports **image and video attachments** with in-line preview and a download button.
* Added a **media upload button** (clip icon) next to the message input for faster sharing.
* Browser **title and favicon indicators** now update when there are unread chat messages.
* Web notifications are triggered for **new chat messages when the tab is in background**.

### 🛠 Improvements

* Chat notifications are now properly handled by the `Notifications` service instead of being bound to the wrong UI class.
* Notification triggering logic was standardized using `document.hidden` and `document.visibilityState`.
* Improved visual feedback for **unread messages received while the chat popup is closed** (pinned highlight until reload).
* Better UX consistency with existing notification patterns in the app.

### 🐛 Fixes

* Fixed an issue where chat notifications **did not fire** due to the handler being registered in the wrong class (`ChatUI` instead of `Notifications`).
* Fixed cases where messages received while the chat popup was closed **were not rendered when reopening**.

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
  * Test image/video upload and rendering in chat.

* uma versão **curta** de Release Notes (pra descrição do GitHub Release), e
* uma versão **super resumida** pra mensagem de update dentro do app.
