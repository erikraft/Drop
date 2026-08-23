/**
 * PairDrop Interoperability Adapter for ErikrafT Drop™
 *
 * Provides translation between PairDrop signaling schemas / WebRTC file header structures
 * and ErikrafT Drop™ native peer events without modifying core signaling logic.
 */

class PairDropAdapter {
    constructor() {
        this._enabled = true;
    }

    static isPairDropPeer(peer) {
        if (!peer || !peer.name) return false;
        const clientType = peer.name.clientType || '';
        const userAgent = peer.name.browser || '';
        return clientType.toLowerCase().includes('pairdrop') || /pairdrop/i.test(userAgent);
    }

    static normalizeHeader(rawHeader) {
        if (!rawHeader) return [];
        const items = Array.isArray(rawHeader) ? rawHeader : [rawHeader];
        return items.map(item => ({
            name: item.name || item.fileName || 'file',
            size: item.size || item.fileSize || 0,
            mime: item.type || item.mime || item.fileType || 'application/octet-stream'
        }));
    }

    static formatRequestSignal(files, options = {}) {
        const header = this.normalizeHeader(files);
        const totalSize = header.reduce((acc, f) => acc + f.size, 0);
        const imagesOnly = header.every(f => f.mime.startsWith('image/'));

        return {
            type: 'request',
            pairDropCompatible: true,
            header: header,
            totalSize: totalSize,
            imagesOnly: imagesOnly,
            thumbnailDataUrl: options.thumbnailDataUrl || ''
        };
    }

    static parseIncomingSignal(msg) {
        if (!msg) return msg;

        // If incoming signal is from PairDrop, ensure header fields match ErikrafT Drop™ expectations
        if (msg.type === 'request' && msg.header) {
            msg.header = this.normalizeHeader(msg.header);
        }

        return msg;
    }
}

window.PairDropAdapter = PairDropAdapter;
