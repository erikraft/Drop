(function installErikrafTUIHardening() {
    'use strict';

    const STYLE_ID = 'erikraft-ui-hardening-style';
    const QR_TEXT_PREVIEW_ID = 'qr-receive-text-preview';
    const QR_SHA_COPY_ID = 'qr-receive-copy-sha';
    const QR_TEXT_DOWNLOAD_ID = 'qr-receive-download-txt';
    const MAX_CHAT_TEXT_LENGTH = 100000;
    const MAX_CHAT_ATTACHMENT_BYTES = 8 * 1024 * 1024;

    function t(key, fallback) {
        try {
            const value = window.Localization && typeof Localization.getTranslation === 'function'
                ? Localization.getTranslation(key)
                : '';
            return value || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function notify(message) {
        if (typeof Events !== 'undefined') {
            Events.fire('notify-user', message);
        }
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
/* Close / cancel / back actions are consistently destructive/navigation actions. */
x-dialog button[close],
x-dialog button[id*="close" i],
x-dialog button[id*="cancel" i],
x-dialog button[id*="back" i],
x-dialog .close-btn,
x-dialog .cancel-btn,
x-dialog .back-btn,
x-dialog [data-action="close"],
x-dialog [data-action="cancel"],
x-dialog [data-action="back"] {
    background-color: #dc3545 !important;
    border-color: #dc3545 !important;
    color: #fff !important;
}

x-dialog button[close]:hover,
x-dialog button[id*="close" i]:hover,
x-dialog button[id*="cancel" i]:hover,
x-dialog button[id*="back" i]:hover,
x-dialog .close-btn:hover,
x-dialog .cancel-btn:hover,
x-dialog .back-btn:hover,
x-dialog [data-action="close"]:hover,
x-dialog [data-action="cancel"]:hover,
x-dialog [data-action="back"]:hover {
    filter: brightness(0.9);
}

#${QR_TEXT_PREVIEW_ID} {
    width: 100%;
    max-width: 100%;
    max-height: min(42vh, 420px);
    overflow: auto;
    box-sizing: border-box;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    user-select: text;
    -webkit-user-select: text;
    padding: 12px;
    margin: 10px 0;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 5%, transparent);
    text-align: left;
}

#qr-receive-complete-sha {
    user-select: text;
    -webkit-user-select: text;
    overflow-wrap: anywhere;
    word-break: break-word;
}

#qr-receive-complete-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    justify-content: center;
    box-sizing: border-box;
}

@media (max-width: 600px) {
    #qr-receive-complete-actions > .btn {
        flex: 1 1 100%;
        min-height: 44px;
    }
}
`;
        document.head.appendChild(style);
    }

    function copyText(text) {
        if (!text) return Promise.reject(new Error('empty-content'));
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const ok = document.execCommand('copy');
                textarea.remove();
                ok ? resolve() : reject(new Error('copy-failed'));
            } catch (error) {
                reject(error);
            }
        });
    }

    function downloadText(text) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const date = new Date();
        const stamp = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
            '_',
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0')
        ].join('');
        const link = document.createElement('a');
        link.href = url;
        link.download = `ErikrafTDrop_QR_Text_${stamp}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function ensureQrTextActions(dialog, result) {
        if (!dialog || !result || result.type !== 'text' || typeof result.text !== 'string') return;
        const container = dialog.$completeContainer;
        if (!container) return;

        let preview = container.querySelector(`#${QR_TEXT_PREVIEW_ID}`);
        if (!preview) {
            preview = document.createElement('div');
            preview.id = QR_TEXT_PREVIEW_ID;
            preview.setAttribute('role', 'textbox');
            preview.setAttribute('aria-readonly', 'true');
            preview.setAttribute('tabindex', '0');
            const filename = dialog.$completeFilename;
            if (filename && filename.parentNode) {
                filename.insertAdjacentElement('afterend', preview);
            } else {
                container.appendChild(preview);
            }
        }
        // Security boundary: never assign received QR text to innerHTML.
        preview.textContent = result.text;

        let actions = container.querySelector(`#qr-receive-complete-actions`);
        if (!actions) {
            actions = document.createElement('div');
            actions.id = 'qr-receive-complete-actions';
            container.appendChild(actions);
        }

        let copyTextButton = actions.querySelector('[data-qr-action="copy-text"]');
        if (!copyTextButton) {
            copyTextButton = document.createElement('button');
            copyTextButton.type = 'button';
            copyTextButton.className = 'btn btn-rounded';
            copyTextButton.dataset.qrAction = 'copy-text';
            actions.appendChild(copyTextButton);
        }
        copyTextButton.textContent = t('dialogs.animated-qr-copy-text', 'Copiar texto');
        copyTextButton.onclick = async () => {
            try {
                await copyText(result.text);
                notify(t('notifications.copied-to-clipboard', 'Texto copiado para a área de transferência.'));
            } catch (error) {
                console.warn('[Animated QR] Could not copy received text:', error);
                notify(t('notifications.copied-to-clipboard-error', 'Não foi possível copiar o texto.'));
            }
        };

        let copyShaButton = actions.querySelector(`#${QR_SHA_COPY_ID}`);
        if (!copyShaButton) {
            copyShaButton = document.createElement('button');
            copyShaButton.type = 'button';
            copyShaButton.id = QR_SHA_COPY_ID;
            copyShaButton.className = 'btn btn-rounded';
            actions.appendChild(copyShaButton);
        }
        const sha = typeof result.sha === 'string' ? result.sha.trim() : '';
        copyShaButton.textContent = 'Copiar SHA-256';
        copyShaButton.disabled = !sha;
        copyShaButton.onclick = async () => {
            if (!sha) return;
            try {
                await copyText(sha);
                notify(t('notifications.copied-to-clipboard', 'SHA-256 copiado para a área de transferência.'));
            } catch (error) {
                console.warn('[Animated QR] Could not copy SHA-256:', error);
                notify(t('notifications.copied-to-clipboard-error', 'Não foi possível copiar o SHA-256.'));
            }
        };

        let downloadButton = actions.querySelector(`#${QR_TEXT_DOWNLOAD_ID}`);
        if (!downloadButton) {
            downloadButton = document.createElement('button');
            downloadButton.type = 'button';
            downloadButton.id = QR_TEXT_DOWNLOAD_ID;
            downloadButton.className = 'btn btn-rounded';
            actions.appendChild(downloadButton);
        }
        downloadButton.textContent = t('dialogs.download', 'Baixar .txt');
        downloadButton.onclick = () => downloadText(result.text);

        // Replace the old action callback so QR text is handled here and safely.
        if (dialog.$actionBtn) {
            dialog.$actionBtn.textContent = t('dialogs.animated-qr-copy-text', 'Copiar texto');
            dialog.$actionBtn.onclick = async () => {
                try {
                    await copyText(result.text);
                    notify(t('notifications.copied-to-clipboard', 'Texto copiado para a área de transferência.'));
                } catch (error) {
                    console.warn('[Animated QR] Could not copy received text:', error);
                    notify(t('notifications.copied-to-clipboard-error', 'Não foi possível copiar o texto.'));
                }
            };
        }
    }

    function installAnimatedQrReceiveEnhancement() {
        if (!window.AnimatedQRReceiveDialog || window.AnimatedQRReceiveDialog.prototype.__erikraftTextActionsPatched) return;
        const proto = window.AnimatedQRReceiveDialog.prototype;
        const originalOpenScanner = proto.openScanner;
        proto.__erikraftTextActionsPatched = true;

        proto.openScanner = function (...args) {
            const result = originalOpenScanner.apply(this, args);
            let attempts = 0;
            const attach = () => {
                attempts += 1;
                const scanner = this.scanner;
                if (scanner && typeof scanner.onComplete === 'function' && !scanner.__erikraftTextActionsWrapped) {
                    const originalOnComplete = scanner.onComplete;
                    scanner.__erikraftTextActionsWrapped = true;
                    scanner.onComplete = (res) => {
                        originalOnComplete.call(scanner, res);
                        if (res && res.type === 'text') {
                            ensureQrTextActions(this, res);
                        }
                    };
                    return;
                }
                if (attempts < 100) setTimeout(attach, 10);
            };
            setTimeout(attach, 0);
            return result;
        };
    }

    function sanitizeChatAttachment(attachment) {
        if (!attachment || typeof attachment !== 'object') return null;
        const name = typeof attachment.name === 'string' ? attachment.name.slice(0, 255) : 'attachment';
        const type = typeof attachment.type === 'string' ? attachment.type.toLowerCase() : '';
        const dataUrl = typeof attachment.dataUrl === 'string' ? attachment.dataUrl : '';
        const kind = type.startsWith('video/') ? 'video' : 'image';

        if (!/^data:(?:image|video)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(dataUrl)) return null;
        const comma = dataUrl.indexOf(',');
        if (comma < 0) return null;
        const estimatedBytes = Math.floor((dataUrl.length - comma - 1) * 3 / 4);
        if (estimatedBytes > MAX_CHAT_ATTACHMENT_BYTES) return null;

        return {
            name,
            type: type || (kind === 'video' ? 'video/mp4' : 'image/png'),
            size: Number.isFinite(Number(attachment.size)) ? Math.min(Math.max(0, Number(attachment.size)), MAX_CHAT_ATTACHMENT_BYTES) : estimatedBytes,
            kind,
            dataUrl
        };
    }

    function installChatHardening() {
        if (window.ChatUI && !window.ChatUI.prototype.__erikraftChatHardeningPatched) {
            const proto = window.ChatUI.prototype;
            proto.__erikraftChatHardeningPatched = true;

            const originalRefreshRoomSelect = proto._refreshRoomSelect;
            proto._refreshRoomSelect = function () {
                const rooms = Array.from(this._rooms.values());
                if (!rooms.length) {
                    this.$roomSelect.replaceChildren();
                    this.$roomSelect.setAttribute('disabled', true);
                    this._currentRoomKey = null;
                    if (this.$status) this.$status.textContent = '';
                    return;
                }

                this.$roomSelect.removeAttribute('disabled');
                this.$roomSelect.replaceChildren();
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.key;
                    option.textContent = `${this._roomLabel(room.roomType, room.roomId)} (${room.peers.size})`;
                    this.$roomSelect.appendChild(option);
                });

                if (!this._currentRoomKey || !this._rooms.has(this._currentRoomKey)) {
                    this._currentRoomKey = rooms[0].key;
                }
                this.$roomSelect.value = this._currentRoomKey;
                this._renderRoom(this._currentRoomKey);
            };

            const originalOnChatReceived = proto._onChatReceived;
            proto._onChatReceived = function (message) {
                if (!message || typeof message !== 'object') return;
                const text = typeof message.text === 'string' ? message.text : '';
                if (text.length > MAX_CHAT_TEXT_LENGTH) {
                    notify(t('notifications.text-content-incorrect', 'Mensagem de chat muito grande.'));
                    return;
                }
                const attachment = message.attachment ? sanitizeChatAttachment(message.attachment) : null;
                if (message.attachment && !attachment) {
                    notify(t('notifications.files-incorrect', 'Anexo de chat inválido ou muito grande.'));
                    return;
                }
                originalOnChatReceived.call(this, {
                    ...message,
                    text,
                    attachment
                });
            };

            const originalUpdateMessageStatus = proto._updateMessageStatus;
            proto._updateMessageStatus = function (messageId, status) {
                if (!this.$messages || typeof messageId !== 'string') return;
                const nodes = this.$messages.querySelectorAll('.chat-status');
                for (const node of nodes) {
                    const parent = node.closest('[data-message-id]');
                    if (parent && parent.dataset.messageId === messageId) {
                        node.textContent = this._statusLabel(status);
                        return;
                    }
                }
            };

            // Keep the original method available for future project changes; the patched
            // selector-free status updater above prevents selector injection through IDs.
            void originalRefreshRoomSelect;
        }

        if (window.ServerConnection && !window.ServerConnection.prototype.__erikraftWsParsingHardeningPatched) {
            const proto = window.ServerConnection.prototype;
            const originalOnMessage = proto._onMessage;
            proto.__erikraftWsParsingHardeningPatched = true;
            proto._onMessage = function (msg) {
                if (typeof msg !== 'string' && !(msg instanceof ArrayBuffer)) return;
                try {
                    return originalOnMessage.call(this, msg);
                } catch (error) {
                    console.warn('[Network] Ignored malformed or unexpected server message.', error);
                    Events.fire('ws-error', { error });
                }
            };
        }

        if (window.Peer && !window.Peer.prototype.__erikraftPeerParsingHardeningPatched) {
            const proto = window.Peer.prototype;
            const originalOnMessage = proto._onMessage;
            proto.__erikraftPeerParsingHardeningPatched = true;
            proto._onMessage = function (message) {
                try {
                    return originalOnMessage.call(this, message);
                } catch (error) {
                    console.warn('[Peer] Ignored malformed peer message.', error);
                }
            };
        }

        if (window.PeersManager && !window.PeersManager.prototype.__erikraftWsRelayHardeningPatched) {
            const proto = window.PeersManager.prototype;
            const originalOnWsRelay = proto._onWsRelay;
            proto.__erikraftWsRelayHardeningPatched = true;
            proto._onWsRelay = function (message) {
                try {
                    const parsed = typeof message === 'string' ? JSON.parse(message) : message;
                    const senderId = parsed && parsed.sender && parsed.sender.id;
                    if (!senderId || !this.peers[senderId]) {
                        console.warn('[Network] Ignoring websocket relay message for unknown peer.');
                        return;
                    }
                    return originalOnWsRelay.call(this, message);
                } catch (error) {
                    console.warn('[Network] Ignored malformed websocket relay message.', error);
                }
            };
        }
    }

    function init() {
        installStyles();
        installAnimatedQrReceiveEnhancement();
        installChatHardening();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
