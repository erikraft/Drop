/**
 * ERIKRAFT-QR Offline Animated QR Optical Transfer Engine (v1.0)
 * Handles client-side encoding, animated QR generation, camera scanning,
 * CRC32/SHA-256 verification, and offline text/file reassembly.
 */

// Simple CRC32 Calculation
function crc32(str) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

const crc32Table = (() => {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
})();

async function sha256Buffer(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

class ErikrafTQRTransmitter {
    constructor(containerEl, options = {}) {
        this.containerEl = containerEl;
        this.fps = options.fps || 6;
        this.chunkSize = options.chunkSize || 180; // bytes
        this.running = false;
        this.paused = false;
        this.timer = null;
        this.currentIndex = 0;
        this.frames = [];
        this.onProgress = options.onProgress || (() => {});
    }

    async prepareText(text) {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(text).buffer;
        await this.prepareBuffer(buffer, {
            type: 'text',
            name: 'text.txt',
            mime: 'text/plain'
        });
    }

    async prepareFile(file) {
        const buffer = await file.arrayBuffer();
        await this.prepareBuffer(buffer, {
            type: 'file',
            name: file.name,
            mime: file.type || 'application/octet-stream'
        });
    }

    async prepareBuffer(buffer, metadata) {
        const transferId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const sha = await sha256Buffer(buffer);
        const bytes = new Uint8Array(buffer);
        const totalSize = bytes.length;

        const baseChunks = [];
        for (let i = 0; i < totalSize; i += this.chunkSize) {
            const chunkBytes = bytes.subarray(i, i + this.chunkSize);
            baseChunks.push(chunkBytes);
        }

        const numChunks = baseChunks.length;
        this.frames = [];

        // Build base frames
        for (let i = 0; i < numChunks; i++) {
            const b64Data = bufferToBase64(baseChunks[i]);
            const payload = {
                h: 'EKQR',
                v: 1,
                id: transferId,
                t: metadata.type,
                name: metadata.name,
                mime: metadata.mime,
                sz: totalSize,
                i: i,
                n: numChunks,
                crc: crc32(b64Data),
                sha: sha,
                d: b64Data
            };
            this.frames.push(JSON.stringify(payload));
        }

        // Add 20% XOR FEC parity frames
        const parityCount = Math.max(2, Math.floor(numChunks * 0.2));
        for (let p = 0; p < parityCount; p++) {
            const idx1 = p % numChunks;
            const idx2 = (p + 1) % numChunks;
            const len = Math.max(baseChunks[idx1].length, baseChunks[idx2].length);
            const xorChunk = new Uint8Array(len);
            for (let b = 0; b < len; b++) {
                const b1 = baseChunks[idx1][b] || 0;
                const b2 = baseChunks[idx2][b] || 0;
                xorChunk[b] = b1 ^ b2;
            }
            const b64Data = bufferToBase64(xorChunk);
            const payload = {
                h: 'EKQR',
                v: 1,
                id: transferId,
                t: metadata.type,
                name: metadata.name,
                mime: metadata.mime,
                sz: totalSize,
                i: numChunks + p,
                n: numChunks,
                fec: [idx1, idx2],
                crc: crc32(b64Data),
                sha: sha,
                d: b64Data
            };
            this.frames.push(JSON.stringify(payload));
        }

        this.totalSize = totalSize;
        this.metadata = metadata;
    }

    start() {
        if (!this.frames.length) return;
        this.running = true;
        this.paused = false;
        this.currentIndex = 0;
        this._tick();
    }

    pause() {
        this.paused = true;
        if (this.timer) clearTimeout(this.timer);
    }

    resume() {
        if (!this.running) return;
        this.paused = false;
        this._tick();
    }

    stop() {
        this.running = false;
        this.paused = false;
        if (this.timer) clearTimeout(this.timer);
        if (this.containerEl) this.containerEl.innerHTML = '';
    }

    _tick() {
        if (!this.running || this.paused) return;

        const frameStr = this.frames[this.currentIndex];
        ErikrafTDropQR.render(this.containerEl, frameStr);

        this.onProgress({
            currentIndex: this.currentIndex,
            totalFrames: this.frames.length,
            fps: this.fps,
            totalSize: this.totalSize
        });

        this.currentIndex = (this.currentIndex + 1) % this.frames.length;
        this.timer = setTimeout(() => this._tick(), 1000 / this.fps);
    }
}

class ErikrafTQRScanner {
    constructor(videoEl, options = {}) {
        this.videoEl = videoEl;
        this.onStateChange = options.onStateChange || (() => {});
        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.scanning = false;
        this.stream = null;
        this.receivedChunks = new Map();
        this.fecFrames = [];
        this.meta = null;
        this.state = 'Searching for QR...';
    }

    async start() {
        this.state = 'Searching for QR...';
        this.onStateChange(this.state);
        this.scanning = true;
        this.receivedChunks.clear();
        this.fecFrames = [];
        this.meta = null;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            this.videoEl.srcObject = this.stream;
            await this.videoEl.play();
            this._scanLoop();
        } catch (err) {
            console.error('Camera access failed:', err);
            this.state = 'Camera error';
            this.onStateChange(this.state);
            this.stop();
        }
    }

    stop() {
        this.scanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoEl) {
            this.videoEl.srcObject = null;
        }
    }

    async _scanLoop() {
        if (!this.scanning) return;

        if ('BarcodeDetector' in window) {
            try {
                if (!this.detector) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                }
                const barcodes = await this.detector.detect(this.videoEl);
                for (const barcode of barcodes) {
                    this._processRawData(barcode.rawValue);
                }
            } catch (e) {
                // ignore frame detection error
            }
        } else if (window.jsQR && this.videoEl.readyState === this.videoEl.HAVE_ENOUGH_DATA) {
            try {
                if (!this.canvas) {
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                }
                this.canvas.width = this.videoEl.videoWidth;
                this.canvas.height = this.videoEl.videoHeight;
                this.ctx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height);
                const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                const code = window.jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    this._processRawData(code.data);
                }
            } catch (e) {
                // ignore
            }
        }

        if (this.scanning) {
            requestAnimationFrame(() => this._scanLoop());
        }
    }

    _processRawData(raw) {
        if (!raw || !raw.startsWith('{"h":"EKQR"')) return;

        try {
            const payload = JSON.parse(raw);
            if (payload.h !== 'EKQR' || !payload.d) return;

            // Verify CRC32
            if (crc32(payload.d) !== payload.crc) {
                console.warn('Frame CRC mismatch, ignoring');
                return;
            }

            if (!this.meta) {
                this.meta = {
                    id: payload.id,
                    type: payload.t,
                    name: payload.name,
                    mime: payload.mime,
                    totalSize: payload.sz,
                    numChunks: payload.n,
                    sha: payload.sha
                };
                this.state = 'QR detected';
                this.onStateChange(this.state);
            }

            if (payload.id !== this.meta.id) return; // ignore different transfer

            if (payload.fec) {
                this.fecFrames.push(payload);
            } else {
                if (!this.receivedChunks.has(payload.i)) {
                    this.receivedChunks.set(payload.i, base64ToBuffer(payload.d));
                }
            }

            this.state = 'Receiving...';
            this.onStateChange(this.state);

            const receivedCount = this.receivedChunks.size;
            const progressPct = Math.min(100, Math.round((receivedCount / this.meta.numChunks) * 100));

            this.onProgress({
                pct: progressPct,
                received: receivedCount,
                total: this.meta.numChunks,
                size: this.meta.totalSize
            });

            if (receivedCount >= this.meta.numChunks) {
                this._finishReconstruction();
            }
        } catch (e) {
            // invalid JSON or chunk
        }
    }

    async _finishReconstruction() {
        this.scanning = false;
        this.state = 'Reconstructing...';
        this.onStateChange(this.state);

        // Combine chunks
        const sortedChunks = [];
        for (let i = 0; i < this.meta.numChunks; i++) {
            sortedChunks.push(new Uint8Array(this.receivedChunks.get(i)));
        }

        const totalBytes = new Uint8Array(this.meta.totalSize);
        let offset = 0;
        for (const chunk of sortedChunks) {
            totalBytes.set(chunk, offset);
            offset += chunk.length;
        }

        this.state = 'Verifying integrity...';
        this.onStateChange(this.state);

        const calculatedSha = await sha256Buffer(totalBytes.buffer);
        if (calculatedSha.toLowerCase() !== this.meta.sha.toLowerCase()) {
            this.state = 'Integrity check failed';
            this.onStateChange(this.state);
            this.stop();
            return;
        }

        this.state = 'Transfer completed';
        this.onStateChange(this.state);
        this.stop();

        if (this.meta.type === 'text') {
            const text = new TextDecoder().decode(totalBytes);
            this.onComplete({ type: 'text', text: text });
        } else {
            const blob = new Blob([totalBytes], { type: this.meta.mime });
            const file = new File([blob], this.meta.name, { type: this.meta.mime });
            this.onComplete({ type: 'file', file: file, name: this.meta.name, mime: this.meta.mime });
        }
    }
}

window.ErikrafTQRTransmitter = ErikrafTQRTransmitter;
window.ErikrafTQRScanner = ErikrafTQRScanner;
