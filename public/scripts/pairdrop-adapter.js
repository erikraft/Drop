/**
 * PairDrop Interoperability Adapter for ErikrafT Drop™
 *
 * Provides translation between PairDrop signaling schemas / WebRTC file header structures
 * and ErikrafT Drop™ native peer events without modifying core signaling logic.
 */

if (typeof PairDropAdapter === 'undefined') {
    var PairDropAdapter = class PairDropAdapter {
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

            if (typeof msg === 'string') {
                try {
                    msg = JSON.parse(msg);
                } catch (e) {
                    return msg;
                }
            }

            // If incoming signal is from PairDrop or contains PairDrop request format
            if (msg.type === 'request' && msg.header) {
                msg.header = this.normalizeHeader(msg.header);
            }

            if (msg.type === 'peer-joined' && msg.peer) {
                msg.peer = this.normalizePeer(msg.peer);
            }

            return msg;
        }

        static normalizePeer(peer) {
            if (!peer) return peer;
            return {
                id: peer.id || peer.peerId,
                name: peer.name || {
                    displayName: peer.displayName || peer.name || 'PairDrop Device',
                    deviceName: peer.deviceName || 'PairDrop Web',
                    clientType: 'pairdrop-web'
                },
                rtcSupported: peer.rtcSupported !== false
            };
        }

        static getChunkSize() {
            return 65536; // 64 KB standard WebRTC chunk
        }
    };
}

if (typeof window !== 'undefined') {
    window.PairDropAdapter = PairDropAdapter;
}

if (typeof globalThis !== 'undefined') {
    globalThis.PairDropAdapter = PairDropAdapter;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PairDropAdapter };
}

/*
 * Android WebView compatibility
 *
 * Drop-Android injects its compatibility layer after the document finishes loading.
 * The web app, however, loads network/UI code as deferred assets. Keep the legacy
 * PairDrop global available and start peer discovery as soon as the two core
 * classes exist instead of making it depend on unrelated optional assets.
 */
if (typeof window !== 'undefined') {
    try {
        if (!Object.prototype.hasOwnProperty.call(window, 'pairDrop')) {
            Object.defineProperty(window, 'pairDrop', {
                configurable: true,
                enumerable: false,
                get() {
                    return window.erikrafTdrop || null;
                }
            });
        }
    } catch (e) {
        console.warn('[Android WebView] Could not install pairDrop compatibility alias.', e);
    }

    const startCoreWhenReady = () => {
        const app = window.erikrafTdrop;
        if (!app || typeof app.startPeerDiscovery !== 'function') return false;
        if (typeof ServerConnection !== 'function' || typeof PeersManager !== 'function') return false;

        try {
            const result = app.startPeerDiscovery();
            if (result && typeof result.catch === 'function') {
                result.catch(error => console.warn('[Android WebView] Core peer discovery startup failed.', error));
            }
            return true;
        } catch (e) {
            console.warn('[Android WebView] Core peer discovery startup failed.', e);
            return false;
        }
    };

    const compatibilityTimer = window.setInterval(() => {
        if (startCoreWhenReady()) {
            window.clearInterval(compatibilityTimer);
        }
    }, 25);

    window.setTimeout(() => window.clearInterval(compatibilityTimer), 30000);
}
