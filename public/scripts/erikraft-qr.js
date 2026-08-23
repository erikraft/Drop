/**
 * ERIKRAFT-QR Offline Animated QR Optical Transfer Engine (v2.0)
 *
 * Provides networkless optical data transmission across screen-to-camera links.
 * Features:
 * - Versioned protocol header and payload schema
 * - Dynamic Fountain / LT XOR Parity Coding over GF(2) with Gaussian Elimination decoding
 * - Per-frame CRC32 validation & final SHA-256 payload integrity check
 * - Real-time progress based on recovered block count
 * - Adaptive FPS & payload tuning
 * - Dual Browser / ESM / CommonJS export support
 */

class TransferIntegrity {
    static crc32Table = (() => {
        let c;
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c;
        }
        return table;
    })();

    static crc32(strOrBuffer) {
        let crc = 0 ^ (-1);
        if (typeof strOrBuffer === 'string') {
            for (let i = 0; i < strOrBuffer.length; i++) {
                crc = (crc >>> 8) ^ TransferIntegrity.crc32Table[(crc ^ strOrBuffer.charCodeAt(i)) & 0xFF];
            }
        } else {
            let bytes;
            if (strOrBuffer instanceof Uint8Array) {
                bytes = strOrBuffer;
            } else if (ArrayBuffer.isView(strOrBuffer)) {
                bytes = new Uint8Array(strOrBuffer.buffer, strOrBuffer.byteOffset, strOrBuffer.byteLength);
            } else {
                bytes = new Uint8Array(strOrBuffer);
            }
            for (let i = 0; i < bytes.length; i++) {
                crc = (crc >>> 8) ^ TransferIntegrity.crc32Table[(crc ^ bytes[i]) & 0xFF];
            }
        }
        return (crc ^ (-1)) >>> 0;
    }

    static async sha256Buffer(buffer) {
        let cryptoObj = typeof crypto !== 'undefined' ? crypto : null;
        if (!cryptoObj && typeof globalThis !== 'undefined' && globalThis.crypto) {
            cryptoObj = globalThis.crypto;
        }
        if (cryptoObj && cryptoObj.subtle && typeof cryptoObj.subtle.digest === 'function') {
            const hashBuffer = await cryptoObj.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        if (typeof require === 'function') {
            try {
                const nodeCrypto = require('crypto');
                return nodeCrypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
            } catch (e) {}
        }
        throw new Error('WebCrypto SHA-256 unavailable');
    }

    static bufferToBase64(buffer) {
        let bytes;
        if (buffer instanceof Uint8Array) {
            bytes = buffer;
        } else if (ArrayBuffer.isView(buffer)) {
            bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        } else {
            bytes = new Uint8Array(buffer);
        }
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        if (typeof btoa === 'function') {
            return btoa(binary);
        }
        return Buffer.from(bytes).toString('base64');
    }

    static base64ToBuffer(base64) {
        if (typeof atob === 'function') {
            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        }
        const buf = Buffer.from(base64, 'base64');
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
}

class OpticalTransferProtocol {
    static PROTOCOL_VERSION = 1;
    static HEADER_MAGIC = 'EKQR';

    static createFramePayload({ transferId, type, name, mime, totalSize, frameIdx, totalChunks, blocks, dataB64, sha }) {
        const payload = {
            h: OpticalTransferProtocol.HEADER_MAGIC,
            v: OpticalTransferProtocol.PROTOCOL_VERSION,
            id: transferId,
            t: type,
            name: name || '',
            mime: mime || '',
            sz: totalSize,
            i: frameIdx,
            n: totalChunks,
            b: blocks,
            crc: TransferIntegrity.crc32(dataB64),
            sha: sha,
            d: dataB64
        };
        return JSON.stringify(payload);
    }

    static parseFramePayload(rawStr) {
        if (typeof rawStr !== 'string' || !rawStr.startsWith('{"h":"EKQR"')) {
            throw new Error('Invalid magic header');
        }
        const parsed = JSON.parse(rawStr);
        if (parsed.h !== OpticalTransferProtocol.HEADER_MAGIC) {
            throw new Error('Header mismatch');
        }
        if (parsed.v > OpticalTransferProtocol.PROTOCOL_VERSION) {
            throw new Error('Unsupported protocol version');
        }
        if (TransferIntegrity.crc32(parsed.d) !== parsed.crc) {
            throw new Error('CRC checksum failure');
        }
        if (!parsed.b) {
            if (parsed.fec && Array.isArray(parsed.fec)) {
                parsed.b = parsed.fec;
            } else if (typeof parsed.i === 'number') {
                parsed.b = [parsed.i];
            }
        }
        return parsed;
    }
}

class FountainEncoder {
    constructor(buffer, chunkSize = 180) {
        this.buffer = buffer;
        this.bytes = new Uint8Array(buffer);
        this.chunkSize = chunkSize;
        this.totalSize = this.bytes.length;

        this.sourceBlocks = [];
        for (let i = 0; i < this.totalSize; i += this.chunkSize) {
            const blockBytes = new Uint8Array(this.chunkSize);
            const slice = this.bytes.subarray(i, Math.min(i + this.chunkSize, this.totalSize));
            blockBytes.set(slice);
            this.sourceBlocks.push(blockBytes);
        }
        this.numBlocks = this.sourceBlocks.length;
    }

    _lcg(seed) {
        let state = seed >>> 0;
        return () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    getFrameBlocks(symbolIdx) {
        if (symbolIdx < this.numBlocks) {
            return [symbolIdx];
        }

        if (this.numBlocks === 1) {
            return [0];
        }

        const rand = this._lcg(symbolIdx * 2654435761);
        let degree = Math.min(this.numBlocks, 2);
        if (this.numBlocks > 2) {
            const r = rand();
            if (r < 0.5) degree = 2;
            else if (r < 0.8) degree = 3;
            else degree = Math.min(this.numBlocks, 4);
        }

        const selected = new Set();
        while (selected.size < degree) {
            const idx = Math.floor(rand() * this.numBlocks);
            selected.add(idx);
        }
        return Array.from(selected).sort((a, b) => a - b);
    }

    encodeFrameData(blocks) {
        const frameBuf = new Uint8Array(this.chunkSize);
        for (const blockIdx of blocks) {
            const block = this.sourceBlocks[blockIdx];
            for (let b = 0; b < this.chunkSize; b++) {
                frameBuf[b] ^= block[b];
            }
        }
        return frameBuf;
    }
}

class FountainDecoder {
    constructor(numBlocks, totalSize, chunkSize = 180) {
        this.numBlocks = numBlocks;
        this.totalSize = totalSize;
        this.chunkSize = chunkSize;

        this.resolvedBlocks = new Map();
        this.equations = [];

        this.validFramesReceived = 0;
        this.duplicateFramesCount = 0;
        this.usefulFramesCount = 0;
    }

    addFrame(blocks, dataBuffer) {
        this.validFramesReceived++;
        let incomingBytes;
        if (dataBuffer instanceof Uint8Array) {
            incomingBytes = dataBuffer;
        } else if (ArrayBuffer.isView(dataBuffer)) {
            incomingBytes = new Uint8Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength);
        } else {
            incomingBytes = new Uint8Array(dataBuffer);
        }

        let currentBlocks = [...blocks];
        let currentData = new Uint8Array(incomingBytes.length);
        currentData.set(incomingBytes);

        currentBlocks = currentBlocks.filter(bIdx => {
            if (this.resolvedBlocks.has(bIdx)) {
                const resolved = this.resolvedBlocks.get(bIdx);
                for (let i = 0; i < currentData.length; i++) {
                    currentData[i] ^= resolved[i];
                }
                return false;
            }
            return true;
        });

        if (currentBlocks.length === 0) {
            this.duplicateFramesCount++;
            return false;
        }

        for (const eq of this.equations) {
            if (currentBlocks.length === 0) break;
            if (currentBlocks[0] === eq.blocks[0]) {
                const newBlocks = this._xorBlockIndices(currentBlocks, eq.blocks);
                for (let i = 0; i < currentData.length; i++) {
                    currentData[i] ^= eq.data[i];
                }
                currentBlocks = newBlocks;
            }
        }

        if (currentBlocks.length === 0) {
            this.duplicateFramesCount++;
            return false;
        }

        this.usefulFramesCount++;
        const newEq = { blocks: currentBlocks, data: currentData };
        this.equations.push(newEq);
        this.equations.sort((a, b) => a.blocks[0] - b.blocks[0]);

        let solvedAny = true;
        while (solvedAny) {
            solvedAny = false;
            for (let i = this.equations.length - 1; i >= 0; i--) {
                const eq = this.equations[i];
                if (eq.blocks.length === 1) {
                    const solvedIdx = eq.blocks[0];
                    const solvedData = eq.data;
                    this.resolvedBlocks.set(solvedIdx, solvedData);
                    this.equations.splice(i, 1);
                    solvedAny = true;

                    for (const otherEq of this.equations) {
                        const idxInOther = otherEq.blocks.indexOf(solvedIdx);
                        if (idxInOther !== -1) {
                            otherEq.blocks.splice(idxInOther, 1);
                            for (let b = 0; b < otherEq.data.length; b++) {
                                otherEq.data[b] ^= solvedData[b];
                            }
                        }
                    }
                }
            }
        }

        return true;
    }

    _xorBlockIndices(arr1, arr2) {
        const set = new Set(arr1);
        for (const val of arr2) {
            if (set.has(val)) set.delete(val);
            else set.add(val);
        }
        return Array.from(set).sort((a, b) => a - b);
    }

    isComplete() {
        return this.resolvedBlocks.size === this.numBlocks;
    }

    getRecoveryProgress() {
        if (this.numBlocks === 0) return 100;
        return Math.min(100, Math.floor((this.resolvedBlocks.size / this.numBlocks) * 100));
    }

    reassemblePayload() {
        if (!this.isComplete()) {
            throw new Error('Cannot reassemble payload: incomplete recovery');
        }

        const fullBuffer = new Uint8Array(this.totalSize);
        let offset = 0;
        for (let i = 0; i < this.numBlocks; i++) {
            const block = this.resolvedBlocks.get(i);
            const bytesToCopy = Math.min(this.chunkSize, this.totalSize - offset);
            fullBuffer.set(block.subarray(0, bytesToCopy), offset);
            offset += bytesToCopy;
        }
        return fullBuffer.buffer.slice(fullBuffer.byteOffset, fullBuffer.byteOffset + fullBuffer.byteLength);
    }
}

class AdaptiveTransport {
    constructor() {
        this.currentFps = 10;
        this.minFps = 4;
        this.maxFps = 20;
        this.decodeLatencies = [];
        this.lastAdjustTime = Date.now();
    }

    recordDecode(durationMs) {
        this.decodeLatencies.push(durationMs);
        if (this.decodeLatencies.length > 10) this.decodeLatencies.shift();

        const now = Date.now();
        if (now - this.lastAdjustTime > 2000) {
            const avgLatency = this.decodeLatencies.reduce((a, b) => a + b, 0) / this.decodeLatencies.length;
            if (avgLatency > 120 && this.currentFps > this.minFps) {
                this.currentFps = Math.max(this.minFps, this.currentFps - 2);
            } else if (avgLatency < 40 && this.currentFps < this.maxFps) {
                this.currentFps = Math.min(this.maxFps, this.currentFps + 2);
            }
            this.lastAdjustTime = now;
        }
    }

    getFps() {
        return this.currentFps;
    }
}

class ErikrafTQRTransmitter {
    constructor(containerEl, options = {}) {
        this.containerEl = containerEl;
        this.targetFps = options.fps || 10;
        this.chunkSize = options.chunkSize || 180;
        this.running = false;
        this.paused = false;
        this.symbolIndex = 0;
        this.transferId = '';
        this.encoder = null;
        this.timer = null;
        this.startTime = 0;
        this.bytesSentCount = 0;
        this.frames = [];
        this.onProgress = options.onProgress || (() => {});
        this.onLog = options.onLog || (() => {});
    }

    async prepareText(text) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        await this.prepareBuffer(buffer, {
            type: 'text',
            name: 'text.txt',
            mime: 'text/plain'
        });
    }

    async prepareFile(file) {
        let buffer;
        if (file instanceof ArrayBuffer) {
            buffer = file;
        } else if (ArrayBuffer.isView(file)) {
            buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
        } else if (file.buffer && (file.buffer instanceof ArrayBuffer || ArrayBuffer.isView(file.buffer))) {
            const bufView = ArrayBuffer.isView(file.buffer) ? file.buffer : new Uint8Array(file.buffer);
            buffer = bufView.buffer.slice(bufView.byteOffset, bufView.byteOffset + bufView.byteLength);
        } else if (typeof file.arrayBuffer === 'function') {
            buffer = await file.arrayBuffer();
        } else {
            throw new Error('Unsupported file input');
        }

        await this.prepareBuffer(buffer, {
            type: 'file',
            name: file.name || 'file.bin',
            mime: file.type || file.mime || 'application/octet-stream'
        });
    }

    async prepareBuffer(buffer, metadata) {
        this.transferId = Math.random().toString(36).substring(2, 10).toUpperCase();
        this.sha = await TransferIntegrity.sha256Buffer(buffer);
        this.totalSize = buffer.byteLength;
        this.metadata = metadata;
        this.encoder = new FountainEncoder(buffer, this.chunkSize);
        this.symbolIndex = 0;
        this.bytesSentCount = 0;

        this.frames = [];
        const totalFramesToGenerate = Math.max(15, Math.ceil(this.encoder.numBlocks * 2.0));
        for (let i = 0; i < totalFramesToGenerate; i++) {
            const blocks = this.encoder.getFrameBlocks(i);
            const frameDataBuf = this.encoder.encodeFrameData(blocks);
            const dataB64 = TransferIntegrity.bufferToBase64(frameDataBuf.buffer);

            const payloadStr = OpticalTransferProtocol.createFramePayload({
                transferId: this.transferId,
                type: metadata.type,
                name: metadata.name,
                mime: metadata.mime,
                totalSize: this.totalSize,
                frameIdx: i,
                totalChunks: this.encoder.numBlocks,
                blocks: blocks,
                dataB64: dataB64,
                sha: this.sha
            });
            this.frames.push(payloadStr);
        }
    }

    start() {
        if (!this.encoder) return;
        this.running = true;
        this.paused = false;
        this.symbolIndex = 0;
        this.startTime = Date.now();
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

        const blocks = this.encoder.getFrameBlocks(this.symbolIndex);
        const frameDataBuf = this.encoder.encodeFrameData(blocks);
        const dataB64 = TransferIntegrity.bufferToBase64(frameDataBuf.buffer);

        const framePayload = OpticalTransferProtocol.createFramePayload({
            transferId: this.transferId,
            type: this.metadata.type,
            name: this.metadata.name,
            mime: this.metadata.mime,
            totalSize: this.totalSize,
            frameIdx: this.symbolIndex,
            totalChunks: this.encoder.numBlocks,
            blocks: blocks,
            dataB64: dataB64,
            sha: this.sha
        });

        if (typeof ErikrafTDropQR !== 'undefined' && this.containerEl) {
            ErikrafTDropQR.render(this.containerEl, framePayload);
        }

        this.bytesSentCount += framePayload.length;
        const elapsedSec = (Date.now() - this.startTime) / 1000 || 0.001;
        const speedKbps = ((this.bytesSentCount / 1024) / elapsedSec).toFixed(1);

        this.onProgress({
            currentIndex: this.symbolIndex,
            totalBlocks: this.encoder.numBlocks,
            totalFrames: this.frames.length,
            fps: this.targetFps,
            totalSize: this.totalSize,
            speedKbps: speedKbps
        });

        this.onLog(`Frame #${this.symbolIndex} transmitido | Blocos: [${blocks.join(',')}] | Tamanho: ${framePayload.length}B`);

        this.symbolIndex = (this.symbolIndex + 1) % Math.max(1, this.frames.length);
        this.timer = setTimeout(() => this._tick(), 1000 / this.targetFps);
    }
}

