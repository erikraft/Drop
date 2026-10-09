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
#${BUTTON_ID}{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    min-height:42px;
    min-width:min(220px,100%);
    max-width:100%;
    margin:0;
    padding:9px 14px;
    box-sizing:border-box;
    border:1px solid color-mix(in srgb, rgb(var(--text-color)) 18%, transparent);
    border-radius:12px;
    color:rgb(var(--text-color));
    background:rgb(var(--bg-color-secondary));
    box-shadow:0 1px 3px rgba(0,0,0,.12);
    transition:background-color .2s ease,color .2s ease,border-color .2s ease,box-shadow .2s ease,transform .15s ease;
}
#${BUTTON_ID}:hover{background:color-mix(in srgb,rgb(var(--bg-color-secondary)) 86%,rgb(var(--text-color)));box-shadow:0 2px 8px rgba(0,0,0,.16)}
#${BUTTON_ID}:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
#${BUTTON_ID}:active{transform:translateY(1px)}
#${BUTTON_ID}[hidden]{display:none!important}
#${BUTTON_ID}.erikraft-screen-awake-active{
    font-weight:700;
    color:#fff;
    background:var(--primary-color);
    border-color:var(--primary-color);
}
@media(prefers-color-scheme:dark){
    body:not(.light-theme) #${BUTTON_ID}{box-shadow:0 1px 4px rgba(0,0,0,.35)}
}
@media(max-width:600px){
    #${BUTTON_ID}{width:100%;min-height:44px}
}
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
@media(max-width:390px){x-dialog#animated-qr-main-dialog x-background{padding:4px 4px 10px}#animated-qr-main-dialog .erikraft-qr-card-send,#animated-qr-main-dialog .erikraft-qr-card-receive{width:100%;box-sizing:border-box;padding:12px 10px;margin:0;gap:8px}#animated-qr-main-dialog .erikraft-qr-card-send .font-body2,#animated-qr-main-dialog .erikraft-qr-card-receive .font-body2{line-height:1.35;margin-bottom:6px}.erikraft-qr-paper{max-width:100%;box-sizing:border-box}}
@media(max-width:600px){x-dialog#animated-qr-main-dialog x-background,x-dialog#animated-qr-send-dialog x-background,x-dialog#animated-qr-receive-dialog x-background,x-dialog#public-room-dialog x-background,x-dialog#pair-device-dialog x-background{padding:6px 5px 12px}#animated-qr-send-dialog .erikraft-qr-paper,#public-room-dialog x-paper,#pair-device-dialog x-paper{max-height:calc(100dvh - 8px)}x-dialog:has(#chat-send) x-paper{max-height:calc(100dvh - 12px)}x-dialog:has(#chat-send) x-background{padding:6px 5px 12px}x-dialog:has(#chat-send) .chat-footer{padding:10px 12px 14px}}
`;
        document.head.appendChild(style);
    }

    const LABELS = {
        ar: { off: 'عدم إيقاف تشغيل الشاشة (انقر هنا)', on: 'الشاشة مضاءة دائمًا: مفعّل' },
        be: { off: 'Не выключаць экран (націсніце тут)', on: 'Экран заўсёды ўключаны: актывавана' },
        bg: { off: 'Не изключвай екрана (кликнете тук)', on: 'Екранът е винаги включен: Активирано' },
        ca: { off: 'No apagar la pantalla (fes clic aquí)', on: 'Pantalla sempre encesa: activat' },
        cs: { off: 'Nevypínat obrazovku (klikněte sem)', on: 'Obrazovka je vždy zapnutá: Aktivováno' },
        da: { off: 'Sluk ikke skærmen (klik her)', on: 'Skærm altid tændt: Aktiveret' },
        de: { off: 'Bildschirm nicht ausschalten (Hier klicken)', on: 'Bildschirm immer an: Aktiviert' },
        en: { off: "Don't turn off screen (Click here)", on: 'Screen always on: Enabled' },
        es: { off: 'No apagar la pantalla (Haz clic aquí)', on: 'Pantalla siempre encendida: Activado' },
        et: { off: 'Ära lülita ekraani välja (klõpsa siia)', on: 'Ekraan alati sees: Aktiveeritud' },
        eu: { off: 'Ez itzali pantaila (egin klik hemen)', on: 'Pantaila beti piztuta: Aktibatuta' },
        fa: { off: 'صفحه‌نمایش را خاموش نکنید (اینجا کلیک کنید)', on: 'صفحه‌نمایش همیشه روشن: فعال' },
        fr: { off: "Ne pas éteindre l’écran (cliquez ici)", on: 'Écran toujours allumé : activé' },
        he: { off: 'אל תכבה את המסך (לחץ כאן)', on: 'המסך תמיד דולק: מופעל' },
        hu: { off: 'Ne kapcsold ki a képernyőt (kattints ide)', on: 'Képernyő mindig bekapcsolva: Engedélyezve' },
        id: { off: 'Jangan matikan layar (Klik di sini)', on: 'Layar selalu menyala: Aktif' },
        it: { off: 'Non spegnere lo schermo (fai clic qui)', on: 'Schermo sempre acceso: Attivato' },
        ja: { off: '画面を消さない（ここをクリック）', on: '画面を常にオン：有効' },
        kn: { off: 'ಪರದೆಯನ್ನು ಆಫ್ ಮಾಡಬೇಡಿ (ಇಲ್ಲಿ ಕ್ಲಿಕ್ ಮಾಡಿ)', on: 'ಪರದೆ ಯಾವಾಗಲೂ ಆನ್: ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ' },
        ko: { off: '화면 끄지 않기 (여기를 클릭)', on: '화면 항상 켜짐: 활성화됨' },
        nb: { off: 'Ikke slå av skjermen (klikk her)', on: 'Skjermen alltid på: Aktivert' },
        nl: { off: 'Scherm niet uitschakelen (klik hier)', on: 'Scherm altijd aan: Ingeschakeld' },
        nn: { off: 'Ikkje slå av skjermen (klikk her)', on: 'Skjermen alltid på: Aktivert' },
        pl: { off: 'Nie wyłączaj ekranu (kliknij tutaj)', on: 'Ekran zawsze włączony: Włączono' },
        'pt-BR': { off: 'Não desligar Tela (Clique aqui)', on: 'Tela sempre ligada: Ativado' },
        ro: { off: 'Nu opri ecranul (faceți clic aici)', on: 'Ecran mereu pornit: Activat' },
        ru: { off: 'Не выключать экран (нажмите здесь)', on: 'Экран всегда включён: Включено' },
        sk: { off: 'Nevypínať obrazovku (kliknite sem)', on: 'Obrazovka je stále zapnutá: Aktivované' },
        ta: { off: 'திரையை அணைக்க வேண்டாம் (இங்கே கிளிக் செய்யவும்)', on: 'திரை எப்போதும் இயக்கத்தில்: இயக்கப்பட்டது' },
        tr: { off: 'Ekranı kapatma (buraya tıklayın)', on: 'Ekran her zaman açık: Etkin' },
        uk: { off: 'Не вимикати екран (натисніть тут)', on: 'Екран завжди увімкнений: Увімкнено' },
        'zh-CN': { off: '不要关闭屏幕（点击此处）', on: '屏幕始终开启：已启用' },
        'zh-HK': { off: '不要關閉螢幕（按此處）', on: '螢幕一直開啟：已啟用' },
        'zh-TW': { off: '不要關閉螢幕（點擊此處）', on: '螢幕始終開啟：已啟用' }
    };

    function getLabel(active) {
        const locale = window.Localization?.getLocale?.() || document.documentElement.lang || navigator.language || 'en';
        const labels = LABELS[locale] || LABELS[locale.split('-')[0]] || LABELS.en;
        return labels[active ? 'on' : 'off'];
    }

    function syncNativePreference() {
        if (!android()?.isKeepScreenOnEnabled) return;
        try { requested = !!android().isKeepScreenOnEnabled(); } catch (_) {}
    }

    function updateButton() {
        const button = getButton();
        if (!button) return;
        // Android owns this preference natively; do not show a browser control in its WebView.
        button.hidden = !!android() || !isSupported();
        button.setAttribute('aria-pressed', String(requested));
        button.classList.toggle(ACTIVE_CLASS, requested);
        button.textContent = getLabel(requested);
        button.title = requested ? getLabel(true) : getLabel(false);
        button.setAttribute('aria-label', button.textContent);
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
            try { android().setKeepScreenOn(true); acquired = true; }
            catch (error) { lastError = error; }
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
        if (android()) {
            const androidButton = getButton();
            if (androidButton) androidButton.remove();
            if (requested) release();
            return;
        }
        if (!dialog) { if (requested) release(); return; }
        syncNativePreference();
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

    let runtimeSyncFrame = 0;
    let runtimeSyncPending = false;
    const scheduleRuntimeSync = () => {
        if (runtimeSyncFrame) return;
        runtimeSyncFrame = requestAnimationFrame(() => {
            runtimeSyncFrame = 0;
            if (!runtimeSyncPending) return;
            runtimeSyncPending = false;
            ensureButton();
            fillAnimatedQrTextFromClipboard();
            removeDuplicateCopyButtons();
            syncNativeDialogLock();
        });
    };
    const observer = new MutationObserver(records => {
        if (!mutationAffectsRuntime(records)) return;
        runtimeSyncPending = true;
        scheduleRuntimeSync();
    });

    const start = () => {
        if (!document.body) return;
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'style', 'class', 'title', 'aria-label'] });
        ensureButton();
        fillAnimatedQrTextFromClipboard();
        removeDuplicateCopyButtons();
        requestAnimationFrame(() => normalizeVisibleBranding());
        syncNativeDialogLock();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
