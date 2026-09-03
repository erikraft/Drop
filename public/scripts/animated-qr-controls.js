(function setupAnimatedQRRuntimeControls() {
    'use strict';

    const IDS = {
        activeButtons: 'qr-send-active-buttons',
        pause: 'qr-send-pause-btn',
        initialize: 'qr-send-initialize-btn',
        previous: 'qr-send-previous-btn',
        next: 'qr-send-next-btn',
        seek: 'qr-send-frame-seek',
        frameInput: 'qr-send-frame-input',
        frameGo: 'qr-send-frame-go-btn',
        frameGroup: 'qr-send-frame-input-group',
        seekWrapper: 'qr-send-frame-seek-wrapper'
    };

    const getTransmitter = () => window.erikrafTdrop?.animatedQRSendDialog?.transmitter || null;

    // The current transfer format stores binary chunks inside base64 JSON payloads.
    // 2953 raw bytes therefore cannot safely fit in a V40-L QR after base64 and
    // metadata overhead. Keep the user-facing setting but clamp the actual chunk
    // size to a conservative value that the existing QR encoder can render.
    const getSafeChunkSize = (requested, ecc) => {
        const limits = { L: 1800, M: 1400, Q: 1000, H: 700 };
        const level = String(ecc || 'L').toUpperCase();
        const requestedSize = Number.parseInt(requested, 10) || 1800;
        return Math.max(256, Math.min(requestedSize, limits[level] || limits.L));
    };

    let transmitterPrototypePatched = false;
    const patchTransmitterPreparation = () => {
        const Transmitter = window.ErikrafTQRTransmitter;
        if (!Transmitter?.prototype?.prepareBuffer || transmitterPrototypePatched) return;
        const originalPrepareBuffer = Transmitter.prototype.prepareBuffer;
        if (originalPrepareBuffer.__erikraftSafeChunkPatch) {
            transmitterPrototypePatched = true;
            return;
        }
        const patchedPrepareBuffer = async function(buffer, metadata) {
            const requested = this.chunkSize;
            const safe = getSafeChunkSize(requested, this.eccLevel);
            if (safe !== requested) {
                console.warn('[Animated QR] Adjusting bytes/frame for QR capacity:', { requested, safe, eccLevel: this.eccLevel });
            }
            this.chunkSize = safe;
            return originalPrepareBuffer.call(this, buffer, metadata);
        };
        patchedPrepareBuffer.__erikraftSafeChunkPatch = true;
        Transmitter.prototype.prepareBuffer = patchedPrepareBuffer;
        transmitterPrototypePatched = true;
        console.log('[Animated QR] Safe QR payload preparation patch installed');
    };

    const stopTimer = tx => {
        if (!tx) return;
        if (tx.timer) clearTimeout(tx.timer);
        tx.timer = null;
    };
    const clamp = (tx, index) => {
        const total = Array.isArray(tx?.frames) ? tx.frames.length : 0;
        if (!total) return 0;
        const n = Number(index);
        return Math.max(0, Math.min(Number.isFinite(n) ? Math.trunc(n) : 0, total - 1));
    };
    const showActive = () => {
        const view = document.getElementById('qr-send-active-view');
        const buttons = document.getElementById(IDS.activeButtons);
        const canvas = document.getElementById('qr-send-canvas-container');
        if (view) {
            view.hidden = false;
            view.removeAttribute('hidden');
        }
        if (buttons) {
            buttons.hidden = false;
            buttons.removeAttribute('hidden');
        }
        if (canvas) {
            canvas.hidden = false;
            canvas.removeAttribute('hidden');
        }
    };
    const getDisplaySize = () => {
        const select = document.getElementById('qr-send-display-size');
        const value = select?.value || 'medium';
        return { small: 200, medium: 300, large: 400 }[value] || 300;
    };
    const render = tx => {
        if (!tx?.initialized || !tx.frames?.length || !tx.containerEl) return false;
        const qr = window.ErikrafTDropQR;
        if (!qr || typeof qr.render !== 'function') {
            console.error('[Animated QR] ErikrafTDropQR renderer unavailable');
            return false;
        }
        tx.currentIndex = clamp(tx, tx.currentIndex);
        showActive();
        const size = getDisplaySize();
        try {
            const instance = qr.render(tx.containerEl, tx.frames[tx.currentIndex], {
                width: size,
                height: size,
                eccLevel: tx.eccLevel,
                animatedTransfer: true
            });
            const renderedNode = tx.containerEl.querySelector('svg, canvas');
            if (!renderedNode) {
                console.error('[Animated QR] Renderer returned without creating SVG/canvas', {
                    container: tx.containerEl,
                    instance,
                    frame: tx.currentIndex + 1
                });
                return false;
            }
            renderedNode.removeAttribute('hidden');
            renderedNode.style.display = 'block';
            renderedNode.style.maxWidth = '100%';
            renderedNode.style.height = 'auto';
        } catch (error) {
            console.error('[Animated QR] Frame render failed:', error, {
                frame: tx.currentIndex + 1,
                totalFrames: tx.frames.length,
                eccLevel: tx.eccLevel,
                chunkSize: tx.chunkSize,
                dataLength: tx.frames[tx.currentIndex]?.length
            });
            return false;
        }
        if (typeof tx.onProgress === 'function') {
            try {
                tx.onProgress({
                    currentIndex: tx.currentIndex,
                    totalFrames: tx.frames.length,
                    numBaseChunks: tx.numBaseChunks,
                    fps: tx.fps,
                    totalSize: tx.totalSize,
                    fileName: tx.metadata?.name || 'Data',
                    progressPct: Math.min(100, Math.round(((tx.currentIndex + 1) / tx.frames.length) * 100))
                });
            } catch (error) {
                console.warn('[Animated QR] Progress callback failed:', error);
            }
        }
        return true;
    };
    const sync = tx => {
        if (!tx?.frames?.length) return;
        tx.currentIndex = clamp(tx, tx.currentIndex);
        const total = tx.frames.length;
        const buttons = document.getElementById(IDS.activeButtons);
        if (buttons) {
            buttons.hidden = false;
            buttons.removeAttribute('hidden');
        }
        const seek = document.getElementById(IDS.seek);
        if (seek) {
            seek.min = '0';
            seek.max = String(total - 1);
            seek.value = String(tx.currentIndex);
            seek.disabled = !tx.initialized;
            seek.setAttribute('aria-valuemin', '0');
            seek.setAttribute('aria-valuemax', String(total - 1));
            seek.setAttribute('aria-valuenow', String(tx.currentIndex));
            seek.setAttribute('aria-valuetext', `QR ${tx.currentIndex + 1} de ${total}`);
        }
        const input = document.getElementById(IDS.frameInput);
        if (input) {
            input.min = '1';
            input.max = String(total);
            input.value = String(tx.currentIndex + 1);
            input.disabled = !tx.initialized;
        }
        const init = document.getElementById(IDS.initialize);
        if (init) init.hidden = !!tx.initialized;
        const previous = document.getElementById(IDS.previous);
        if (previous) previous.disabled = !tx.initialized;
        const next = document.getElementById(IDS.next);
        if (next) next.disabled = !tx.initialized;
        const pause = document.getElementById(IDS.pause);
        if (pause) {
            pause.textContent = tx.paused ? 'Play' : 'Pausar';
            pause.removeAttribute('data-i18n-key');
            pause.setAttribute('aria-label', tx.paused ? 'Reproduzir QR animado' : 'Pausar QR animado');
            pause.title = tx.paused ? 'Play' : 'Pausar';
            pause.disabled = !tx.initialized;
        }
        const go = document.getElementById(IDS.frameGo);
        if (go) go.disabled = !tx.initialized;
    };
    const select = (tx, index) => {
        if (!tx?.initialized || !tx.frames?.length) return;
        stopTimer(tx);
        tx.running = true;
        tx.paused = true;
        tx.currentIndex = clamp(tx, index);
        render(tx);
        sync(tx);
    };
    const install = tx => {
        if (!tx || !Array.isArray(tx.frames) || tx.__erikraftAnimatedControlsOwned) return;
        tx.__erikraftAnimatedControlsOwned = true;
        // qr-helper.js has a legacy controller loaded before this file. This
        // controller is the final owner of animated playback state.
        tx.__erikraftPlaybackControlsInstalled = true;
        tx.initialized = false;
        tx.start = function () {
            if (!this.frames?.length) return;
            stopTimer(this);
            this.running = true;
            this.paused = true;
            this.initialized = false;
            this.currentIndex = 0;
            if (this.containerEl && window.ErikrafTDropQR?.destroy) window.ErikrafTDropQR.destroy(this.containerEl);
            sync(this);
        };
        tx.initialize = function () {
            if (!this.frames?.length) return;
            stopTimer(this);
            this.running = true;
            this.paused = true;
            this.initialized = true;
            this.currentIndex = clamp(this, this.currentIndex);
            showActive();
            if (!render(this)) {
                this.initialized = false;
            }
            sync(this);
        };
        tx.pause = function () {
            stopTimer(this);
            this.paused = true;
            sync(this);
        };
        tx.resume = function () {
            if (!this.running || !this.initialized || !this.frames?.length) return;
            stopTimer(this);
            this.paused = false;
            const tick = () => {
                if (!this.running || this.paused || !this.initialized || !this.frames?.length) {
                    stopTimer(this);
                    sync(this);
                    return;
                }
                if (!render(this)) {
                    this.paused = true;
                    sync(this);
                    return;
                }
                this.currentIndex = (this.currentIndex + 1) % this.frames.length;
                sync(this);
                this.timer = setTimeout(tick, 1000 / Math.max(1, Number(this.fps) || 6));
            };
            tick();
        };
        tx.previousFrame = function () { select(this, this.currentIndex - 1); };
        tx.nextFrame = function () { select(this, this.currentIndex + 1); };
        tx.seekFrame = function (index) { select(this, index); };
        sync(tx);
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
    const setup = tx => {
        const buttons = document.getElementById(IDS.activeButtons);
        const pause = document.getElementById(IDS.pause);
        if (!buttons || !pause || !tx) {
            console.warn('[Animated QR] Missing required elements:', { buttons: !!buttons, pause: !!pause, tx: !!tx });
            return false;
        }
        console.log('[Animated QR] Setting up controls for transmitter with', tx.frames?.length, 'frames');
        install(tx);
        if (tx.frames?.length) {
            buttons.hidden = false;
            buttons.removeAttribute('hidden');
        }
        const init = makeButton(IDS.initialize, 'Inicializar', 'Inicializar QR animado', () => {
            console.log('[Animated QR] Inicializar button clicked');
            const current = getTransmitter();
            if (current?.initialize) current.initialize();
        }, pause);
        if (init && !init.parentNode) buttons.insertBefore(init, buttons.firstElementChild);
        const prev = makeButton(IDS.previous, 'Anterior', 'Mostrar QR anterior', () => {
            console.log('[Animated QR] Anterior button clicked');
            const current = getTransmitter();
            if (current?.previousFrame) current.previousFrame();
        }, pause);
        if (prev && !prev.parentNode) buttons.insertBefore(prev, buttons.firstElementChild);
        const next = makeButton(IDS.next, 'Próximo', 'Mostrar próximo QR', () => {
            console.log('[Animated QR] Próximo button clicked');
            const current = getTransmitter();
            if (current?.nextFrame) current.nextFrame();
        }, pause);
        if (next && !next.parentNode) buttons.insertBefore(next, pause.nextSibling);
        if (!pause.dataset.erikraftControlCapture) {
            pause.dataset.erikraftControlCapture = 'true';
            pause.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const current = getTransmitter();
                console.log('[Animated QR] Pause button clicked, initialized:', current?.initialized, 'paused:', current?.paused);
                if (!current?.initialized) return;
                current.paused ? current.resume() : current.pause();
                sync(current);
            }, true);
        }
        if (!document.getElementById(IDS.seek)) {
            const wrapper = document.createElement('div');
            wrapper.id = IDS.seekWrapper;
            wrapper.className = 'fw column gap-1';
            wrapper.style.cssText = 'width:100%;margin:8px 0 0;';
            const seek = document.createElement('input');
            seek.type = 'range';
            seek.id = IDS.seek;
            seek.className = 'fw';
            seek.style.cssText = 'width:100%;accent-color:#0d6efd;cursor:pointer;touch-action:pan-x;';
            seek.setAttribute('aria-label', 'Posição do QR animado');
            seek.addEventListener('input', event => {
                const current = getTransmitter();
                if (current?.seekFrame) current.seekFrame(Number(event.target.value));
            });
            wrapper.appendChild(seek);
            buttons.parentNode.insertBefore(wrapper, buttons);
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
            input.style.cssText = 'width:min(90px,24vw);text-align:center;box-sizing:border-box;';
            input.setAttribute('aria-label', 'Número do QR');
            const go = document.createElement('button');
            go.type = 'button';
            go.id = IDS.frameGo;
            go.className = 'btn btn-rounded btn-grey';
            go.textContent = 'Ir';
            go.setAttribute('aria-label', 'Ir para o QR informado');
            go.title = 'Ir para o QR informado';
            const goFrame = () => {
                const value = Number.parseInt(input.value, 10);
                const current = getTransmitter();
                if (Number.isFinite(value) && current?.seekFrame) current.seekFrame(value - 1);
            };
            go.onclick = goFrame;
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    goFrame();
                }
            });
            group.append(input, go);
            buttons.parentNode.insertBefore(group, buttons);
        }
        sync(tx);
        console.log('[Animated QR] Controls setup completed');
        return true;
    };
    const tryInstall = () => {
        patchTransmitterPreparation();
        const tx = getTransmitter();
        if (!tx) return false;
        setup(tx);
        return !!tx.__erikraftAnimatedControlsOwned;
    };
    let attempts = 0;
    const timer = setInterval(() => {
        patchTransmitterPreparation();
        if (tryInstall() || ++attempts >= 300) clearInterval(timer);
    }, 100);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
    else tryInstall();
})();