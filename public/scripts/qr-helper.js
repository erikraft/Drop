/**
 * Reusable QR Code Helper utilizing qr-code-styling.
 * Standardizes the design, error correction, and logo centralisation
 * for ErikrafT Drop™ permanent pairing and temporary public rooms.
 */

class ErikrafTDropQR {
    /**
     * Renders or updates a QR Code inside the provided container.
     * Keeps track of the instance to avoid memory leaks.
     *
     * @param {HTMLElement} container - The DOM element where the QR Code will render.
     * @param {string} data - The URL/data to encode.
     * @returns {QRCodeStyling} The created/updated QRCodeStyling instance.
     */
    static render(container, data) {
        if (!container) {
            console.error('[QR Helper] Container element is required.');
            return null;
        }

        // Clean up previous instance in this container to prevent memory leaks and duplicate rendering.
        // We MUST completely destroy the previous instance and clean the container as requested:
        // "Quando um novo QR Code for gerado: destruir a instância anterior, limpar o container, renderizar novamente. Não permitir múltiplos QR Codes empilhados."
        if (container._qrInstance) {
            this.destroy(container);
        }

        // Clear any old SVGs/Canvases inside container first
        container.innerHTML = '';

        // Create a new instance
        // Options tailored to requirements: modern, rounded dots/corners, white background/margin, excellent contrast, and blue drop icon logo.
        // Let's use a crisp resolution (e.g., width & height 160 or larger like 256 for sharp look)
        const qrCode = new QRCodeStyling({
            width: 256,
            height: 256,
            type: 'svg', // Ensure crisp, highly scalable vector rendering
            data: data,
            image: 'images/icon-drop-blue.svg', // Exact project file
            margin: 10, // Quiet zone margin
            qrOptions: {
                typeNumber: 0,
                mode: 'Byte',
                errorCorrectionLevel: 'H' // High correction level to ensure scannability with central logo
            },
            imageOptions: {
                hideBackgroundDots: true,
                imageSize: 0.3, // Balanced central area so it doesn't cover excess area
                margin: 5, // White margin around the logo for excellent legibility
                crossOrigin: 'anonymous',
                saveAsBlob: true
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
        });

        // Save instance reference on container to enable updates and proper cleanup
        container._qrInstance = qrCode;

        // Render inside container
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
