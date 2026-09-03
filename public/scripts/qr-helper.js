/**
 * Reusable QR Code Helper utilizing qr-code-styling.
 * Standardizes QR design for ErikrafT Drop™ permanent pairing and temporary public rooms.
 *
 * Animated transfer QR codes intentionally skip the logo for faster frame generation.
 */
class ErikrafTDropQR {
    static _logoState = { attempted: false, available: false, path: 'images/icon-drop-blue.svg', promise: null };

    static async _ensureLogoLoaded(logoPath = 'images/icon-drop-blue.svg') {
        if (this._logoState.attempted) return this._logoState.promise;
        this._logoState.attempted = true;
        this._logoState.path = logoPath;
        this._logoState.promise = (async () => {
            try {
                const response = await fetch(logoPath);
                this._logoState.available = response.ok;
                if (response.ok) console.log('[QR Helper] Logo loaded successfully, cached for subsequent QR frames');
            } catch (err) {
                this._logoState.available = false;
            }
        })();
        return this._logoState.promise;
    }

    static render(container, data, options = {}) {
        if (!container) {
            console.error('[QR Helper] Container element is required.');
            return null;
        }
        const isAnimatedTransfer = container.id === 'qr-send-canvas-container' || options.animatedTransfer === true;
        const logoPath = options.logoPath || 'images/icon-drop-blue.svg';
        if (!isAnimatedTransfer && !this._logoState.attempted) this._ensureLogoLoaded(logoPath);
        if (container._qrInstance && typeof container._qrInstance.update === 'function') {
            try {
                container._qrInstance.update({ data });
                return container._qrInstance;
            } catch (err) {
                console.warn('[QR Helper] Direct instance update failed, recreating:', err);
            }
        }
        const baseConfig = {
            width: options.width || 280, height: options.height || 280, type: 'svg', data,
            margin: options.margin || 8,
            qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
            dotsOptions: { color: '#121212', type: 'rounded' },
            backgroundOptions: { color: '#ffffff' },
            cornersSquareOptions: { color: '#121212', type: 'extra-rounded' },
            cornersDotOptions: { color: '#121212', type: 'dot' }
        };
        if (!isAnimatedTransfer && this._logoState.available) {
            baseConfig.image = this._logoState.path;
            baseConfig.imageOptions = { hideBackgroundDots: true, imageSize: options.imageSize || 0.25, margin: options.logoMargin || 4, crossOrigin: 'anonymous', saveAsBlob: true };
        }
        const qrCode = new QRCodeStyling(baseConfig);
        container._qrInstance = qrCode;
        container.innerHTML = '';
        qrCode.append(container);
        return qrCode;
    }

    static destroy(container) {
        if (!container) return;
        if (container._qrInstance) delete container._qrInstance;
        container.innerHTML = '';
    }
}
window.ErikrafTDropQR = ErikrafTDropQR;

