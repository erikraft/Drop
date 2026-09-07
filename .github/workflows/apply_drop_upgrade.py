from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]

# Version metadata
pkg = ROOT / 'package.json'
data = json.loads(pkg.read_text(encoding='utf-8'))
data['version'] = '1.17.0'
pkg.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

index = ROOT / 'public/index.html'
html = index.read_text(encoding='utf-8')

# Keep all public version references synchronized.
html = re.sub(r'("softwareVersion"\s*:\s*")([^\"]+)(")', r'\g<1>1.17.0\3', html)
html = html.replace('<div class="font-subheading">v1.13.0</div>', '<div class="font-subheading">v1.17.0</div>')

# Load the WebTorrent mode without disturbing the existing PairDrop scripts.
marker = '<script src="scripts/main.js" defer></script>'
script_tag = '<script src="scripts/webtorrent-transfer.js" defer></script>'
if script_tag not in html:
    html = html.replace(marker, script_tag + '\n    ' + marker)

# Rebuild the About screen. The old screen had malformed nested social-button rows,
# animated Lord Icons and image badges, which made the Android WebView About screen
# appear empty on some devices.
footer_logo_match = re.search(r'<svg class="icon logo"[^>]*height="80"[^>]*>.*?</svg>', html, re.S)
if not footer_logo_match:
    footer_logo_match = re.search(r'<svg class="icon logo"[^>]*>.*?</svg>', html, re.S)
logo = footer_logo_match.group(0) if footer_logo_match else '<svg viewBox="1.4198 0.9793 13.76 14.24" width="89" height="96"></svg>'
logo = logo.replace('class="icon logo"', 'class="about-logo"')
logo = logo.replace('fill="currentColor"', 'fill="#ffffff"')
logo = re.sub(r'\s+height="80"\s+width="80"', ' height="96" width="89"', logo)

about = '''    <!-- About Page -->
    <x-about id="about" class="full center column">
        <header class="row-reverse">
            <a href="#" class="close icon-button" data-i18n-key="about.close-about" data-i18n-attrs="aria-label">
                <svg class="icon"><use xlink:href="#close-icon"></use></svg>
            </a>
        </header>
        <section class="center column" style="padding: 24px; box-sizing: border-box; overflow-y: auto; width: 100%; max-height: 100%;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:12px; width:100%;">
                __LOGO__
                <div class="title-wrapper" dir="ltr" style="text-align:center;">
                    <h1>ErikrafT Drop™</h1>
                    <div class="font-subheading">v1.17.0</div>
                </div>
                <div class="font-subheading" data-i18n-key="about.claim" data-i18n-attrs="text" style="text-align:center; max-width:720px;">
                    A maneira mais fácil de transferir arquivos entre dispositivos
                </div>
                <div class="row social-buttons" style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">
                    <a class="icon-button" target="_blank" href="https://github.com/erikraft/Drop" rel="noreferrer" data-i18n-key="about.github" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#github"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://ko-fi.com/erikraft" rel="noreferrer" data-i18n-key="about.buy-me-a-coffee" data-i18n-attrs="title"><i class="fa-solid fa-mug-hot icon" aria-hidden="true"></i></a>
                    <a class="icon-button" target="_blank" href="https://x.com/ErikrafTbr" rel="noreferrer" data-i18n-key="about.tweet" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#x-twitter"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://www.instagram.com/erikraft_drop" rel="noreferrer" data-i18n-key="about.instagram" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#instagram"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://www.threads.com/@erikraft_drop" rel="noreferrer" data-i18n-key="about.threads" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#threads"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://mastodon.social/@ErikrafT" rel="noreferrer" data-i18n-key="about.mastodon" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#mastodon"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://bsky.app/profile/erikraft.com" rel="noreferrer" data-i18n-key="about.bluesky" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#bluesky"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://biodrop.erikraft.com/privacy.html" rel="noreferrer" data-i18n-key="about.privacypolicy" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#privacypolicy"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://github.com/erikraft/Drop/blob/master/docs/faq.md" rel="noreferrer" data-i18n-key="about.faq" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#help-outline"></use></svg></a>
                    <a class="icon-button" target="_blank" href="https://biodrop.erikraft.com/" rel="noreferrer" data-i18n-key="site.biodrop" data-i18n-attrs="title"><svg class="icon"><use xlink:href="#info-outline"></use></svg></a>
                </div>
            </div>
        </section>
    </x-about>'''.replace('__LOGO__', logo)

