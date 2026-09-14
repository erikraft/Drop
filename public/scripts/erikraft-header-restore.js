(function restoreErikrafTHeaderActions() {
    'use strict';

    const HEADER_BUTTON_CLASS = 'icon-button';

    function loadVisualStyles() {
        if (document.getElementById('erikraft-dialog-visual-fixes-link')) return;
        const link = document.createElement('link');
        link.id = 'erikraft-dialog-visual-fixes-link';
        link.rel = 'stylesheet';
        link.href = 'styles/erikraft-dialog-visual-fixes.css';
        document.head.appendChild(link);
    }

    function restoreAnimatedQRButton() {
        if (document.getElementById('animated-qr-btn')) return;

        const button = document.createElement('div');
        button.id = 'animated-qr-btn';
        button.className = HEADER_BUTTON_CLASS;
        button.setAttribute('data-i18n-key', 'header.animated-qr');
        button.setAttribute('data-i18n-attrs', 'title aria-label');
        button.title = 'Transfer via Animated QR';
        button.setAttribute('aria-label', 'Transfer via Animated QR');
        button.innerHTML = `
            <svg class="icon" aria-hidden="true">
                <use xlink:href="#qrcode-icon"></use>
            </svg>
        `;

        const anchor = document.getElementById('pair-device')
            || document.getElementById('join-public-room')
            || document.getElementById('tor-config-btn');
        if (anchor?.parentNode) {
            anchor.parentNode.insertBefore(button, anchor);
        } else {
            document.querySelector('header')?.appendChild(button);
        }
    }

    function prepareWebTorrentMount() {
        const header = document.querySelector('header');
        if (!header) return;

        const existing = document.getElementById('webtorrent-btn');
        const slot = document.createElement('span');
        slot.id = 'erikraft-webtorrent-slot';
        slot.hidden = true;
        slot.setAttribute('aria-hidden', 'true');

        if (existing && existing.parentNode) {
            existing.parentNode.insertBefore(slot, existing);
            existing.remove();
        } else {
            header.insertBefore(slot, header.firstElementChild);
        }

        const placeButton = () => {
            const button = document.getElementById('webtorrent-btn');
            if (!button || !slot.parentNode) return false;
            button.type = 'button';
            button.className = 'icon-button';
            button.title = 'Torrent (Beta)';
            button.setAttribute('aria-label', 'Abrir transferência Torrent (Beta)');
            button.innerHTML = '<img class="webtorrent-icon webtorrent-official-icon" src="images/icons/webtorrent-official.svg" alt="WebTorrent">';
            if (button.previousSibling !== slot) slot.parentNode.insertBefore(button, slot.nextSibling);
            return true;
        };

        placeButton();
        const observer = new MutationObserver(() => {
            if (placeButton()) observer.disconnect();
        });
        observer.observe(header, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000);
    }

    function patchPermanentPairingQRLogo() {
        const QR = window.ErikrafTDropQR;
        if (!QR || QR.__erikraftLogoRaceFixed || typeof QR.render !== 'function') return;
        const originalRender = QR.render.bind(QR);
        QR.render = function (container, data, options = {}) {
            const result = originalRender(container, data, options);
            const isAnimated = container?.id === 'qr-send-canvas-container' || options.animatedTransfer === true;
            if (!isAnimated && typeof QR._ensureLogoLoaded === 'function' && QR._logoState && !QR._logoState.available) {
                QR._ensureLogoLoaded(options.logoPath || 'images/icon-drop-blue.svg').then(() => {
                    if (!QR._logoState.available || !container || !document.contains(container)) return;
                    try {
                        QR.destroy(container);
                        originalRender(container, data, options);
                    } catch (_) {}
                });
            }
            return result;
        };
        QR.__erikraftLogoRaceFixed = true;
    }

    function initialize() {
        loadVisualStyles();
        restoreAnimatedQRButton();
        prepareWebTorrentMount();
        patchPermanentPairingQRLogo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    let qrPatchAttempts = 0;
    const qrPatchTimer = setInterval(() => {
        patchPermanentPairingQRLogo();
        if (window.ErikrafTDropQR || ++qrPatchAttempts >= 100) clearInterval(qrPatchTimer);
    }, 50);
})();