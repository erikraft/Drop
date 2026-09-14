/* ErikrafT Optical Matrix — Beta sender UI */
(function () {
    'use strict';

    const MAX_PAYLOAD = 756;
    const I18N = {
        en: {
            title: 'ErikrafT Optical Matrix', beta: 'Beta (Testing)',
            description: 'High-density optical matrix with colours and symbols for experimental local transfers.',
            textMode: 'Text', fileMode: 'File', textLabel: 'Text to encode', fileLabel: 'File to encode',
            fileHint: 'Files are split into QR frames when needed.', generate: 'Generate matrix',
            close: 'Close', previous: 'Previous', next: 'Next', play: 'Play', stop: 'Stop',
            empty: 'Enter text or select a file.', noFile: 'Select a file first.',
            frame: 'Frame', encoded: 'encoded', bytes: 'bytes', unsupported: 'Camera decoding is not available yet; this Beta currently provides the sender/encoder only.'
        },
        pt: {
            title: 'ErikrafT Optical Matrix', beta: 'Beta (Em testes)',
            description: 'Matriz óptica de alta densidade com cores e símbolos para transferências locais em testes.',
            textMode: 'Texto', fileMode: 'Arquivo', textLabel: 'Texto para codificar', fileLabel: 'Arquivo para codificar',
            fileHint: 'Arquivos maiores são divididos em vários quadros do QR.', generate: 'Gerar matriz',
            close: 'Fechar', previous: 'Anterior', next: 'Próximo', play: 'Reproduzir', stop: 'Parar',
            empty: 'Digite um texto ou selecione um arquivo.', noFile: 'Selecione um arquivo primeiro.',
            frame: 'Quadro', encoded: 'codificado', bytes: 'bytes', unsupported: 'A decodificação pela câmera ainda não está disponível; esta versão Beta fornece o envio/codificação.'
        }
    };

    const locale = () => /^pt(?:-|$)/i.test(document.documentElement.lang || navigator.language || '') ? I18N.pt : I18N.en;
    const t = key => locale()[key] || I18N.en[key] || key;

    function applyCardCopy() {
        const card = document.querySelector('.erikraft-qr-card-send [data-i18n-key="dialogs.optical-matrix-title"]');
        const badge = document.querySelector('.erikraft-qr-card-send [data-i18n-key="dialogs.optical-matrix-experimental"]');
        const description = document.querySelector('.erikraft-qr-card-send [data-i18n-key="dialogs.optical-matrix-description"]');
        const openButton = document.getElementById('optical-matrix-info-btn');
        if (card) card.textContent = t('title');
        if (badge) badge.textContent = t('beta');
        if (description) description.textContent = t('description');
        if (openButton) openButton.textContent = locale() === I18N.pt ? 'Abrir Optical Matrix' : 'Open Optical Matrix';
    }

    function createStyles() {
        if (document.getElementById('optical-matrix-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'optical-matrix-ui-styles';
        style.textContent = `
            #optical-matrix-dialog { width:min(680px,calc(100vw - 20px)); max-width:680px; border:1px solid var(--border-color); border-radius:18px; padding:0; color:var(--primary-color); background:rgb(var(--bg-color)); box-shadow:0 18px 55px rgba(0,0,0,.28); }
            #optical-matrix-dialog::backdrop { background:rgba(0,0,0,.58); backdrop-filter:blur(4px); }
            #optical-matrix-dialog form { box-sizing:border-box; display:grid; gap:12px; padding:22px; }
            #optical-matrix-dialog h2 { margin:0; line-height:1.3; overflow-wrap:anywhere; }
            #optical-matrix-dialog h2 small { display:inline-block; margin-left:6px; font-size:.58em; font-weight:600; color:#3AAB46; vertical-align:middle; }
            #optical-matrix-dialog p { margin:0; color:var(--secondary-color,#666); line-height:1.55; }
            #optical-matrix-dialog .optical-matrix-modes { display:flex; flex-wrap:wrap; gap:8px; }
            #optical-matrix-dialog .optical-matrix-mode { min-height:40px; }
            #optical-matrix-dialog .optical-matrix-mode.selected { border-color:#3AAB46; color:#3AAB46; }
            #optical-matrix-dialog label { color:var(--primary-color); font-weight:600; font-size:13px; }
            #optical-matrix-dialog textarea,#optical-matrix-dialog input[type=file] { width:100%; box-sizing:border-box; border:1px solid var(--border-color); border-radius:10px; background:rgb(var(--bg-color)); color:var(--primary-color); padding:10px 11px; font:inherit; }
            #optical-matrix-dialog textarea { min-height:100px; resize:vertical; }
            #optical-matrix-dialog .optical-matrix-file-hint { font-size:12px; }
            #optical-matrix-dialog canvas { display:block; width:min(100%,576px); height:auto; margin:2px auto 0; image-rendering:pixelated; border-radius:4px; }
            #optical-matrix-dialog .optical-matrix-controls,#optical-matrix-dialog menu { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:8px; padding:0; margin:0; }
            #optical-matrix-dialog .optical-matrix-frame { min-width:100px; text-align:center; color:var(--secondary-color,#666); font-size:12px; }
            #optical-matrix-dialog .btn-primary { background:#3AAB46; border-color:#3AAB46; color:#fff; }
            #optical-matrix-dialog .optical-matrix-warning { padding:10px 12px; border:1px solid var(--border-color); border-radius:10px; font-size:12px; }
            @media (max-width:600px) { #optical-matrix-dialog form { padding:16px; } #optical-matrix-dialog canvas { width:100%; } }
        `;
        document.head.appendChild(style);
    }

    function chunkBytes(bytes, size) {
        const chunks = [];
        for (let offset = 0; offset < bytes.length; offset += size) chunks.push(bytes.slice(offset, Math.min(offset + size, bytes.length)));
        return chunks.length ? chunks : [new Uint8Array()];
    }

    function buildFrames(bytes, filename = '', mime = 'application/octet-stream') {
        const encoder = new window.ErikrafTOpticalMatrix.OpticalMatrixEncoder();
        const header = new TextEncoder().encode(JSON.stringify({ type: 'file', name: filename, mime, size: bytes.length }));
        const capacity = Math.max(1, MAX_PAYLOAD - 12 - header.length - 8);
        const chunks = chunkBytes(bytes, capacity);
        return chunks.map((chunk, index) => {
            const meta = new TextEncoder().encode(JSON.stringify({ type: 'file-frame', name: filename, mime, size: bytes.length, index, total: chunks.length }));
            const payload = new Uint8Array(meta.length + 1 + chunk.length);
            payload.set(meta);
            payload[meta.length] = 10;
            payload.set(chunk, meta.length + 1);
            return encoder.encode(payload);
        });
    }

    function open() {
        let dialog = document.getElementById('optical-matrix-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'optical-matrix-dialog';
            dialog.className = 'optical-matrix-dialog';
            dialog.innerHTML = `
                <form method="dialog">
                    <h2 data-i18n-key="dialogs.optical-matrix-title">${t('title')} <small data-i18n-key="dialogs.optical-matrix-experimental">${t('beta')}</small></h2>
                    <p data-i18n-key="dialogs.optical-matrix-dialog-description">${t('description')}</p>
                    <div class="optical-matrix-modes">
                        <button type="button" class="btn btn-rounded btn-grey optical-matrix-mode selected" data-mode="text">${t('textMode')}</button>
                        <button type="button" class="btn btn-rounded btn-grey optical-matrix-mode" data-mode="file">${t('fileMode')}</button>
                    </div>
                    <section data-panel="text">
                        <label for="optical-matrix-text">${t('textLabel')}</label>
                        <textarea id="optical-matrix-text" rows="4" maxlength="400"></textarea>
                    </section>
                    <section data-panel="file" hidden>
                        <label for="optical-matrix-file">${t('fileLabel')}</label>
                        <input id="optical-matrix-file" type="file">
                        <p class="optical-matrix-file-hint">${t('fileHint')}</p>
                    </section>
                    <div class="optical-matrix-warning">${t('unsupported')}</div>
                    <p id="optical-matrix-status" role="status"></p>
                    <canvas id="optical-matrix-canvas" aria-label="Optical Matrix encoded payload"></canvas>
                    <div class="optical-matrix-controls">
                        <button type="button" id="optical-matrix-prev" class="btn btn-rounded btn-grey">${t('previous')}</button>
                        <span id="optical-matrix-frame" class="optical-matrix-frame"></span>
                        <button type="button" id="optical-matrix-next" class="btn btn-rounded btn-grey">${t('next')}</button>
                        <button type="button" id="optical-matrix-play" class="btn btn-rounded btn-grey">${t('play')}</button>
                    </div>
                    <menu>
                        <button value="cancel" class="btn btn-rounded btn-grey">${t('close')}</button>
                        <button type="button" id="optical-matrix-generate" class="btn btn-rounded btn-primary">${t('generate')}</button>
                    </menu>
                </form>`;
            document.body.appendChild(dialog);
            const canvas = dialog.querySelector('#optical-matrix-canvas');
            let frames = [];
            let current = 0;
            let timer = null;

            const renderFrame = () => {
                if (!frames.length) return;
                const encoder = new window.ErikrafTOpticalMatrix.OpticalMatrixEncoder();
                encoder.render(canvas, frames[current]);
                dialog.querySelector('#optical-matrix-frame').textContent = `${t('frame')} ${current + 1}/${frames.length}`;
            };
            const stop = () => { if (timer) clearInterval(timer); timer = null; dialog.querySelector('#optical-matrix-play').textContent = t('play'); };
            const generate = async () => {
                stop();
                const status = dialog.querySelector('#optical-matrix-status');
                try {
                    if (dialog.querySelector('[data-panel="text"]').hidden === false) {
                        const text = dialog.querySelector('#optical-matrix-text').value;
                        if (!text) throw new Error(t('empty'));
                        const encoded = new window.ErikrafTOpticalMatrix.OpticalMatrixEncoder().encode(new TextEncoder().encode(text));
                        frames = [encoded];
                        current = 0;
                        status.textContent = `${text.length} ${t('encoded')} (${encoded.payload.length} ${t('bytes')}).`;
                    } else {
                        const file = dialog.querySelector('#optical-matrix-file').files[0];
                        if (!file) throw new Error(t('noFile'));
                        frames = buildFrames(new Uint8Array(await file.arrayBuffer()), file.name, file.type || 'application/octet-stream');
                        current = 0;
                        status.textContent = `${file.name} · ${file.size} ${t('bytes')} · ${frames.length} ${t('frame').toLowerCase()}(s).`;
                    }
                    renderFrame();
                } catch (error) { status.textContent = error.message; }
            };
            dialog.querySelectorAll('.optical-matrix-mode').forEach(button => button.addEventListener('click', () => {
                dialog.querySelectorAll('.optical-matrix-mode').forEach(item => item.classList.toggle('selected', item === button));
                dialog.querySelector('[data-panel="text"]').hidden = button.dataset.mode !== 'text';
                dialog.querySelector('[data-panel="file"]').hidden = button.dataset.mode !== 'file';
                stop();
            }));
            dialog.querySelector('#optical-matrix-generate').addEventListener('click', generate);
            dialog.querySelector('#optical-matrix-prev').addEventListener('click', () => { if (!frames.length) return; current = (current - 1 + frames.length) % frames.length; renderFrame(); });
            dialog.querySelector('#optical-matrix-next').addEventListener('click', () => { if (!frames.length) return; current = (current + 1) % frames.length; renderFrame(); });
            dialog.querySelector('#optical-matrix-play').addEventListener('click', () => {
                if (!frames.length) return;
                if (timer) { stop(); return; }
                dialog.querySelector('#optical-matrix-play').textContent = t('stop');
                timer = setInterval(() => { current = (current + 1) % frames.length; renderFrame(); }, 450);
            });
            dialog.addEventListener('close', stop);
        }
        applyCardCopy();
        try { if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal(); else dialog.setAttribute('open', ''); } catch (_) { dialog.setAttribute('open', ''); }
    }

    const bind = () => document.getElementById('optical-matrix-info-btn')?.addEventListener('click', open);
    createStyles();
    applyCardCopy();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
    else bind();
})();