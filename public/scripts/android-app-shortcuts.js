(() => {
    'use strict';

    const bridge = () => window.ErikrafTdropAndroid || null;
    const getElement = id => document.getElementById(id);

    function exposeShortcut(element) {
        if (!element) return;
        element.hidden = false;
        element.removeAttribute('aria-hidden');
        element.removeAttribute('tabindex');
    }

    function bindNativeButton(element, action) {
        if (!element || element.dataset.erikraftNativeShortcutBound === 'true') return;
        element.dataset.erikraftNativeShortcutBound = 'true';
        exposeShortcut(element);
        element.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            action();
        });
    }

    function bind() {
        const native = bridge();
        if (!native) return;

        const tor = getElement('tor-config-btn');
        if (tor && typeof native.openOnionTransfer === 'function'
                && tor.dataset.erikraftNativeShortcutBound !== 'true') {
            tor.dataset.erikraftNativeShortcutBound = 'true';
            tor.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                native.openOnionTransfer();
            }, true);
        }

        if (typeof native.openFtpSettings === 'function') {
            bindNativeButton(getElement('android-ftp-shortcut'), () => native.openFtpSettings());
        }
        if (typeof native.openSftpSettings === 'function') {
            bindNativeButton(getElement('android-sftp-shortcut'), () => native.openSftpSettings());
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
        bind();
    }
})();
