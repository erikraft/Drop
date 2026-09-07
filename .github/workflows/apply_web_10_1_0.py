from pathlib import Path
import json
import re

ROOT = Path.cwd()

# Version metadata
pkg = ROOT / 'package.json'
data = json.loads(pkg.read_text(encoding='utf-8'))
data['version'] = '10.1.0'
pkg.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

lock = ROOT / 'package-lock.json'
if lock.exists():
    lock_data = json.loads(lock.read_text(encoding='utf-8'))
    lock_data['version'] = '10.1.0'
    if isinstance(lock_data.get('packages'), dict) and isinstance(lock_data['packages'].get(''), dict):
        lock_data['packages']['']['version'] = '10.1.0'
    lock.write_text(json.dumps(lock_data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Main page
index_path = ROOT / 'public/index.html'
html = index_path.read_text(encoding='utf-8')

for old in ('1.13.0', '1.16.3', '1.16.6', '1.17.0', 'v1.13.0', 'v1.16.3', 'v1.16.6', 'v1.17.0'):
    html = html.replace(old, '10.1.0')

html = re.sub(r'("softwareVersion"\s*:\s*")[^"]+(")', r'\g<1>10.1.0\2', html, count=1)

# Load WebTorrent before the main application bootstrap.
marker = '<script src="scripts/main.js" defer></script>'
webtorrent_tag = '<script src="scripts/webtorrent-transfer.js" defer></script>'
if webtorrent_tag not in html:
    if marker not in html:
        raise RuntimeError('scripts/main.js insertion point not found')
    html = html.replace(marker, webtorrent_tag + '\n    ' + marker, 1)

# Replace only #openQRScanner SVG.
qr_pattern = re.compile(r'(<div id="openQRScanner"\b.*?<svg class="icon">).*?(</svg>\s*</div>)', re.S)
qr_replacement = r'''\1
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3" aria-hidden="true"><path d="M120-680q-17 0-28.5-11.5T80-720v-120q0-17 11.5-28.5T120-880h120q17 0 28.5 11.5T280-840q0 17-11.5 28.5T240-800h-80v80q0 17-11.5 28.5T120-680Zm0 600q-17 0-28.5-11.5T80-120v-120q0-17 11.5-28.5T120-280q17 0 28.5 11.5T160-240v80h80q17 0 28.5 11.5T280-120q0 17-11.5 28.5T240-80H120Zm600 0q-17 0-28.5-11.5T680-120q0-17 11.5-28.5T720-160h80v-80q0-17 11.5-28.5T840-280q17 0 28.5 11.5T880-240v120q0 17-11.5 28.5T840-80H720Zm91.5-611.5Q800-703 800-720v-80h-80q-17 0-28.5-11.5T680-840q0-17 11.5-28.5T720-880h120q17 0 28.5 11.5T880-840v120q0 17-11.5 28.5T840-680q-17 0-28.5-11.5ZM700-200v-60h60v60h-60Zm0-120v-60h60v60h-60Zm-60 60v-60h60v60h-60Zm-60 60v-60h60v60h-60Zm-60-60v-60h60v60h-60Zm120-120v-60h60v60h-60Zm-60 60v-60h60v60h-60Zm-60-60v-60h60v60h-60Zm40-140q-17 0-28.5-11.5T520-560v-160q0-17 11.5-28.5T560-760h160q17 0 28.5 11.5T760-720v160q0 17-11.5 28.5T720-520H560ZM240-200q-17 0-28.5-11.5T200-240v-160q0-17 11.5-28.5T240-440h160q17 0 28.5 11.5T440-400v160q0 17-11.5 28.5T400-200H240Zm0-320q-17 0-28.5-11.5T200-560v-160q0-17 11.5-28.5T240-760h160q17 0 28.5 11.5T440-720v160q0 17-11.5 28.5T400-520H240Zm20 260h120v-120H260v120Zm0-320h120v-120H260v120Zm320 0h120v-120H580v120Z"/></svg>
          \2'''
html, count = qr_pattern.subn(qr_replacement, html, count=1)
if count != 1:
    raise RuntimeError('#openQRScanner SVG not found')

# Reuse the existing footer logo in About without the clickable footer classes.
logo_match = re.search(r'<svg\b[^>]*class="icon logo"[^>]*>.*?</svg>', html, re.S)
if not logo_match:
    raise RuntimeError('footer SVG logo not found')
logo = re.sub(r'\bclass="icon logo"', 'class="about-logo"', logo_match.group(0), count=1)
logo = re.sub(r'\s+style="[^"]*"', '', logo, count=1)

about = f'''    <x-about id="about" class="full center column">
        <header class="row-reverse">
            <a href="#" class="close icon-button" data-i18n-key="about.close-about" data-i18n-attrs="aria-label">
                <svg class="icon"><use xlink:href="#close-icon"></use></svg>
            </a>
        </header>
        <section class="center column about-content" style="overflow-y:auto;width:100%;max-height:100%;box-sizing:border-box;padding:24px;">
            <div class="about-branding">
                {logo}
                <div class="title-wrapper" dir="ltr">
                    <h1>ErikrafT Drop™</h1>
                    <div class="font-subheading">v10.1.0</div>
                </div>
            </div>
            <div class="font-subheading about-claim" data-i18n-key="about.claim" data-i18n-attrs="text">
                Transferência de arquivos peer-to-peer, sem cadastro.
            </div>
            <div class="about-feature-list" role="list">
                <div class="about-feature" role="listitem"><i class="fa-solid fa-wifi" aria-hidden="true"></i><div><strong>Descoberta na rede</strong><span>Encontre dispositivos compatíveis na mesma rede.</span></div></div>
                <div class="about-feature" role="listitem"><i class="fa-solid fa-network-wired" aria-hidden="true"></i><div><strong>WebTorrent (Beta)</strong><span>Transferência P2P baseada em WebRTC para peers compatíveis.</span></div></div>
                <div class="about-feature" role="listitem"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><div><strong>Privacidade</strong><span>Os arquivos não são armazenados em um banco de dados central.</span></div></div>
            </div>
            <div class="row social-buttons" role="navigation" aria-label="Links oficiais">
                <a class="icon-button" target="_blank" rel="noreferrer" href="https://github.com/erikraft/Drop" title="GitHub" aria-label="GitHub"><svg class="icon"><use xlink:href="#github"></use></svg></a>
                <a class="icon-button" target="_blank" rel="noreferrer" href="https://github.com/erikraft/Drop-Android" title="Android" aria-label="Android"><i class="fa-brands fa-android" aria-hidden="true"></i></a>
                <a class="icon-button" target="_blank" rel="noreferrer" href="https://discord.gg/KWvqwRxjnA" title="Discord" aria-label="Discord"><svg class="icon"><use xlink:href="#icon-discord"></use></svg></a>
                <a class="icon-button" target="_blank" rel="noreferrer" href="https://www.instagram.com/erikraft.yt/" title="Instagram" aria-label="Instagram"><svg class="icon"><use xlink:href="#instagram"></use></svg></a>
                <a class="icon-button" target="_blank" rel="noreferrer" href="https://ko-fi.com/erikraft" title="Apoiar" aria-label="Apoiar"><svg class="icon"><use xlink:href="#donation"></use></svg></a>
            </div>
            <div class="font-caption about-beta-note">WebTorrent e recursos relacionados estão em Beta e podem depender do suporte do navegador e da conectividade entre peers.</div>
        </section>
    </x-about>
'''
about_pattern = re.compile(r'<x-about\b[^>]*\bid=["\']about["\'][^>]*>.*?</x-about>', re.S | re.I)
html, count = about_pattern.subn(about, html, count=1)
if count != 1:
    raise RuntimeError('About section not found')

about_css = '''\n        .about-content { gap:18px; }\n        .about-branding { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; width:100%; }\n        .about-logo { width:89px; height:96px; color:#fff !important; fill:#fff !important; flex:0 0 auto; }\n        .about-logo * { fill:#fff !important; stroke:#fff !important; }\n        .about-branding .title-wrapper { text-align:center; }\n        .about-claim { text-align:center; max-width:720px; }\n        .about-feature-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; width:min(900px,100%); }\n        .about-feature { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; border:1px solid rgba(127,127,127,.2); border-radius:14px; background:rgba(127,127,127,.06); }\n        .about-feature > i { width:24px; text-align:center; font-size:20px; margin-top:2px; }\n        .about-feature div { display:flex; flex-direction:column; gap:3px; }\n        .about-feature span { font-size:.9rem; opacity:.78; line-height:1.4; }\n        .social-buttons { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; }\n        .social-buttons .icon-button { display:inline-flex; align-items:center; justify-content:center; }\n        .social-buttons i { font-size:20px; width:24px; text-align:center; }\n        .about-beta-note { max-width:760px; text-align:center; opacity:.7; }\n'''
if '.about-logo {' not in html:
    html = html.replace('</style>', about_css + '    </style>', 1)
index_path.write_text(html, encoding='utf-8')

# WebTorrent browser mode.
wt_path = ROOT / 'public/scripts/webtorrent-transfer.js'
wt_path.write_text(r'''/* ErikrafT Drop™ — WebTorrent browser transfer mode (Beta) */
(function () {
    'use strict';
    var TRACKERS = ['wss://tracker.btorrent.xyz', 'wss://tracker.openwebtorrent.com', 'wss://tracker.fastcast.nz'];
    var CLIENT_SRC = 'https://cdn.jsdelivr.net/npm/webtorrent@3.0.11/webtorrent.min.js';
    var clientPromise = null;

    function loadClient() {
        if (clientPromise) return clientPromise;
        clientPromise = new Promise(function (resolve, reject) {
            if (window.WebTorrent) return resolve(window.WebTorrent);
            var script = document.createElement('script');
            script.src = CLIENT_SRC;
            script.async = true;
            script.onload = function () { window.WebTorrent ? resolve(window.WebTorrent) : reject(new Error('WebTorrent não foi carregado.')); };
            script.onerror = function () { reject(new Error('Não foi possível carregar o WebTorrent.')); };
            document.head.appendChild(script);
        });
        return clientPromise;
    }

    function status(text, error) {
        var el = document.getElementById('webtorrent-status');
        if (el) { el.textContent = text; el.classList.toggle('text-danger', !!error); }
    }

    function progress(value) {
        var el = document.getElementById('webtorrent-progress');
        if (el) el.value = Math.max(0, Math.min(100, value || 0));
    }

    function getClient() {
        return loadClient().then(function (Ctor) {
            if (!window.__erikraftWebTorrentClient) window.__erikraftWebTorrentClient = new Ctor();
            return window.__erikraftWebTorrentClient;
        });
    }

    function closeDialog() {
        var dialog = document.getElementById('webtorrent-dialog');
        if (!dialog) return;
        if (typeof dialog.close === 'function') dialog.close(); else dialog.setAttribute('hidden', '');
    }

    function seed() {
        var input = document.getElementById('webtorrent-file');
        var file = input && input.files && input.files[0];
        if (!file) return status('Selecione um arquivo primeiro.', true);
        status('Criando transferência WebTorrent…');
        progress(0);
        getClient().then(function (client) {
            return new Promise(function (resolve, reject) {
                var done = false;
                client.seed(file, { announce: TRACKERS }, function (torrent) { if (!done) { done = true; resolve(torrent); } });
                client.on('error', function (error) { if (!done) { done = true; reject(error); } });
            });
        }).then(function (torrent) {
            document.getElementById('webtorrent-magnet').value = torrent.magnetURI;
            status('Transferência criada. Compartilhe o magnet URI com o receptor.');
            torrent.on('download', function () { progress(torrent.progress * 100); });
        }).catch(function (error) { status(error && error.message ? error.message : 'Falha ao criar a transferência.', true); });
    }

    function receive() {
        var input = document.getElementById('webtorrent-magnet');
        var magnet = input && input.value.trim();
        if (!magnet || !/^magnet:/i.test(magnet)) return status('Cole um magnet URI válido.', true);
        status('Conectando aos peers…');
        progress(0);
        getClient().then(function (client) {
            client.add(magnet, { announce: TRACKERS }, function (torrent) {
                status('Recebendo arquivo…');
                torrent.on('download', function () { progress(torrent.progress * 100); });
                torrent.on('done', function () {
                    progress(100);
                    status('Transferência concluída.');
                    var file = torrent.files && torrent.files[0];
                    if (!file) return;
                    file.getBlobURL(function (error, url) {
                        if (error) return status(error.message || 'Não foi possível preparar o download.', true);
                        var result = document.getElementById('webtorrent-result');
                        result.textContent = '';
                        var link = document.createElement('a');
                        link.href = url; link.download = file.name; link.textContent = 'Baixar ' + file.name;
                        link.className = 'btn btn-rounded btn-primary';
                        result.appendChild(link);
                    });
                });
            });
        }).catch(function (error) { status(error && error.message ? error.message : 'Falha ao receber a transferência.', true); });
    }

    function copyMagnet() {
        var input = document.getElementById('webtorrent-magnet');
        if (!input || !input.value) return status('Nenhum magnet URI para copiar.', true);
        var copy = navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject();
        copy.then(function () { status('Magnet URI copiado.'); }).catch(function () { input.select(); document.execCommand('copy'); status('Magnet URI copiado.'); });
    }

    function createUI() {
        if (document.getElementById('webtorrent-btn')) return;
        var header = document.querySelector('header');
        if (!header) return;
        var button = document.createElement('div');
        button.id = 'webtorrent-btn'; button.className = 'icon-button'; button.title = 'WebTorrent (Beta)'; button.setAttribute('aria-label', 'WebTorrent (Beta)');
        button.innerHTML = '<i class="fa-solid fa-network-wired" aria-hidden="true"></i>';
        header.insertBefore(button, header.firstElementChild);

        var dialog = document.createElement('x-dialog');
        dialog.id = 'webtorrent-dialog'; dialog.className = 'erikraft-qr-dialog';
        dialog.innerHTML = '<x-background class="full center"><x-paper shadow="2" style="max-width:650px;width:92%;"><div class="row center p-2"><h2 class="dialog-title">WebTorrent (Beta)</h2></div><div class="column gap-2 p-3"><div class="font-body2 text-secondary">Transferência P2P entre navegadores compatíveis. Nenhum arquivo é armazenado como um upload central.</div><label class="font-caption">Enviar arquivo</label><input id="webtorrent-file" type="file" class="fw"><button id="webtorrent-seed" type="button" class="btn btn-rounded btn-primary">Criar transferência</button><label class="font-caption">Magnet URI</label><textarea id="webtorrent-magnet" class="fw textarea" rows="4" placeholder="Cole o magnet URI aqui"></textarea><div class="row gap-2 wrap"><button id="webtorrent-copy" type="button" class="btn btn-rounded btn-grey">Copiar magnet</button><button id="webtorrent-receive" type="button" class="btn btn-rounded btn-primary">Receber</button></div><progress id="webtorrent-progress" class="fw" value="0" max="100"></progress><div id="webtorrent-status" class="font-caption text-secondary">Pronto.</div><div id="webtorrent-result" class="font-caption word-break"></div></div><div class="btn-row row-reverse wrap p-2"><button id="webtorrent-close" class="btn btn-rounded btn-grey" type="button">Fechar</button></div></x-paper></x-background>';
        document.body.appendChild(dialog);
        button.addEventListener('click', function () { if (typeof dialog.open === 'function') dialog.open(); else dialog.removeAttribute('hidden'); });
        document.getElementById('webtorrent-close').addEventListener('click', closeDialog);
        document.getElementById('webtorrent-seed').addEventListener('click', seed);
        document.getElementById('webtorrent-receive').addEventListener('click', receive);
        document.getElementById('webtorrent-copy').addEventListener('click', copyMagnet);
    }

    document.addEventListener('DOMContentLoaded', createUI);
}());
''', encoding='utf-8')

# Documentation / FAQ updates.
faq_section = '''\n### What is WebTorrent (Beta)?\nWebTorrent is an additional peer-to-peer transfer mode available in compatible modern browsers. It uses WebRTC-capable peers and WebTorrent trackers to help peers discover each other. Transfer data is exchanged between peers rather than stored by ErikrafT Drop™ as a normal cloud-storage operation.\n\nWebTorrent is currently **Beta**. Browser support, NAT/firewall configuration, network restrictions and peer availability can affect whether a transfer can be established or completed.\n\n### Is WebTorrent the same as local network discovery?\nNo. Local discovery helps compatible devices find each other on the same network. WebTorrent uses a magnet-based peer discovery flow and can connect compatible peers beyond the same local network when the browser and network allow it.\n'''
for rel in ('docs/FAQ.md', 'docs/faq.md'):
    path = ROOT / rel
    if path.exists():
        text = path.read_text(encoding='utf-8')
        if 'What is WebTorrent (Beta)?' not in text:
            marker = '\n### What about the connection?'
            text = text.replace(marker, faq_section + marker, 1) if marker in text else text + faq_section
            path.write_text(text, encoding='utf-8')

docs_index = ROOT / 'docs/index.mdx'
if docs_index.exists():
    text = docs_index.read_text(encoding='utf-8')
    if 'WebTorrent (Beta)' not in text:
        text += '''\n\n## WebTorrent (Beta)\n\nErikrafT Drop™ includes an optional WebTorrent transfer mode for compatible modern browsers. It creates a magnet-based peer-to-peer transfer and uses WebRTC-capable peers plus WebTorrent trackers for peer discovery. This mode is experimental and may be affected by browser support, NAT, firewalls and peer availability.\n'''
        docs_index.write_text(text, encoding='utf-8')

# Remove stale one-off automation helpers from the previous beta work.
for rel in (
    '.github/workflows/apply-android-beta-upgrade.yml',
    '.github/workflows/apply_drop_upgrade.py',
    '.github/workflows/fix_and_apply.py',
    '.github/workflows/fix_and_apply2.py',
    '.github/workflows/fix_and_apply3.py',
    '.github/workflows/fix_and_apply4.py',
):
    path = ROOT / rel
    if path.exists():
        path.unlink()

# Delete this migration script and workflow after their generated changes are committed.
for rel in ('.github/workflows/apply_web_10_1_0.py', '.github/workflows/apply-web-10-1-0.yml'):
    path = ROOT / rel
    if path.exists():
        path.unlink()

# Final validations.
assert json.loads(pkg.read_text(encoding='utf-8'))['version'] == '10.1.0'
assert 'scripts/webtorrent-transfer.js' in index_path.read_text(encoding='utf-8')
assert 'v10.1.0' in index_path.read_text(encoding='utf-8')
assert 'WebTorrent (Beta)' in wt_path.read_text(encoding='utf-8')
