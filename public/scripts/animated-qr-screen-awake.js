(function setupAnimatedQRScreenAwake() {
    'use strict';

    const DIALOG_IDS = ['animated-qr-main-dialog', 'animated-qr-send-dialog', 'animated-qr-receive-dialog'];
    const BUTTON_ID = 'animated-qr-screen-awake-btn';
    const STYLE_ID = 'animated-qr-screen-awake-style';
    const ACTIVE_CLASS = 'erikraft-screen-awake-active';

    let wakeLock = null;
    let noSleep = null;
    let requested = false;
    let lastError = null;

    const getDialog = id => document.getElementById(id);
    const getButton = () => document.getElementById(BUTTON_ID);

    function isSupported() {
        return 'wakeLock' in navigator || typeof window.NoSleep === 'function';
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${BUTTON_ID}{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin:0;max-width:100%;box-sizing:border-box}
#${BUTTON_ID}[hidden]{display:none!important}
#${BUTTON_ID}.erikraft-screen-awake-active{font-weight:600}

/* WebChat: keep the complete footer reachable on small screens. */
x-dialog:has(#chat-send) x-background{overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
x-dialog:has(#chat-send) x-paper{max-height:calc(100dvh - 24px);min-height:0}
x-dialog:has(#chat-send) .chat-footer{min-width:0;box-sizing:border-box;flex-wrap:wrap}
x-dialog:has(#chat-send) .chat-footer__content{min-width:0;max-width:100%;box-sizing:border-box}

/* WebChat send button: consistent, non-distorted icon sizing. */
#chat-send{width:40px;height:40px;min-width:40px;min-height:40px;padding:0;display:inline-flex;align-items:center;justify-content:center;flex:0 0 40px;box-sizing:border-box}
#chat-send .icon,#chat-send svg{width:20px;height:20px;min-width:20px;min-height:20px;max-width:20px;max-height:20px;display:block;flex:0 0 20px}
@media (max-width:600px){
  x-dialog:has(#chat-send) x-paper{max-height:calc(100dvh - 12px)}
  x-dialog:has(#chat-send) x-background{padding:6px 5px 12px}
  x-dialog:has(#chat-send) .chat-footer{padding:10px 12px 14px}
}
`;
        document.head.appendChild(style);
    }

    function getLabel(active) {
        return active ? 'Tela sempre ligada: Ativado' : 'Não desligar tela';
    }

    function updateButton() {
        const button = getButton();
        if (!button) return;
        button.hidden = !isSupported();
        button.setAttribute('aria-pressed', String(requested));
        button.classList.toggle(ACTIVE_CLASS, requested);
        button.textContent = getLabel(requested);
        button.title = requested
            ? 'Desativar o modo para manter a tela ligada'
            : 'Manter a tela ligada enquanto o QR Code Animado estiver na tela';
    }

    function ensureNoSleep() {
        if (noSleep || typeof window.NoSleep !== 'function') return noSleep;
        try {
            noSleep = new window.NoSleep();
        } catch (error) {
            console.warn('[Animated QR] NoSleep indisponível:', error);
        }
        return noSleep;
    }

    async function acquire() {
        lastError = null;

        if ('wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function') {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                    if (requested && document.visibilityState === 'visible') {
                        setTimeout(() => { if (requested) acquire().catch(() => {}); }, 250);
                    }
                }, { once: true });
                return true;
            } catch (error) {
                lastError = error;
            }
        }

        const fallback = ensureNoSleep();
        if (fallback && typeof fallback.enable === 'function') {
            try {
                await fallback.enable();
                return true;
            } catch (error) {
                lastError = error;
            }
        }

        return false;
    }

    async function release() {
        requested = false;
        if (wakeLock) {
            try { await wakeLock.release(); } catch (error) { console.warn('[Animated QR] Falha ao liberar Wake Lock:', error); }
            wakeLock = null;
        }
        if (noSleep && typeof noSleep.disable === 'function') {
            try { noSleep.disable(); } catch (error) { console.warn('[Animated QR] Falha ao desativar NoSleep:', error); }
        }
        updateButton();
    }

    async function toggle() {
        if (requested) {
            await release();
            return;
        }

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

    function findInsertionPoint(dialog) {
        if (!dialog) return null;
        return dialog.querySelector('#qr-send-controls-group')
            || dialog.querySelector('#qr-send-compose-buttons')
            || dialog.querySelector('.dialog-buttons')
            || dialog.querySelector('.buttons')
            || dialog.querySelector('.erikraft-qr-paper');
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

        if (backButton && backButton !== button) {
            insertionPoint.insertBefore(button, backButton);
            return;
        }

        if (button.parentElement !== insertionPoint) {
            insertionPoint.appendChild(button);
        }
    }

    function ensureButton() {
        injectStyles();
        const sendDialog = getDialog('animated-qr-send-dialog');
        const receiveDialog = getDialog('animated-qr-receive-dialog');
        const dialog = isDialogVisible(sendDialog) ? sendDialog : (isDialogVisible(receiveDialog) ? receiveDialog : null);
        if (!dialog) {
            if (requested) release();
            return;
        }

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

    document.addEventListener('visibilitychange', () => {
        if (!requested || document.visibilityState !== 'visible') return;
        if (!wakeLock && 'wakeLock' in navigator) {
            acquire().then(updateButton).catch(() => updateButton());
        } else {
            updateButton();
        }
    });

    window.addEventListener('pagehide', () => {
        if (noSleep && typeof noSleep.disable === 'function') {
            try { noSleep.disable(); } catch (_) { /* best effort */ }
        }
        wakeLock = null;
        requested = false;
    });

    const observer = new MutationObserver(() => ensureButton());
    const start = () => {
        if (!document.body) return;
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'style', 'class'] });
        ensureButton();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

    // Animated QR FPS compatibility bridge.
    // Keep protocol generation untouched: this only raises the playback/configuration ceiling.
    const MAX_ANIMATED_QR_FPS = 120;

    function clampFps(value) {
        const parsed = Number.parseInt(value, 10);
        return Math.max(1, Math.min(MAX_ANIMATED_QR_FPS, Number.isFinite(parsed) ? parsed : 6));
    }

    function patchTransmitter() {
        const proto = window.ErikrafTQRTransmitter?.prototype;
        if (!proto || typeof proto.setFps !== 'function' || proto.__erikraftHighFpsPatched) return !!proto;
        const originalSetFps = proto.setFps;
        proto.setFps = function (value) {
            return originalSetFps.call(this, clampFps(value));
        };
        proto.__erikraftHighFpsPatched = true;
        if (typeof this?.fps === 'number') this.fps = clampFps(this.fps);
        return true;
    }

    function patchFpsControl() {
        const input = document.getElementById('qr-send-fps-slider');
        if (!input || input.dataset.erikraftHighFpsPatched === 'true') return;

        input.min = '1';
        input.max = String(MAX_ANIMATED_QR_FPS);
        input.value = String(clampFps(input.value));

        input.addEventListener('input', event => {
            const fps = clampFps(event.target.value);
            event.target.value = String(fps);
            const value = document.getElementById('qr-send-fps-val');
            const speed = document.getElementById('qr-send-fps-speed');
            if (value) value.textContent = `${fps} FPS`;
            if (speed) speed.textContent = `Velocidade: ${fps} FPS`;
            const tx = window.erikrafTdrop?.animatedQRSendDialog?.transmitter;
            tx?.setFps?.(fps);
        }, true);

        input.dataset.erikraftHighFpsPatched = 'true';
    }

    const fpsObserver = new MutationObserver(() => {
        patchTransmitter();
        patchFpsControl();
    });
    const patchFps = () => {
        patchTransmitter();
        patchFpsControl();
        if (document.body && !fpsObserver.__erikraftObserved) {
            fpsObserver.observe(document.body, {childList: true, subtree: true});
            fpsObserver.__erikraftObserved = true;
        }
    };

    patchFps();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchFps, {once: true});
})();