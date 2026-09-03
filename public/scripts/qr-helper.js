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

    /**
     * Ensures logo is loaded once globally without blocking QR creation.
     */
    static async _ensureLogoLoaded(logoPath = 'images/icon-drop-blue.svg') {
        if (this._logoState.attempted) {
            return this._logoState.promise;
        }

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

    /**
     * Renders or updates a QR Code inside the provided container.
     * Animated transfer QR codes intentionally never load or render a logo.
     *
     * @param {HTMLElement} container - The DOM element where the QR Code will render.
     * @param {string} data - The URL/data to encode.
     * @param {Object} options - Optional configuration overrides.
     * @returns {QRCodeStyling} The created/updated QRCodeStyling instance.
     */
    static render(container, data, options = {}) {
        if (!container) {
            console.error('[QR Helper] Container element is required.');
            return null;
        }

        // Animated QR transfer frames are rendered without the logo so each frame
        // can be generated as quickly as possible. Pairing/public-room QR codes
        // keep the existing branded logo behaviour.
        const isAnimatedTransfer = container.id === 'qr-send-canvas-container' || options.animatedTransfer === true;
        const logoPath = options.logoPath || 'images/icon-drop-blue.svg';
        if (!isAnimatedTransfer && !this._logoState.attempted) {
            this._ensureLogoLoaded(logoPath);
        }

        // Check if existing QRCodeStyling instance can be updated directly
        if (container._qrInstance && typeof container._qrInstance.update === 'function') {
            try {
                container._qrInstance.update({
                    data: data
                });
                return container._qrInstance;
            } catch (err) {
                console.warn('[QR Helper] Direct instance update failed, recreating:', err);
            }
        }

        // Initial creation of QRCodeStyling instance
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
            dotsOptions: {
                color: '#121212',
                type: 'rounded'
            },
            backgroundOptions: {
                color: '#ffffff'
            },
            cornersSquareOptions: {
                color: '#121212',
                type: 'extra-rounded'
            },
            cornersDotOptions: {
                color: '#121212',
                type: 'dot'
            }
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

    /**
     * Clean up and destroy the QR Code instance associated with the container.
     *
     * @param {HTMLElement} container - The DOM element containing the QR Code.
     */
    static destroy(container) {
        if (container) {
            if (container._qrInstance) {
                delete container._qrInstance;
            }
            container.innerHTML = '';
        }
    }
}

// Make it globally accessible for our non-modular browser scripts
window.ErikrafTDropQR = ErikrafTDropQR;

// Animated QR transfer playback controls.
// The existing Pause and Back controls are preserved; this adds a dedicated
// Play button without changing the transfer protocol or QR frame generation.
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup, { once: true });
    } else {
        setup();
    }

    // The dialog may be instantiated after DOMContentLoaded.
    const observer = new MutationObserver(setup);
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
