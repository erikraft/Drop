(function setupAnimatedQRUIGuard() {
    'use strict';

    const IDS = {
        activeView: 'qr-send-active-view',
        activeButtons: 'qr-send-active-buttons',
        composeView: 'qr-send-compose-view',
        canvas: 'qr-send-canvas-container',
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
    const stopTimer = tx => {
        if (tx?.timer) clearTimeout(tx.timer);
        if (tx) tx.timer = null;
    };
    const clamp = (tx, index) => {
        const total = tx?.frames?.length || 0;
        if (!total) return 0;
        const value = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : 0;
        return Math.max(0, Math.min(value, total - 1));
    };
    const render = tx => {
        if (!tx?.initialized || !tx.frames?.length || !tx.containerEl) return false;
        tx.currentIndex = clamp(tx, tx.currentIndex);
        const qr = window.ErikrafTDropQR;
        if (!qr || typeof qr.render !== 'function') return false;
        qr.render(tx.containerEl, tx.frames[tx.currentIndex], { width: 300, height: 300, animatedTransfer: true });
        return true;
    };
    const updateProgress = tx => {
        if (!tx || !tx.frames?.length || typeof tx.onProgress !== 'function') return;
        tx.onProgress({
            currentIndex: clamp(tx, tx.currentIndex),
            totalFrames: tx.frames.length,
            numBaseChunks: tx.numBaseChunks,
            fps: tx.fps,
            totalSize: tx.totalSize,
            fileName: tx.metadata?.name || 'Data',
            progressPct: Math.min(100, Math.round(((clamp(tx, tx.currentIndex) + 1) / tx.frames.length) * 100))
        });
    };
    const sync = tx => {
        if (!tx?.frames?.length) return;
        tx.currentIndex = clamp(tx, tx.currentIndex);
        const total = tx.frames.length;
        const seek = document.getElementById(IDS.seek);
        if (seek) {
            seek.min = '0'; seek.max = String(total - 1); seek.value = String(tx.currentIndex);
            seek.disabled = !tx.initialized;
            seek.setAttribute('aria-valuenow', String(tx.currentIndex));
            seek.setAttribute('aria-valuetext', `QR ${tx.currentIndex + 1} de ${total}`);
        }
        const input = document.getElementById(IDS.frameInput);
        if (input) {
            input.min = '1'; input.max = String(total); input.value = String(tx.currentIndex + 1);
            input.disabled = !tx.initialized;
        }
        const init = document.getElementById(IDS.initialize);
        if (init) init.hidden = !!tx.initialized;
        const pause = document.getElementById(IDS.pause);
        if (pause) {
            pause.textContent = tx.paused ? 'Play' : 'Pausar';
            pause.removeAttribute('data-i18n-key');
            pause.setAttribute('aria-label', tx.paused ? 'Reproduzir QR animado' : 'Pausar QR animado');
            pause.title = tx.paused ? 'Play' : 'Pausar';
        }
    };
    const select = (tx, index) => {
        if (!tx?.initialized || !tx.frames?.length) return;
        stopTimer(tx); tx.running = true; tx.paused = true; tx.currentIndex = clamp(tx, index);
        render(tx); updateProgress(tx); sync(tx);
    };

    const install = tx => {
        if (!tx || tx.__erikraftCompleteGuard) return;
        tx.__erikraftCompleteGuard = true;
        tx.start = function () {
            if (!this.frames?.length) return;
            stopTimer(this); this.running = true; this.paused = true; this.initialized = false; this.currentIndex = 0;
            if (this.containerEl && window.ErikrafTDropQR?.destroy) window.ErikrafTDropQR.destroy(this.containerEl);
            const active = document.getElementById(IDS.activeView); if (active) active.hidden = false;
            const buttons = document.getElementById(IDS.activeButtons); if (buttons) buttons.hidden = false;
            sync(this);
        };
        tx.initialize = function () {
            if (!this.frames?.length) return;
            stopTimer(this); this.running = true; this.paused = true; this.initialized = true; this.currentIndex = clamp(this, this.currentIndex);
            const active = document.getElementById(IDS.activeView); if (active) active.hidden = false;
            const buttons = document.getElementById(IDS.activeButtons); if (buttons) buttons.hidden = false;
            const canvas = document.getElementById(IDS.canvas); if (canvas) canvas.hidden = false;
            render(this); updateProgress(this); sync(this);
        };
        tx.pause = function () { stopTimer(this); this.paused = true; sync(this); };
        tx.resume = function () {
            if (!this.initialized || !this.running || !this.frames?.length) return;
            stopTimer(this); this.paused = false;
            const tick = () => {
                if (!this.initialized || !this.running || this.paused || !this.frames?.length) { stopTimer(this); sync(this); return; }
                render(this); updateProgress(this); this.currentIndex = (this.currentIndex + 1) % this.frames.length; sync(this);
                this.timer = setTimeout(tick, 1000 / Math.max(1, Number(this.fps) || 6));
            };
            tick();
        };
        tx.previousFrame = function () { select(this, this.currentIndex - 1); };
        tx.nextFrame = function () { select(this, this.currentIndex + 1); };
        tx.seekFrame = function (index) { select(this, index); };
        sync(tx);
    };

    const wire = () => {
        const tx = getTransmitter();
        if (!tx) return false;
        install(tx);
        const buttons = document.getElementById(IDS.activeButtons);
        const pause = document.getElementById(IDS.pause);
        if (!buttons || !pause) return true;

        pause.onclick = event => {
            event.preventDefault(); event.stopPropagation();
            const current = getTransmitter();
            if (!current?.initialized) return;
            current.paused ? current.resume() : current.pause();
            sync(current);
        };

        const init = document.getElementById(IDS.initialize);
        if (init) init.onclick = event => {
            event.preventDefault(); event.stopPropagation();
            getTransmitter()?.initialize();
        };
        const prev = document.getElementById(IDS.previous);
        if (prev) prev.onclick = event => { event.preventDefault(); event.stopPropagation(); getTransmitter()?.previousFrame(); };
        const next = document.getElementById(IDS.next);
        if (next) next.onclick = event => { event.preventDefault(); event.stopPropagation(); getTransmitter()?.nextFrame(); };

        const seek = document.getElementById(IDS.seek);
        if (seek && !seek.__guardListener) {
            seek.__guardListener = true;
            seek.addEventListener('input', event => getTransmitter()?.seekFrame(Number(event.target.value)));
        }
        const input = document.getElementById(IDS.frameInput);
        const go = document.getElementById(IDS.frameGo);
        const goFrame = () => { const value = Number.parseInt(input?.value, 10); if (Number.isFinite(value)) getTransmitter()?.seekFrame(value - 1); };
        if (go && !go.__guardListener) { go.__guardListener = true; go.addEventListener('click', goFrame); }
        if (input && !input.__guardListener) { input.__guardListener = true; input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goFrame(); } }); }
        sync(tx);
        return true;
    };

    let attempts = 0;
    const interval = setInterval(() => { if (wire() || ++attempts > 300) clearInterval(interval); }, 100);
    const observer = new MutationObserver(() => wire());
    const observe = () => observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true }); else observe();
    wire();
})();