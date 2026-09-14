(function restoreErikrafTHeaderActions() {
    'use strict';

    function restoreAnimatedQRButton() {
        if (document.getElementById('animated-qr-btn')) return;
        const button = document.createElement('div');
        button.id = 'animated-qr-btn';
        button.className = 'icon-button';
        button.setAttribute('data-i18n-key', 'header.animated-qr');
        button.setAttribute('data-i18n-attrs', 'title aria-label');
        button.title = 'Transfer via Animated QR';
        button.setAttribute('aria-label', 'Transfer via Animated QR');
        button.innerHTML = '<svg class="icon"><use xlink:href="#qrcode-icon"></use></svg>';
        const anchor = document.getElementById('pair-device') || document.getElementById('join-public-room') || document.getElementById('tor-config-btn');
        if (anchor?.parentNode) anchor.parentNode.insertBefore(button, anchor);
    }

    function removeTorrentButton() {
        document.getElementById('webtorrent-btn')?.remove();
    }

    function initialize() {
        restoreAnimatedQRButton();
        removeTorrentButton();

        // webtorrent-transfer.js may create its legacy header button after this script.
        // Keep the Torrent transfer implementation available without restoring the unwanted header control.
        const observer = new MutationObserver(removeTorrentButton);
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 5000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
})();
