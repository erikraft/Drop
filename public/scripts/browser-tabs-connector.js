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
        document.querySelectorAll('.font-subheading').forEach(el => {
            if (/^v1\.(13\.0|16\.[36]|17\.0)$/.test(el.textContent.trim())) el.textContent = 'v10.1.0';
        });

        const qrButton = document.getElementById('openQRScanner');
        if (qrButton) {
            qrButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3" aria-hidden="true"><path d="' + qrPath + '"/></svg>';
        }

        const about = document.getElementById('about');
        if (!about || about.dataset.web10UiApplied === 'true') return;

        // Reuse the actual footer SVG, but detach it completely from footer/icon CSS.
        const footerLogo = document.querySelector('footer svg.icon.logo');
        let logo = null;
        if (footerLogo) {
            logo = footerLogo.cloneNode(true);
            logo.removeAttribute('class');
            logo.removeAttribute('style');
            logo.setAttribute('width', '89');
            logo.setAttribute('height', '96');
            logo.setAttribute('aria-hidden', 'true');
            logo.setAttribute('focusable', 'false');
            logo.classList.add('about-logo-runtime');
            logo.style.setProperty('display', 'block', 'important');
            logo.style.setProperty('width', '89px', 'important');
            logo.style.setProperty('height', '96px', 'important');
            logo.style.setProperty('min-width', '89px', 'important');
            logo.style.setProperty('min-height', '96px', 'important');
            logo.style.setProperty('color', '#fff', 'important');
            logo.style.setProperty('fill', '#fff', 'important');
            logo.querySelectorAll('*').forEach(node => {
                node.removeAttribute('class');
                node.style.setProperty('color', '#fff', 'important');
                node.style.setProperty('fill', '#fff', 'important');
                node.style.setProperty('stroke', '#fff', 'important');
            });
        }

        const header = about.querySelector(':scope > header') || document.createElement('header');
        if (!header.parentElement) about.appendChild(header);
        header.className = 'row-reverse';
        header.innerHTML = '<a href="#" class="close icon-button" data-i18n-key="about.close-about" data-i18n-attrs="aria-label"><svg class="icon"><use xlink:href="#close-icon"></use></svg></a>';

        // Remove only the old About content. Do not use a generic section selector after
        // creating the replacement, otherwise component CSS can re-style the new content.
        Array.from(about.children).forEach(child => {
            if (child !== header) child.remove();
        });

        const content = document.createElement('div');
        content.className = 'about-content-runtime';
        content.innerHTML =
            '<div class="about-branding-runtime"></div>' +
            '<p class="about-subtitle-runtime">Transferência de arquivos peer-to-peer, sem cadastro.</p>' +
            '<div class="about-feature-list-runtime" role="list">' +
                '<article class="about-feature-runtime" role="listitem"><div class="about-feature-icon-runtime"><i class="fa-solid fa-wifi" aria-hidden="true"></i></div><div class="about-feature-copy-runtime"><strong>Descoberta na rede</strong><span>Encontre dispositivos compatíveis na mesma rede.</span></div></article>' +
                '<article class="about-feature-runtime" role="listitem"><div class="about-feature-icon-runtime"><i class="fa-solid fa-network-wired" aria-hidden="true"></i></div><div class="about-feature-copy-runtime"><strong>WebTorrent (Beta)</strong><span>Transferência P2P baseada em WebRTC para peers compatíveis.</span></div></article>' +
                '<article class="about-feature-runtime" role="listitem"><div class="about-feature-icon-runtime"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i></div><div class="about-feature-copy-runtime"><strong>Privacidade</strong><span>Sem banco de dados central para armazenar os arquivos transferidos.</span></div></article>' +
            '</div>' +
            '<div class="social-buttons-runtime" role="navigation" aria-label="Links oficiais">' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://github.com/erikraft/Drop" title="GitHub" aria-label="GitHub"><svg class="icon"><use xlink:href="#github"></use></svg></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://github.com/erikraft/Drop-Android" title="Android" aria-label="Android"><i class="fa-brands fa-android" aria-hidden="true"></i></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://discord.gg/KWvqwRxjnA" title="Discord" aria-label="Discord"><svg class="icon"><use xlink:href="#icon-discord"></use></svg></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://www.instagram.com/erikraft.yt/" title="Instagram" aria-label="Instagram"><svg class="icon"><use xlink:href="#instagram"></use></svg></a>' +
                '<a class="icon-button" target="_blank" rel="noreferrer" href="https://ko-fi.com/erikraft" title="Apoiar" aria-label="Apoiar"><svg class="icon"><use xlink:href="#donation"></use></svg></a>' +
            '</div>' +
            '<p class="about-note-runtime">WebTorrent e recursos relacionados estão em Beta e podem depender do suporte do navegador e da conectividade entre peers.</p>';

        const branding = content.querySelector('.about-branding-runtime');
        if (logo) branding.appendChild(logo);
        const title = document.createElement('div');
        title.className = 'title-wrapper about-title-runtime';
        title.innerHTML = '<h1>ErikrafT Drop™</h1><div class="font-subheading">v10.1.0</div>';
        branding.appendChild(title);

        about.appendChild(content);
        about.dataset.web10UiApplied = 'true';

        const style = document.createElement('style');
        style.textContent = `
            #about .about-content-runtime {
                box-sizing: border-box;
                width: min(920px, calc(100% - 32px));
                max-width: 920px;
                max-height: calc(100vh - 72px);
                margin: 0 auto;
                padding: 16px 0 28px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                gap: 18px;
                overflow-x: hidden;
                overflow-y: auto;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
            }
            #about .about-branding-runtime {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                gap: 10px;
                text-align: center;
                flex: 0 0 auto;
            }
            #about .about-logo-runtime {
                flex: 0 0 auto !important;
                object-fit: contain;
            }
            #about .about-title-runtime {
                width: 100%;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                text-align: center;
            }
            #about .about-title-runtime h1 {
                margin: 0;
                line-height: 1.15;
            }
            #about .about-subtitle-runtime,
            #about .about-note-runtime {
                width: min(760px, 100%);
                margin: 0;
                text-align: center;
                line-height: 1.5;
            }
            #about .about-feature-list-runtime {
                box-sizing: border-box;
                width: 100%;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                align-items: stretch;
                gap: 12px;
                margin: 0;
            }
            #about .about-feature-runtime {
                box-sizing: border-box;
                min-width: 0;
                width: 100%;
                min-height: 112px;
                margin: 0;
                padding: 16px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: flex-start;
                gap: 10px;
                border: 1px solid rgba(127,127,127,.22);
                border-radius: 14px;
                background: rgba(127,127,127,.06);
                text-align: left;
            }
            #about .about-feature-icon-runtime {
                width: 38px;
                height: 38px;
                flex: 0 0 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                background: rgba(127,127,127,.10);
            }
            #about .about-feature-icon-runtime i {
                font-size: 18px;
                line-height: 1;
            }
            #about .about-feature-copy-runtime {
                min-width: 0;
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            #about .about-feature-copy-runtime strong {
                font-size: .98rem;
                line-height: 1.3;
            }
            #about .about-feature-copy-runtime span {
                font-size: .86rem;
                line-height: 1.45;
                opacity: .78;
            }
            #about .social-buttons-runtime {
                width: 100%;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin: 0;
            }
            #about .social-buttons-runtime .icon-button {
                flex: 0 0 auto;
            }
            #about .social-buttons-runtime i {
                font-size: 20px;
                width: 24px;
                text-align: center;
            }
            #about .about-note-runtime {
                opacity: .7;
                font-size: .82rem;
            }
            @media (max-width: 720px) {
                #about .about-content-runtime {
                    width: min(100% - 20px, 560px);
                    max-height: calc(100vh - 60px);
                    padding: 10px 0 22px;
                    gap: 14px;
                }
                #about .about-feature-list-runtime {
                    grid-template-columns: 1fr;
                }
                #about .about-feature-runtime {
                    min-height: 0;
                }
            }
            @media (min-width: 721px) and (max-width: 900px) {
                #about .about-feature-list-runtime {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
        `;
        document.head.appendChild(style);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
}());
