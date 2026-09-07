class BrowserTabsConnector {
    constructor() {
        if (!('BroadcastChannel' in window)) return;

        this.bc = new BroadcastChannel('pairdrop');
        this.bc.addEventListener('message', e => this._onMessage(e));
        Events.on('broadcast-send', e => this._broadcastSend(e.detail));
    }

    _broadcastSend(message) {
        this.bc.postMessage(message);
    }

    _onMessage(e) {
        console.log('Broadcast:', e.data)
        switch (e.data.type) {
            case 'self-display-name-changed':
                Events.fire('self-display-name-changed', e.data.detail);
                break;
        }
    }

    static peerIsSameBrowser(peerId) {
        let peerIdsBrowser = JSON.parse(localStorage.getItem('peer_ids_browser'));
        return peerIdsBrowser
            ? peerIdsBrowser.indexOf(peerId) !== -1
            : false;
    }

    static async addPeerIdToLocalStorage() {
        const peerId = sessionStorage.getItem('peer_id');
        if (!peerId) return false;

        let peerIdsBrowser = [];
        let peerIdsBrowserOld = JSON.parse(localStorage.getItem('peer_ids_browser'));

        if (peerIdsBrowserOld) peerIdsBrowser.push(...peerIdsBrowserOld);
        peerIdsBrowser.push(peerId);
        peerIdsBrowser = peerIdsBrowser.filter(onlyUnique);
        localStorage.setItem('peer_ids_browser', JSON.stringify(peerIdsBrowser));

        return peerIdsBrowser;
    }

    static async removePeerIdFromLocalStorage(peerId) {
        let peerIdsBrowser = JSON.parse(localStorage.getItem('peer_ids_browser'));
        if (!peerIdsBrowser || !Array.isArray(peerIdsBrowser)) return peerId;
        const index = peerIdsBrowser.indexOf(peerId);
        if (index !== -1) {
            peerIdsBrowser.splice(index, 1);
            localStorage.setItem('peer_ids_browser', JSON.stringify(peerIdsBrowser));
        }
        return peerId;
    }

    static async removeOtherPeerIdsFromLocalStorage() {
        const peerId = sessionStorage.getItem('peer_id');
        if (!peerId) return false;

        let peerIdsBrowser = JSON.parse(localStorage.getItem('peer_ids_browser')) || [];
        if (!Array.isArray(peerIdsBrowser)) peerIdsBrowser = [];
        if (!peerIdsBrowser.includes(peerId)) {
            peerIdsBrowser.push(peerId);
        }
        localStorage.setItem('peer_ids_browser', JSON.stringify(peerIdsBrowser));
        return peerIdsBrowser;
    }
}

(function loadWebTorrentBeta() {
    const load = () => {
        if (document.querySelector('script[data-erikraft-webtorrent="true"]')) return;
        const script = document.createElement('script');
        script.src = 'scripts/webtorrent-transfer.js';
        script.defer = true;
        script.dataset.erikraftWebtorrent = 'true';
        script.onerror = error => console.warn('[WebTorrent] Beta module failed to load:', error);
        document.head.appendChild(script);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load, { once: true });
    } else {
        load();
    }
}());

