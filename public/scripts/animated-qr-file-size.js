(function setupAnimatedQRFileSizeDefaults() {
    'use strict';

    const FILE_INFO_ID = 'qr-send-file-info';
    const DISPLAY_SIZE_ID = 'qr-send-display-size';
    const CANVAS_ID = 'qr-send-canvas-container';
    const DEFAULT_FILE_SIZE = 'large';
    // These are the exact layout-1 sizes used by the Animated QR text transfer.
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

    function getResponsiveSize(size) {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || size;
        const horizontalAllowance = viewportWidth <= 360 ? 12 : 24;
        return Math.max(1, Math.min(size, viewportWidth - horizontalAllowance));
    }

    function syncCanvasSize() {
        const container = getEl(CANVAS_ID);
        if (!container || !isFileTransferActive()) return;

        const requestedSize = getSelectedSize();
        const renderedSize = getResponsiveSize(requestedSize);
        container.classList.add('erikraft-file-qr-transfer');
        container.style.setProperty('--erikraft-file-qr-size', `${requestedSize}px`);
        container.style.setProperty('--erikraft-file-qr-rendered-size', `${renderedSize}px`);
        container.style.width = `${renderedSize}px`;
        container.style.height = `${renderedSize}px`;
        container.style.maxWidth = `${renderedSize}px`;
        container.style.maxHeight = `${renderedSize}px`;

        // Do not leave the SVG at its old intrinsic 280px dimensions. The
        // text-transfer QR uses the selected layout-1 size as its actual
        // rendered box, so the file-transfer QR must do the same.
        container.querySelectorAll('svg, canvas').forEach(element => {
            element.style.width = `${renderedSize}px`;
            element.style.height = `${renderedSize}px`;
            element.style.maxWidth = `${renderedSize}px`;
            element.style.maxHeight = `${renderedSize}px`;
            element.style.minWidth = `${renderedSize}px`;
            element.style.minHeight = `${renderedSize}px`;
            element.style.display = 'block';
            element.setAttribute('width', String(renderedSize));
            element.setAttribute('height', String(renderedSize));
        });
    }

    function applyFileDefault() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || !isFileTransferActive()) return;

        // File transfer starts at Large, matching the text-transfer Large size.
        // Once the user changes Tamanho, never overwrite that explicit choice.
        if (select.dataset.erikraftUserSizeSelection !== 'true') {
            select.value = DEFAULT_FILE_SIZE;
        }
        syncCanvasSize();
    }

    function bindSizeControl() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || select.dataset.erikraftFileSizeBound === 'true') return;

        select.dataset.erikraftFileSizeBound = 'true';
        select.addEventListener('change', () => {
            select.dataset.erikraftUserSizeSelection = 'true';
            syncCanvasSize();
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
                if (container) {
                    ['--erikraft-file-qr-size', '--erikraft-file-qr-rendered-size'].forEach(property => container.style.removeProperty(property));
                    ['width', 'height', 'max-width', 'max-height'].forEach(property => container.style.removeProperty(property));
                }
            }
        });
        observer.observe(fileInfo, { childList: true, characterData: true, subtree: true });
    }

    function observeCanvas() {
        const container = getEl(CANVAS_ID);
        if (!container || container.dataset.erikraftFileCanvasObserver === 'true') return;

        container.dataset.erikraftFileCanvasObserver = 'true';
        const observer = new MutationObserver(() => {
            if (isFileTransferActive()) syncCanvasSize();
        });
        observer.observe(container, { childList: true, subtree: true });
    }

    function injectResponsiveSizing() {
        if (document.getElementById('erikraft-animated-qr-file-size-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-animated-qr-file-size-style';
        style.textContent = `
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer {
    width: var(--erikraft-file-qr-rendered-size, 320px) !important;
    height: var(--erikraft-file-qr-rendered-size, 320px) !important;
    max-width: var(--erikraft-file-qr-rendered-size, 320px) !important;
    max-height: var(--erikraft-file-qr-rendered-size, 320px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 4px auto !important;
    overflow: hidden !important;
}
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer > svg,
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer > canvas {
    display: block !important;
    width: var(--erikraft-file-qr-rendered-size, 320px) !important;
    height: var(--erikraft-file-qr-rendered-size, 320px) !important;
    max-width: none !important;
    max-height: none !important;
    min-width: var(--erikraft-file-qr-rendered-size, 320px) !important;
    min-height: var(--erikraft-file-qr-rendered-size, 320px) !important;
}
@media (max-width: 360px) {
    #animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer {
        width: var(--erikraft-file-qr-rendered-size, 320px) !important;
        height: var(--erikraft-file-qr-rendered-size, 320px) !important;
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
        applyFileDefault();
        window.addEventListener('resize', () => {
            if (isFileTransferActive()) syncCanvasSize();
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
