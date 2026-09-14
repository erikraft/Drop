(function setupAndroidDialogScrollBridge() {
    'use strict';

    if (window.__erikraftAndroidDialogScrollBridgeInstalled) return;
    window.__erikraftAndroidDialogScrollBridgeInstalled = true;

    function sync() {
        try {
            const bridge = window['ErikrafT' + 'dropAndroid'];
            if (!bridge?.setDialogVisible) return;
            const dialogs = Array.from(document.querySelectorAll('x-dialog, dialog, [role="dialog"]'));
            const visible = dialogs.some(dialog => {
                if (dialog.hidden || dialog.hasAttribute('hidden')) return false;
                const style = window.getComputedStyle(dialog);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });
            bridge.setDialogVisible(visible);
        } catch (error) {
            console.debug('[Android] Dialog scroll bridge unavailable:', error);
        }
    }

    function start() {
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['hidden', 'style', 'class', 'open']
        });
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
