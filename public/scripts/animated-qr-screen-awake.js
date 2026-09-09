(function setupAnimatedQRScreenAwake() {
    'use strict';

    const DIALOG_IDS = ['animated-qr-main-dialog', 'animated-qr-send-dialog', 'animated-qr-receive-dialog', 'public-room-dialog', 'pair-device-dialog'];
    const BUTTON_ID = 'animated-qr-screen-awake-btn';
    const STYLE_ID = 'animated-qr-screen-awake-style';
    const ACTIVE_CLASS = 'erikraft-screen-awake-active';
    const android = () => window.ErikrafTdropAndroid || null;

    let wakeLock = null;
    let noSleep = null;
    let requested = false;
    let lastError = null;
    let nativeDialogLocked = false;

    const getDialog = id => document.getElementById(id);
    const getButton = () => document.getElementById(BUTTON_ID);

    function isSupported() {
        return 'wakeLock' in navigator || typeof window.NoSleep === 'function' || !!android()?.setKeepScreenOn;
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${BUTTON_ID}{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin:0;max-width:100%;box-sizing:border-box}
#${BUTTON_ID}[hidden]{display:none!important}
#${BUTTON_ID}.erikraft-screen-awake-active{font-weight:600}
x-dialog#animated-qr-main-dialog x-background,
x-dialog#animated-qr-send-dialog x-background,
x-dialog#animated-qr-receive-dialog x-background,
x-dialog#public-room-dialog x-background,
x-dialog#pair-device-dialog x-background{overflow:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}
#animated-qr-send-dialog .erikraft-qr-paper,
#public-room-dialog x-paper,
#pair-device-dialog x-paper{max-height:calc(100dvh - 16px);min-height:0;overflow:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;box-sizing:border-box}
x-dialog:has(#chat-send) x-background{overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}
x-dialog:has(#chat-send) x-paper{max-height:calc(100dvh - 24px);min-height:0;overflow:auto}
x-dialog:has(#chat-send) .chat-footer{min-width:0;box-sizing:border-box;flex-wrap:wrap}
x-dialog:has(#chat-send) .chat-footer__content{min-width:0;max-width:100%;box-sizing:border-box}
#chat-send{width:40px;height:40px;min-width:40px;min-height:40px;padding:0;display:inline-flex;align-items:center;justify-content:center;flex:0 0 40px;box-sizing:border-box}
#chat-send .icon,#chat-send svg{width:20px;height:20px;min-width:20px;min-height:20px;max-width:20px;max-height:20px;display:block;flex:0 0 20px}
@media(max-width:600px){x-dialog#animated-qr-main-dialog x-background,x-dialog#animated-qr-send-dialog x-background,x-dialog#animated-qr-receive-dialog x-background,x-dialog#public-room-dialog x-background,x-dialog#pair-device-dialog x-background{padding:6px 5px 12px}#animated-qr-send-dialog .erikraft-qr-paper,#public-room-dialog x-paper,#pair-device-dialog x-paper{max-height:calc(100dvh - 8px)}x-dialog:has(#chat-send) x-paper{max-height:calc(100dvh - 12px)}x-dialog:has(#chat-send) x-background{padding:6px 5px 12px}x-dialog:has(#chat-send) .chat-footer{padding:10px 12px 14px}}
`;
        document.head.appendChild(style);
    }

    function getLabel(active) { return active ? 'Tela sempre ligada: Ativado' : 'Não desligar tela'; }

    function updateButton() {
        const button = getButton();
        if (!button) return;
        button.hidden = !isSupported();
        button.setAttribute('aria-pressed', String(requested));
        button.classList.toggle(ACTIVE_CLASS, requested);
        button.textContent = getLabel(requested);
        button.title = requested ? 'Desativar o modo para manter a tela ligada' : 'Manter a tela ligada enquanto o QR Code Animado estiver na tela';
    }

    function ensureNoSleep() {
        if (noSleep || typeof window.NoSleep !== 'function') return noSleep;
        try { noSleep = new window.NoSleep(); }
        catch (error) { console.warn('[Animated QR] NoSleep indisponível:', error); }
        return noSleep;
    }

    async function acquire() {
        lastError = null;
        let acquired = false;
        if ('wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function') {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                    if (requested && document.visibilityState === 'visible') setTimeout(() => { if (requested) acquire().catch(() => {}); }, 250);
                }, { once: true });
                acquired = true;
            } catch (error) { lastError = error; }
        }
        if (!acquired) {
            const fallback = ensureNoSleep();
            if (fallback && typeof fallback.enable === 'function') {
                try { await fallback.enable(); acquired = true; }
                catch (error) { lastError = error; }
            }
        }
        if (android()?.setKeepScreenOn) {
            try { android().setKeepScreenOn(acquired || requested); acquired = true; }
            catch (error) { console.warn('[Animated QR] Android screen-awake bridge failed:', error); }
        }
        return acquired;
    }

    async function release() {
        requested = false;
        if (wakeLock) { try { await wakeLock.release(); } catch (error) { console.warn('[Animated QR] Falha ao liberar Wake Lock:', error); } wakeLock = null; }
        if (noSleep && typeof noSleep.disable === 'function') { try { noSleep.disable(); } catch (error) { console.warn('[Animated QR] Falha ao desativar NoSleep:', error); } }
        if (android()?.setKeepScreenOn) {
            try { android().setKeepScreenOn(false); } catch (error) { console.warn('[Animated QR] Android screen-awake release failed:', error); }
        }
        updateButton();
    }

    async function toggle() {
        if (requested) { await release(); return; }
        requested = true;
        const acquired = await acquire();
        if (!acquired) {
            requested = false;
            console.warn('[Animated QR] O navegador/dispositivo não permite manter a tela ligada.', lastError);
        }
        updateButton();
    }

    function isDialogVisible(dialog) {
        if (!dialog) return false;
        if (dialog.hidden || dialog.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(dialog);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function hasScrollLockedOverlay() {
        return DIALOG_IDS.some(id => isDialogVisible(getDialog(id))) || !!document.querySelector('x-dialog:has(#chat-send)') && isDialogVisible(document.querySelector('x-dialog:has(#chat-send)'));
    }

    function syncNativeDialogLock() {
        const locked = hasScrollLockedOverlay();
        if (locked === nativeDialogLocked) return;
        nativeDialogLocked = locked;
        if (android()?.setDialogVisible) {
            try { android().setDialogVisible(locked); }
            catch (error) { console.warn('[WebView] Unable to update native refresh lock:', error); }
        }
    }

    function findInsertionPoint(dialog) {
        if (!dialog) return null;
        return dialog.querySelector('#qr-send-controls-group') || dialog.querySelector('#qr-send-compose-buttons') || dialog.querySelector('.dialog-buttons') || dialog.querySelector('.buttons') || dialog.querySelector('.erikraft-qr-paper');
    }

    function placeButton(button, insertionPoint) {
        if (!button || !insertionPoint) return;
        const previousButton = insertionPoint.querySelector('#qr-send-previous-btn');
        const backButton = insertionPoint.querySelector('#qr-send-back-btn');
        if (previousButton && previousButton !== button) {
            const reference = previousButton.nextSibling;
            if (reference !== button) insertionPoint.insertBefore(button, reference);
            return;
        }
        if (backButton && backButton !== button) { insertionPoint.insertBefore(button, backButton); return; }
        if (button.parentElement !== insertionPoint) insertionPoint.appendChild(button);
    }

    function ensureButton() {
        injectStyles();
        const sendDialog = getDialog('animated-qr-send-dialog');
        const receiveDialog = getDialog('animated-qr-receive-dialog');
        const dialog = isDialogVisible(sendDialog) ? sendDialog : (isDialogVisible(receiveDialog) ? receiveDialog : null);
        if (!dialog) { if (requested) release(); return; }
        let button = getButton();
        const insertionPoint = findInsertionPoint(dialog);
        if (!button && insertionPoint) {
            button = document.createElement('button');
            button.id = BUTTON_ID;
            button.type = 'button';
            button.className = 'btn btn-rounded btn-dark';
            button.addEventListener('click', toggle);
        }
        if (button && insertionPoint) placeButton(button, insertionPoint);
        updateButton();
    }

    function fillAnimatedQrTextFromClipboard() {
        const button = document.getElementById('qr-send-text-paste-btn');
        if (!button || button.dataset.androidPasteBound === 'true' || !android()?.getClipboardText) return;
        button.dataset.androidPasteBound = 'true';
        button.addEventListener('click', () => {
            let text = '';
            try { text = android().getClipboardText() || ''; } catch (error) { console.warn('[WebView] Clipboard bridge failed:', error); }
            if (!text) return;
            const dialog = document.getElementById('animated-qr-send-dialog');
            const editable = dialog?.querySelector('[contenteditable="true"], textarea, input[type="text"]');
            if (!editable) return;
            if (editable.matches('[contenteditable="true"]')) editable.textContent = text;
            else editable.value = text;
            editable.dispatchEvent(new Event('input', { bubbles: true }));
            editable.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function removeDuplicateCopyButtons() {
        const dialogs = document.querySelectorAll('#animated-qr-receive-dialog, #receive-text-dialog, #animated-qr-send-dialog');
        dialogs.forEach(dialog => {
            const candidates = [...dialog.querySelectorAll('button, .btn')].filter(button => {
                const label = (button.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
                return label === 'COPIAR TEXTO' || label === 'COPY TEXT';
            });
            candidates.slice(1).forEach(button => button.remove());
        });
    }

    function normalizeVisibleBranding() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) nodes.push(node);
        nodes.forEach(textNode => {
            const parent = textNode.parentElement;
            if (!parent || ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) return;
            if (textNode.nodeValue.includes('ErikrafT Drop') && !textNode.nodeValue.includes('ErikrafT Drop™')) {
                textNode.nodeValue = textNode.nodeValue.replaceAll('ErikrafT Drop', 'ErikrafT Drop™');
            }
        });
        document.querySelectorAll('[title],[aria-label]').forEach(element => {
            ['title', 'aria-label'].forEach(attribute => {
                const value = element.getAttribute(attribute);
                if (value && value.includes('ErikrafT Drop') && !value.includes('ErikrafT Drop™')) element.setAttribute(attribute, value.replaceAll('ErikrafT Drop', 'ErikrafT Drop™'));
            });
        });
    }

    function mutationAffectsRuntime(records) {
        return records.some(record => {
            if (record.type === 'attributes') return DIALOG_IDS.includes(record.target?.id) || record.target?.id === BUTTON_ID;
            return true;
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (!requested || document.visibilityState !== 'visible') return;
        if (!wakeLock && 'wakeLock' in navigator) acquire().then(updateButton).catch(() => updateButton());
        else if (android()?.setKeepScreenOn) { try { android().setKeepScreenOn(true); } catch (_) {} }
        else updateButton();
    });

    window.addEventListener('pagehide', () => {
        if (noSleep && typeof noSleep.disable === 'function') { try { noSleep.disable(); } catch (_) {} }
        if (android()?.setKeepScreenOn) { try { android().setKeepScreenOn(false); } catch (_) {} }
        wakeLock = null;
        requested = false;
    });

    const observer = new MutationObserver(records => {
        if (mutationAffectsRuntime(records)) {
            ensureButton();
            fillAnimatedQrTextFromClipboard();
            removeDuplicateCopyButtons();
            normalizeVisibleBranding();
            syncNativeDialogLock();
        }
    });

    const start = () => {
        if (!document.body) return;
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'style', 'class', 'title', 'aria-label'] });
        ensureButton();
        fillAnimatedQrTextFromClipboard();
        removeDuplicateCopyButtons();
        normalizeVisibleBranding();
        syncNativeDialogLock();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
