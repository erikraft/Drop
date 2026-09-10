/* ErikrafT Drop™ — WebTorrent browser transfer mode (Beta) */
(function () {
    'use strict';

    const TRACKERS = [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.fastcast.nz'
    ];
    const WEBTORRENT_VERSION = '3.0.21';
    const UTORRENT_GREEN = '#76B83F';
    let client = null;
    let loadingClient = null;
    const objectUrls = new Set();

    const icon = (viewBox, path) => `<svg class="webtorrent-icon" viewBox="${viewBox}" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`;
    const icons = {
        upload: icon('0 0 640 512', 'M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128l-368 0zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39L296 392c0 13.3 10.7 24 24 24s24-10.7 24-24l0-134.1 39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z'),
        magnet: icon('0 0 448 512', 'M0 160l0 96C0 379.7 100.3 480 224 480s224-100.3 224-224l0-96-128 0 0 96c0 53-43 96-96 96s-96-43-96-96l0-96L0 160zm0-32l128 0 0-64c0-17.7-14.3-32-32-32L32 32C14.3 32 0 46.3 0 64l0 64zm320 0l128 0 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64z'),
        download: icon('0 0 512 512', 'M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 242.7-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7 288 32zM64 352c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-101.5 0-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352 64 352zm368 56a24 24 0 1 1 0 48 24 24 0 0 1 0-48z'),
        copy: icon('0 0 448 512', 'M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-28.7-48-64L0 176c0-26.5 21.5-48 48-48z'),
        close: icon('0 0 384 512', 'M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z')
    };

    function ensureStyles() {
        if (document.getElementById('webtorrent-dialog-styles')) return;
        const style = document.createElement('style');
        style.id = 'webtorrent-dialog-styles';
        style.textContent = `
            #webtorrent-btn { display:flex; align-items:center; justify-content:center; }
            #webtorrent-btn .webtorrent-icon { width:20px; height:20px; }
            #webtorrent-dialog { border:0; padding:0; width:min(760px,calc(100vw - 28px)); max-width:760px; background:transparent; color:inherit; }
            #webtorrent-dialog::backdrop { background:rgba(0,0,0,.68); backdrop-filter:blur(6px); }
            .webtorrent-panel { overflow:hidden; border:1px solid rgba(118,184,63,.42); border-radius:22px; background:linear-gradient(145deg,#171a15,#10120f 70%); box-shadow:0 28px 90px rgba(0,0,0,.48); }
            .webtorrent-head { display:flex; align-items:center; gap:13px; padding:20px 22px; border-bottom:1px solid rgba(255,255,255,.08); background:linear-gradient(90deg,rgba(118,184,63,.17),transparent); }
            .webtorrent-brand { display:grid; place-items:center; width:42px; height:42px; border-radius:13px; background:${UTORRENT_GREEN}; color:#fff; box-shadow:0 8px 24px rgba(118,184,63,.24); }
            .webtorrent-brand .webtorrent-icon { width:22px; height:22px; }
            .webtorrent-title { margin:0; font-size:20px; font-weight:750; }
            .webtorrent-subtitle { margin:3px 0 0; color:rgba(255,255,255,.62); font-size:13px; }
            .webtorrent-close { margin-left:auto; width:40px; height:40px; padding:0; border:1px solid rgba(255,255,255,.1); border-radius:12px; background:transparent; color:rgba(255,255,255,.72); cursor:pointer; }
            .webtorrent-close:hover { background:rgba(255,255,255,.08); color:#fff; }
            .webtorrent-close .webtorrent-icon { width:15px; height:15px; }
            .webtorrent-body { display:grid; gap:16px; padding:22px; }
            .webtorrent-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
            .webtorrent-card { min-width:0; padding:18px; border:1px solid rgba(255,255,255,.09); border-radius:17px; background:rgba(255,255,255,.035); }
            .webtorrent-card h3 { margin:0 0 6px; font-size:16px; }
            .webtorrent-card p { margin:0 0 14px; color:rgba(255,255,255,.58); font-size:13px; line-height:1.5; }
            .webtorrent-label { display:block; margin:0 0 7px; font-size:12px; font-weight:700; color:rgba(255,255,255,.72); }
            .webtorrent-input,.webtorrent-textarea { width:100%; box-sizing:border-box; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:#0b0d0a; color:#fff; padding:11px 12px; font:inherit; }
            .webtorrent-textarea { min-height:92px; resize:vertical; }
            .webtorrent-file { width:100%; color:rgba(255,255,255,.72); font-size:13px; }
            .webtorrent-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
            .webtorrent-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:42px; padding:0 14px; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:#20241d; color:#fff; font:600 13px/1 inherit; cursor:pointer; }
            .webtorrent-btn.primary { border-color:${UTORRENT_GREEN}; background:${UTORRENT_GREEN}; color:#fff; }
            .webtorrent-btn:hover { filter:brightness(1.08); }
            .webtorrent-btn:disabled { opacity:.45; cursor:not-allowed; filter:none; }
            .webtorrent-btn .webtorrent-icon { width:15px; height:15px; }
            .webtorrent-result { display:grid; gap:10px; }
            .webtorrent-magnet { display:none; }
            .webtorrent-meta { color:rgba(255,255,255,.62); font-size:12px; line-height:1.5; word-break:break-word; }
            .webtorrent-status { padding:12px 13px; border-radius:12px; background:#0b0d0a; color:rgba(255,255,255,.66); font-size:12px; }
            .webtorrent-status.error { color:#ff9b9b; }
            .webtorrent-status.success { color:#c9f3a8; }
            .webtorrent-progress { width:100%; height:8px; accent-color:${UTORRENT_GREEN}; }
            .webtorrent-file-link { display:inline-flex; align-items:center; gap:7px; color:#dff6ca; text-decoration:none; font-size:13px; }
            .webtorrent-file-link:hover { text-decoration:underline; }
            .webtorrent-footer { display:flex; justify-content:flex-end; padding:0 22px 20px; }
            @media (max-width:700px) { .webtorrent-grid { grid-template-columns:1fr; } #webtorrent-dialog { width:calc(100vw - 18px); } .webtorrent-head { padding:16px; } .webtorrent-body { padding:16px; } .webtorrent-footer { padding:0 16px 16px; } }
        `;
        document.head.appendChild(style);
    }

    function setStatus(message, state) {
        const el = document.getElementById('webtorrent-status');
        if (!el) return;
        el.textContent = message;
        el.classList.toggle('error', state === 'error');
        el.classList.toggle('success', state === 'success');
    }

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
        const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
        const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        return `${(bytes / 1024 ** exponent).toFixed(exponent ? 2 : 0)} ${units[exponent]}`;
    }

    function cleanupUrl(url) {
        if (url) {
            objectUrls.add(url);
            return url;
        }
        return null;
    }

    function createDownloadLink(blob, name) {
        const url = cleanupUrl(URL.createObjectURL(blob));
        const link = document.createElement('a');
        link.className = 'webtorrent-file-link';
        link.href = url;
        link.download = name;
        link.rel = 'noopener';
        link.innerHTML = `${icons.download}<span>${name}</span>`;
        return link;
    }

    async function loadWebTorrent() {
        if (window.WebTorrent) return window.WebTorrent;
        if (!loadingClient) {
            loadingClient = import(`https://esm.sh/webtorrent@${WEBTORRENT_VERSION}`).then(module => {
                const Ctor = module.default || module.WebTorrent;
                if (!Ctor) throw new Error('WebTorrent não pôde ser carregado.');
                window.WebTorrent = Ctor;
                return Ctor;
            });
        }
        return loadingClient;
    }

    async function getClient() {
        const WebTorrent = await loadWebTorrent();
        if (!WebTorrent.WEBRTC_SUPPORT) throw new Error('Este navegador não oferece WebRTC para WebTorrent.');
        if (!client) {
            client = new WebTorrent();
            client.on('error', error => setStatus(`WebTorrent: ${error.message}`, 'error'));
        }
        return client;
    }

    function updateTorrentCard(torrent, card) {
        const meta = card.querySelector('.webtorrent-meta');
        const progress = card.querySelector('.webtorrent-progress');
        if (progress) progress.value = torrent.progress || 0;
        if (meta) meta.textContent = `${Math.round((torrent.progress || 0) * 100)}% · ${torrent.numPeers || 0} peers · ↓ ${formatBytes(torrent.downloadSpeed)}/s · ↑ ${formatBytes(torrent.uploadSpeed)}/s · ${formatBytes(torrent.length)} · ${torrent.files.length} arquivo(s)`;
    }

    function createTorrentCard(torrent, mode) {
        const result = document.getElementById('webtorrent-result');
        if (!result) return null;
        result.replaceChildren();
        const card = document.createElement('div');
        card.className = 'webtorrent-card';
        const heading = document.createElement('h3');
        heading.textContent = torrent.name || 'Torrent';
        const meta = document.createElement('div');
        meta.className = 'webtorrent-meta';
        const progress = document.createElement('progress');
        progress.className = 'webtorrent-progress';
        progress.max = 1;
        const files = document.createElement('div');
        files.className = 'webtorrent-result';
        card.append(heading, meta, progress, files);
        result.appendChild(card);

        const update = () => updateTorrentCard(torrent, card);
        update();
        torrent.on('download', update);
        torrent.on('upload', update);
        torrent.on('wire', update);
        torrent.on('warning', warning => {
            const message = warning && warning.message ? warning.message : String(warning);
            setStatus(`Tracker/peer warning: ${message}`);
        });
        torrent.on('noPeers', announceType => {
            if (!torrent.numPeers) setStatus(`Aguardando peers WebRTC (${announceType || 'discovery'})…`);
        });
        torrent.on('error', error => setStatus(`Torrent: ${error.message}`, 'error'));
        torrent.on('done', async () => {
            update();
            setStatus(mode === 'seed' ? 'Torrent criado e disponível para peers WebRTC.' : 'Transferência concluída.', 'success');
            files.replaceChildren();
            for (const file of torrent.files) {
                try {
                    files.appendChild(createDownloadLink(await file.blob(), file.name));
                } catch (error) {
                    const failed = document.createElement('div');
                    failed.className = 'webtorrent-meta';
                    failed.textContent = `Falha ao preparar ${file.name}: ${error.message}`;
                    files.appendChild(failed);
                }
            }
        });
        return card;
    }

    async function seedFiles() {
        const input = document.getElementById('webtorrent-file');
        if (!input || !input.files || !input.files.length) {
            setStatus('Selecione pelo menos um arquivo.', 'error');
            return;
        }
        const button = document.getElementById('webtorrent-seed');
        button.disabled = true;
        try {
            setStatus('Criando torrent e anunciando para peers WebRTC…');
            const torrentClient = await getClient();
            const torrent = await new Promise((resolve, reject) => {
                let settled = false;
                const onError = error => {
                    if (!settled) {
                        settled = true;
                        reject(error);
                    }
                };
                torrentClient.seed(Array.from(input.files), { announce: TRACKERS }, created => {
                    if (!settled) {
                        settled = true;
                        resolve(created);
                    }
                });
                torrentClient.once('error', onError);
            });

            const magnet = document.getElementById('webtorrent-magnet');
            magnet.value = torrent.magnetURI;
            magnet.style.display = 'block';
            document.getElementById('webtorrent-copy').hidden = false;
            document.getElementById('webtorrent-download-torrent').hidden = false;
            createTorrentCard(torrent, 'seed');
            setStatus('Torrent criado. Mantenha o ErikrafT Drop aberto enquanto outro peer baixa os arquivos.', 'success');
        } catch (error) {
            setStatus(`Não foi possível criar o torrent: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
        }
    }

    async function receiveTorrent(source) {
        const magnet = typeof source === 'string' ? source.trim() : source;
        if (!magnet) {
            setStatus('Informe um Magnet URI ou selecione um arquivo .torrent.', 'error');
            return;
        }
        const buttons = ['webtorrent-receive', 'webtorrent-seed'];
        buttons.forEach(id => { const button = document.getElementById(id); if (button) button.disabled = true; });
        try {
            setStatus('Carregando metadados e procurando peers WebRTC…');
            const torrentClient = await getClient();
            const torrent = torrentClient.add(magnet, { announce: TRACKERS });
            createTorrentCard(torrent, 'download');
            torrent.once('metadata', () => setStatus(`Torrent encontrado: ${torrent.name}`));
        } catch (error) {
            setStatus(`Não foi possível iniciar o download: ${error.message}`, 'error');
        } finally {
            buttons.forEach(id => { const button = document.getElementById(id); if (button) button.disabled = false; });
        }
    }

    async function copyMagnet() {
        const input = document.getElementById('webtorrent-magnet');
        if (!input || !input.value) {
            setStatus('Nenhum Magnet URI disponível.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(input.value);
            setStatus('Magnet URI copiado.', 'success');
        } catch (error) {
            input.focus();
            input.select();
            document.execCommand('copy');
            setStatus('Magnet URI copiado.', 'success');
        }
    }

    function downloadTorrentFile() {
        if (!client) return;
        const torrents = client.torrents || [];
        const torrent = torrents[torrents.length - 1];
        if (!torrent || !torrent.torrentFileBlob) {
            setStatus('Crie um torrent primeiro.', 'error');
            return;
        }
        const link = createDownloadLink(torrent.torrentFileBlob, `${torrent.name || 'erikraft-drop'}.torrent`);
        link.click();
        setStatus('Arquivo .torrent preparado.', 'success');
    }

    function createUI() {
        if (document.getElementById('webtorrent-btn')) return;
        const header = document.querySelector('header');
        if (!header) return;
        ensureStyles();

        const button = document.createElement('button');
        button.id = 'webtorrent-btn';
        button.type = 'button';
        button.className = 'icon-button';
        button.title = 'Torrent (Beta)';
        button.setAttribute('aria-label', 'Abrir transferência Torrent (Beta)');
        button.innerHTML = icons.magnet;
        header.insertBefore(button, header.firstElementChild);

        const dialog = document.createElement('dialog');
        dialog.id = 'webtorrent-dialog';
        dialog.innerHTML = `
            <div class="webtorrent-panel">
                <div class="webtorrent-head">
                    <div class="webtorrent-brand">${icons.magnet}</div>
                    <div><h2 class="webtorrent-title">Torrent</h2><p class="webtorrent-subtitle">Transferência P2P via WebTorrent / WebRTC</p></div>
                    <button class="webtorrent-close" id="webtorrent-close" type="button" aria-label="Fechar">${icons.close}</button>
                </div>
                <div class="webtorrent-body">
                    <div class="webtorrent-grid">
                        <section class="webtorrent-card">
                            <h3>${icons.upload}<span> Enviar arquivos</span></h3>
                            <p>Crie um torrent no navegador e compartilhe o Magnet URI com o receptor.</p>
                            <label class="webtorrent-label" for="webtorrent-file">Arquivos</label>
                            <input id="webtorrent-file" class="webtorrent-file" type="file" multiple>
                            <div class="webtorrent-actions"><button id="webtorrent-seed" class="webtorrent-btn primary" type="button">${icons.upload}<span>Criar torrent</span></button></div>
                        </section>
                        <section class="webtorrent-card">
                            <h3>${icons.magnet}<span> Receber arquivos</span></h3>
                            <p>Cole um Magnet URI ou selecione um arquivo .torrent criado por um peer WebTorrent.</p>
                            <label class="webtorrent-label" for="webtorrent-magnet">Magnet URI</label>
                            <textarea id="webtorrent-magnet" class="webtorrent-textarea" placeholder="magnet:?xt=urn:btih:..." spellcheck="false"></textarea>
                            <input id="webtorrent-file-input" class="webtorrent-file" type="file" accept=".torrent,application/x-bittorrent">
                            <div class="webtorrent-actions">
                                <button id="webtorrent-receive" class="webtorrent-btn primary" type="button">${icons.download}<span>Receber</span></button>
                                <button id="webtorrent-copy" class="webtorrent-btn" type="button" hidden>${icons.copy}<span>Copiar Magnet</span></button>
                                <button id="webtorrent-download-torrent" class="webtorrent-btn" type="button" hidden>${icons.download}<span>Baixar .torrent</span></button>
                            </div>
                        </section>
                    </div>
                    <div id="webtorrent-status" class="webtorrent-status">Pronto.</div>
                    <div id="webtorrent-result"></div>
                </div>
                <div class="webtorrent-footer"><button id="webtorrent-close-footer" class="webtorrent-btn" type="button">Fechar</button></div>
            </div>`;
        document.body.appendChild(dialog);

        const close = () => dialog.close();
        button.addEventListener('click', () => {
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', '');
        });
        dialog.querySelector('#webtorrent-close').addEventListener('click', close);
        dialog.querySelector('#webtorrent-close-footer').addEventListener('click', close);
        dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
        dialog.querySelector('#webtorrent-seed').addEventListener('click', seedFiles);
        dialog.querySelector('#webtorrent-copy').addEventListener('click', copyMagnet);
        dialog.querySelector('#webtorrent-download-torrent').addEventListener('click', downloadTorrentFile);
        dialog.querySelector('#webtorrent-receive').addEventListener('click', async () => {
            const file = dialog.querySelector('#webtorrent-file-input').files[0];
            if (file) {
                try {
                    await receiveTorrent(new Uint8Array(await file.arrayBuffer()));
                } catch (error) {
                    setStatus(`Não foi possível ler o .torrent: ${error.message}`, 'error');
                }
                return;
            }
            await receiveTorrent(dialog.querySelector('#webtorrent-magnet').value);
        });

        dialog.querySelector('#webtorrent-file-input').addEventListener('change', event => {
            const file = event.target.files[0];
            if (file) setStatus(`Arquivo .torrent selecionado: ${file.name}`);
        });
    }

    document.addEventListener('DOMContentLoaded', createUI, { once: true });
    if (document.readyState !== 'loading') createUI();

    window.addEventListener('beforeunload', () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        if (client) client.destroy();
    });
}());
