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
    /**
     * Renders or updates a QR Code inside the provided container.
     * QR appears immediately, logo loads asynchronously if available.
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

        // Check if we need to apply logo for the first time
        const shouldTryLogo = !container._logoAttempted;
        if (shouldTryLogo) {
            container._logoAttempted = true;
            // Start logo loading in background, don't wait for it
            this._tryLoadLogoInBackground(container, options);
        }

        // Check if existing QRCodeStyling instance can be updated directly
        // Update method is supported by qr-code-styling without recreating DOM elements or flickering
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

        // Only add logo if it was successfully loaded previously
        if (container._logoAvailable) {
            baseConfig.image = container._logoPath || 'images/icon-drop-blue.svg';
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
     * Attempts to load logo in background without blocking QR rendering.
     * If successful, subsequent QR renders will include the logo.
     * If failed, QR continues to work without logo.
     */
    static async _tryLoadLogoInBackground(container, options = {}) {
        const logoPath = options.logoPath || 'images/icon-drop-blue.svg';
        
        try {
            // Check if logo exists by attempting to load it
            const response = await fetch(logoPath);
            if (!response.ok) {
                console.warn('[QR Helper] Logo not available, QR will render without logo');
                container._logoAvailable = false;
                return;
            }

            // Logo exists, mark it as available for future renders
            container._logoAvailable = true;
            container._logoPath = logoPath;
            console.log('[QR Helper] Logo loaded successfully, will be applied to subsequent QR frames');

        } catch (error) {
            console.warn('[QR Helper] Logo loading failed, QR continues without logo:', error);
            container._logoAvailable = false;
        }
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
            if (container._logoAvailable !== undefined) {
                delete container._logoAvailable;
            }
            if (container._logoPath !== undefined) {
                delete container._logoPath;
            }
            if (container._logoAttempted !== undefined) {
                delete container._logoAttempted;
            }
            container.innerHTML = '';
        }
    }
}

// Make it globally accessible for our non-modular browser scripts
window.ErikrafTDropQR = ErikrafTDropQR;
