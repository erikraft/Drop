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

    function ensureTorrentIconInSprite() {
        if (document.getElementById('torrent-icon')) return;
        const sprite = Array.from(document.querySelectorAll('svg')).find(svg => {
            const style = window.getComputedStyle(svg);
            return svg.querySelector('symbol, use') && (style.display === 'none' || svg.getAttribute('aria-hidden') === 'true');
        });
        if (!sprite) return;
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        symbol.id = 'torrent-icon';
        symbol.setAttribute('viewBox', '0 0 448 512');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M0 160v96c0 123.7 100.3 224 224 224s224-100.3 224-224v-96H320v96c0 53-43 96-96 96s-96-43-96-96v-96H0zm0-32h128V64c0-17.7-14.3-32-32-32H32C14.3 32 0 46.3 0 64v64zm320 0h128V64c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v64z');
        symbol.appendChild(path);
        sprite.appendChild(symbol);
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
        button.innerHTML = '<svg class="icon" aria-hidden="true"><use xlink:href="#qrcode-icon"></use></svg>';
        const anchor = document.getElementById('pair-device') || document.getElementById('join-public-room') || document.getElementById('tor-config-btn');
        if (anchor?.parentNode) anchor.parentNode.insertBefore(button, anchor);
        else document.querySelector('header')?.appendChild(button);
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
                    try { QR.destroy(container); originalRender(container, data, options); } catch (_) {}
                });
            }
            return result;
        };
        QR.__erikraftLogoRaceFixed = true;
    }

    function initialize() {
        loadVisualStyles();
        ensureTorrentIconInSprite();
        restoreAnimatedQRButton();
        prepareWebTorrentMount();
        patchPermanentPairingQRLogo();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();

    let qrPatchAttempts = 0;
    const qrPatchTimer = setInterval(() => {
        patchPermanentPairingQRLogo();
        if (window.ErikrafTDropQR || ++qrPatchAttempts >= 100) clearInterval(qrPatchTimer);
    }, 50);
})();