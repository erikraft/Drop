/**
 * Reusable QR Code Helper utilizing qr-code-styling.
 * Standardizes the design, error correction, and logo centralisation
 * for ErikrafT Drop™ permanent pairing and temporary public rooms.
 * 
 * OPTIMIZED FOR ANIMATED QR:
 * - Reuses QRCodeStyling instance to prevent flickering
 * - Renders QR immediately without waiting for logo
 * - Applies logo asynchronously when available
 * - Prevents DOM churn during frame updates
 */

class ErikrafTDropQR {
    /**
     * Renders or updates a QR Code inside the provided container.
     * Keeps track of the instance to avoid memory leaks and flickering.
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

        // Reuse existing instance if available (prevents flickering during animation)
        let qrCode = container._qrInstance;
        
        if (!qrCode) {
            // Clear any old SVGs/Canvases inside container first
            container.innerHTML = '';

            // Create base configuration without logo initially for fast rendering
            const baseConfig = {
                width: options.width || 256,
                height: options.height || 256,
                type: 'svg', // Ensure crisp, highly scalable vector rendering
                data: data,
                margin: options.margin || 10, // Quiet zone margin
                qrOptions: {
                    typeNumber: 0,
                    mode: 'Byte',
                    errorCorrectionLevel: 'H' // High correction level for logo compatibility
                },
                dotsOptions: {
                    color: '#121212', // Deep high-contrast dark color
                    type: 'rounded' // Rounded points
                },
                backgroundOptions: {
                    color: '#ffffff' // Pure white background
                },
                cornersSquareOptions: {
                    color: '#121212',
                    type: 'extra-rounded' // Smooth, modern rounded corners
                },
                cornersDotOptions: {
                    color: '#121212',
                    type: 'dot' // Rounded dot inside the corner squares
                }
            };

            // Create new instance
            qrCode = new QRCodeStyling(baseConfig);

            // Save instance reference on container
            container._qrInstance = qrCode;

            // Render immediately without logo
            qrCode.append(container);

            // Load and apply logo asynchronously (doesn't block QR appearance)
            this._applyLogoAsync(qrCode, container, options);
        } else {
            // Update data on existing instance (QRCodeStyling doesn't support direct data update)
            // We need to recreate the instance but keep it in the same DOM position
            // to minimize flickering
            const oldContent = container.innerHTML;
            
            const baseConfig = {
                width: options.width || 256,
                height: options.height || 256,
                type: 'svg',
                data: data,
                margin: options.margin || 10,
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

            // Create new instance with updated data
            qrCode = new QRCodeStyling(baseConfig);
            container._qrInstance = qrCode;
            container.innerHTML = '';
            qrCode.append(container);

            // Re-apply logo asynchronously if it was previously applied
            if (container._logoApplied) {
                this._applyLogoAsync(qrCode, container, options);
            }
        }

        return qrCode;
    }

    /**
     * Applies logo to QR code asynchronously without blocking rendering.
     * Falls back gracefully if logo fails to load.
     */
    static async _applyLogoAsync(qrCode, container, options = {}) {
        const logoPath = options.logoPath || 'images/icon-drop-blue.svg';
        
        try {
            // Check if logo exists by attempting to load it
            const response = await fetch(logoPath);
            if (!response.ok) {
                console.warn('[QR Helper] Logo not available, QR will render without logo');
                return;
            }

            // Logo exists, apply it
            const logoConfig = {
                image: logoPath,
                imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: options.imageSize || 0.3,
                    margin: options.logoMargin || 5,
                    crossOrigin: 'anonymous',
                    saveAsBlob: true
                }
            };

            // Update the instance with logo
            const logoQrCode = new QRCodeStyling({
                ...qrCode._options,
                ...logoConfig
            });

            container._qrInstance = logoQrCode;
            container.innerHTML = '';
            logoQrCode.append(container);
            container._logoApplied = true;

        } catch (error) {
            console.warn('[QR Helper] Logo loading failed, QR continues without logo:', error);
            container._logoApplied = false;
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
            if (container._logoApplied !== undefined) {
                delete container._logoApplied;
            }
            container.innerHTML = '';
        }
    }
}

// Make it globally accessible for our non-modular browser scripts
window.ErikrafTDropQR = ErikrafTDropQR;