(function setupAnimatedQRPlaybackControls() {
    const BUTTON_IDS = {
        initialize: 'qr-send-initialize-btn',
        previous: 'qr-send-previous-btn',
        pause: 'qr-send-pause-btn',
        next: 'qr-send-next-btn',
        seek: 'qr-send-frame-seek',
        frameInput: 'qr-send-frame-input',
        frameGo: 'qr-send-frame-go-btn'
    };

    const getTransmitter = () => {
        const dialog = window.erikrafTdrop && window.erikrafTdrop.animatedQRSendDialog;
        return dialog && dialog.transmitter;
    };

    const stopTimer = transmitter => {
        if (!transmitter) return;
        if (transmitter.timer) {
            clearTimeout(transmitter.timer);
            transmitter.timer = null;
        }
    };

    const emitProgress = transmitter => {
        if (!transmitter || !Array.isArray(transmitter.frames) || !transmitter.frames.length) return;
        if (typeof transmitter.onProgress === 'function') {
            transmitter.onProgress({
                currentIndex: transmitter.currentIndex,
                totalFrames: transmitter.frames.length,
                numBaseChunks: transmitter.numBaseChunks,
                fps: transmitter.fps,
                totalSize: transmitter.totalSize,
                fileName: transmitter.metadata ? transmitter.metadata.name : 'Data',
                progressPct: Math.min(100, Math.round(((transmitter.currentIndex + 1) / transmitter.frames.length) * 100))
            });
        }
    };

    const renderCurrentFrame = (transmitter, force = false) => {
        if (!transmitter || !Array.isArray(transmitter.frames) || !transmitter.frames.length) return false;
        if (!force && !transmitter.initialized) return false;
        const index = Math.max(0, Math.min(Number.isFinite(transmitter.currentIndex) ? transmitter.currentIndex : 0, transmitter.frames.length - 1));
        transmitter.currentIndex = index;
        if (typeof ErikrafTDropQR !== 'undefined' && transmitter.containerEl) {
            ErikrafTDropQR.render(transmitter.containerEl, transmitter.frames[index], {
                width: 300,
                height: 300
            });
        }
        emitProgress(transmitter);
        return true;
    };

    const syncSeekUI = transmitter => {
        const seek = document.getElementById(BUTTON_IDS.seek);
        const input = document.getElementById(BUTTON_IDS.frameInput);
        if (!transmitter || !Array.isArray(transmitter.frames) || !transmitter.frames.length) return;
        const total = transmitter.frames.length;
        const current = Math.max(0, Math.min(transmitter.currentIndex, total - 1));
        if (seek) {
            seek.min = '0';
            seek.max = String(total - 1);
            seek.value = String(current);
            seek.setAttribute('aria-valuetext', `QR ${current + 1} de ${total}`);
            seek.disabled = !transmitter.initialized;
        }
        if (input) {
            input.min = '1';
            input.max = String(total);
            input.value = String(current + 1);
            input.setAttribute('aria-label', `Número do QR, de 1 a ${total}`);
            input.disabled = !transmitter.initialized;
        }
    };

    const setFrame = (transmitter, index) => {
        if (!transmitter || !transmitter.initialized || !Array.isArray(transmitter.frames) || !transmitter.frames.length) return;
        stopTimer(transmitter);
        transmitter.running = true;
        transmitter.paused = true;
        transmitter.currentIndex = Math.max(0, Math.min(Number.isFinite(index) ? index : 0, transmitter.frames.length - 1));
        renderCurrentFrame(transmitter, true);
        syncSeekUI(transmitter);
    };

    const installTransmitterControls = transmitter => {
        if (!transmitter || transmitter.__erikraftPlaybackControlsInstalled) return;
        if (!Array.isArray(transmitter.frames)) return;

        transmitter.__erikraftPlaybackControlsInstalled = true;
        transmitter.initialized = false;

        transmitter.start = function () {
            if (!this.frames || !this.frames.length) return;
            stopTimer(this);
            this.running = true;
            this.paused = true;
            this.initialized = false;
            this.currentIndex = 0;
            syncSeekUI(this);
        };

        transmitter.initialize = function () {
            if (!this.frames || !this.frames.length) return;
            stopTimer(this);
            this.running = true;
            this.paused = true;
            this.initialized = true;
            this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.frames.length - 1));
            renderCurrentFrame(this, true);
            syncSeekUI(this);
        };

        transmitter.pause = function () {
            stopTimer(this);
            this.paused = true;
            syncSeekUI(this);
        };

        transmitter.resume = function () {
            if (!this.running || !this.initialized || !this.frames || !this.frames.length) return;
            stopTimer(this);
            this.paused = false;
            const tick = () => {
                if (!this.running || this.paused || !this.initialized || !this.frames.length) return;
                renderCurrentFrame(this, true);
                this.currentIndex = (this.currentIndex + 1) % this.frames.length;
                syncSeekUI(this);
                this.timer = setTimeout(tick, 1000 / this.fps);
            };
            tick();
        };

        transmitter.previousFrame = function () {
            if (!this.initialized || !this.frames || !this.frames.length) return;
            setFrame(this, this.currentIndex - 1);
        };

        transmitter.nextFrame = function () {
            if (!this.initialized || !this.frames || !this.frames.length) return;
            setFrame(this, this.currentIndex + 1);
        };

        transmitter.seekFrame = function (index) {
            if (!this.initialized || !this.frames || !this.frames.length) return;
            setFrame(this, index);
        };

        syncSeekUI(transmitter);
    };

    const makeButton = (template, id, text, ariaLabel, onClick) => {
        if (document.getElementById(id)) return;
        const button = template.cloneNode(true);
        button.id = id;
        button.removeAttribute('data-i18n-key');
        button.textContent = text;
        button.setAttribute('aria-label', ariaLabel);
        button.title = ariaLabel;
        button.addEventListener('click', onClick);
        return button;
    };

    const setup = () => {
        const activeButtons = document.getElementById('qr-send-active-buttons');
        const pauseButton = document.getElementById(BUTTON_IDS.pause);
        if (!activeButtons || !pauseButton) return;

        const transmitter = getTransmitter();
        if (transmitter) installTransmitterControls(transmitter);

        const current = getTransmitter();
        if (!current) return;

        if (!document.getElementById(BUTTON_IDS.initialize)) {
            const initializeButton = makeButton(
                pauseButton,
                BUTTON_IDS.initialize,
                'Inicializar',
                'Inicializar QR animado',
                () => {
                    const tx = getTransmitter();
                    if (tx && typeof tx.initialize === 'function') tx.initialize();
                    const button = document.getElementById(BUTTON_IDS.initialize);
                    if (button) button.hidden = true;
                }
            );
            if (initializeButton) activeButtons.insertBefore(initializeButton, activeButtons.firstElementChild);
        }

        if (!document.getElementById(BUTTON_IDS.previous)) {
            const previousButton = makeButton(
                pauseButton,
                BUTTON_IDS.previous,
                'Anterior',
                'Mostrar QR anterior',
                () => {
                    const tx = getTransmitter();
                    if (tx && typeof tx.previousFrame === 'function') tx.previousFrame();
                }
            );
            if (previousButton) activeButtons.insertBefore(previousButton, activeButtons.firstElementChild);
        }

        if (!document.getElementById(BUTTON_IDS.next)) {
            const nextButton = makeButton(
                pauseButton,
                BUTTON_IDS.next,
                'Próximo',
                'Mostrar próximo QR',
                () => {
                    const tx = getTransmitter();
                    if (tx && typeof tx.nextFrame === 'function') tx.nextFrame();
                }
            );
            if (nextButton) activeButtons.insertBefore(nextButton, pauseButton.nextSibling);
        }

        pauseButton.textContent = current.paused ? 'Play' : 'Pausar';
        pauseButton.removeAttribute('data-i18n-key');
        pauseButton.setAttribute('aria-label', current.paused ? 'Reproduzir QR animado' : 'Pausar QR animado');
        pauseButton.title = current.paused ? 'Reproduzir QR animado' : 'Pausar QR animado';
        pauseButton.onclick = () => {
            const tx = getTransmitter();
            if (!tx || !tx.initialized) return;
            if (tx.paused) {
                tx.resume();
            } else {
                tx.pause();
            }
            pauseButton.textContent = tx.paused ? 'Play' : 'Pausar';
            pauseButton.setAttribute('aria-label', tx.paused ? 'Reproduzir QR animado' : 'Pausar QR animado');
            pauseButton.title = tx.paused ? 'Reproduzir QR animado' : 'Pausar QR animado';
        };

        let seek = document.getElementById(BUTTON_IDS.seek);
        if (!seek) {
            seek = document.createElement('input');
            seek.type = 'range';
            seek.id = BUTTON_IDS.seek;
            seek.className = 'fw';
            seek.setAttribute('aria-label', 'Posição do QR animado');
            seek.style.cssText = 'width:100%;accent-color:#0d6efd;cursor:pointer;';
            const seekWrapper = document.createElement('div');
            seekWrapper.id = 'qr-send-frame-seek-wrapper';
            seekWrapper.className = 'fw column gap-1';
            seekWrapper.style.margin = '8px 0 0';
            seekWrapper.appendChild(seek);
            activeButtons.parentNode.insertBefore(seekWrapper, activeButtons);
            seek.addEventListener('input', event => {
                const tx = getTransmitter();
                if (!tx || !tx.initialized || !tx.frames || !tx.frames.length) return;
                setFrame(tx, Number(event.target.value));
            });
        }

        let frameInput = document.getElementById(BUTTON_IDS.frameInput);
        if (!frameInput) {
            frameInput = document.createElement('input');
            frameInput.type = 'number';
            frameInput.id = BUTTON_IDS.frameInput;
            frameInput.className = 'btn btn-rounded btn-grey';
            frameInput.min = '1';
            frameInput.step = '1';
            frameInput.inputMode = 'numeric';
            frameInput.style.cssText = 'width:90px;text-align:center;';
            frameInput.setAttribute('aria-label', 'Número do QR');
            const frameGo = document.createElement('button');
            frameGo.type = 'button';
            frameGo.id = BUTTON_IDS.frameGo;
            frameGo.className = 'btn btn-rounded btn-grey';
            frameGo.textContent = 'Ir';
            frameGo.setAttribute('aria-label', 'Ir para o QR informado');
            frameGo.title = 'Ir para o QR informado';
            const frameGroup = document.createElement('div');
            frameGroup.id = 'qr-send-frame-input-group';
            frameGroup.className = 'row center gap-2';
            frameGroup.style.cssText = 'width:100%;justify-content:center;margin:8px 0 0;';
            frameGroup.append(frameInput, frameGo);
            activeButtons.parentNode.insertBefore(frameGroup, activeButtons);
            const goToFrame = () => {
                const tx = getTransmitter();
                if (!tx || !tx.initialized || !tx.frames || !tx.frames.length) return;
                const value = Number.parseInt(frameInput.value, 10);
                if (!Number.isFinite(value)) return;
                setFrame(tx, value - 1);
            };
            frameGo.addEventListener('click', goToFrame);
            frameInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    goToFrame();
                }
            });
        }

        syncSeekUI(current);

        const initializeButton = document.getElementById(BUTTON_IDS.initialize);
        if (initializeButton) initializeButton.hidden = !!current.initialized;
    };

    const runSetup = () => {
        setup();
        const transmitter = getTransmitter();
        if (transmitter) installTransmitterControls(transmitter);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runSetup, { once: true });
    else runSetup();
    new MutationObserver(runSetup).observe(document.documentElement, { childList: true, subtree: true });
})();

