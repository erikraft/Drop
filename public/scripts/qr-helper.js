/**
 * Reusable QR Code Helper utilizing qr-code-styling.
 * Standardizes QR design for ErikrafT Drop™ permanent pairing and temporary public rooms.
 *
 * Animated transfer QR codes intentionally skip the logo for faster frame generation.
 */
class ErikrafTDropQR {
    static _logoState = { attempted: false, available: false, path: 'images/icon-drop-blue.svg', promise: null };

    static async _ensureLogoLoaded(logoPath = 'images/icon-drop-blue.svg') {
        if (this._logoState.attempted) return this._logoState.promise;
        this._logoState.attempted = true;
        this._logoState.path = logoPath;
        this._logoState.promise = (async () => {
            try {
                const response = await fetch(logoPath);
                this._logoState.available = response.ok;
                if (response.ok) console.log('[QR Helper] Logo loaded successfully, cached for subsequent QR frames');
            } catch (err) {
                this._logoState.available = false;
            }
        })();
        return this._logoState.promise;
    }

    static render(container, data, options = {}) {
        if (!container) {
            console.error('[QR Helper] Container element is required.');
            return null;
        }
        const isAnimatedTransfer = container.id === 'qr-send-canvas-container' || options.animatedTransfer === true;
        const logoPath = options.logoPath || 'images/icon-drop-blue.svg';
        if (!isAnimatedTransfer && !this._logoState.attempted) this._ensureLogoLoaded(logoPath);
        if (container._qrInstance && typeof container._qrInstance.update === 'function') {
            try {
                const updateOptions = { data };
                // qr-code-styling's update() must receive width/height explicitly;
                // otherwise an existing 280x280 instance keeps its original SVG
                // background rect and ignores the animated transfer size control.
                if (isAnimatedTransfer) {
                    if (Number.isFinite(options.width)) updateOptions.width = options.width;
                    if (Number.isFinite(options.height)) updateOptions.height = options.height;
                }
                container._qrInstance.update(updateOptions);
                return container._qrInstance;
            } catch (err) {
                console.warn('[QR Helper] Direct instance update failed, recreating:', err);
            }
        }
        // Use ECC level from options if provided, otherwise default to 'H' for static QR
        const eccLevel = options.eccLevel || (isAnimatedTransfer ? 'L' : 'H');
        const baseConfig = {
            width: options.width || 280, height: options.height || 280, type: 'svg', data,
            margin: options.margin || 8,
            qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: eccLevel },
            dotsOptions: { color: '#121212', type: 'rounded' },
            backgroundOptions: { color: '#ffffff' },
            cornersSquareOptions: { color: '#121212', type: 'extra-rounded' },
            cornersDotOptions: { color: '#121212', type: 'dot' }
        };
        if (!isAnimatedTransfer && this._logoState.available) {
            baseConfig.image = this._logoState.path;
            baseConfig.imageOptions = { hideBackgroundDots: true, imageSize: options.imageSize || 0.25, margin: options.logoMargin || 4, crossOrigin: 'anonymous', saveAsBlob: true };
        }
        const qrCode = new QRCodeStyling(baseConfig);
        container._qrInstance = qrCode;
        container.innerHTML = '';
        qrCode.append(container);
        return qrCode;
    }

    static destroy(container) {
        if (!container) return;
        if (container._qrInstance) delete container._qrInstance;
        container.innerHTML = '';
    }
}
window.ErikrafTDropQR = ErikrafTDropQR;