(function refreshWeb10UI() {
    const qrPath = 'M120-680q-17 0-28.5-11.5T80-720v-120q0-17 11.5-28.5T120-880h120q17 0 28.5 11.5T280-840q0 17-11.5 28.5T240-800h-80v80q0 17-11.5 28.5T120-680Zm0 600q-17 0-28.5-11.5T80-120v-120q0-17 11.5-28.5T120-280q17 0 28.5 11.5T160-240v80h80q17 0 28.5 11.5T280-120q0 17-11.5 28.5T240-80H120Zm600 0q-17 0-28.5-11.5T680-120q0-17 11.5-28.5T720-160h80v-80q0-17 11.5-28.5T840-280q17 0 28.5 11.5T880-240v120q0 17-11.5 28.5T840-80H720Zm91.5-611.5Q800-703 800-720v-80h-80q-17 0-28.5-11.5T680-840q0-17 11.5-28.5T720-880h120q17 0 28.5 11.5T880-840v120q0 17-11.5 28.5T840-680q-17 0-28.5-11.5ZM700-200v-60h60v60h-60Zm0-120v-60h60v60h-60Zm-60 60v-60h60v60h-60Zm-60 60v-60h60v60h-60Zm-60-60v-60h60v60h-60Zm120-120v-60h60v60h-60Zm-60 60v-60h60v60h-60Zm-60-60v-60h60v60h-60Zm40-140q-17 0-28.5-11.5T520-560v-160q0-17 11.5-28.5T560-760h160q17 0 28.5 11.5T760-720v160q0 17-11.5 28.5T720-520H560ZM240-200q-17 0-28.5-11.5T200-240v-160q0-17 11.5-28.5T240-440h160q17 0 28.5 11.5T440-400v160q0 17-11.5 28.5T400-200H240Zm0-320q-17 0-28.5-11.5T200-560v-160q0-17 11.5-28.5T240-760h160q17 0 28.5 11.5T440-720v160q0 17-11.5 28.5T400-520H240Zm20 260h120v-120H260v120Zm0-320h120v-120H260v120Zm320 0h120v-120H580v120Z';

    const apply = () => {
        // Keep visible version information synchronized with package.json 10.1.0.
        document.querySelectorAll('.font-subheading').forEach(el => {
            if (/^v1\.(13\.0|16\.[36]|17\.0)$/.test(el.textContent.trim())) el.textContent = 'v10.1.0';
        });

        // Replace the header QR icon without relying on the old sprite symbol.
        const qrButton = document.getElementById('openQRScanner');
        if (qrButton) {
            qrButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3" aria-hidden="true"><path d="' + qrPath + '"/></svg>';
        }

        const about = document.getElementById('about');
        if (!about || about.dataset.web10UiApplied === 'true') return;

        const footerLogo = document.querySelector('footer svg.icon.logo');
        const logo = footerLogo ? footerLogo.cloneNode(true) : null;
        if (logo) {
            logo.removeAttribute('class');
            logo.classList.add('about-logo-runtime');
            logo.style.color = '#fff';
            logo.style.fill = '#fff';
            logo.querySelectorAll('*').forEach(node => {
                node.style.fill = '#fff';
                node.style.stroke = '#fff';
            });
        }

        const close = about.querySelector('header') || document.createElement('header');
        if (!close.parentElement) about.appendChild(close);
        close.className = 'row-reverse';
        if (!close.querySelector('.close')) {
            close.innerHTML = '<a href="#" class="close icon-button" aria-label="Fechar"><svg class="icon"><use xlink:href="#close-icon"></use></svg></a>';
        }

        const section = document.createElement('section');
        section.className = 'center column about-content-runtime';
        section.style.cssText = 'overflow-y:auto;width:100%;max-height:100%;box-sizing:border-box;padding:24px;gap:18px;';
        section.innerHTML = '<div class="about-branding-runtime"></div>' +
            '<div class="font-subheading" style="text-align:center;max-width:720px;">Transferência de arquivos peer-to-peer, sem cadastro.</div>' +
            '<div class="about-feature-list-runtime">' +
                '<div class="about-feature-runtime"><i class="fa-solid fa-wifi" aria-hidden="true"></i><div><strong>Descoberta na rede</strong><span>Encontre dispositivos compatíveis na mesma rede.</span></div></div>' +
                '<div class="about-feature-runtime"><i class="fa-solid fa-network-wired" aria-hidden="true"></i><div><strong>WebTorrent (Beta)</strong><span>Transferência P2P baseada em WebRTC para peers compatíveis.</span></div></div>' +
                '<div class="about-feature-runtime"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><div><strong>Privacidade</strong><span>Sem banco de dados central para armazenar os arquivos transferidos.</span></div></div>' +
            '</div>' +
            '<div class="row social-buttons-runtime" role="navigation" aria-label="Links oficiais">' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://github.com/erikraft/Drop" title="GitHub" aria-label="GitHub"><svg class="icon"><use xlink:href="#github"></use></svg></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://github.com/erikraft/Drop-Android" title="Android" aria-label="Android"><i class="fa-brands fa-android" aria-hidden="true"></i></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://discord.gg/KWvqwRxjnA" title="Discord" aria-label="Discord"><svg class="icon"><use xlink:href="#icon-discord"></use></svg></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://www.instagram.com/erikraft.yt/" title="Instagram" aria-label="Instagram"><svg class="icon"><use xlink:href="#instagram"></use></svg></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://ko-fi.com/erikraft" title="Apoiar" aria-label="Apoiar"><svg class="icon"><use xlink:href="#donation"></use></svg></a>' +
            '</div>' +
            '<div class="font-caption" style="max-width:760px;text-align:center;opacity:.7;">WebTorrent e recursos relacionados estão em Beta e podem depender do suporte do navegador e da conectividade entre peers.</div>';

        const branding = section.querySelector('.about-branding-runtime');
        if (logo) branding.appendChild(logo);
        const oldTitle = about.querySelector('.title-wrapper');
        const title = oldTitle ? oldTitle.cloneNode(true) : document.createElement('div');
        title.className = 'title-wrapper';
        title.innerHTML = '<h1>ErikrafT Drop™</h1><div class="font-subheading">v10.1.0</div>';
        branding.appendChild(title);

        about.querySelectorAll('section, .download-badge-grid, img, lord-icon, [data-lordicon-hover-card]').forEach(el => el.remove());
        about.appendChild(section);
        about.dataset.web10UiApplied = 'true';

        const style = document.createElement('style');
        style.textContent = '.about-logo-runtime{width:89px;height:96px;display:block;color:#fff!important;fill:#fff!important}.about-logo-runtime *{fill:#fff!important;stroke:#fff!important}.about-feature-list-runtime{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;width:min(900px,100%)}.about-feature-runtime{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1px solid rgba(127,127,127,.2);border-radius:14px;background:rgba(127,127,127,.06)}.about-feature-runtime>i{width:24px;text-align:center;font-size:20px}.about-feature-runtime div{display:flex;flex-direction:column;gap:3px}.about-feature-runtime span{font-size:.9rem;opacity:.78;line-height:1.4}.social-buttons-runtime{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px}.social-buttons-runtime i{font-size:20px;width:24px;text-align:center}';
        document.head.appendChild(style);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
}());
