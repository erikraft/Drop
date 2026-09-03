/**
 * Reusable QR Code Helper utilizing qr-code-styling.
 * Standardizes the design, error correction, and logo centralisation
 * for ErikrafT Drop™ permanent pairing and temporary public rooms.
 *
 * OPTIMIZED FOR ANIMATED QR:
 * - Renders QR immediately without waiting for logo
 * - Logo is optional enhancement, never blocks QR appearance
 * - Prevents visual flickering during frame updates
 * - Minimizes DOM churn during animation
 */

class ErikrafTDropQR {
    static _logoState = {
        attempted: false,
        available: false,
        path: 'images/icon-drop-blue.svg',
        promise: null
    };

    static async _ensureLogoLoaded(logoPath = 'images/icon-drop-blue.svg') {
        if (this._logoState.attempted) return this._logoState.promise;
        this._logoState.attempted = true;
        this._logoState.path = logoPath;
        this._logoState.promise = (async () => {
            try {
                const response = await fetch(logoPath);
                if (response.ok) {
                    this._logoState.available = true;
                    console.log('[QR Helper] Logo loaded successfully, cached for subsequent QR frames');
                } else {
                    this._logoState.available = false;
                }
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
                container._qrInstance.update({ data: data });
                return container._qrInstance;
            } catch (err) {
                console.warn('[QR Helper] Direct instance update failed, recreating:', err);
            }
        }

        const baseConfig = {
            width: options.width || 280,
            height: options.height || 280,
            type: 'svg',
            data: data,
            margin: options.margin || 8,
            qrOptions: {
                typeNumber: 0,
                mode: 'Byte',
                errorCorrectionLevel: 'H'
            },
            dotsOptions: { color: '#121212', type: 'rounded' },
            backgroundOptions: { color: '#ffffff' },
            cornersSquareOptions: { color: '#121212', type: 'extra-rounded' },
            cornersDotOptions: { color: '#121212', type: 'dot' }
        };

        if (!isAnimatedTransfer && this._logoState.available) {
            baseConfig.image = this._logoState.path;
            baseConfig.imageOptions = {
                hideBackgroundDots: true,
                imageSize: options.imageSize || 0.25,
                margin: options.logoMargin || 4,
                crossOrigin: 'anonymous',
                saveAsBlob: true
            };
        }

        const qrCode = new QRCodeStyling(baseConfig);
        container._qrInstance = qrCode;
        container.innerHTML = '';
        qrCode.append(container);
        return qrCode;
    }

    static destroy(container) {
        if (container) {
            if (container._qrInstance) delete container._qrInstance;
            container.innerHTML = '';
        }
    }
}

window.ErikrafTDropQR = ErikrafTDropQR;

(function setupAnimatedQRPlaybackControls() {
    const setup = () => {
        const activeButtons = document.getElementById('qr-send-active-buttons');
        const pauseButton = document.getElementById('qr-send-pause-btn');
        if (!activeButtons || !pauseButton || document.getElementById('qr-send-play-btn')) return;
        const playButton = pauseButton.cloneNode(true);
        playButton.id = 'qr-send-play-btn';
        playButton.removeAttribute('data-i18n-key');
        playButton.textContent = '▶ Play';
        playButton.setAttribute('aria-label', 'Play animated QR transfer');
        playButton.title = 'Play animated QR transfer';
        playButton.addEventListener('click', () => {
            const dialog = window.erikrafTdrop && window.erikrafTdrop.animatedQRSendDialog;
            const transmitter = dialog && dialog.transmitter;
            if (!transmitter || !transmitter.running) return;
            transmitter.resume();
            pauseButton.textContent = typeof Localization !== 'undefined' && Localization.getTranslation
                ? (Localization.getTranslation('dialogs.animated-qr-pause') || 'Pause')
                : 'Pause';
        });
        activeButtons.insertBefore(playButton, pauseButton);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
    else setup();
    const observer = new MutationObserver(setup);
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();

// QR Scanner fixes are kept here so they can be applied without touching the
// large UI controller. Bare domains are valid QR URLs even without a scheme.
(function setupQRScannerFixes() {
    const isLikelyHostname = value => {
        const host = value.trim().replace(/^www\./i, '');
        if (!host || host.includes('/') || host.includes(' ') || host.includes('@')) return false;
        if (host.endsWith('.onion')) return /^[a-z2-7]{16}|[a-z2-7]{56}\.onion$/i.test(host) || /^[a-z0-9-]+\.onion$/i.test(host);
        if (host === 'localhost' || host === '127.0.0.1') return true;
        return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host);
    };

    const normalizeScannedUrl = raw => {
        const value = String(raw || '').trim();
        if (!value) return null;
        try {
            const parsed = new URL(value);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') return parsed;
        } catch (e) {}
        if (isLikelyHostname(value)) {
            try { return new URL(`https://${value}`); } catch (e) {}
        }
        return null;
    };

    const classify = raw => {
        const original = String(raw || '').trim();
        if (!original) return null;
        const parsedUrl = normalizeScannedUrl(original);
        if (!parsedUrl) {
            return { isUrl: false, isEcosystem: false, type: 'text', title: 'QR Code (Texto)', displayUrl: original, targetUrl: original, isExternal: false };
        }

        const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        const params = parsedUrl.searchParams;
        const isErikraftHost = host === 'erikraft.com' || host.endsWith('.erikraft.com');
        const isDropHost = host === 'drop.erikraft.com' || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.onion');
        const isDocsDrop = host === 'docsdrop.erikraft.com';
        const isBioDrop = host === 'biodrop.erikraft.com';
        const isEcosystem = isErikraftHost || isDropHost || isDocsDrop || isBioDrop;

        let title = 'QR Code Externo';
        let type = 'external';
        if (params.has('room_id')) {
            title = 'ErikrafT Drop™ - Sala Pública/Privada'; type = 'drop-room';
        } else if (params.has('pair_key')) {
            title = 'ErikrafT Drop™ - Emparelhamento de Dispositivo'; type = 'drop-pair';
        } else if (isDocsDrop) {
            title = 'DocsDrop - Documentação ErikrafT'; type = 'docsdrop';
        } else if (isBioDrop) {
            title = 'BioDrop - Link Bio ErikrafT'; type = 'biodrop';
        } else if (isDropHost) {
            title = 'ErikrafT Drop™'; type = 'drop';
        } else if (isErikraftHost) {
            title = host === 'erikraft.com' ? 'ErikrafT' : 'ErikrafT Service'; type = 'erikraft-service';
        }

        return {
            isUrl: true,
            isEcosystem,
            type,
            title,
            displayUrl: parsedUrl.href,
            targetUrl: parsedUrl.href,
            searchParams: params,
            isExternal: !isEcosystem
        };
    };

    const install = () => {
        if (typeof QRScannerDialog === 'undefined') return false;
        QRScannerDialog.prototype.processScannedRaw = function(raw) {
            if (!raw) return;
            this.stopCamera();
            this.hide();
            const classified = classify(raw);
            const dialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
            if (dialog && typeof dialog.showResult === 'function') dialog.showResult(classified);
        };
        return true;
    };

    // ui.js can load before or after this helper. Retry only until the scanner exists.
    const tryInstall = () => {
        if (install()) return;
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (install() || attempts >= 100) clearInterval(timer);
        }, 50);
    };
    tryInstall();

    // Improve the dialog presentation without changing global dialog styles.
    const injectStyles = () => {
        if (document.getElementById('erikraft-qr-scanner-fix-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-qr-scanner-fix-style';
        style.textContent = `
            #qr-scanner-dialog x-paper { width: min(92vw, 560px); max-width: 560px; max-height: 90vh; overflow: auto; border-radius: 18px; }
            #qr-scanner-dialog .dialog-title { margin: 0; line-height: 1.25; }
            #qr-scanner-dialog x-background > * { box-sizing: border-box; }
            #qr-scanner-dialog #qr-scanner-main-video { display: block; width: 100%; max-height: 55vh; min-height: 220px; object-fit: cover; border-radius: 14px; }
            #qr-scanner-dialog #qr-scanner-main-status { margin: 12px 0; line-height: 1.5; text-align: center; overflow-wrap: anywhere; }
            #qr-scanner-dialog #qr-scanner-manual-input { width: 100%; box-sizing: border-box; min-height: 44px; }
            #qr-scanner-confirm-dialog x-paper { width: min(92vw, 560px); max-width: 560px; max-height: 90vh; overflow: auto; border-radius: 18px; }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-url { display: block; width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 12px; overflow-wrap: anywhere; word-break: break-word; line-height: 1.5; }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-badge { display: inline-flex; align-items: center; max-width: 100%; margin: 8px 0; padding: 5px 10px; border-radius: 999px; font-size: 12px; line-height: 1.4; white-space: nowrap; }
            #qr-scanner-confirm-dialog .btn-row { display: flex; flex-wrap: wrap; gap: 10px; }
            @media (max-width: 600px) {
                #qr-scanner-dialog x-paper, #qr-scanner-confirm-dialog x-paper { width: calc(100vw - 20px); border-radius: 14px; }
                #qr-scanner-dialog #qr-scanner-main-video { min-height: 180px; border-radius: 10px; }
                #qr-scanner-confirm-dialog #qr-scanner-confirm-url { padding: 12px; }
                #qr-scanner-confirm-dialog .btn-row > button { flex: 1 1 140px; }
            }
        `;
        document.head.appendChild(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
    else injectStyles();
})();