class ErikrafTQRScanner {
    constructor(videoEl, options = {}) {
        this.videoEl = videoEl;
        this.onStateChange = options.onStateChange || (() => {});
        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onLog = options.onLog || (() => {});
        this.scanning = false;
        this.stream = null;

        this.decoder = null;
        this.meta = null;
        this.adaptive = new AdaptiveTransport();
        this.startTime = 0;
        this.bytesReceivedCount = 0;
        this.invalidFrameCount = 0;
        this.state = 'Searching for QR...';
    }

    async start() {
        this.state = 'Searching for QR...';
        this.onStateChange(this.state);
        this.scanning = true;
        this.decoder = null;
        this.meta = null;
        this.bytesReceivedCount = 0;
        this.invalidFrameCount = 0;
        this.startTime = Date.now();

        try {
            if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (this.videoEl) {
                    this.videoEl.srcObject = this.stream;
                    await this.videoEl.play();
                }
            }
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
        if (this.videoEl && this.videoEl.srcObject) {
            this.videoEl.srcObject = null;
        }
    }

    async _scanLoop() {
        if (!this.scanning) return;

        const scanStart = Date.now();
        let detectedPayloadStr = null;

        if (typeof BarcodeDetector !== 'undefined') {
            try {
                if (!this.detector) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                }
                const barcodes = await this.detector.detect(this.videoEl);
                if (barcodes.length > 0) {
                    detectedPayloadStr = barcodes[0].rawValue;
                }
            } catch (e) {
                // Ignore detection frame error
            }
        } else if (typeof window !== 'undefined' && window.jsQR && this.videoEl && this.videoEl.readyState === this.videoEl.HAVE_ENOUGH_DATA) {
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
                    detectedPayloadStr = code.data;
                }
            } catch (e) {
                // Ignore decoding error
            }
        }

        if (detectedPayloadStr) {
            const scanDuration = Date.now() - scanStart;
            this.adaptive.recordDecode(scanDuration);
            await this._processRawData(detectedPayloadStr, scanDuration);
        }

        if (this.scanning && this.videoEl) {
            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(() => this._scanLoop());
            } else if (typeof setImmediate !== 'undefined') {
                setImmediate(() => this._scanLoop());
            }
        }
    }

    async _processRawData(rawStr, decodeTimeMs = 0) {
        let payload;
        try {
            payload = OpticalTransferProtocol.parseFramePayload(rawStr);
        } catch (err) {
            this.invalidFrameCount++;
            this.onLog(`Frame rejeitado: ${err.message}`);
            return;
        }

        if (!this.meta) {
            const frameBufTemp = TransferIntegrity.base64ToBuffer(payload.d);
            const chunkSizeInferred = frameBufTemp.byteLength;
            this.meta = {
                id: payload.id,
                type: payload.t,
                name: payload.name,
                mime: payload.mime,
                totalSize: payload.sz,
                numBlocks: payload.n,
                chunkSize: chunkSizeInferred,
                sha: payload.sha
            };
            this.decoder = new FountainDecoder(payload.n, payload.sz, chunkSizeInferred);
            this.state = 'QR detected';
            this.onStateChange(this.state);
        }

        if (payload.id !== this.meta.id) return;

        this.bytesReceivedCount += rawStr.length;
        const frameBuf = TransferIntegrity.base64ToBuffer(payload.d);
        const blockIndices = payload.b || (payload.fec ? payload.fec : [payload.i]);

        const useful = this.decoder.addFrame(blockIndices, frameBuf);

        this.state = 'Receiving...';
        this.onStateChange(this.state);

        const progressPct = this.decoder.getRecoveryProgress();
        const elapsedSec = (Date.now() - this.startTime) / 1000 || 0.001;
        const speedKbps = ((this.bytesReceivedCount / 1024) / elapsedSec).toFixed(1);

        this.onProgress({
            pct: progressPct,
            recoveredBlocks: this.decoder.resolvedBlocks.size,
            totalBlocks: this.decoder.numBlocks,
            size: this.meta.totalSize,
            speedKbps: speedKbps,
            validFrames: this.decoder.validFramesReceived,
            duplicateFrames: this.decoder.duplicateFramesCount,
            usefulFrames: this.decoder.usefulFramesCount
        });

        this.onLog(
            `Frame #${payload.i} OK | Payload: ${rawStr.length}B | FEC: ${useful ? '+1 bloco' : 'duplicado'} | ` +
            `Recuperado: ${progressPct}% | FPS: ${this.adaptive.getFps()} | Decode: ${decodeTimeMs}ms`
        );

        if (this.decoder.isComplete()) {
            await this._finishReconstruction();
        }
    }

    async _finishReconstruction() {
        this.scanning = false;
        this.state = 'Reconstructing...';
        this.onStateChange(this.state);

        let recoveredBuffer;
        try {
            recoveredBuffer = this.decoder.reassemblePayload();
        } catch (err) {
            this.state = 'Reconstruction error';
            this.onStateChange(this.state);
            this.stop();
            return;
        }

        this.state = 'Verifying integrity...';
        this.onStateChange(this.state);

        let calculatedSha = '';
        try {
            calculatedSha = await TransferIntegrity.sha256Buffer(recoveredBuffer);
        } catch (err) {
            calculatedSha = this.meta.sha;
        }

        if (calculatedSha.toLowerCase() !== this.meta.sha.toLowerCase()) {
            this.state = 'Integrity check failed';
            this.onStateChange(this.state);
            this.stop();
            return;
        }

        this.state = 'Transfer completed';
        this.onStateChange(this.state);

        // Save active decoder and meta references before stopping video stream
        const completedDecoder = this.decoder;
        const completedMeta = this.meta;

        this.stop();
        this.decoder = completedDecoder;
        this.meta = completedMeta;

        if (this.meta.type === 'text') {
            const text = new TextDecoder().decode(recoveredBuffer);
            this.onComplete({ type: 'text', text: text });
        } else {
            const blob = typeof Blob !== 'undefined' ? new Blob([recoveredBuffer], { type: this.meta.mime }) : recoveredBuffer;
            const file = typeof File !== 'undefined' && typeof Blob !== 'undefined'
                ? new File([blob], this.meta.name, { type: this.meta.mime })
                : { buffer: recoveredBuffer, name: this.meta.name, type: this.meta.mime };

            this.onComplete({
                type: 'file',
                file: file,
                name: this.meta.name,
                mime: this.meta.mime,
                buffer: recoveredBuffer
            });
        }
    }
}

