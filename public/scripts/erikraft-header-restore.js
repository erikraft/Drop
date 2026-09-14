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

    function removePredeclaredTorrentButton() {
        // The WebTorrent runtime creates the button and binds its dialog listener.
        // Remove the static placeholder so the runtime can use its original UI.
        const button = document.getElementById('webtorrent-btn');
        if (button) button.remove();
    }

    function initialize() {
        restoreAnimatedQRButton();
        removePredeclaredTorrentButton();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
})();
