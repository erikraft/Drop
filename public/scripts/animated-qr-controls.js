/**
 * Runtime safety layer for Animated QR transfer controls.
 * Loaded after erikraft-qr.js so the transmitter class is available.
 */
(function setupAnimatedQRRuntimeControls() {
    'use strict';

    const IDS = {
        activeButtons: 'qr-send-active-buttons',
        pause: 'qr-send-pause-btn',
        initialize: 'qr-send-initialize-btn',
        previous: 'qr-send-previous-btn',
        next: 'qr-send-next-btn',
        seek: 'qr-send-frame-seek',
        seekWrapper: 'qr-send-frame-seek-wrapper',
        frameInput: 'qr-send-frame-input',
        frameGo: 'qr-send-frame-go-btn',
        frameGroup: 'qr-send-frame-input-group'
    };

    const getTransmitter = () => window.erikrafTdrop?.animatedQRSendDialog?.transmitter || null;

    const stopTimer = tx => {
        if (!tx) return;
        if (tx.timer) {
            clearTimeout(tx.timer);
            tx.timer = null;
        }
    };

    const clampFrame = (tx, index) => {
        if (!tx?.frames?.length) return 0;
        const numeric = Number(index);
        return Math.max(0, Math.min(Number.isFinite(numeric) ? Math.trunc(numeric) : 0, tx.frames.length - 1));
    };

    const renderFrame = tx => {
        if (!tx?.initialized || !tx.frames?.length || !tx.containerEl) return false;
        tx.currentIndex = clampFrame(tx, tx.currentIndex);
        if (typeof window.ErikrafTDropQR !== 'undefined') {
            window.ErikrafTDropQR.render(tx.containerEl, tx.frames[tx.currentIndex], {
                width: 300,
                height: 300,
                animatedTransfer: true
            });
        }
        if (typeof tx.onProgress === 'function') {
            tx.onProgress({
                currentIndex: tx.currentIndex,
                totalFrames: tx.frames.length,
                numBaseChunks: tx.numBaseChunks,
                fps: tx.fps,
                totalSize: tx.totalSize,
                fileName: tx.metadata?.name || 'Data',
                progressPct: Math.min(100, Math.round(((tx.currentIndex + 1) / tx.frames.length) * 100))
            });
        }
        return true;
    };

    const syncUI = tx => {
        if (!tx?.frames?.length) return;
        const total = tx.frames.length;
        const current = clampFrame(tx, tx.currentIndex);
        tx.currentIndex = current;

        const seek = document.getElementById(IDS.seek);
        if (seek) {
            seek.min = '0';
            seek.max = String(total - 1);
            seek.value = String(current);
            seek.disabled = !tx.initialized;
            seek.setAttribute('aria-valuemin', '0');
            seek.setAttribute('aria-valuemax', String(total - 1));
            seek.setAttribute('aria-valuenow', String(current));
            seek.setAttribute('aria-valuetext', `QR ${current + 1} de ${total}`);
        }

        const input = document.getElementById(IDS.frameInput);
        if (input) {
            input.min = '1';
            input.max = String(total);
            input.value = String(current + 1);
            input.disabled = !tx.initialized;
        }

        const initialize = document.getElementById(IDS.initialize);
        if (initialize) initialize.hidden = !!tx.initialized;

        const pause = document.getElementById(IDS.pause);
        if (pause) {
            const label = tx.paused ? 'Play' : 'Pausar';
            if (pause.textContent !== label) pause.textContent = label;
            pause.removeAttribute('data-i18n-key');
            pause.setAttribute('aria-label', tx.paused ? 'Reproduzir QR animado' : 'Pausar QR animado');
            pause.title = tx.paused ? 'Reproduzir QR animado' : 'Pausar QR animado';
        }
    };

    const selectFrame = (tx, index) => {
        if (!tx?.initialized || !tx.frames?.length) return;
        stopTimer(tx);
        tx.running = true;
        tx.paused = true;
        tx.currentIndex = clampFrame(tx, index);
        renderFrame(tx);
        syncUI(tx);
    };

    const installTransmitter = tx => {
        if (!tx || tx.__erikraftRuntimeControlsInstalled) return;
        if (!Array.isArray(tx.frames)) return;

        tx.__erikraftRuntimeControlsInstalled = true;
        tx.initialized = false;

        tx.start = function () {
            if (!this.frames?.length) return;
            stopTimer(this);
            this.running = true;
            this.paused = true;
            this.initialized = false;
            this.currentIndex = 0;
            if (this.containerEl && window.ErikrafTDropQR) {
                window.ErikrafTDropQR.destroy(this.containerEl);
            }
            syncUI(this);
        };

        tx.initialize = function () {
            if (!this.frames?.length) return;
            stopTimer(this);
            this.running = true;
            this.paused = true;
            this.initialized = true;
            this.currentIndex = clampFrame(this, this.currentIndex);
            renderFrame(this);
            syncUI(this);
        };

        tx.pause = function () {
            stopTimer(this);
            this.paused = true;
            syncUI(this);
        };

        tx.resume = function () {
            if (!this.running || !this.initialized || !this.frames?.length) return;
            stopTimer(this);
            this.paused = false;

            const tick = () => {
                if (!this.running || this.paused || !this.initialized || !this.frames?.length) {
                    this.timer = null;
                    syncUI(this);
                    return;
                }
                renderFrame(this);
                this.currentIndex = (this.currentIndex + 1) % this.frames.length;
                syncUI(this);
                this.timer = setTimeout(tick, 1000 / Math.max(1, Number(this.fps) || 6));
            };
            tick();
        };

        tx.previousFrame = function () {
            if (!this.initialized || !this.frames?.length) return;
            selectFrame(this, this.currentIndex - 1);
        };

        tx.nextFrame = function () {
            if (!this.initialized || !this.frames?.length) return;
            selectFrame(this, this.currentIndex + 1);
        };

        tx.seekFrame = function (index) {
            if (!this.initialized || !this.frames?.length) return;
            selectFrame(this, index);
        };

        syncUI(tx);
    };

    const makeButton = (id, text, label, handler, template) => {
        let button = document.getElementById(id);
        if (button) return button;
        button = template.cloneNode(true);
        button.id = id;
        button.type = 'button';
        button.removeAttribute('data-i18n-key');
        button.textContent = text;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.onclick = handler;
        return button;
    };

    const setupUI = tx => {
        const activeButtons = document.getElementById(IDS.activeButtons);
        const pause = document.getElementById(IDS.pause);
        if (!activeButtons || !pause || !tx) return false;

        installTransmitter(tx);

        const initialize = makeButton(
            IDS.initialize,
            'Inicializar',
            'Inicializar QR animado',
            () => {
                const current = getTransmitter();
                if (current) current.initialize?.();
            },
            pause
        );
        if (!initialize.parentNode) activeButtons.insertBefore(initialize, activeButtons.firstElementChild);

        const previous = makeButton(
            IDS.previous,
            'Anterior',
            'Mostrar QR anterior',
            () => getTransmitter()?.previousFrame?.(),
            pause
        );
        if (!previous.parentNode) activeButtons.insertBefore(previous, activeButtons.firstElementChild);

        const next = makeButton(
            IDS.next,
            'Próximo',
            'Mostrar próximo QR',
            () => getTransmitter()?.nextFrame?.(),
            pause
        );
        if (!next.parentNode) activeButtons.insertBefore(next, pause.nextSibling);

        pause.onclick = () => {
            const current = getTransmitter();
            if (!current?.initialized) return;
            if (current.paused) current.resume?.();
            else current.pause?.();
            syncUI(current);
        };

        if (!document.getElementById(IDS.seek)) {
            const wrapper = document.createElement('div');
            wrapper.id = IDS.seekWrapper;
            wrapper.className = 'fw column gap-1';
            wrapper.style.cssText = 'width:100%;margin:8px 0 0;';

            const seek = document.createElement('input');
            seek.type = 'range';
            seek.id = IDS.seek;
            seek.className = 'fw';
            seek.style.cssText = 'width:100%;accent-color:#0d6efd;cursor:pointer;';
            seek.setAttribute('aria-label', 'Posição do QR animado');
            seek.addEventListener('input', event => {
                const current = getTransmitter();
                if (current) current.seekFrame?.(Number(event.target.value));
            });
            wrapper.appendChild(seek);
            activeButtons.parentNode.insertBefore(wrapper, activeButtons);
        }

        if (!document.getElementById(IDS.frameInput)) {
            const group = document.createElement('div');
            group.id = IDS.frameGroup;
            group.className = 'row center gap-2';
            group.style.cssText = 'width:100%;justify-content:center;margin:8px 0 0;flex-wrap:wrap;';

            const input = document.createElement('input');
            input.type = 'number';
            input.id = IDS.frameInput;
            input.className = 'btn btn-rounded btn-grey';
            input.min = '1';
            input.step = '1';
            input.inputMode = 'numeric';
            input.style.cssText = 'width:90px;text-align:center;';
            input.setAttribute('aria-label', 'Número do QR');

            const go = document.createElement('button');
            go.type = 'button';
            go.id = IDS.frameGo;
            go.className = 'btn btn-rounded btn-grey';
            go.textContent = 'Ir';
            go.setAttribute('aria-label', 'Ir para o QR informado');
            go.title = 'Ir para o QR informado';

            const goToFrame = () => {
                const current = getTransmitter();
                const value = Number.parseInt(input.value, 10);
                if (current && Number.isFinite(value)) current.seekFrame?.(value - 1);
            };
            go.onclick = goToFrame;
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    goToFrame();
                }
            });

            group.append(input, go);
            activeButtons.parentNode.insertBefore(group, activeButtons);
        }

        syncUI(tx);
        return true;
    };

    const tryInstall = () => {
        const tx = getTransmitter();
        if (!tx) return false;
        setupUI(tx);
        return !!tx.__erikraftRuntimeControlsInstalled;
    };

    let attempts = 0;
    const timer = setInterval(() => {
        if (tryInstall() || ++attempts >= 300) clearInterval(timer);
    }, 100);

    if (document.readyState !== 'loading') tryInstall();
    else document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
})();
