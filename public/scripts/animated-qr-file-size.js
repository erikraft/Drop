(function setupAnimatedQRFileSizeDefaults() {
    'use strict';

    const FILE_INFO_ID = 'qr-send-file-info';
    const DISPLAY_SIZE_ID = 'qr-send-display-size';
    const CANVAS_ID = 'qr-send-canvas-container';
    const DEFAULT_FILE_SIZE = 'large';
    const SIZE_PX = { small: 220, medium: 280, large: 320 };

    const getEl = id => document.getElementById(id);

    function isFileTransferActive() {
        const fileInfo = getEl(FILE_INFO_ID);
        return !!fileInfo && !!fileInfo.textContent.trim();
    }

    function syncContainerSize() {
        const select = getEl(DISPLAY_SIZE_ID);
        const container = getEl(CANVAS_ID);
        if (!select || !container || !isFileTransferActive()) return;

        const requestedSize = SIZE_PX[select.value] || SIZE_PX[DEFAULT_FILE_SIZE];
        container.style.setProperty('--erikraft-file-qr-size', `${requestedSize}px`);
    }

    function applyFileDefault() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || !isFileTransferActive()) return;

        // Only choose Large automatically when the user has not explicitly
        // changed the Tamanho control. Never override an explicit choice.
        if (select.dataset.erikraftUserSizeSelection !== 'true') {
            select.value = DEFAULT_FILE_SIZE;
        }
        syncContainerSize();
    }

    function bindSizeControl() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || select.dataset.erikraftFileSizeBound === 'true') return;

        select.dataset.erikraftFileSizeBound = 'true';
        select.addEventListener('change', () => {
            select.dataset.erikraftUserSizeSelection = 'true';
            syncContainerSize();
        });
    }

    function resetWhenFileClears() {
        const fileInfo = getEl(FILE_INFO_ID);
        const select = getEl(DISPLAY_SIZE_ID);
        if (!fileInfo || !select || fileInfo.dataset.erikraftFileSizeObserver === 'true') return;

        fileInfo.dataset.erikraftFileSizeObserver = 'true';
        const observer = new MutationObserver(() => {
            if (fileInfo.textContent.trim()) {
                bindSizeControl();
                applyFileDefault();
            } else {
                delete select.dataset.erikraftUserSizeSelection;
                const container = getEl(CANVAS_ID);
                container?.style.removeProperty('--erikraft-file-qr-size');
            }
        });
        observer.observe(fileInfo, { childList: true, characterData: true, subtree: true });
    }

    function injectResponsiveSizing() {
        if (document.getElementById('erikraft-animated-qr-file-size-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-animated-qr-file-size-style';
        style.textContent = `
#animated-qr-send-dialog #qr-send-canvas-container:has(+ *) {
    width: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 32px)) !important;
    height: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 32px)) !important;
    max-width: calc(100vw - 32px) !important;
    max-height: calc(100vw - 32px) !important;
}
@media (max-width: 600px) {
    #animated-qr-send-dialog #qr-send-canvas-container:has(+ *) {
        width: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 24px)) !important;
        height: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 24px)) !important;
        max-width: calc(100vw - 24px) !important;
        max-height: calc(100vw - 24px) !important;
    }
}
@media (max-width: 360px) {
    #animated-qr-send-dialog #qr-send-canvas-container:has(+ *) {
        width: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 20px)) !important;
        height: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 20px)) !important;
        max-width: calc(100vw - 20px) !important;
        max-height: calc(100vw - 20px) !important;
    }
}
`;
        document.head.appendChild(style);
    }

    function init() {
        injectResponsiveSizing();
        bindSizeControl();
        resetWhenFileClears();
        applyFileDefault();

        const dialog = document.getElementById('animated-qr-send-dialog');
        if (dialog && !dialog.dataset.erikraftFileSizeDialogObserver) {
            dialog.dataset.erikraftFileSizeDialogObserver = 'true';
            const observer = new MutationObserver(() => {
                bindSizeControl();
                if (isFileTransferActive()) applyFileDefault();
            });
            observer.observe(dialog, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
