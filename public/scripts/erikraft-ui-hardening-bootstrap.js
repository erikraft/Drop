(function activateErikrafTHardening() {
    'use strict';

    const MAX_CHAT_TEXT_LENGTH = 100000;
    const MAX_CHAT_ATTACHMENT_BYTES = 8 * 1024 * 1024;

    const translate = (key, fallback) => {
        try {
            const value = typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function'
                ? Localization.getTranslation(key)
                : '';
            return value || fallback;
        } catch (error) {
            return fallback;
        }
    };

    const notify = message => {
        if (typeof Events !== 'undefined') Events.fire('notify-user', message);
    };

    const copyText = text => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            try {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                const ok = document.execCommand('copy');
                area.remove();
                ok ? resolve() : reject(new Error('copy-failed'));
            } catch (error) {
                reject(error);
            }
        });
    };

    const downloadTxt = text => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `ErikrafTDrop_QR_Text_${stamp}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    function enhanceQrTextResult(dialog, result) {
        if (!dialog || !result || result.type !== 'text' || typeof result.text !== 'string') return;
        const container = dialog.$completeContainer;
        if (!container) return;

        let preview = container.querySelector('#qr-receive-text-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'qr-receive-text-preview';
            preview.setAttribute('role', 'textbox');
            preview.setAttribute('aria-readonly', 'true');
            preview.setAttribute('tabindex', '0');
            if (dialog.$completeFilename && dialog.$completeFilename.parentNode) {
                dialog.$completeFilename.insertAdjacentElement('afterend', preview);
            } else {
                container.appendChild(preview);
            }
        }
        // Never render QR-delivered text as HTML. textContent is the XSS boundary.
        preview.textContent = result.text;

        let actions = container.querySelector('#qr-receive-complete-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.id = 'qr-receive-complete-actions';
            container.appendChild(actions);
        }

        const makeButton = (id, label, handler) => {
            let button = actions.querySelector(`#${id}`);
            if (!button) {
                button = document.createElement('button');
                button.type = 'button';
                button.id = id;
                button.className = 'btn btn-rounded';
                actions.appendChild(button);
            }
            button.textContent = label;
            button.onclick = handler;
            return button;
        };

        makeButton('qr-receive-copy-text', translate('dialogs.animated-qr-copy-text', 'Copiar texto'), async () => {
            try {
                await copyText(result.text);
                notify(translate('notifications.copied-to-clipboard', 'Texto copiado para a área de transferência.'));
            } catch (error) {
                console.warn('[Animated QR] Text copy failed:', error);
                notify(translate('notifications.copied-to-clipboard-error', 'Não foi possível copiar o texto.'));
            }
        });

        const sha = typeof result.sha === 'string' ? result.sha.trim() : '';
        const copySha = makeButton('qr-receive-copy-sha', 'Copiar SHA-256', async () => {
            if (!sha) return;
            try {
                await copyText(sha);
                notify(translate('notifications.copied-to-clipboard', 'SHA-256 copiado para a área de transferência.'));
            } catch (error) {
                console.warn('[Animated QR] SHA-256 copy failed:', error);
                notify(translate('notifications.copied-to-clipboard-error', 'Não foi possível copiar o SHA-256.'));
            }
        });
        copySha.disabled = !sha;

        makeButton('qr-receive-download-txt', translate('dialogs.download', 'Baixar .txt'), () => downloadTxt(result.text));

        // The original action button previously opened ReceiveTextDialog. Keep the
        // interaction simple: it now copies the already visible text securely.
        if (dialog.$actionBtn) {
            dialog.$actionBtn.textContent = translate('dialogs.animated-qr-copy-text', 'Copiar texto');
            dialog.$actionBtn.onclick = async () => {
                try {
                    await copyText(result.text);
                    notify(translate('notifications.copied-to-clipboard', 'Texto copiado para a área de transferência.'));
                } catch (error) {
                    console.warn('[Animated QR] Text copy failed:', error);
                    notify(translate('notifications.copied-to-clipboard-error', 'Não foi possível copiar o texto.'));
                }
            };
        }
    }

    function patchAnimatedQrReceive() {
        if (typeof AnimatedQRReceiveDialog === 'undefined') return;
        const proto = AnimatedQRReceiveDialog.prototype;
        if (proto.__erikrafTQrTextActionsPatched) return;
        const original = proto.openScanner;
        proto.__erikrafTQrTextActionsPatched = true;

        proto.openScanner = function (...args) {
            const result = original.apply(this, args);
            let attempts = 0;
            const attach = () => {
                attempts += 1;
                const scanner = this.scanner;
                if (scanner && typeof scanner.onComplete === 'function' && !scanner.__erikrafTQrTextActionsWrapped) {
                    const callback = scanner.onComplete;
                    scanner.__erikrafTQrTextActionsWrapped = true;
                    scanner.onComplete = resultData => {
                        callback.call(scanner, resultData);
                        if (resultData && resultData.type === 'text') {
                            enhanceQrTextResult(this, resultData);
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

    function sanitizeAttachment(attachment) {
        if (!attachment || typeof attachment !== 'object') return null;
        const type = typeof attachment.type === 'string' ? attachment.type.toLowerCase() : '';
        const dataUrl = typeof attachment.dataUrl === 'string' ? attachment.dataUrl : '';
        const isVideo = type.startsWith('video/');
        const mediaPrefix = isVideo ? 'video' : 'image';
        const pattern = new RegExp(`^data:${mediaPrefix}/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$`, 'i');
        if (!pattern.test(dataUrl)) return null;
        const comma = dataUrl.indexOf(',');
        const estimatedBytes = Math.floor((dataUrl.length - comma - 1) * 3 / 4);
        if (estimatedBytes > MAX_CHAT_ATTACHMENT_BYTES) return null;
        return {
            name: typeof attachment.name === 'string' ? attachment.name.slice(0, 255) : 'attachment',
            type: type || `${mediaPrefix}/${isVideo ? 'mp4' : 'png'}`,
            size: Number.isFinite(Number(attachment.size)) ? Math.min(Math.max(0, Number(attachment.size)), MAX_CHAT_ATTACHMENT_BYTES) : estimatedBytes,
            kind: isVideo ? 'video' : 'image',
            dataUrl
        };
    }

    function patchChat() {
        if (typeof ChatUI !== 'undefined' && !ChatUI.prototype.__erikrafTChatHardeningPatched) {
            const proto = ChatUI.prototype;
            proto.__erikrafTChatHardeningPatched = true;

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

            const originalReceive = proto._onChatReceived;
            proto._onChatReceived = function (message) {
                if (!message || typeof message !== 'object') return;
                const text = typeof message.text === 'string' ? message.text : '';
                if (text.length > MAX_CHAT_TEXT_LENGTH) {
                    notify(translate('notifications.text-content-incorrect', 'Mensagem de chat muito grande.'));
                    return;
                }
                if (message.attachment) {
                    const attachment = sanitizeAttachment(message.attachment);
                    if (!attachment) {
                        notify(translate('notifications.files-incorrect', 'Anexo de chat inválido ou muito grande.'));
                        return;
                    }
                    message = { ...message, attachment };
                }
                originalReceive.call(this, { ...message, text });
            };

            proto._updateMessageStatus = function (messageId, status) {
                if (typeof messageId !== 'string') return;
                const nodes = this.$messages.querySelectorAll('[data-message-id]');
                for (const node of nodes) {
                    if (node.dataset.messageId === messageId) {
                        const statusNode = node.querySelector('.chat-status');
                        if (statusNode) statusNode.textContent = this._statusLabel(status);
                        return;
                    }
                }
            };
        }

        if (typeof ServerConnection !== 'undefined' && !ServerConnection.prototype.__erikrafTMessageHardeningPatched) {
            const proto = ServerConnection.prototype;
            const original = proto._onMessage;
            proto.__erikrafTMessageHardeningPatched = true;
            proto._onMessage = function (message) {
                try {
                    return original.call(this, message);
                } catch (error) {
                    console.warn('[Network] Ignored malformed server message.', error);
                    if (typeof Events !== 'undefined') Events.fire('ws-error', { error });
                }
            };
        }

        if (typeof Peer !== 'undefined' && !Peer.prototype.__erikrafTMessageHardeningPatched) {
            const proto = Peer.prototype;
            const original = proto._onMessage;
            proto.__erikrafTMessageHardeningPatched = true;
            proto._onMessage = function (message) {
                try {
                    return original.call(this, message);
                } catch (error) {
                    console.warn('[Peer] Ignored malformed peer message.', error);
                }
            };
        }

        if (typeof PeersManager !== 'undefined' && !PeersManager.prototype.__erikrafTRelayHardeningPatched) {
            const proto = PeersManager.prototype;
            const original = proto._onWsRelay;
            proto.__erikrafTRelayHardeningPatched = true;
            proto._onWsRelay = function (message) {
                try {
                    const parsed = typeof message === 'string' ? JSON.parse(message) : message;
                    const senderId = parsed && parsed.sender && parsed.sender.id;
                    if (!senderId || !this.peers[senderId]) return;
                    return original.call(this, message);
                } catch (error) {
                    console.warn('[Network] Ignored malformed websocket relay message.', error);
                }
            };
        }
    }

    function init() {
        patchAnimatedQrReceive();
        patchChat();
    }

    init();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
})();
