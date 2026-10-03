(() => {
    'use strict';

    const STORE_KEY = 'erikraft-drop-page-agent-ai';
    const TARGET_ATTR = 'data-erikraft-page-agent-target';
    const EXTENSION_URL = 'https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj';
    const OFFICIAL_URL = 'https://alibaba.github.io/page-agent/';
    const REPOSITORY_URL = 'https://github.com/alibaba/page-agent';
    const CDN_URL = 'https://cdn.jsdelivr.net/npm/page-agent@1.12.4/dist/iife/page-agent.demo.js';
    const MIRROR_URL = 'https://registry.npmmirror.com/page-agent/1.12.4/files/dist/iife/page-agent.demo.js';
    const CDN_BOOKMARKLET = 'javascript:(function()%7Bvar%20s=document.createElement(%27script%27);s.src=%60https://cdn.jsdelivr.net/npm/page-agent@1.12.4/dist/iife/page-agent.demo.js?lang=en-US&t=$%7BMath.random()%7D%60;s.setAttribute(%27crossorigin%27,%20true);s.type=%22text/javascript%22;s.onload=()=%3Econsole.log(%27PageAgent%20script%20loaded!%27);document.body.appendChild(s);%7D)();';
    const MIRROR_BOOKMARKLET = 'javascript:(function()%7Bvar%20s=document.createElement(%27script%27);s.src=%60https://registry.npmmirror.com/page-agent/1.12.4/files/dist/iife/page-agent.demo.js?lang=en-US&t=$%7BMath.random()%7D%60;s.setAttribute(%27crossorigin%27,%20true);s.type=%22text/javascript%22;s.onload=()=%3Econsole.log(%27PageAgent%20script%20loaded!%27);document.body.appendChild(s);%7D)();'

    const isPageAgentLogo = target => target instanceof HTMLImageElement
        && /(?:^|\\/)(?:Page_Agent_Ext|page_agent_js_horizontal_logo)\\.png(?:$|\\?)/i.test(target.src);

    const protectPageAgentLogos = () => {
        const blockLogoInteraction = event => {
            if (!isPageAgentLogo(event.target)) return;
            event.preventDefault();
            event.stopPropagation();
        };

        document.addEventListener('contextmenu', blockLogoInteraction, true);
        document.addEventListener('dragstart', blockLogoInteraction, true);
        document.addEventListener('selectstart', blockLogoInteraction, true);
    };

    const isDesktop = () => {
        if (window.isMobile === true) return false;
        return window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;
    };

    const notify = message => {
        if (typeof Events !== 'undefined') Events.fire('notify-user', message);
        console.info('[Page Agent]', message);
    };

    const t = (key, fallback) => {
        try {
            return typeof Localization !== 'undefined' ? Localization.getTranslation(key) : fallback;
        } catch {
            return fallback;
        }
    };

    const loadPageAgent = (provider, button = null) => {
        if (!isDesktop()) {
            notify(t('ai.desktop-only', 'Page Agent AI is available on desktop only.'));
            return false;
        }

        const script = document.createElement('script');
        const isMirror = provider === 'mirror';
        script.src = (isMirror ? MIRROR_URL : CDN_URL) + '?lang=en-US&t=' + Math.random();
        script.setAttribute('crossorigin', 'true');
        script.type = 'text/javascript';

        if (button) {
            button.setAttribute('aria-busy', 'true');
            button.dataset.pageAgentLoading = 'true';
        }

        script.onload = () => {
            if (button) {
                button.removeAttribute('aria-busy');
                delete button.dataset.pageAgentLoading;
                button.classList.add('is-loaded');
                window.setTimeout(() => button.classList.remove('is-loaded'), 1400);
            }
            notify(t('ai.bookmarklet-loaded', 'Page Agent carregado na página atual.'));
        };

        script.onerror = () => {
            if (button) {
                button.removeAttribute('aria-busy');
                delete button.dataset.pageAgentLoading;
            }
            notify(t('ai.bookmarklet-failed', 'Não foi possível carregar o Page Agent nesta página.'));
        };

        document.body.appendChild(script);
        return true;
    };

    const getConfig = () => {
        try {
            return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        } catch {
            return {};
        }
    };

    const saveConfig = config => localStorage.setItem(STORE_KEY, JSON.stringify({
        baseURL: config.baseURL,
        model: config.model
    }));

    // API keys are intentionally kept only in memory for this page session.
    // Do not persist them in localStorage/sessionStorage or prefill them into the DOM.
    let sessionApiKey = '';
    const getApiKey = () => sessionApiKey;
    const setApiKey = value => {
        sessionApiKey = value || '';
    };

    const getAuthToken = () => localStorage.getItem('PageAgentExtUserAuthToken') || '';
    const setAuthToken = value => value
        ? localStorage.setItem('PageAgentExtUserAuthToken', value)
        : localStorage.removeItem('PageAgentExtUserAuthToken');

    const closeDialog = dialog => {
        if (!dialog) return;
        if (dialog._pageAgentEscapeHandler) {
            document.removeEventListener('keydown', dialog._pageAgentEscapeHandler);
            dialog._pageAgentEscapeHandler = null;
        }
        dialog.remove();
        document.documentElement.classList.remove('erikraft-page-agent-dialog-open');
    };

    const createDialog = ({ title, description = '', width = 560 }) => {
        const overlay = document.createElement('div');
        overlay.className = 'erikraft-page-agent-dialog';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const panel = document.createElement('section');
        panel.className = 'erikraft-page-agent-dialog__panel';
        panel.style.setProperty('--page-agent-dialog-width', width + 'px');

        const header = document.createElement('header');
        header.className = 'erikraft-page-agent-dialog__header';

        const logo = document.createElement('img');
        logo.className = 'erikraft-page-agent-dialog__logo';
        logo.src = 'images/page_agent_js_horizontal_logo.png';
        logo.alt = 'Page Agent Ext';

        const headerActions = document.createElement('div');
        headerActions.className = 'erikraft-page-agent-dialog__header-actions';

        const fullscreen = document.createElement('button');
        fullscreen.type = 'button';
        fullscreen.className = 'erikraft-page-agent-dialog__fullscreen';
        fullscreen.setAttribute('aria-label', t('ai.fullscreen', 'Ver tudo'));
        fullscreen.setAttribute('aria-expanded', 'false');
        fullscreen.textContent = '⛶';

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'erikraft-page-agent-dialog__close';
        close.setAttribute('aria-label', t('ai.dialog-close', 'Fechar'));
        close.textContent = '×';

        headerActions.append(fullscreen, close);

        const body = document.createElement('div');
        body.className = 'erikraft-page-agent-dialog__body';

        if (description) {
            const desc = document.createElement('p');
            desc.className = 'erikraft-page-agent-dialog__description';
            desc.textContent = description;
            body.appendChild(desc);
        }

        header.innerHTML = '<img class="erikraft-page-agent-dialog__logo" src="images/page_agent_js_horizontal_logo.png" alt="Page Agent Ext"><div class="erikraft-page-agent-dialog__header-actions"></div>';
        header.querySelector('.erikraft-page-agent-dialog__header-actions').append(fullscreen, close);
        panel.append(header, body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        document.documentElement.classList.add('erikraft-page-agent-dialog-open');

        const closeAll = () => closeDialog(overlay);
        const onKeyDown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeAll();
            }
        };
        overlay._pageAgentEscapeHandler = onKeyDown;
        document.addEventListener('keydown', onKeyDown);
        const setFullscreen = enabled => {
            panel.classList.toggle('is-fullscreen', enabled);
            fullscreen.setAttribute('aria-expanded', String(enabled));
            fullscreen.setAttribute(
                'aria-label',
                enabled
                    ? t('ai.exit-fullscreen', 'Sair de Ver tudo')
                    : t('ai.fullscreen', 'Ver tudo')
            );
            fullscreen.textContent = enabled ? '⛶' : '⛶';
        };

        fullscreen.addEventListener('click', () => {
            setFullscreen(!panel.classList.contains('is-fullscreen'));
        });
        close.addEventListener('click', closeAll);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeAll();
        });

        return { overlay, panel, body, close: closeAll, setFullscreen };
    };

    const addField = (body, { label, value = '', type = 'text', placeholder = '', autocomplete = 'off' }) => {
        const wrapper = document.createElement('label');
        wrapper.className = 'erikraft-page-agent-dialog__field';
        const caption = document.createElement('span');
        caption.textContent = label;
        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.placeholder = placeholder;
        input.autocomplete = autocomplete;
        wrapper.append(caption, input);
        body.appendChild(wrapper);
        return input;
    };

    const ensureIntegrationStyles = () => {
        if (document.getElementById('erikraft-page-agent-integration-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-page-agent-integration-style';
        style.textContent = `
            .erikraft-page-agent-dialog__integration { display:grid; gap:12px; margin-top:16px; }
            .erikraft-page-agent-dialog__integration-card { display:grid; gap:10px; padding:12px; border:1px solid rgba(var(--text-color),.14); border-radius:14px; background:rgba(var(--bg-color),.28); }
            .erikraft-page-agent-dialog__integration-code { display:block; max-height:96px; overflow:auto; padding:10px; border-radius:10px; white-space:pre-wrap; overflow-wrap:anywhere; font:12px/1.45 monospace; background:rgba(var(--text-color),.06); }
            .erikraft-page-agent-dialog__integration-actions { display:flex; flex-wrap:wrap; gap:8px; }
            @media (max-width:600px) { .erikraft-page-agent-dialog__integration-actions > button { flex:1 1 140px; } }
        `;
        document.head.appendChild(style);
    };

    const customInstructionDialog = target => {
        const dialog = createDialog({
            title: t('ai.custom', 'Instrução personalizada')
        });

        const tools = document.createElement('div');
        tools.className = 'erikraft-page-agent-dialog__tools';

        const toolsTitle = document.createElement('h3');
        toolsTitle.className = 'erikraft-page-agent-dialog__tools-title';
        toolsTitle.textContent = t('ai.bookmarklets-title', 'Usar o Page Agent sem extensão');

        const toolsDescription = document.createElement('p');
        toolsDescription.className = 'erikraft-page-agent-dialog__tools-description';
        toolsDescription.textContent = t(
            'ai.bookmarklets-description',
            'Execute o Page Agent nesta página ou arraste o atalho para a barra de favoritos do navegador.'
        );

        const bookmarkHelp = document.createElement('p');
        bookmarkHelp.className = 'erikraft-page-agent-dialog__bookmarklet-help';
        bookmarkHelp.textContent = t(
            'ai.bookmarklets-help',
            'Para mostrar a barra de favoritos: Windows/Linux Ctrl+Shift+B · macOS ⌘+Shift+B. Depois, arraste o botão de cada opção para a barra.'
        );

        const quickRun = document.createElement('div');
        quickRun.className = 'erikraft-page-agent-dialog__quick-run';

        const quickRunCopy = document.createElement('div');
        quickRunCopy.className = 'erikraft-page-agent-dialog__quick-run-copy';

        const quickRunTitle = document.createElement('strong');
        quickRunTitle.textContent = t('ai.quick-run-title', 'Executar Page Agent 1.12.4');

        const quickRunDescription = document.createElement('span');
        quickRunDescription.textContent = t(
            'ai.quick-run-description',
            'Atalho de 1 clique para carregar o Page Agent diretamente nesta página.'
        );

        quickRunCopy.append(quickRunTitle, quickRunDescription);

        const quickRunButtons = document.createElement('div');
        quickRunButtons.className = 'erikraft-page-agent-dialog__quick-run-buttons';

        const quickMirror = document.createElement('button');
        quickMirror.type = 'button';
        quickMirror.className = 'erikraft-page-agent-dialog__quick-run-button';
        quickMirror.textContent = t('ai.quick-run-mirror', 'Executar · npm Mirror');
        quickMirror.addEventListener('click', () => loadPageAgent('mirror', quickMirror));

        const quickCdn = document.createElement('button');
        quickCdn.type = 'button';
        quickCdn.className = 'erikraft-page-agent-dialog__quick-run-button';
        quickCdn.textContent = t('ai.quick-run-cdn', 'Executar · jsDelivr');
        quickCdn.addEventListener('click', () => loadPageAgent('cdn', quickCdn));

        quickRunButtons.append(quickMirror, quickCdn);
        quickRun.append(quickRunCopy, quickRunButtons);

        const makeBookmarklet = (label, value) => {
            const row = document.createElement('div');
            row.className = 'erikraft-page-agent-dialog__bookmarklet';

            const info = document.createElement('span');
            info.className = 'erikraft-page-agent-dialog__bookmarklet-label';
            info.textContent = label;

            const use = document.createElement('button');
            use.type = 'button';
            use.className = 'erikraft-page-agent-dialog__primary erikraft-page-agent-dialog__bookmarklet-use';
            use.textContent = t('ai.use', 'Executar');
            use.addEventListener('click', () => executeBookmarklet(value, use));

            const drag = document.createElement('a');
            drag.className = 'erikraft-page-agent-dialog__bookmarklet-link';
            drag.href = value;
            drag.draggable = true;
            drag.textContent = '✨PageAgent';
            drag.setAttribute('aria-label', label + ': ✨PageAgent');
            drag.title = '✨PageAgent';

            row.append(info, use, drag);
            return row;
        };

        tools.append(
            toolsTitle,
            toolsDescription,
            bookmarkHelp,
            quickRun,
            makeBookmarklet(t('ai.bookmarklet-cdn', 'Bookmarklet CDN'), CDN_BOOKMARKLET),
            makeBookmarklet(t('ai.bookmarklet-mirror', 'Bookmarklet Mirror'), MIRROR_BOOKMARKLET)
        );

        ensureIntegrationStyles();

        const integration = document.createElement('div');
        integration.className = 'erikraft-page-agent-dialog__integration';

        const integrationTitle = document.createElement('h3');
        integrationTitle.className = 'erikraft-page-agent-dialog__tools-title';
        integrationTitle.textContent = t('ai.integration-title', 'Navegador e IDE');

        const integrationDescription = document.createElement('p');
        integrationDescription.className = 'erikraft-page-agent-dialog__tools-description';
        integrationDescription.textContent = t(
            'ai.integration-description',
            'Copie o código para uma extensão de navegador, DevTools ou navegador integrado da sua IDE.'
        );

        const makeIntegration = (label, value, provider) => {
            const card = document.createElement('div');
            card.className = 'erikraft-page-agent-dialog__integration-card';
            card.dataset.pageAgentProvider = provider;

            const name = document.createElement('strong');
            name.textContent = label;

            const code = document.createElement('code');
            code.className = 'erikraft-page-agent-dialog__integration-code';
            code.textContent = value;

            const actions = document.createElement('div');
            actions.className = 'erikraft-page-agent-dialog__integration-actions';

            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'btn btn-rounded btn-grey';
            copy.textContent = t('ai.copy-code', 'Copiar código');
            copy.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(value);
                } catch {
                    const area = document.createElement('textarea');
                    area.value = value;
                    area.setAttribute('readonly', '');
                    area.style.position = 'fixed';
                    area.style.opacity = '0';
                    document.body.appendChild(area);
                    area.select();
                    document.execCommand('copy');
                    area.remove();
                }
                copy.textContent = t('ai.copied-code', 'Código copiado');
                window.setTimeout(() => {
                    copy.textContent = t('ai.copy-code', 'Copiar código');
                }, 1400);
            });

            const run = document.createElement('button');
            run.type = 'button';
            run.className = 'btn btn-rounded btn-grey';
            run.textContent = t('ai.run-code', 'Executar nesta página');
            run.addEventListener('click', () => executeBookmarklet(value, run));

            actions.append(copy, run);
            card.append(name, code, actions);
            return card;
        };

        integration.append(
            integrationTitle,
            integrationDescription,
            makeIntegration(t('ai.integration-cdn', 'jsDelivr · Navegador / IDE'), CDN_BOOKMARKLET, 'cdn'),
            makeIntegration(t('ai.integration-mirror', 'npm Mirror · Navegador / IDE'), MIRROR_BOOKMARKLET, 'mirror')
        );
        tools.append(integration);
        dialog.body.appendChild(tools);

        const actions = document.createElement('div');
        actions.className = 'erikraft-page-agent-dialog__actions';

        const download = document.createElement('a');
        download.className = 'erikraft-page-agent-dialog__secondary';
        download.href = EXTENSION_URL;
        download.target = '_blank';
        download.rel = 'noopener noreferrer';
        download.textContent = t('ai.download', 'Baixar Page Agent Ext');

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn btn-rounded btn-grey';
        close.textContent = t('ai.dialog-close', 'Fechar');
        close.setAttribute('aria-label', t('ai.dialog-close', 'Fechar'));
        close.addEventListener('click', dialog.close);

        actions.append(download, close);
        dialog.body.appendChild(actions);
        return dialog;
    };

    const waitForExtension = async (timeout = 1200) => {
        const started = Date.now();
        while (Date.now() - started < timeout) {
            if (window.PAGE_AGENT_EXT && typeof window.PAGE_AGENT_EXT.execute === 'function') return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    };

    const snapshotTarget = target => ({
        value: 'value' in target ? target.value : null,
        text: target.innerText
    });

    const restoreTarget = (target, snapshot) => {
        if ('value' in target && snapshot.value !== null) target.value = snapshot.value;
        else target.innerText = snapshot.text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const buildTask = (action, instruction = '') => {
        const task = action === 'custom'
            ? instruction.trim()
            : instruction.trim();
        return [
            'Você está operando dentro do ErikrafT Drop™.',
            'Existe exatamente um elemento marcado com data-erikraft-page-agent-target="true".',
            'Trabalhe SOMENTE nesse elemento.',
            'Não clique em enviar, submit, compartilhar, fechar, cancelar ou qualquer ação externa.',
            'Não altere outros elementos, configurações, conexões, arquivos ou mensagens.',
            'Não invente conteúdo. Preserve a intenção original.',
            task,
            'Após concluir, deixe o resultado diretamente no elemento-alvo e não envie a mensagem.'
        ].join('\n');
    };

    const run = async (target, action, instruction = '') => {
        if (!isDesktop()) {
            notify(t('ai.desktop-only', 'Page Agent AI is available on desktop only.'));
            return false;
        }
        if (!target) return false;

        const available = await waitForExtension();
        if (!available) {
            notify(t('ai.install-required', 'Instale e autorize o Page Agent Ext para usar a IA.'));
            return false;
        }

        const before = snapshotTarget(target);
        target.setAttribute(TARGET_ATTR, 'true');
        target.focus();

        try {
            const result = await window.PAGE_AGENT_EXT.execute(buildTask(action, instruction), {
                includeInitialTab: true
            });

            if (!result?.success) {
                restoreTarget(target, before);
                notify(result?.data || t('ai.failed', 'O Page Agent não conseguiu concluir a tarefa.'));
                return false;
            }

            target.dispatchEvent(new Event('input', { bubbles: true }));
            notify(t('ai.completed', 'IA aplicada ao texto.'));
            return true;
        } catch (error) {
            restoreTarget(target, before);
            console.error('[Page Agent] execution failed:', error);
            notify(error?.message || t('ai.failed', 'Falha ao executar o Page Agent.'));
            return false;
        } finally {
            target.removeAttribute(TARGET_ATTR);
        }
    };

    const style = () => {
        if (document.getElementById('erikraft-page-agent-ai-style')) return;
        const node = document.createElement('style');
        node.id = 'erikraft-page-agent-ai-style';
        node.textContent = `
            :root.erikraft-page-agent-dialog-open { overflow:hidden; }
            .erikraft-page-agent-header-shortcut { position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; padding:0; margin:0; cursor:pointer; appearance:none; -webkit-appearance:none; border:0; background:transparent; color:inherit; font:inherit; line-height:normal; box-shadow:none; }
            .erikraft-page-agent-header-shortcut img { width:24px; height:24px; border-radius:6px; display:block; object-fit:contain; }
            .erikraft-page-agent-header-shortcut::after { content:""; position:absolute; right:5px; bottom:5px; width:6px; height:6px; border-radius:50%; background:var(--primary-color); box-shadow:0 0 0 2px var(--bg-color); }
            .erikraft-page-agent-header-shortcut[data-page-agent-loading="true"] img { animation:erikraft-page-agent-pulse .8s ease-in-out infinite; }
            .erikraft-page-agent-header-shortcut.is-loaded { outline:2px solid var(--primary-color); outline-offset:-2px; }
            @keyframes erikraft-page-agent-pulse { 50% { opacity:.45; transform:scale(.88); } }
            @media (max-width:768px) { .erikraft-page-agent-header-shortcut { display:none !important; } }

            .erikraft-page-agent-ai { position:relative; display:inline-flex; flex:0 0 auto; min-width:0; }
            .erikraft-page-agent-ai > button { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-width:42px; max-width:140px; height:40px; padding:0 10px; box-sizing:border-box; overflow:hidden; }
            .erikraft-page-agent-ai > button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .erikraft-page-agent-ai[data-context="send-text"] > button span { display:none; }
            .erikraft-page-agent-ai img { width:18px; height:18px; flex:0 0 18px; border-radius:5px; }
            #chat-form .erikraft-page-agent-ai { margin-inline-start:4px; }
            #chat-form .erikraft-page-agent-ai > button { width:40px; min-width:40px; padding:0; }
            #send-text-dialog .erikraft-page-agent-ai { margin-inline-end:auto; }
            .erikraft-page-agent-menu { position:fixed; z-index:2147482000; width:min(330px,calc(100vw - 24px)); max-height:min(70vh,520px); overflow:auto; overscroll-behavior:contain; padding:8px; box-sizing:border-box; border:1px solid rgba(123,105,255,.32); border-radius:16px; background-color:var(--dialog-bg-color); background-image:none; color:rgb(var(--text-color)); box-shadow:0 18px 55px rgba(0,0,0,.42),0 0 0 1px rgba(88,185,255,.08); scrollbar-width:thin; }
            .erikraft-page-agent-menu[hidden] { display:none; }
            .erikraft-page-agent-menu button { width:100%; display:flex; align-items:center; min-height:42px; padding:9px 11px; border:0; border-radius:10px; background:transparent; color:inherit; text-align:left; cursor:pointer; }
            .erikraft-page-agent-menu button:hover { background:linear-gradient(90deg,rgba(123,105,255,.16),rgba(88,185,255,.12)); }
            .erikraft-page-agent-menu .label { padding:7px 11px; font-size:11px; opacity:.62; }
            .erikraft-page-agent-dialog { position:fixed; inset:0; z-index:2147481000; display:grid; place-items:center; padding:18px; box-sizing:border-box; background:rgba(0,0,0,.55); overflow:auto; color:rgb(var(--text-color)); }
            .erikraft-page-agent-dialog__panel { width:min(var(--page-agent-dialog-width),calc(100vw - 28px)); max-height:min(760px,calc(100vh - 28px)); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border-color); border-radius:16px; background-color:var(--dialog-bg-color); background-image:none; color:rgb(var(--text-color)); box-shadow:0 24px 80px rgba(0,0,0,.48),0 0 35px rgba(88,185,255,.10); }
            .erikraft-page-agent-dialog__header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 16px 12px; border-bottom:1px solid rgba(127,127,127,.18); background-color:var(--dialog-bg-color); background-image:linear-gradient(120deg,rgba(123,105,255,.08),rgba(88,185,255,.04)); }
            .erikraft-page-agent-dialog__logo { display:block; width:auto; max-width:min(220px,70%); height:28px; object-fit:contain; object-position:left center; }
            .erikraft-page-agent-dialog__header-actions { display:flex; align-items:center; gap:4px; flex:0 0 auto; }
            .erikraft-page-agent-dialog__fullscreen,.erikraft-page-agent-dialog__close { width:34px; height:34px; border:0; border-radius:9px; background:transparent; color:inherit; cursor:pointer; }
            .erikraft-page-agent-dialog__fullscreen { font-size:20px; line-height:1; }
            .erikraft-page-agent-dialog__close { font-size:25px; line-height:1; }
            .erikraft-page-agent-dialog__fullscreen:hover,.erikraft-page-agent-dialog__close:hover { background:rgba(127,127,127,.13); }
            .erikraft-page-agent-dialog__panel.is-fullscreen { width:100%; height:100%; max-width:none; max-height:none; border-radius:14px; }
            .erikraft-page-agent-dialog__panel.is-fullscreen .erikraft-page-agent-dialog__body { padding:18px clamp(16px,4vw,42px); }
            .erikraft-page-agent-dialog__body { min-height:0; overflow:auto; padding:16px; }
            .erikraft-page-agent-dialog__description,.erikraft-page-agent-dialog__hint { margin:0 0 14px; opacity:.76; line-height:1.5; font-size:13px; }
            .erikraft-page-agent-dialog__field { display:block; margin:0 0 12px; }
            .erikraft-page-agent-dialog__field span { display:block; margin:0 0 6px; font-size:12px; font-weight:650; }
            .erikraft-page-agent-dialog__field input,.erikraft-page-agent-dialog__textarea { width:100%; box-sizing:border-box; border:1px solid rgba(127,127,127,.32); border-radius:11px; background:var(--bg-color-secondary); color:rgb(var(--text-color)); caret-color:rgb(var(--text-color)); outline:none; padding:10px 11px; font:inherit; }
            .erikraft-page-agent-dialog__field input::placeholder,.erikraft-page-agent-dialog__textarea::placeholder { color:rgb(var(--text-color)); opacity:.58; }
            .erikraft-page-agent-dialog__tools { margin-top:16px; padding:13px; border:1px solid rgba(123,105,255,.24); border-radius:13px; background:linear-gradient(135deg,rgba(123,105,255,.08),rgba(88,185,255,.06)); }
            .erikraft-page-agent-dialog__tools-title { margin:0 0 5px; font-size:13px; }
            .erikraft-page-agent-dialog__tools-description { margin:0 0 8px; font-size:12px; line-height:1.45; opacity:.72; }
            .erikraft-page-agent-dialog__bookmarklet-help { margin:0 0 12px; font-size:12px; line-height:1.45; opacity:.72; }
            .erikraft-page-agent-dialog__bookmarklet { display:grid; grid-template-columns:minmax(110px,1fr) auto auto; gap:8px; margin-top:8px; align-items:center; padding:8px; border:1px solid var(--border-color); border-radius:12px; background-color:var(--dialog-bg-color); }
            .erikraft-page-agent-dialog__bookmarklet-label { min-width:0; overflow-wrap:anywhere; font-size:12px; font-weight:650; }
            .erikraft-page-agent-dialog__bookmarklet-link { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 12px; border-radius:10px; border:1px dashed rgba(123,105,255,.55); background-color:var(--bg-color-secondary); color:rgb(var(--text-color)); text-decoration:none; font:inherit; cursor:grab; user-select:none; white-space:nowrap; }
            .erikraft-page-agent-dialog__bookmarklet-link:active { cursor:grabbing; }
                        .erikraft-page-agent-dialog__field input:focus,.erikraft-page-agent-dialog__textarea:focus { border-color:rgba(123,105,255,.72); box-shadow:0 0 0 3px rgba(88,185,255,.10); }
            .erikraft-page-agent-dialog__textarea { min-height:150px; resize:vertical; line-height:1.45; }
            .erikraft-page-agent-dialog__actions { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid rgba(127,127,127,.16); }
            .erikraft-page-agent-dialog__primary,.erikraft-page-agent-dialog__secondary { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 13px; border-radius:10px; box-sizing:border-box; text-decoration:none; cursor:pointer; font:inherit; }
            .erikraft-page-agent-dialog__primary { border:1px solid rgba(123,105,255,.72); background:linear-gradient(120deg,#7b69ff,#58b9ff); color:#fff; }
            .erikraft-page-agent-dialog__bookmarklet-use { min-width:112px; font-weight:750; box-shadow:0 3px 12px rgba(88,185,255,.18); }
            .erikraft-page-agent-dialog__quick-run { display:flex; align-items:center; justify-content:space-between; gap:14px; margin:14px 0 16px; padding:14px; border:1px solid rgba(88,185,255,.42); border-radius:14px; background:linear-gradient(135deg,rgba(123,105,255,.12),rgba(88,185,255,.14)); }
            .erikraft-page-agent-dialog__quick-run-copy { display:flex; flex-direction:column; gap:3px; min-width:0; }
            .erikraft-page-agent-dialog__quick-run-copy strong { font-size:14px; }
            .erikraft-page-agent-dialog__quick-run-copy span { font-size:12px; line-height:1.4; opacity:.78; }
            .erikraft-page-agent-dialog__quick-run-buttons { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
            .erikraft-page-agent-dialog__quick-run-button { min-height:42px; padding:0 13px; border:1px solid rgba(123,105,255,.75); border-radius:11px; background:linear-gradient(120deg,#7b69ff,#58b9ff); color:#fff; font:inherit; font-weight:750; cursor:pointer; white-space:nowrap; box-shadow:0 4px 14px rgba(88,185,255,.2); }
            .erikraft-page-agent-dialog__quick-run-button:hover { filter:brightness(1.06); transform:translateY(-1px); }
            .erikraft-page-agent-dialog__quick-run-button:focus-visible { outline:2px solid #58b9ff; outline-offset:2px; }
            .erikraft-page-agent-dialog__secondary { border:1px solid transparent; background-color:var(--bg-color-secondary); color:var(--accent-color); font-family:"Open Sans",-apple-system,BlinkMacSystemFont,sans-serif; padding:8px 16px !important; font-size:14px; line-height:1.2 !important; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; min-height:40px; border-radius:12px; box-sizing:border-box; overflow:hidden; }
            @media (max-width:760px) {
                .erikraft-page-agent-ai > button { width:40px; min-width:40px; padding:0; }
                .erikraft-page-agent-dialog { padding:10px; place-items:center; }
                .erikraft-page-agent-dialog__panel { width:calc(100vw - 20px); max-height:calc(100vh - 20px); border-radius:15px; }
                .erikraft-page-agent-dialog__header { padding:12px; }
                .erikraft-page-agent-dialog__logo { max-width:calc(100% - 82px); height:24px; }
                .erikraft-page-agent-dialog__panel.is-fullscreen { width:100%; height:100%; border-radius:10px; }
                .erikraft-page-agent-dialog__body { padding:12px; }
                .erikraft-page-agent-dialog__actions > * { flex:1 1 145px; }
                .erikraft-page-agent-dialog__bookmarklet { grid-template-columns:1fr; }
                .erikraft-page-agent-dialog__quick-run { flex-direction:column; align-items:stretch; }
                .erikraft-page-agent-dialog__quick-run-buttons { justify-content:stretch; }
                .erikraft-page-agent-dialog__quick-run-button { flex:1 1 160px; }
                .erikraft-page-agent-dialog__bookmarklet > * { width:100%; }
            }
            .erikraft-page-agent-dialog__panel,
            .erikraft-page-agent-dialog__body,
            .erikraft-page-agent-dialog__tools,
            .erikraft-page-agent-dialog__bookmarklet { color:rgb(var(--text-color)); }
            @media (max-height:620px) and (min-width:761px) {
                .erikraft-page-agent-dialog__panel { max-height:calc(100vh - 18px); }
                .erikraft-page-agent-dialog__body { padding:12px 14px; }
                .erikraft-page-agent-dialog__textarea { min-height:105px; }
            }
        `;
        document.head.appendChild(node);
    };

    const positionMenu = (menu, toggle) => {
        const rect = toggle.getBoundingClientRect();
        const gap = 8;
        const width = Math.min(330, window.innerWidth - 24);
        const height = Math.min(520, Math.max(160, window.innerHeight * 0.7));
        const spaceAbove = rect.top - gap - 8;
        const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
        const openAbove = spaceAbove >= Math.min(height, 320) || spaceAbove > spaceBelow;
        const maxHeight = Math.max(120, Math.min(height, openAbove ? spaceAbove : spaceBelow));

        menu.style.width = width + 'px';
        menu.style.maxHeight = maxHeight + 'px';
        menu.style.left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)) + 'px';
        if (openAbove) {
            menu.style.bottom = (window.innerHeight - rect.top + gap) + 'px';
            menu.style.top = 'auto';
        } else {
            menu.style.top = (rect.bottom + gap) + 'px';
            menu.style.bottom = 'auto';
        }
    };

    const createMenu = (target, host) => {
        if (!target || !host) return;

        // Reuse the static WebChat control when it is already present in index.html.
        // The previous implementation returned early in that case, leaving the
        // existing button without a click handler or menu.
        let wrapper = host.querySelector('.erikraft-page-agent-ai');
        let toggle = wrapper?.querySelector('button');
        let menu = wrapper?.querySelector('.erikraft-page-agent-menu');

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'erikraft-page-agent-ai';
            if (host.closest('#send-text-dialog')) wrapper.dataset.context = 'send-text';
            host.insertBefore(wrapper, host.id === 'chat-form' ? (host.querySelector('#chat-send') || null) : null);
        }

        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'btn btn-rounded btn-grey';
            toggle.title = t('ai.page-agent-title', 'Page Agent Ext');
            toggle.setAttribute('aria-label', t('ai.page-agent-title', 'Page Agent Ext'));
            toggle.innerHTML = '<img src="images/Page_Agent_Ext.png" alt="" aria-hidden="true"><span>Page Agent Ext</span>';
            wrapper.appendChild(toggle);
        }

        if (!menu) {
            menu = document.createElement('div');
            menu.className = 'erikraft-page-agent-menu';
            menu.hidden = true;

            const addAction = (label, action) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.addEventListener('click', () => {
                    menu.hidden = true;
                    action();
                });
                menu.appendChild(button);
            };

            addAction(t('ai.custom', 'Instrução personalizada'), () => customInstructionDialog(target));
            wrapper.appendChild(menu);
        }

        if (wrapper.dataset.pageAgentBound === 'true') return;
        wrapper.dataset.pageAgentBound = 'true';

        toggle.type = 'button';
        toggle.title = t('ai.page-agent-title', 'Page Agent Ext');
        toggle.setAttribute('aria-label', t('ai.page-agent-title', 'Page Agent Ext'));

        const openMenu = event => {
            event.preventDefault();
            event.stopPropagation();
            menu.hidden = !menu.hidden;
            if (!menu.hidden) {
                if (menu.parentElement !== document.body) document.body.appendChild(menu);
                positionMenu(menu, toggle);
            }
        };

        toggle.addEventListener('click', openMenu);
        window.addEventListener('resize', () => {
            if (!menu.hidden) positionMenu(menu, toggle);
        });
        window.addEventListener('scroll', () => {
            if (!menu.hidden) positionMenu(menu, toggle);
        }, true);
        document.addEventListener('click', event => {
            if (!wrapper.contains(event.target) && event.target !== menu) menu.hidden = true;
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') menu.hidden = true;
        });
    };

    const attachHeaderShortcuts = () => {
        if (!isDesktop()) return;

        const chatToggle = document.getElementById('chat-toggle');
        if (!chatToggle) return;

        const buttons = [
            { id: 'page-agent-ext-mirror-toggle', provider: 'mirror', title: 'Page Agent Ext · npm Mirror' },
            { id: 'page-agent-ext-cdn-toggle', provider: 'cdn', title: 'Page Agent Ext · jsDelivr' }
        ];

        buttons.forEach(({ id, provider, title }) => {
            const button = document.getElementById(id);
            if (!button || button.dataset.pageAgentBound === 'true') return;

            button.dataset.pageAgentBound = 'true';
            button.title = title;
            button.setAttribute('aria-label', title);
            button.hidden = false;

            const run = event => {
                event.preventDefault();
                event.stopPropagation();
                loadPageAgent(provider, button);
            };

            button.addEventListener('click', run);
        });
    };

    const attach = (target, host) => {
        if (!target || !host || !isDesktop()) return;
        createMenu(target, host);
    };

    const init = () => {
        protectPageAgentLogos();
        if (!isDesktop()) return;
        style();
        attachHeaderShortcuts();
        attach(document.getElementById('chat-input'), document.getElementById('chat-form'));
        attach(document.querySelector('#send-text-dialog .textarea'), document.querySelector('#send-text-dialog .btn-row'));

        const observer = new MutationObserver(() => {
            attach(document.getElementById('chat-input'), document.getElementById('chat-form'));
            attach(document.querySelector('#send-text-dialog .textarea'), document.querySelector('#send-text-dialog .btn-row'));
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    window.ErikrafTPageAgentAI = Object.freeze({
        buildTask,
        run,
        openExtension: () => window.open(EXTENSION_URL, '_blank', 'noopener,noreferrer'),
        officialUrl: OFFICIAL_URL,
        repositoryUrl: REPOSITORY_URL,
        extensionUrl: EXTENSION_URL,
        demoUrls: { CDN_URL, MIRROR_URL }
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();