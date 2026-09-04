(function setupAnimatedQRFileSizeDefaults() {
    'use strict';

    const FILE_INFO_ID = 'qr-send-file-info';
    const DISPLAY_SIZE_ID = 'qr-send-display-size';
    const CANVAS_ID = 'qr-send-canvas-container';
    const DEFAULT_FILE_SIZE = 'large';
    // Keep the file-transfer QR dimensions identical to the text-transfer QR.
    const SIZE_PX = { small: 220, medium: 280, large: 320 };

    const getEl = id => document.getElementById(id);

    function isFileTransferActive() {
        const fileInfo = getEl(FILE_INFO_ID);
        return !!fileInfo && !!fileInfo.textContent.trim();
    }

    function getSelectedSize() {
        const select = getEl(DISPLAY_SIZE_ID);
        return SIZE_PX[select?.value] || SIZE_PX[DEFAULT_FILE_SIZE];
    }

    function syncContainerSize() {
        const container = getEl(CANVAS_ID);
        if (!container || !isFileTransferActive()) return;

        const size = getSelectedSize();
        container.classList.add('erikraft-file-qr-transfer');
        container.style.setProperty('--erikraft-file-qr-size', `${size}px`);
        container.style.width = `min(${size}px, calc(100vw - 24px))`;
        container.style.height = `min(${size}px, calc(100vw - 24px))`;
        container.style.maxWidth = `calc(100vw - 24px)`;
        container.style.maxHeight = `calc(100vw - 24px)`;

        container.querySelectorAll('svg, canvas').forEach(element => {
            element.style.width = '100%';
            element.style.height = '100%';
            element.style.maxWidth = '100%';
            element.style.maxHeight = '100%';
            element.style.display = 'block';
        });
    }

    function applyFileDefault() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || !isFileTransferActive()) return;

        // Large is the file-transfer default, but an explicit user choice always wins.
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
                container?.classList.remove('erikraft-file-qr-transfer');
                container?.style.removeProperty('--erikraft-file-qr-size');
                if (container) {
                    container.style.removeProperty('width');
                    container.style.removeProperty('height');
                    container.style.removeProperty('max-width');
                    container.style.removeProperty('max-height');
                }
            }
        });
        observer.observe(fileInfo, { childList: true, characterData: true, subtree: true });
    }

    function wrapQRRenderer() {
        if (window.ErikrafTDropQR?.__erikraftFileSizeRendererWrapped) return;
        const qr = window.ErikrafTDropQR;
        if (!qr || typeof qr.render !== 'function') return;

        const originalRender = qr.render.bind(qr);
        qr.render = (container, data, options = {}) => {
            const fileTransfer = container?.id === CANVAS_ID && isFileTransferActive();
            if (!fileTransfer) return originalRender(container, data, options);

            const size = getSelectedSize();
            const fileOptions = {
                ...options,
                width: size,
                height: size,
                margin: 0,
                animatedTransfer: true
            };
            const result = originalRender(container, data, fileOptions);
            syncContainerSize();
            return result;
        };
        qr.__erikraftFileSizeRendererWrapped = true;
    }

    function observeCanvas() {
        const container = getEl(CANVAS_ID);
        if (!container || container.dataset.erikraftFileCanvasObserver === 'true') return;

        container.dataset.erikraftFileCanvasObserver = 'true';
        const observer = new MutationObserver(() => {
            if (isFileTransferActive()) syncContainerSize();
        });
        observer.observe(container, { childList: true, subtree: true, attributes: true });
    }

    function injectResponsiveSizing() {
        if (document.getElementById('erikraft-animated-qr-file-size-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-animated-qr-file-size-style';
        style.textContent = `
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer {
    width: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 24px)) !important;
    height: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 24px)) !important;
    max-width: calc(100vw - 24px) !important;
    max-height: calc(100vw - 24px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 4px auto !important;
}
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer > svg,
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer > canvas {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
}
@media (max-width: 600px) {
    #animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer {
        width: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 20px)) !important;
        height: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 20px)) !important;
        max-width: calc(100vw - 20px) !important;
        max-height: calc(100vw - 20px) !important;
    }
}
@media (max-width: 360px) {
    #animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer {
        width: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 12px)) !important;
        height: min(var(--erikraft-file-qr-size, 320px), calc(100vw - 12px)) !important;
        max-width: calc(100vw - 12px) !important;
        max-height: calc(100vw - 12px) !important;
    }
}
`;
        document.head.appendChild(style);
    }

    function init() {
        injectResponsiveSizing();
        bindSizeControl();
        resetWhenFileClears();
        observeCanvas();
        wrapQRRenderer();
        applyFileDefault();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