html, count = re.subn(r'\s*<!-- About Page -->\s*<x-about id="about".*?</x-about>', '\n' + about, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit('Could not replace About page')

# Remove the legacy image badge grid if any stale copy remains elsewhere in the page.
html = re.sub(r'\s*<!-- Botões com Imagens -->\s*<div class="download-badge-grid">.*?</div>\s*(?=\s*</x-about>|\s*<!-- Script)', '', html, flags=re.S)
index.write_text(html, encoding='utf-8')

# WebTorrent browser mode. It uses WebRTC/WebTorrent peers only; file payload never
# passes through Render/Vercel. The UI is injected so it also works inside the Android WebView.
wt = ROOT / 'public/scripts/webtorrent-transfer.js'
wt.write_text(r'''(() => {
    'use strict';

    const TRACKERS = [
        'wss://tracker.btorrent.xyz',
        'wss://tracker.fastcast.nz',
        'wss://tracker.openwebtorrent.com'
    ];

    let clientPromise = null;
    let client = null;

    const isAndroidWebView = () => {
        try {
            return typeof window.ErikrafTdropAndroid !== 'undefined' ||
                /; wv\)/i.test(navigator.userAgent || '') ||
                (/Android/i.test(navigator.userAgent || '') && /Version\/4\.0/i.test(navigator.userAgent || ''));
        } catch (_) { return false; }
    };

    const loadClient = async () => {
        if (!clientPromise) {
            clientPromise = import('https://esm.sh/webtorrent@3.0.11/dist/webtorrent.min.js')
                .then(mod => mod.default || mod.WebTorrent || mod)
                .then(WebTorrent => {
                    if (!WebTorrent.WEBRTC_SUPPORT) throw new Error('WebRTC não é suportado neste ambiente.');
                    client = new WebTorrent({ dht: false, lsd: false });
                    client.on('error', error => console.error('[WebTorrent]', error));
                    return client;
                });
        }
        return clientPromise;
    };

    const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const injectStyles = () => {
        if (document.getElementById('erikraft-webtorrent-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-webtorrent-style';
        style.textContent = `
            #erikraft-webtorrent-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
            #erikraft-webtorrent-card{width:min(680px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:var(--background-color,#151515);color:var(--text-color,#fff);box-shadow:0 20px 80px rgba(0,0,0,.45);padding:22px}
            #erikraft-webtorrent-card input[type=text],#erikraft-webtorrent-card input[type=file]{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(127,127,127,.12);color:inherit;margin:8px 0 12px}
            .erikraft-wt-row{display:flex;gap:10px;flex-wrap:wrap}.erikraft-wt-btn{border:0;border-radius:12px;padding:10px 14px;cursor:pointer;background:rgba(127,127,127,.18);color:inherit}.erikraft-wt-btn.primary{background:#867D6C;color:#fff}.erikraft-wt-status{margin-top:14px;line-height:1.5;word-break:break-word}.erikraft-wt-progress{height:8px;border-radius:999px;background:rgba(127,127,127,.2);overflow:hidden;margin:10px 0}.erikraft-wt-progress>i{display:block;height:100%;width:0;background:#867D6C}.erikraft-wt-file{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid rgba(127,127,127,.15)}
        `;
        document.head.appendChild(style);
    };

    const openModal = async () => {
        injectStyles();
        if (document.getElementById('erikraft-webtorrent-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'erikraft-webtorrent-modal';
        modal.innerHTML = `<div id="erikraft-webtorrent-card" role="dialog" aria-modal="true" aria-labelledby="erikraft-wt-title">
            <div class="erikraft-wt-row" style="justify-content:space-between;align-items:center"><h2 id="erikraft-wt-title" style="margin:0">Transferência via Torrent</h2><button class="erikraft-wt-btn" id="erikraft-wt-close" aria-label="Fechar">✕</button></div>
            <p>Transferência P2P usando WebRTC/WebTorrent. O arquivo não é enviado para o Render nem para o Vercel.</p>
            <div class="erikraft-wt-row"><button class="erikraft-wt-btn primary" id="erikraft-wt-send-tab">Enviar</button><button class="erikraft-wt-btn" id="erikraft-wt-recv-tab">Receber</button></div>
            <section id="erikraft-wt-send"><input id="erikraft-wt-files" type="file" multiple><div class="erikraft-wt-row"><button class="erikraft-wt-btn primary" id="erikraft-wt-seed">Criar Torrent</button></div><div class="erikraft-wt-status" id="erikraft-wt-send-status"></div><input id="erikraft-wt-magnet" type="text" readonly placeholder="Magnet URI"></section>
            <section id="erikraft-wt-recv" hidden><input id="erikraft-wt-magnet-in" type="text" placeholder="Cole o magnet URI"><div class="erikraft-wt-row"><button class="erikraft-wt-btn primary" id="erikraft-wt-download">Baixar</button></div><div class="erikraft-wt-status" id="erikraft-wt-recv-status"></div><div id="erikraft-wt-files-out"></div></section>
        </div>`;
        document.body.appendChild(modal);

        const close = () => { modal.remove(); };
        modal.querySelector('#erikraft-wt-close').onclick = close;
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        const send = modal.querySelector('#erikraft-wt-send');
        const recv = modal.querySelector('#erikraft-wt-recv');
        modal.querySelector('#erikraft-wt-send-tab').onclick = () => { send.hidden = false; recv.hidden = true; };
        modal.querySelector('#erikraft-wt-recv-tab').onclick = () => { send.hidden = true; recv.hidden = false; };

        modal.querySelector('#erikraft-wt-seed').onclick = async () => {
            const input = modal.querySelector('#erikraft-wt-files');
            if (!input.files.length) return;
            const status = modal.querySelector('#erikraft-wt-send-status');
            try {
                status.textContent = 'Inicializando WebTorrent…';
                const c = await loadClient();
                c.seed(Array.from(input.files), { announce: TRACKERS }, torrent => {
                    modal.querySelector('#erikraft-wt-magnet').value = torrent.magnetURI;
                    status.innerHTML = `Torrent criado. Peers: <b>${torrent.numPeers}</b>. Compartilhe o magnet URI.`;
                    torrent.on('upload', () => { status.textContent = `Enviando… ${(torrent.uploadSpeed / 1024 / 1024).toFixed(2)} MB/s`; });
                });
            } catch (error) { status.textContent = error.message || String(error); }
        };

        modal.querySelector('#erikraft-wt-download').onclick = async () => {
            const magnet = modal.querySelector('#erikraft-wt-magnet-in').value.trim();
            const status = modal.querySelector('#erikraft-wt-recv-status');
            const out = modal.querySelector('#erikraft-wt-files-out');
            if (!magnet) return;
            try {
                status.textContent = 'Conectando aos peers…';
                const c = await loadClient();
                c.add(magnet, { announce: TRACKERS }, async torrent => {
                    status.textContent = `Torrent encontrado: ${torrent.name || 'arquivos'} — ${torrent.files.length} arquivo(s).`;
                    out.innerHTML = '';
                    for (const file of torrent.files) {
                        const row = document.createElement('div'); row.className = 'erikraft-wt-file';
                        row.innerHTML = `<span>${esc(file.name)}</span><span>${(file.length / 1024 / 1024).toFixed(2)} MB</span>`;
                        out.appendChild(row);
                        try {
                            const blob = await file.blob();
                            const a = document.createElement('a');
                            a.className = 'erikraft-wt-btn primary';
                            a.download = file.name; a.href = URL.createObjectURL(blob); a.textContent = 'Salvar';
                            row.appendChild(a);
                        } catch (error) { row.appendChild(document.createTextNode(' — erro: ' + error.message)); }
                    }
                    torrent.on('download', () => {
                        status.textContent = `Baixando… ${(torrent.progress * 100).toFixed(1)}% — ${(torrent.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s — peers: ${torrent.numPeers}`;
                    });
                });
            } catch (error) { status.textContent = error.message || String(error); }
        };
    };

    const install = () => {
        const header = document.querySelector('body > header');
        if (!header || document.getElementById('erikraft-webtorrent-btn')) return;
        const button = document.createElement('div');
        button.id = 'erikraft-webtorrent-btn';
        button.className = 'icon-button';
        button.title = 'Transferência via Torrent';
        button.setAttribute('aria-label', 'Transferência via Torrent');
        button.innerHTML = '<i class="fa-solid fa-magnet icon" aria-hidden="true"></i>';
        button.onclick = openModal;
        header.appendChild(button);

        // The native Android WebView already exposes About through the native action bar.
        if (isAndroidWebView()) {
            const about = header.querySelector('a[href="#about"]');
            if (about) about.style.display = 'none';
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
})();
''', encoding='utf-8')

# Documentation
faq = ROOT / 'docs/faq.md'
faq_text = faq.read_text(encoding='utf-8') if faq.exists() else '# Frequently Asked Questions\n'
if 'Transferência via Torrent' not in faq_text:
    faq_text += '''\n## Transferência via Torrent\n\nO ErikrafT Drop™ possui um modo WebTorrent experimental que usa WebRTC para transportar os dados diretamente entre peers. O Render/Vercel não recebe o conteúdo do arquivo; eles continuam sendo infraestrutura de descoberta/sinalização quando usada pelo modo correspondente. Navegadores WebTorrent só conseguem falar diretamente com peers compatíveis com WebRTC/WebTorrent.\n\n## Transferência via Onion no Android\n\nA versão Android possui suporte Beta para um modo Onion/Tor local. O objetivo é executar o Tor no próprio dispositivo, publicar um Onion Service temporário e compartilhar o endereço `.onion` por link, QR Code ou código. Um endereço `.onion` não deve ser tratado como uma URL HTTPS comum fora de um ambiente com Tor.\n'''
faq.write_text(faq_text, encoding='utf-8')

about_dir = ROOT / 'Website About/NEW'
about_dir.mkdir(parents=True, exist_ok=True)
(about_dir / 'transfer-modes.md').write_text('''# ErikrafT Drop™ — Novos modos de transferência\n\n## WebTorrent/P2P\n\nO modo Torrent é baseado em WebTorrent/WebRTC e foi desenhado para Web ↔ Web, Web ↔ Android e Android ↔ Android quando ambos os clientes estiverem em ambientes WebRTC compatíveis. O servidor não recebe o payload do arquivo.\n\n## Onion/Tor no Android\n\nO modo Onion é Android-only e Beta. O dispositivo pode iniciar Tor, criar um Onion Service e compartilhar um endereço `.onion`. O objetivo é manter o conteúdo no dispositivo e usar Tor apenas como transporte de acesso ao serviço.\n\n## Infraestrutura\n\nRender e Vercel continuam sendo usados para a aplicação Web, descoberta/sinalização e fallback. Nenhum armazenamento permanente de arquivos é introduzido.\n''', encoding='utf-8')
'''
}