(function setupQRScannerFixes() {
    const ERIKRAFT_ONION_HOST = 'nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion';

    const isHostname = value => {
        const host = value.trim().replace(/^www\./i, '').toLowerCase();
        if (!host || host.includes('@') || host.includes(' ')) return false;
        if (host === 'localhost' || host === '127.0.0.1' || host === ERIKRAFT_ONION_HOST) return true;
        return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host);
    };

    const normalizeScannedUrl = raw => {
        const value = String(raw || '').trim();
        if (!value) return null;
        try {
            const parsed = new URL(value);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') return parsed;
        } catch (err) {}
        if (isHostname(value) || /^[a-z0-9.-]+\.(?:onion|[a-z]{2,63})(?::\d+)?(?:[/?#].*)?$/i.test(value)) {
            try { return new URL(`https://${value}`); } catch (err) {}
        }
        return null;
    };

    const classify = raw => {
        const original = String(raw || '').trim();
        if (!original) return null;
        const parsedUrl = normalizeScannedUrl(original);
        if (!parsedUrl) return { isUrl: false, isEcosystem: false, type: 'text', title: 'QR Code (Texto)', displayUrl: original, targetUrl: original, isExternal: false };

        const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        const searchParams = parsedUrl.searchParams;
        const isErikraftHost = host === 'erikraft.com' || host.endsWith('.erikraft.com');
        const isDropHost = host === 'drop.erikraft.com' || host === 'localhost' || host === '127.0.0.1';
        const isErikraftOnion = host === ERIKRAFT_ONION_HOST;
        const isDocsDrop = host === 'docsdrop.erikraft.com';
        const isBioDrop = host === 'biodrop.erikraft.com';
        const isEcosystem = isErikraftHost || isDropHost || isErikraftOnion || isDocsDrop || isBioDrop;

        let title = 'QR Code Externo';
        let type = 'external';
        if (searchParams.has('room_id')) { title = 'ErikrafT Drop™ - Sala Pública/Privada'; type = 'drop-room'; }
        else if (searchParams.has('pair_key')) { title = 'ErikrafT Drop™ - Emparelhamento de Dispositivo'; type = 'drop-pair'; }
        else if (isDocsDrop) { title = 'DocsDrop - Documentação ErikrafT'; type = 'docsdrop'; }
        else if (isBioDrop) { title = 'BioDrop - Link Bio ErikrafT'; type = 'biodrop'; }
        else if (isDropHost || isErikraftOnion) { title = 'ErikrafT Drop™'; type = 'drop'; }
        else if (isErikraftHost) { title = host === 'erikraft.com' ? 'ErikrafT' : 'ErikrafT Service'; type = 'erikraft-service'; }

        return { isUrl: true, isEcosystem, type, title, displayUrl: parsedUrl.href, targetUrl: parsedUrl.href, searchParams, isExternal: !isEcosystem };
    };

    const showClassifiedResult = (scanner, raw) => {
        const classified = classify(raw);
        scanner.stopCamera();
        scanner.hide();
        const dialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
        if (dialog && typeof dialog.showResult === 'function') dialog.showResult(classified);
    };

    const install = () => {
        if (typeof QRScannerDialog === 'undefined') return false;
        QRScannerDialog.prototype.processScannedRaw = function(raw) {
            if (raw) showClassifiedResult(this, raw);
        };
        return true;
    };
    const tryInstall = () => {
        if (install()) return;
        let attempts = 0;
        const timer = setInterval(() => { if (install() || ++attempts >= 100) clearInterval(timer); }, 50);
    };
    tryInstall();

    const handleManual = event => {
        const submit = event.target && event.target.closest && event.target.closest('#qr-scanner-manual-submit');
        const input = document.getElementById('qr-scanner-manual-input');
        if (!submit || !input || !input.value.trim()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const scanner = window.erikrafTdrop && window.erikrafTdrop.qrScannerDialog;
        const confirmDialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
        if (!confirmDialog || typeof confirmDialog.showResult !== 'function') return;
        if (scanner) scanner.stopCamera();
        if (scanner) scanner.hide();
        const value = input.value.trim();
        input.value = '';
        confirmDialog.showResult(classify(value));
    };
    const handleManualEnter = event => {
        if (event.key !== 'Enter') return;
        const input = event.target && event.target.closest && event.target.closest('#qr-scanner-manual-input');
        if (!input || !input.value.trim()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const scanner = window.erikrafTdrop && window.erikrafTdrop.qrScannerDialog;
        const confirmDialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
        if (!confirmDialog || typeof confirmDialog.showResult !== 'function') return;
        if (scanner) scanner.stopCamera();
        if (scanner) scanner.hide();
        const value = input.value.trim();
        input.value = '';
        confirmDialog.showResult(classify(value));
    };
    document.addEventListener('click', handleManual, true);
    document.addEventListener('keydown', handleManualEnter, true);

    const injectStyles = () => {
        if (document.getElementById('erikraft-qr-scanner-fix-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-qr-scanner-fix-style';
        style.textContent = `
            #qr-scanner-dialog x-paper,
            #qr-scanner-confirm-dialog x-paper {
                width: min(92vw, 560px); max-width: 560px; max-height: 90vh;
                overflow: auto; border-radius: 18px; box-sizing: border-box;
            }
            #qr-scanner-dialog x-paper > *, #qr-scanner-confirm-dialog x-paper > * { box-sizing: border-box; }
            #qr-scanner-dialog .dialog-title, #qr-scanner-confirm-dialog .dialog-title {
                margin: 0; line-height: 1.25; overflow-wrap: anywhere;
            }
            #qr-scanner-dialog .row.center, #qr-scanner-confirm-dialog .row.center { gap: 14px; }
            #qr-scanner-dialog #qr-scanner-main-video {
                display: block; width: 100%; max-width: 480px; min-height: 220px; max-height: 55vh;
                margin: 0 auto; object-fit: cover; border-radius: 14px;
            }
            #qr-scanner-dialog #qr-scanner-main-status {
                width: 100%; margin: 0; padding: 0 4px; line-height: 1.5; text-align: center; overflow-wrap: anywhere;
            }
            #qr-scanner-dialog #qr-scanner-manual-input { width: 100%; min-height: 44px; box-sizing: border-box; }
            #qr-scanner-dialog #qr-scanner-manual-submit { min-height: 42px; }
            #qr-scanner-dialog .btn-row, #qr-scanner-confirm-dialog .btn-row {
                display: flex; flex-wrap: wrap; gap: 10px; width: 100%; box-sizing: border-box;
                justify-content: center; align-items: center;
            }
            #qr-scanner-dialog .btn-row > button, #qr-scanner-confirm-dialog .btn-row > button {
                margin-left: 0; margin-right: 0;
            }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-url {
                display: block; width: 100%; margin: 0; padding: 14px 16px; box-sizing: border-box;
                border-radius: 12px; line-height: 1.5; overflow-wrap: anywhere; word-break: break-word;
            }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-badge {
                display: inline-flex; align-items: center; max-width: 100%; margin: 0; padding: 5px 10px;
                border-radius: 999px; font-size: 12px; line-height: 1.4; white-space: normal; overflow-wrap: anywhere;
            }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-warning {
                width: 100%; box-sizing: border-box; line-height: 1.5; overflow-wrap: anywhere;
            }
            @media (max-width: 600px) {
                #qr-scanner-dialog x-paper, #qr-scanner-confirm-dialog x-paper {
                    width: calc(100vw - 20px); max-height: calc(100vh - 20px); border-radius: 14px;
                }
                #qr-scanner-dialog .row.center, #qr-scanner-confirm-dialog .row.center { gap: 10px; }
                #qr-scanner-dialog #qr-scanner-main-video { min-height: 180px; border-radius: 10px; }
                #qr-scanner-confirm-dialog #qr-scanner-confirm-url { padding: 12px; }
            }
        `;
        document.head.appendChild(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
    else injectStyles();
})();
