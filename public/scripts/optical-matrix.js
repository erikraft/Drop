/*
 * ErikrafT Optical Matrix (experimental)
 *
 * A browser-native colour-and-symbol matrix codec.  This is an independent
 * implementation; it deliberately does not claim wire compatibility with
 * Cimbar/libcimbar.
 */
(function (root) {
    'use strict';
    const MAGIC = [0x45, 0x4f, 0x4d, 1]; // EOM + protocol version
    const PALETTE = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
    const SHAPES = [
        [[.5,.12],[.88,.5],[.5,.88],[.12,.5]], [[.18,.18],[.82,.18],[.82,.82],[.18,.82]],
        [[.5,.1],[.9,.9],[.1,.9]], [[.1,.1],[.9,.5],[.1,.9]], [[.5,.08],[.62,.38],[.92,.5],[.62,.62],[.5,.92],[.38,.62],[.08,.5],[.38,.38]],
        [[.5,.08],[.92,.5],[.5,.92],[.08,.5]], [[.2,.1],[.8,.1],[.9,.8],[.1,.8]], [[.5,.08],[.92,.35],[.76,.92],[.24,.92],[.08,.35]],
        [[.1,.5],[.35,.1],[.9,.1],[.65,.5],[.9,.9],[.35,.9]], [[.5,.1],[.9,.5],[.5,.9],[.1,.5]],
        [[.1,.1],[.9,.1],[.5,.9]], [[.1,.2],[.9,.2],[.9,.8],[.1,.8]], [[.5,.06],[.94,.94],[.06,.94]], [[.06,.06],[.94,.5],[.06,.94]],
        [[.5,.06],[.94,.5],[.5,.94],[.06,.5]], [[.15,.15],[.85,.15],[.85,.85],[.15,.85]]
    ];
    const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let b = 0; b < 8; b++) { const lowBit = value & 1; value >>>= 1; if (lowBit) value ^= 0xedb88320; } } return (value ^ 0xffffffff) >>> 0; };
    const write32 = (target, offset, value) => { target[offset] = value >>> 24; target[offset + 1] = value >>> 16; target[offset + 2] = value >>> 8; target[offset + 3] = value; };
    const read32 = (source, offset) => ((source[offset] << 24) | (source[offset + 1] << 16) | (source[offset + 2] << 8) | source[offset + 3]) >>> 0;

    class OpticalMatrixEncoder {
        constructor(options = {}) { this.columns = options.columns || 32; this.rows = options.rows || 32; this.tileSize = options.tileSize || 18; }
        encode(bytes) {
            bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            const payload = new Uint8Array(MAGIC.length + 8 + bytes.length);
            payload.set(MAGIC); write32(payload, 4, bytes.length); write32(payload, 8, crc(bytes)); payload.set(bytes, 12);
            const capacity = this.columns * this.rows * 6 / 8 | 0;
            if (payload.length > capacity) throw new RangeError(`Payload is ${payload.length} bytes; this matrix supports ${capacity} bytes.`);
            return { columns: this.columns, rows: this.rows, tileSize: this.tileSize, payload, capacity };
        }
        render(canvas, encoded) {
            const {columns, rows, tileSize, payload} = encoded; const border = tileSize;
            canvas.width = (columns + 2) * tileSize; canvas.height = (rows + 2) * tileSize;
            const ctx = canvas.getContext('2d', {willReadFrequently: true}); ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, border); ctx.fillRect(0, canvas.height - border, canvas.width, border); ctx.fillRect(0, 0, border, canvas.height); ctx.fillRect(canvas.width - border, 0, border, canvas.height);
            let bits = 0, count = 0, at = 0; const next = () => { while (count < 6) { bits = (bits << 8) | (payload[at++] || 0); count += 8; } count -= 6; return (bits >>> count) & 63; };
            for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) this._tile(ctx, (x + 1) * tileSize, (y + 1) * tileSize, tileSize, next());
            return canvas;
        }
        _tile(ctx, x, y, size, value) { const color = value >>> 4, symbol = value & 15; ctx.fillStyle = PALETTE[color]; ctx.beginPath(); for (const [px, py] of SHAPES[symbol]) ctx.lineTo(x + px * size, y + py * size); ctx.closePath(); ctx.fill(); }
    }

    class OpticalMatrixDecoder {
        decodeCanvas(canvas, options = {}) {
            const columns = options.columns || 32, rows = options.rows || 32, tileSize = canvas.width / (columns + 2);
            if (!Number.isInteger(tileSize) || canvas.height !== (rows + 2) * tileSize) throw new Error('Unexpected matrix geometry.');
            const ctx = canvas.getContext('2d', {willReadFrequently: true}); const values = [];
            for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) values.push(this._readTile(ctx, (x + 1) * tileSize, (y + 1) * tileSize, tileSize));
            let accumulator = 0, bitCount = 0; const out = [];
            for (const value of values) { accumulator = (accumulator << 6) | value; bitCount += 6; while (bitCount >= 8) { bitCount -= 8; out.push((accumulator >>> bitCount) & 255); } }
            const data = new Uint8Array(out); if (!MAGIC.every((v, i) => data[i] === v)) throw new Error('Optical Matrix signature not found.');
            const length = read32(data, 4), expected = read32(data, 8); if (length > data.length - 12) throw new Error('Invalid Optical Matrix payload length.');
            const payload = data.slice(12, 12 + length); if (crc(payload) !== expected) throw new Error('Optical Matrix integrity check failed.'); return payload;
        }
        _readTile(ctx, x, y, size) { const image = ctx.getImageData(x, y, size, size).data; let best = 0, distance = Infinity; for (let color = 0; color < PALETTE.length; color++) for (let shape = 0; shape < SHAPES.length; shape++) { const candidate = this._raster(shape, color, size); let d = 0; for (let i = 0; i < image.length; i += 4) d += Math.abs(image[i] - candidate[i]) + Math.abs(image[i + 1] - candidate[i + 1]) + Math.abs(image[i + 2] - candidate[i + 2]); if (d < distance) { distance = d; best = color * 16 + shape; } } return best; }
        _raster(shape, color, size) { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d'); ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = PALETTE[color]; ctx.beginPath(); for (const [x, y] of SHAPES[shape]) ctx.lineTo(x * size, y * size); ctx.closePath(); ctx.fill(); return ctx.getImageData(0, 0, size, size).data; }
    }
    root.ErikrafTOpticalMatrix = { OpticalMatrixEncoder, OpticalMatrixDecoder, PALETTE, protocol: 'EOM/1', capabilities: { cameraPerspectiveDecoder: false, cimbarCompatible: false, cfcCompatible: false } };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.ErikrafTOpticalMatrix;
})(typeof globalThis !== 'undefined' ? globalThis : window);