(function setupQRScannerFixes() {
    const ERIKRAFT_ONION_HOST = 'nozudb2e4jy4betognmnwoxvdu44wvjoqvmwios5ql7mxagqqpnn64ad.onion';

    const isHostname = value => {
        const host = value.trim().replace(/^www\./i, '').toLowerCase();
        if (!host || host.includes('@') || host.includes(' ')) return false;
        if (host === 'localhost' || host === '127.0.0.1' || host === ERIKRAFT_ONION_HOST) return true;
        return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host);
    };

    const normalizeScannedUrl = raw => {
        const value = String(raw || '').trim();
        if (!value) return null;
        try {
            const parsed = new URL(value);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') return parsed;
        } catch (err) {}
        if (isHostname(value) || /^[a-z0-9.-]+\.(?:onion|[a-z]{2,63})(?::\d+)?(?:[/?#].*)?$/i.test(value)) {
            try { return new URL(`https://${value}`); } catch (err) {}
        }
        return null;
    };

    const classify = raw => {
        const original = String(raw || '').trim();
        if (!original) return null;
        const parsedUrl = normalizeScannedUrl(original);
        if (!parsedUrl) return { isUrl: false, isEcosystem: false, type: 'text', title: 'QR Code (Texto)', displayUrl: original, targetUrl: original, isExternal: false };

        const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        const searchParams = parsedUrl.searchParams;
        const isErikraftHost = host === 'erikraft.com' || host.endsWith('.erikraft.com');
        const isDropHost = host === 'drop.erikraft.com' || host === 'localhost' || host === '127.0.0.1';
        const isErikraftOnion = host === ERIKRAFT_ONION_HOST;
        const isDocsDrop = host === 'docsdrop.erikraft.com';
        const isBioDrop = host === 'biodrop.erikraft.com';
        const isEcosystem = isErikraftHost || isDropHost || isErikraftOnion || isDocsDrop || isBioDrop;

        let title = 'QR Code Externo';
        let type = 'external';
        if (searchParams.has('room_id')) { title = 'ErikrafT Drop™ - Sala Pública/Privada'; type = 'drop-room'; }
        else if (searchParams.has('pair_key')) { title = 'ErikrafT Drop™ - Emparelhamento de Dispositivo'; type = 'drop-pair'; }
        else if (isDocsDrop) { title = 'DocsDrop - Documentação ErikrafT'; type = 'docsdrop'; }
        else if (isBioDrop) { title = 'BioDrop - Link Bio ErikrafT'; type = 'biodrop'; }
        else if (isDropHost || isErikraftOnion) { title = 'ErikrafT Drop™'; type = 'drop'; }
        else if (isErikraftHost) { title = host === 'erikraft.com' ? 'ErikrafT' : 'ErikrafT Service'; type = 'erikraft-service'; }

        return { isUrl: true, isEcosystem, type, title, displayUrl: parsedUrl.href, targetUrl: parsedUrl.href, searchParams, isExternal: !isEcosystem };
    };

    const showClassifiedResult = (scanner, raw) => {
        const classified = classify(raw);
        scanner.stopCamera();
        scanner.hide();
        const dialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
        if (dialog && typeof dialog.showResult === 'function') dialog.showResult(classified);
    };

    const install = () => {
        if (typeof QRScannerDialog === 'undefined') return false;
        QRScannerDialog.prototype.processScannedRaw = function(raw) {
            if (raw) showClassifiedResult(this, raw);
        };
        return true;
    };
    const tryInstall = () => {
        if (install()) return;
        let attempts = 0;
        const timer = setInterval(() => { if (install() || ++attempts >= 100) clearInterval(timer); }, 50);
    };
    tryInstall();

    const handleManual = event => {
        const submit = event.target && event.target.closest && event.target.closest('#qr-scanner-manual-submit');
        const input = document.getElementById('qr-scanner-manual-input');
        if (!submit || !input || !input.value.trim()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const scanner = window.erikrafTdrop && window.erikrafTdrop.qrScannerDialog;
        const confirmDialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
        if (!confirmDialog || typeof confirmDialog.showResult !== 'function') return;
        if (scanner) scanner.stopCamera();
        if (scanner) scanner.hide();
        const value = input.value.trim();
        input.value = '';
        confirmDialog.showResult(classify(value));
    };
    const handleManualEnter = event => {
        if (event.key !== 'Enter') return;
        const input = event.target && event.target.closest && event.target.closest('#qr-scanner-manual-input');
        if (!input || !input.value.trim()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const scanner = window.erikrafTdrop && window.erikrafTdrop.qrScannerDialog;
        const confirmDialog = window.erikrafTdrop && window.erikrafTdrop.qrScannerConfirmDialog;
        if (!confirmDialog || typeof confirmDialog.showResult !== 'function') return;
        if (scanner) scanner.stopCamera();
        if (scanner) scanner.hide();
        const value = input.value.trim();
        input.value = '';
        confirmDialog.showResult(classify(value));
    };
    document.addEventListener('click', handleManual, true);
    document.addEventListener('keydown', handleManualEnter, true);

    const injectStyles = () => {
        if (document.getElementById('erikraft-qr-scanner-fix-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-qr-scanner-fix-style';
        style.textContent = `
            #qr-scanner-dialog x-paper,
            #qr-scanner-confirm-dialog x-paper {
                width: min(92vw, 560px); max-width: 560px; max-height: 90vh;
                overflow: auto; border-radius: 18px; box-sizing: border-box;
            }
            #qr-scanner-dialog x-paper > *, #qr-scanner-confirm-dialog x-paper > * { box-sizing: border-box; }
            #qr-scanner-dialog .dialog-title, #qr-scanner-confirm-dialog .dialog-title {
                margin: 0; line-height: 1.25; overflow-wrap: anywhere;
            }
            #qr-scanner-dialog .row.center, #qr-scanner-confirm-dialog .row.center { gap: 14px; }
            #qr-scanner-dialog #qr-scanner-main-video {
                display: block; width: 100%; max-width: 480px; min-height: 220px; max-height: 55vh;
                margin: 0 auto; object-fit: cover; border-radius: 14px;
            }
            #qr-scanner-dialog #qr-scanner-main-status {
                width: 100%; margin: 0; padding: 0 4px; line-height: 1.5; text-align: center; overflow-wrap: anywhere;
            }
            #qr-scanner-dialog #qr-scanner-manual-input { width: 100%; min-height: 44px; box-sizing: border-box; }
            #qr-scanner-dialog #qr-scanner-manual-submit { min-height: 42px; }
            #qr-scanner-dialog .btn-row, #qr-scanner-confirm-dialog .btn-row {
                display: flex; flex-wrap: wrap; gap: 10px; width: 100%; box-sizing: border-box;
                justify-content: center; align-items: center;
            }
            #qr-scanner-dialog .btn-row > button, #qr-scanner-confirm-dialog .btn-row > button {
                margin-left: 0; margin-right: 0;
            }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-url {
                display: block; width: 100%; margin: 0; padding: 14px 16px; box-sizing: border-box;
                border-radius: 12px; line-height: 1.5; overflow-wrap: anywhere; word-break: break-word;
            }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-badge {
                display: inline-flex; align-items: center; max-width: 100%; margin: 0; padding: 5px 10px;
                border-radius: 999px; font-size: 12px; line-height: 1.4; white-space: normal; overflow-wrap: anywhere;
            }
            #qr-scanner-confirm-dialog #qr-scanner-confirm-warning {
                width: 100%; box-sizing: border-box; line-height: 1.5; overflow-wrap: anywhere;
            }
            @media (max-width: 600px) {
                #qr-scanner-dialog x-paper, #qr-scanner-confirm-dialog x-paper {
                    width: calc(100vw - 20px); max-height: calc(100vh - 20px); border-radius: 14px;
                }
                #qr-scanner-dialog .row.center, #qr-scanner-confirm-dialog .row.center { gap: 10px; }
                #qr-scanner-dialog #qr-scanner-main-video { min-height: 180px; border-radius: 10px; }
                #qr-scanner-confirm-dialog #qr-scanner-confirm-url { padding: 12px; }
            }
        `;
        document.head.appendChild(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
    else injectStyles();
})();
