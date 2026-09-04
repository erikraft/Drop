/**
 * ErikrafT Drop security layer.
 *
 * This module deliberately does not modify the EKQR frame protocol, FEC,
 * CRC, SHA-256, compression, or reconstruction algorithms. Security checks
 * are applied only at safe content boundaries after data has been decoded.
 */
(function () {
    'use strict';

    const TRUSTED_ROOT_HOSTS = Object.freeze([
        'erikraft.com',
        'wolvpersonalizados.com.br'
    ]);

    const BLOCKED_PROTOCOLS = new Set([
        'javascript:',
        'data:',
        'file:',
        'vbscript:'
    ]);

    const WEB_PROTOCOLS = new Set(['http:', 'https:']);

    function normalizeHostname(hostname) {
        return String(hostname || '')
            .trim()
            .toLowerCase()
            .replace(/\.$/, '');
    }

    function isTrustedHostname(hostname) {
        const normalized = normalizeHostname(hostname);
        return TRUSTED_ROOT_HOSTS.some(root =>
            normalized === root || normalized.endsWith(`.${root}`)
        );
    }

    function parseWebUrl(value) {
        if (typeof value !== 'string') {
            return { ok: false, reason: 'invalid-url' };
        }

        const input = value.trim();
        if (!input) {
            return { ok: false, reason: 'empty-url' };
        }

        let parsed;
        try {
            parsed = new URL(input);
        } catch (_) {
            return { ok: false, reason: 'invalid-url' };
        }

        const protocol = parsed.protocol.toLowerCase();
        const hostname = normalizeHostname(parsed.hostname);

        if (BLOCKED_PROTOCOLS.has(protocol)) {
            return { ok: false, reason: 'blocked-protocol', url: parsed };
        }

        if (!WEB_PROTOCOLS.has(protocol)) {
            return { ok: false, reason: 'unsupported-protocol', url: parsed };
        }

        if (!hostname) {
            return { ok: false, reason: 'missing-hostname', url: parsed };
        }

        return {
            ok: true,
            url: parsed,
            hostname,
            trusted: isTrustedHostname(hostname)
        };
    }

    function validateUrl(value) {
        const result = parseWebUrl(value);
        if (!result.ok) return result;

        // The hostname is the authority used for the allowlist. Path/query/
        // fragment text can never make another hostname trusted.
        return {
            ...result,
            allowlisted: result.trusted
        };
    }

    function looksLikeWebUrl(value) {
        return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
    }

    function getSecurityMessage(reason) {
        switch (reason) {
            case 'blocked-protocol':
            case 'unsupported-protocol':
                return 'Este link usa um protocolo que não pode ser aberto com segurança.';
            case 'invalid-url':
            case 'missing-hostname':
                return 'Este link não possui um endereço web válido.';
            default:
                return 'Este conteúdo não pode ser aberto com segurança.';
        }
    }

    function notifyBlocked(reason) {
        console.warn('[Security] Content blocked:', reason);

        if (typeof Toast === 'function' && window.erikrafTdrop?.toast?.show) {
            try {
                window.erikrafTdrop.toast.show(getSecurityMessage(reason));
                return;
            } catch (_) {}
        }

        if (typeof alert === 'function') {
            alert(getSecurityMessage(reason));
        }
    }

    function validateQrText(text) {
        if (!looksLikeWebUrl(text)) {
            return { allowed: true, type: 'text' };
        }

        const result = validateUrl(text);
        if (!result.ok) {
            return { allowed: false, type: 'url', reason: result.reason };
        }

        return {
            allowed: true,
            type: 'url',
            trusted: result.trusted,
            hostname: result.hostname
        };
    }

    function installAnimatedQrBoundary() {
        // Classic scripts expose top-level class declarations as a global lexical
        // binding rather than necessarily as a window property. Use both forms.
        const Scanner = typeof ErikrafTQRScanner === 'function'
            ? ErikrafTQRScanner
            : (typeof window.ErikrafTQRScanner === 'function' ? window.ErikrafTQRScanner : null);

        if (!Scanner) {
            return false;
        }

        if (Scanner.prototype.__erikrafTSecurityWrapped) {
            return true;
        }

        const originalFinish = Scanner.prototype._finishReconstruction;
        if (typeof originalFinish !== 'function') {
            console.warn('[Security] Animated QR boundary not installed: unsupported scanner implementation.');
            return false;
        }

        Scanner.prototype._finishReconstruction = function (...args) {
            const originalOnComplete = this.onComplete;

            // Keep this wrapper synchronous so it remains installed for the exact
            // duration in which _finishReconstruction invokes the callback. Async
            // moderation continues from the callback without modifying EKQR state.
            this.onComplete = (result, ...callbackArgs) => {
                try {
                    if (typeof result === 'string') {
                        const validation = validateQrText(result);
                        if (!validation.allowed) {
                            notifyBlocked(validation.reason);
                            return;
                        }

                        return originalOnComplete?.call(this, result, ...callbackArgs);
                    }

                    if (typeof File !== 'undefined' && result instanceof File && typeof window.handleReceivedFile === 'function') {
                        Promise.resolve(window.handleReceivedFile(result))
                            .then(moderated => {
                                if (moderated) {
                                    originalOnComplete?.call(this, moderated, ...callbackArgs);
                                } else {
                                    console.info('[Security] Animated QR file withheld by content moderation.');
                                }
                            })
                            .catch(error => {
                                console.error('[Security] Animated QR file validation failed:', error);
                                // Do not pass a failed security check through to the
                                // original callback. The transfer protocol itself is
                                // left untouched.
                            });
                        return;
                    }

                    return originalOnComplete?.call(this, result, ...callbackArgs);
                } catch (error) {
                    console.error('[Security] Animated QR content validation failed:', error);
                }
            };

            try {
                return originalFinish.apply(this, args);
            } finally {
                this.onComplete = originalOnComplete;
            }
        };

        Scanner.prototype.__erikrafTSecurityWrapped = true;
        return true;
    }

    window.ErikrafTSecurity = Object.freeze({
        TRUSTED_ROOT_HOSTS,
        isTrustedHostname,
        parseWebUrl,
        validateUrl,
        validateQrText
    });

    // erikraft-qr.js is loaded immediately before this module. Keep a single
    // microtask retry for unusual script-loader timing; no polling loop is used.
    if (!installAnimatedQrBoundary() && typeof queueMicrotask === 'function') {
        queueMicrotask(() => installAnimatedQrBoundary());
    }
})();
