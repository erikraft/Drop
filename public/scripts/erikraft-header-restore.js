(function restoreErikrafTHeaderActions() {
    'use strict';

    const HEADER_BUTTON_CLASS = 'icon-button';

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
            || document.getElementById('public-room')
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
        let slot = document.getElementById('erikraft-webtorrent-slot');

        if (!slot) {
            slot = document.createComment('erikraft-webtorrent-slot');
            slot.id = 'erikraft-webtorrent-slot';
        }

        if (existing && existing.parentNode) {
            existing.parentNode.insertBefore(slot, existing);
            existing.remove();
        }

        const placeButton = () => {
            const button = document.getElementById('webtorrent-btn');
            if (!button || !slot.parentNode) return false;
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

    function initialize() {
        restoreAnimatedQRButton();
        prepareWebTorrentMount();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
