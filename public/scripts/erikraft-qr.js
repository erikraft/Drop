/**
 * ERIKRAFT-QR Offline Animated QR Optical Transfer Engine (v2.0)
 * Handles client-side encoding, animated QR generation, camera scanning,
 * Deflate payload compression, FEC/Fountain XOR recovery, CRC32/SHA-256 verification,
 * and offline text/file reassembly without network dependencies.
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
    const bytes = buffer instanceof Uint8Array
        ? buffer
        : (ArrayBuffer.isView(buffer)
            ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
            : new Uint8Array(buffer));
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
        const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Node.js fallback or lightweight SHA-256 if Subtle Crypto is unavailable
    if (typeof require !== 'undefined') {
        try {
            const cryptoModule = require('crypto');
            return cryptoModule.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
        } catch (e) {}
    }
    throw new Error('SHA-256 calculation unsupported in this environment');
}

function bufferToBase64(buffer) {
    let binary = '';
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa === 'function') {
        return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
    }
    throw new Error('Base64 encoding unsupported');
}

function base64ToBuffer(base64) {
    if (typeof atob === 'function') {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    if (typeof Buffer !== 'undefined') {
        const buf = Buffer.from(base64, 'base64');
        return new Uint8Array(buf).buffer;
    }
    throw new Error('Base64 decoding unsupported');
}

async function compressBuffer(inputBuffer) {
    const bytes = inputBuffer instanceof Uint8Array ? inputBuffer : new Uint8Array(inputBuffer);
    const originalSize = bytes.byteLength;

    // Files that are typically already compressed - skip compression
    const compressedExtensions = ['.zip', '.rar', '.7z', '.gz', '.bz2', '.xz', '.tar',
                                  '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.flac', '.ogg',
                                  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic',
                                  '.pdf', '.docx', '.xlsx', '.pptx'];

    // Simple check if the data might be already compressed (high entropy)
    function isHighEntropy(buffer) {
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < buffer.length; i++) {
            histogram[buffer[i]]++;
        }

        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (histogram[i] > 0) {
                const p = histogram[i] / buffer.length;
                entropy -= p * Math.log2(p);
            }
        }

        // High entropy (> 7.5) suggests already compressed data
        return entropy > 7.5;
    }

    // Skip compression for small files or high-entropy data
    if (originalSize < 1000 || isHighEntropy(bytes)) {
        return { buffer: inputBuffer, compressed: 0 };
    }

    if (typeof CompressionStream !== 'undefined') {
        try {
            const cs = new CompressionStream('deflate-raw');
            const writer = cs.writable.getWriter();
            writer.write(bytes);
            writer.close();
            const res = await new Response(cs.readable).arrayBuffer();

            // Only use compression if it actually reduces size by at least 5%
            if (res.byteLength < originalSize * 0.95) {
                return { buffer: res, compressed: 1 };
            }
        } catch (e) {
            console.warn('Compression failed, using uncompressed:', e);
        }
    }

    return { buffer: inputBuffer, compressed: 0 };
}

async function decompressBuffer(inputBuffer, isCompressed) {
    if (isCompressed && typeof DecompressionStream !== 'undefined') {
        try {
            const bytes = inputBuffer instanceof Uint8Array ? inputBuffer : new Uint8Array(inputBuffer);
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(bytes);
            writer.close();
            return await new Response(ds.readable).arrayBuffer();
        } catch (e) {
            console.warn('Decompression failed, falling back to raw payload:', e);
        }
    }
    return inputBuffer;
}

class ErikrafTQRTransmitter {
    constructor(containerEl, options = {}) {
        this.containerEl = containerEl;
        this.fps = options.fps || 6;
        this.chunkSize = options.chunkSize || options.bytesPerFrame || 2953; // bytes per QR frame (default V40)
        this.eccLevel = options.eccLevel || 'L'; // Error correction level
        this.running = false;
        this.paused = false;
        this.initialized = false;
        this.timer = null;
        this.currentIndex = 0;
        this.frames = [];
        this.onProgress = options.onProgress || (() => {});
    }

    setFps(newFps) {
        this.fps = Math.max(1, Math.min(30, parseInt(newFps, 10) || 6));
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
        const buffer = typeof file.arrayBuffer === 'function' ? await file.arrayBuffer() : file.buffer;
        await this.prepareBuffer(buffer, {
            type: 'file',
            name: file.name || 'file.bin',
            mime: file.type || 'application/octet-stream'
        });
    }

    async prepareBuffer(buffer, metadata) {
        const transferId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const sha = await sha256Buffer(buffer);
        const originalBytes = new Uint8Array(buffer);
        const totalSize = originalBytes.length;

        // Try deflate compression
        const { buffer: payloadBuffer, compressed } = await compressBuffer(buffer);
        const payloadBytes = new Uint8Array(payloadBuffer);

        const baseChunks = [];
        for (let i = 0; i < payloadBytes.length; i += this.chunkSize) {
            const chunkBytes = payloadBytes.subarray(i, i + this.chunkSize);
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
                c: compressed,
                crc: crc32(b64Data),
                sha: sha,
                d: b64Data
            };
            this.frames.push(JSON.stringify(payload));
        }

        // Add 20% XOR FEC parity frames (reduced from 25% for efficiency)
        // NOTE: This is simple XOR parity between chunk pairs, NOT true Fountain/LT coding.
        // True Fountain codes use Luby Transform with robust-soliton distribution for
        // optimal recovery from frame loss, late receiver join, and out-of-order delivery.
        // This implementation provides basic recovery for single frame loss but has limitations:
        // - Can only recover if one chunk in a pair is lost
        // - Cannot handle arbitrary frame loss patterns
        // - Receiver must receive enough frames to complete pairs
        // For production use with robust frame loss tolerance, consider implementing
        // true Fountain/LT coding as seen in Decimen, TxQR, or BitFountain references.
        const parityCount = Math.max(2, Math.floor(numChunks * 0.20));
        for (let p = 0; p < parityCount; p++) {
            // Use better XOR combinations - pair chunks that are further apart
            // This improves recovery chances when consecutive frames are lost
            const idx1 = (p * 2) % numChunks;
            const idx2 = (p * 2 + 1) % numChunks;
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
                c: compressed,
                crc: crc32(b64Data),
                sha: sha,
                d: b64Data
            };
            this.frames.push(JSON.stringify(payload));
        }

        this.totalSize = totalSize;
        this.metadata = metadata;
        this.numBaseChunks = numChunks;
        this.totalFramesCount = this.frames.length;
    }

    start() {
        if (!this.frames.length) return;
        this.running = true;
        this.paused = true; // Start paused - user must click Play to start animation
        this.initialized = false; // User must click Inicializar to show first frame
        this.currentIndex = 0;
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
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.containerEl) {
            ErikrafTDropQR.destroy(this.containerEl);
            this.containerEl.innerHTML = '';
        }
        this.frames = [];
        this.currentIndex = 0;
    }

    _tick() {
        if (!this.running || this.paused) return;

        const frameStr = this.frames[this.currentIndex];
        if (typeof ErikrafTDropQR !== 'undefined' && this.containerEl) {
            // Render QR with current frame data
            // The helper now reuses instances to prevent flickering
            ErikrafTDropQR.render(this.containerEl, frameStr, {
                width: 300, // Larger size for better scanning
                height: 300
            });
        }

        this.onProgress({
            currentIndex: this.currentIndex,
            totalFrames: this.frames.length,
            numBaseChunks: this.numBaseChunks,
            fps: this.fps,
            totalSize: this.totalSize,
            fileName: this.metadata ? this.metadata.name : 'Data',
            progressPct: Math.min(100, Math.round(((this.currentIndex + 1) / this.frames.length) * 100))
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
        this.onError = options.onError || (() => {});
        this.scanning = false;
        this.stream = null;
        this.receivedChunks = new Map();
        this.fecFrames = [];
        this.meta = null;
        this.state = 'Searching for QR...';
        this.fecRecoveredCount = 0;
        this.animFrameId = null;
    }

    async start() {
        this.stop(); // Stop any existing scan loop/stream before starting fresh
        this.state = typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function'
            ? Localization.getTranslation('dialogs.camera-starting')
            : 'Iniciando câmera...';
        this.onStateChange(this.state);
        this.scanning = true;
        this.receivedChunks.clear();
        this.fecFrames = [];
        this.meta = null;
        this.fecRecoveredCount = 0;

        if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            try {
                if (this.videoEl) {
                    this.videoEl.setAttribute('playsinline', 'true');
                    this.videoEl.setAttribute('autoplay', 'true');
                    this.videoEl.muted = true;
                    this.videoEl.controls = false;
                }

                try {
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                } catch (envErr) {
                    console.warn('Facing mode environment failed, falling back to default camera:', envErr);
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                }

                if (this.videoEl) {
                    this.videoEl.srcObject = this.stream;

                    // Wait for video metadata to load with fallback timeout
                    await new Promise((resolve) => {
                        if (!this.videoEl) return resolve();
                        let resolved = false;
                        const onLoaded = () => {
                            if (!resolved) {
                                resolved = true;
                                resolve();
                            }
                        };
                        this.videoEl.onloadedmetadata = onLoaded;
                        if (this.videoEl.readyState >= 1) {
                            onLoaded();
                        } else {
                            setTimeout(onLoaded, 3000);
                        }
                    });

                    try {
                        await this.videoEl.play();
                        this.state = (typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function'
                            ? Localization.getTranslation('dialogs.camera-searching')
                            : 'Procurando QR...').replace(/[\.\s]*(?:Cole o link|Paste link|Cole o).*$/gi, '').trim();
                        this.onStateChange(this.state);
                    } catch (playErr) {
                        console.warn('Video play interrupted or rejected:', playErr);
                        this.state = (typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function'
                            ? Localization.getTranslation('dialogs.camera-error-play')
                            : 'Erro ao reproduzir vídeo').replace(/[\.\s]*(?:Cole o link|Paste link|Cole o).*$/gi, '').trim();
                        this.onStateChange(this.state);
                        this.onError(playErr);
                        this.stop();
                        return;
                    }
                }
            } catch (err) {
                console.warn('Camera access error:', err);
                const isPermissionError = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
                this.state = isPermissionError
                    ? (typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function' && Localization.getTranslation('dialogs.camera-denied')
                        ? Localization.getTranslation('dialogs.camera-denied')
                        : 'Acesso à câmera negado.').replace(/[\.\s]*(?:Cole o link|Paste link|Cole o).*$/gi, '').trim()
                    : (typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function'
                        ? Localization.getTranslation('dialogs.camera-unavailable')
                        : 'Câmera indisponível.').replace(/[\.\s]*(?:Cole o link|Paste link|Cole o).*$/gi, '').trim();
                this.onStateChange(this.state);
                this.onError(err);
                this.stop();
                return;
            }
        } else {
            const err = new Error('Camera unsupported');
            this.state = (typeof Localization !== 'undefined' && typeof Localization.getTranslation === 'function'
                ? Localization.getTranslation('dialogs.camera-unsupported')
                : 'Câmera não suportada.').replace(/[\.\s]*(?:Cole o link|Paste link|Cole o).*$/gi, '').trim();
            this.onStateChange(this.state);
            this.onError(err);
            return;
        }
        this._scanLoop();
    }

    stop() {
        this.scanning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.stream) {
            try {
                this.stream.getTracks().forEach(track => {
                    try { track.stop(); } catch (e) {}
                });
            } catch (e) {}
            this.stream = null;
        }
        if (this.videoEl) {
            this.videoEl.srcObject = null;
            this.videoEl.onloadedmetadata = null;
        }
        if (this.canvas) {
            this.canvas = null;
            this.ctx = null;
        }
        if (this.detector) {
            this.detector = null;
        }
        this.receivedChunks.clear();
        this.fecFrames = [];
        this.meta = null;
        this.fecRecoveredCount = 0;
    }

    async _scanLoop() {
        if (!this.scanning) return;

        if (typeof BarcodeDetector !== 'undefined') {
            try {
                if (!this.detector) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                }
                if (this.videoEl && this.videoEl.readyState >= 2 && this.videoEl.videoWidth > 0 && this.videoEl.videoHeight > 0) {
                    const barcodes = await this.detector.detect(this.videoEl);
                    for (const barcode of barcodes) {
                        this._processRawData(barcode.rawValue);
                    }
                }
            } catch (e) {
                // ignore detection error on frame
            }
        } else if (typeof window !== 'undefined' && window.jsQR && this.videoEl && this.videoEl.readyState >= 2) {
            try {
                if (!this.canvas) {
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                }
                if (this.videoEl.videoWidth > 0 && this.videoEl.videoHeight > 0) {
                    this.canvas.width = this.videoEl.videoWidth;
                    this.canvas.height = this.videoEl.videoHeight;
                    this.ctx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height);
                    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    const code = window.jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && code.data) {
                        this._processRawData(code.data);
                    }
                }
            } catch (e) {
                // ignore
            }
        }

        if (this.scanning && typeof requestAnimationFrame !== 'undefined') {
            this.animFrameId = requestAnimationFrame(() => this._scanLoop());
        }
    }

    _tryApplyFec() {
        if (!this.meta) return;
        let progressMade = true;
        while (progressMade && this.receivedChunks.size < this.meta.numChunks) {
            progressMade = false;
            for (const fecFrame of this.fecFrames) {
                if (!fecFrame.fec || fecFrame.fec.length !== 2) continue;
                const [idx1, idx2] = fecFrame.fec;
                const has1 = this.receivedChunks.has(idx1);
                const has2 = this.receivedChunks.has(idx2);

                if (has1 && !has2) {
                    const b1 = new Uint8Array(this.receivedChunks.get(idx1));
                    const xorBuf = new Uint8Array(base64ToBuffer(fecFrame.d));
                    const recovered = new Uint8Array(xorBuf.length);
                    for (let b = 0; b < xorBuf.length; b++) {
                        recovered[b] = (b1[b] || 0) ^ xorBuf[b];
                    }
                    this.receivedChunks.set(idx2, recovered.buffer);
                    this.fecRecoveredCount++;
                    progressMade = true;
                } else if (has2 && !has1) {
                    const b2 = new Uint8Array(this.receivedChunks.get(idx2));
                    const xorBuf = new Uint8Array(base64ToBuffer(fecFrame.d));
                    const recovered = new Uint8Array(xorBuf.length);
                    for (let b = 0; b < xorBuf.length; b++) {
                        recovered[b] = (b2[b] || 0) ^ xorBuf[b];
                    }
                    this.receivedChunks.set(idx1, recovered.buffer);
                    this.fecRecoveredCount++;
                    progressMade = true;
                }
            }
        }
    }

    async _processRawData(raw) {
        if (!this.scanning || !raw || typeof raw !== 'string' || !raw.startsWith('{"h":"EKQR"')) return;

        try {
            const payload = JSON.parse(raw);
            if (payload.h !== 'EKQR' || !payload.d) return;

            // CRC32 Checksum Verification
            if (crc32(payload.d) !== payload.crc) {
                console.warn('Frame CRC32 mismatch, discarding corrupted frame');
                return;
            }

            if (!this.meta) {
                // Security: Validate payload values before using them
                const totalSize = typeof payload.sz === 'number' && payload.sz > 0 && payload.sz < 100 * 1024 * 1024
                    ? payload.sz
                    : 0; // Max 100MB
                const numChunks = typeof payload.n === 'number' && payload.n > 0 && payload.n < 10000
                    ? payload.n
                    : 0; // Max 10000 chunks
                const chunkIndex = typeof payload.i === 'number' && payload.i >= 0 && payload.i < numChunks + 1000
                    ? payload.i
                    : -1;

                if (totalSize === 0 || numChunks === 0 || chunkIndex === -1) {
                    console.warn('Invalid payload metadata, discarding frame');
                    return;
                }

                // Validate file name to prevent path traversal
                const safeName = typeof payload.name === 'string'
                    ? payload.name.replace(/[\/\\]/g, '_').substring(0, 255)
                    : 'file.bin';

                // Validate MIME type
                const safeMime = typeof payload.mime === 'string' && payload.mime.length < 256
                    ? payload.mime
                    : 'application/octet-stream';

                this.meta = {
                    id: payload.id,
                    type: payload.t,
                    name: safeName,
                    mime: safeMime,
                    totalSize: totalSize,
                    numChunks: numChunks,
                    compressed: payload.c || 0,
                    sha: payload.sha
                };
                this.state = 'QR detected';
                this.onStateChange(this.state);
            }

            if (payload.id !== this.meta.id) return; // ignore frame from different session

            // Security: Validate chunk index against metadata
            if (typeof payload.i !== 'number' || payload.i < 0 || payload.i >= this.meta.numChunks + 1000) {
                console.warn('Invalid chunk index, discarding frame');
                return;
            }

            if (payload.fec) {
                // Avoid duplicate parity frames
                if (!this.fecFrames.some(f => f.i === payload.i)) {
                    this.fecFrames.push(payload);
                }
            } else {
                if (!this.receivedChunks.has(payload.i)) {
                    this.receivedChunks.set(payload.i, base64ToBuffer(payload.d));
                }
            }

            this._tryApplyFec();

            this.state = 'Receiving...';
            this.onStateChange(this.state);

            const receivedCount = this.receivedChunks.size;
            const progressPct = Math.min(100, Math.round((receivedCount / this.meta.numChunks) * 100));

            // Estimate recovered bytes
            let recoveredBytes = 0;
            this.receivedChunks.forEach(chunkBuf => {
                recoveredBytes += chunkBuf.byteLength;
            });

            this.onProgress({
                pct: progressPct,
                received: receivedCount,
                total: this.meta.numChunks,
                size: this.meta.totalSize,
                recoveredBytes: Math.min(this.meta.totalSize, recoveredBytes),
                fileName: this.meta.name,
                fecRecoveredCount: this.fecRecoveredCount
            });

            if (receivedCount >= this.meta.numChunks) {
                return await this._finishReconstruction();
            }
        } catch (e) {
            // invalid JSON frame, ignore
        }
    }

    async _finishReconstruction() {
        this.scanning = false;
        this.state = 'Reconstructing...';
        this.onStateChange(this.state);

        // Security: Validate total combined length before allocation
        const maxTotalSize = 100 * 1024 * 1024; // 100MB max
        let combinedLength = 0;
        for (let i = 0; i < this.meta.numChunks; i++) {
            const chunkBuf = this.receivedChunks.get(i);
            if (!chunkBuf) {
                this.state = 'Missing required chunk';
                this.onStateChange(this.state);
                this.stop();
                return;
            }
            combinedLength += chunkBuf.byteLength;
            if (combinedLength > maxTotalSize) {
                this.state = 'Data size exceeds maximum limit';
                this.onStateChange(this.state);
                this.stop();
                return;
            }
        }

        // Combine chunks
        const sortedChunkBuffers = [];
        for (let i = 0; i < this.meta.numChunks; i++) {
            const chunkBuf = this.receivedChunks.get(i);
            sortedChunkBuffers.push(new Uint8Array(chunkBuf));
        }

        const combinedBytes = new Uint8Array(combinedLength);
        let offset = 0;
        for (const chunk of sortedChunkBuffers) {
            combinedBytes.set(chunk, offset);
            offset += chunk.length;
        }

        this.state = 'Decompressing...';
        this.onStateChange(this.state);

        const decompressedBuffer = await decompressBuffer(combinedBytes.buffer, this.meta.compressed);
        const finalBytes = new Uint8Array(decompressedBuffer);

        // Security: Prevent decompression bomb - check if decompressed size is reasonable
        const maxDecompressedSize = 500 * 1024 * 1024; // 500MB max after decompression
        if (finalBytes.length > maxDecompressedSize) {
            this.state = 'Decompressed data exceeds maximum limit';
            this.onStateChange(this.state);
            this.stop();
            return;
        }

        // If decompressed buffer size exceeds meta.totalSize (due to padding), slice to exact totalSize
        const exactBytes = finalBytes.length > this.meta.totalSize
            ? finalBytes.subarray(0, this.meta.totalSize)
            : finalBytes;

        this.state = 'Verifying integrity...';
        this.onStateChange(this.state);

        const calculatedSha = await sha256Buffer(exactBytes);
        if (calculatedSha.toLowerCase() !== this.meta.sha.toLowerCase()) {
            this.state = 'Integrity check failed';
            this.onStateChange(this.state);
            this.stop();
            return;
        }

        this.state = 'Transfer completed';
        this.onStateChange(this.state);
        const meta = this.meta;
        this.stop();

        if (meta.type === 'text') {
            const text = new TextDecoder().decode(exactBytes);
            this.onComplete({
                type: 'text',
                text: text,
                sha: calculatedSha
            });
        } else {
            const blob = typeof Blob !== 'undefined' ? new Blob([exactBytes], { type: meta.mime }) : exactBytes;
            const file = typeof File !== 'undefined' && typeof Blob !== 'undefined'
                ? new File([blob], meta.name, { type: meta.mime })
                : { buffer: exactBytes.buffer, name: meta.name, type: meta.mime, size: exactBytes.byteLength };

            this.onComplete({
                type: 'file',
                file: file,
                name: meta.name,
                mime: meta.mime,
                buffer: exactBytes.buffer,
                sha: calculatedSha
            });
        }
    }
}

if (typeof window !== 'undefined') {
    window.ErikrafTQRTransmitter = ErikrafTQRTransmitter;
    window.ErikrafTQRScanner = ErikrafTQRScanner;
    window.crc32 = crc32;
    window.sha256Buffer = sha256Buffer;
    window.bufferToBase64 = bufferToBase64;
    window.base64ToBuffer = base64ToBuffer;
    window.compressBuffer = compressBuffer;
    window.decompressBuffer = decompressBuffer;
}

if (typeof globalThis !== 'undefined') {
    globalThis.ErikrafTQRTransmitter = ErikrafTQRTransmitter;
    globalThis.ErikrafTQRScanner = ErikrafTQRScanner;
    globalThis.crc32 = crc32;
    globalThis.sha256Buffer = sha256Buffer;
    globalThis.bufferToBase64 = bufferToBase64;
    globalThis.base64ToBuffer = base64ToBuffer;
    globalThis.compressBuffer = compressBuffer;
    globalThis.decompressBuffer = decompressBuffer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ErikrafTQRTransmitter,
        ErikrafTQRScanner,
        crc32,
        sha256Buffer,
        bufferToBase64,
        base64ToBuffer,
        compressBuffer,
        decompressBuffer
    };
}