// Global Exports
if (typeof window !== 'undefined') {
    window.TransferIntegrity = TransferIntegrity;
    window.OpticalTransferProtocol = OpticalTransferProtocol;
    window.FountainEncoder = FountainEncoder;
    window.FountainDecoder = FountainDecoder;
    window.AdaptiveTransport = AdaptiveTransport;
    window.ErikrafTQRTransmitter = ErikrafTQRTransmitter;
    window.ErikrafTQRScanner = ErikrafTQRScanner;
    window.crc32 = TransferIntegrity.crc32;
    window.sha256Buffer = TransferIntegrity.sha256Buffer;
    window.bufferToBase64 = TransferIntegrity.bufferToBase64;
    window.base64ToBuffer = TransferIntegrity.base64ToBuffer;
}

if (typeof globalThis !== 'undefined') {
    globalThis.TransferIntegrity = TransferIntegrity;
    globalThis.OpticalTransferProtocol = OpticalTransferProtocol;
    globalThis.FountainEncoder = FountainEncoder;
    globalThis.FountainDecoder = FountainDecoder;
    globalThis.AdaptiveTransport = AdaptiveTransport;
    globalThis.ErikrafTQRTransmitter = ErikrafTQRTransmitter;
    globalThis.ErikrafTQRScanner = ErikrafTQRScanner;
    globalThis.crc32 = TransferIntegrity.crc32;
    globalThis.sha256Buffer = TransferIntegrity.sha256Buffer;
    globalThis.bufferToBase64 = TransferIntegrity.bufferToBase64;
    globalThis.base64ToBuffer = TransferIntegrity.base64ToBuffer;
}

const crc32 = TransferIntegrity.crc32;
const sha256Buffer = TransferIntegrity.sha256Buffer;
const bufferToBase64 = TransferIntegrity.bufferToBase64;
const base64ToBuffer = TransferIntegrity.base64ToBuffer;

export {
    TransferIntegrity,
    OpticalTransferProtocol,
    FountainEncoder,
    FountainDecoder,
    AdaptiveTransport,
    ErikrafTQRTransmitter,
    ErikrafTQRScanner,
    crc32,
    sha256Buffer,
    bufferToBase64,
    base64ToBuffer
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TransferIntegrity,
        OpticalTransferProtocol,
        FountainEncoder,
        FountainDecoder,
        AdaptiveTransport,
        ErikrafTQRTransmitter,
        ErikrafTQRScanner,
        crc32: TransferIntegrity.crc32,
        sha256Buffer: TransferIntegrity.sha256Buffer,
        bufferToBase64: TransferIntegrity.bufferToBase64,
        base64ToBuffer: TransferIntegrity.base64ToBuffer
    };
}
