(() => {
    'use strict';

    const STORE_KEY = 'erikraft-drop-page-agent-ai';
    const SESSION_KEY = 'erikraft-drop-page-agent-ai-key';
    const TARGET_ATTR = 'data-erikraft-page-agent-target';
    const EXTENSION_URL = 'https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj';
    const OFFICIAL_URL = 'https://alibaba.github.io/page-agent/';
    const REPOSITORY_URL = 'https://github.com/alibaba/page-agent';
    const CDN_URL = 'https://cdn.jsdelivr.net/npm/page-agent@1.12.4/dist/iife/page-agent.demo.js';
    const MIRROR_URL = 'https://registry.npmmirror.com/page-agent/1.12.4/files/dist/iife/page-agent.demo.js';

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

        const brand = document.createElement('div');
        brand.className = 'erikraft-page-agent-dialog__brand';
        brand.innerHTML = '<img src="https://raw.githubusercontent.com/alibaba/page-agent/main/packages/extension/public/assets/page-agent-64.png" alt="" aria-hidden="true"><span>Page Agent Ext</span>';

        const heading = document.createElement('h2');
        heading.className = 'erikraft-page-agent-dialog__title';
        heading.textContent = title;

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'erikraft-page-agent-dialog__close';
        close.setAttribute('aria-label', t('ai.dialog-close', 'Close'));
        close.textContent = '×';

        const body = document.createElement('div');
        body.className = 'erikraft-page-agent-dialog__body';

        if (description) {
            const desc = document.createElement('p');
            desc.className = 'erikraft-page-agent-dialog__description';
            desc.textContent = description;
            body.appendChild(desc);
        }

        header.append(brand, heading, close);
        panel.append(header, body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        document.documentElement.classList.add('erikraft-page-agent-dialog-open');

        const closeAll = () => closeDialog(overlay);
        close.addEventListener('click', closeAll);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeAll();
        });

        return { overlay, panel, body, close: closeAll };
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

    const promptConfig = () => {
        if (!isDesktop()) return null;

        const current = getConfig();
        const dialog = createDialog({
            title: t('ai.settings', 'Configurar LLM e autorização'),
            description: t('ai.settings-description', 'Configure o endpoint LLM, o modelo e a autorização do Page Agent Ext sem usar pop-ups do navegador.')
        });

        const endpoint = addField(dialog.body, {
            label: t('ai.endpoint', 'Endpoint LLM'),
            value: current.baseURL || '',
            placeholder: 'https://api.openai.com/v1'
        });
        const model = addField(dialog.body, {
            label: t('ai.model', 'Modelo'),
            value: current.model || '',
            placeholder: 'gpt-5.2'
        });
        const apiKey = addField(dialog.body, {
            label: t('ai.api-key', 'API key'),
            type: 'password',
            placeholder: getApiKey()
                ? t('ai.api-key-placeholder-configured', 'Deixe em branco para manter a chave desta sessão')
                : t('ai.api-key-placeholder', 'Opcional para Ollama/LM Studio'),
            autocomplete: 'off'
        });
        const token = addField(dialog.body, {
            label: t('ai.auth-token', 'Token de autorização do Page Agent Ext'),
            value: getAuthToken(),
            type: 'password',
            placeholder: t('ai.auth-token-placeholder', 'Cole o token copiado da extensão'),
            autocomplete: 'off'
        });

        const actions = document.createElement('div');
        actions.className = 'erikraft-page-agent-dialog__actions';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn-rounded btn-grey';
        cancel.textContent = t('dialogs.cancel', 'Cancelar');
        cancel.addEventListener('click', dialog.close);

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'erikraft-page-agent-dialog__primary';
        save.textContent = t('ai.save', 'Salvar configuração');
        save.addEventListener('click', () => {
            const baseURL = endpoint.value.trim();
            const selectedModel = model.value.trim();
            if (!baseURL || !selectedModel) {
                notify(t('ai.settings-required', 'Informe o endpoint LLM e o modelo.'));
                return;
            }
            saveConfig({ baseURL, model: selectedModel });
            const enteredApiKey = apiKey.value.trim();
            if (enteredApiKey) setApiKey(enteredApiKey);
            setAuthToken(token.value.trim());
            dialog.close();
            notify(t('ai.settings-saved', 'Configuração do Page Agent salva.'));
        });

        actions.append(cancel, save);
        dialog.body.appendChild(actions);
        endpoint.focus();
        return { dialog, submit: () => save.click() };
    };

    const customInstructionDialog = target => {
        const dialog = createDialog({
            title: t('ai.custom', 'Instrução personalizada'),
            description: t('ai.custom-description', 'Descreva exatamente o que o Page Agent deve fazer somente com o texto/código selecionado. A tarefa não enviará a mensagem automaticamente.')
        });

        const textarea = document.createElement('textarea');
        textarea.className = 'erikraft-page-agent-dialog__textarea';
        textarea.rows = 7;
        textarea.placeholder = t('ai.custom-placeholder', 'Ex.: deixe o texto mais profissional, mas preserve o significado.');
        dialog.body.appendChild(textarea);

        const hint = document.createElement('p');
        hint.className = 'erikraft-page-agent-dialog__hint';
        hint.textContent = t('ai.custom-hint', 'O Page Agent será limitado ao campo marcado no ErikrafT Drop™.');
        dialog.body.appendChild(hint);

        const actions = document.createElement('div');
        actions.className = 'erikraft-page-agent-dialog__actions';

        const download = document.createElement('a');
        download.className = 'erikraft-page-agent-dialog__secondary';
        download.href = EXTENSION_URL;
        download.target = '_blank';
        download.rel = 'noopener noreferrer';
        download.textContent = t('ai.download', 'Baixar Page Agent Ext');

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn-rounded btn-grey';
        cancel.textContent = t('dialogs.cancel', 'Cancelar');
        cancel.addEventListener('click', dialog.close);

        const execute = document.createElement('button');
        execute.type = 'button';
        execute.className = 'erikraft-page-agent-dialog__primary';
        execute.textContent = t('ai.execute', 'Executar instrução');
        execute.addEventListener('click', async () => {
            const instruction = textarea.value.trim();
            if (!instruction) {
                textarea.focus();
                return;
            }
            dialog.close();
            await run(target, 'custom', instruction);
        });

        actions.append(download, cancel, execute);
        dialog.body.appendChild(actions);
        textarea.focus();
        return dialog;
    };

    const ensureConfig = () => {
        const config = getConfig();
        if (!config.baseURL || !config.model || !getAuthToken()) {
            promptConfig();
            return null;
        }
        return {
            baseURL: config.baseURL,
            model: config.model,
            apiKey: getApiKey()
        };
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

        const config = ensureConfig();
        if (!config) return false;

        const before = snapshotTarget(target);
        target.setAttribute(TARGET_ATTR, 'true');
        target.focus();

        try {
            const result = await window.PAGE_AGENT_EXT.execute(buildTask(action, instruction), {
                baseURL: config.baseURL,
                model: config.model,
                ...(config.apiKey ? { apiKey: config.apiKey } : {}),
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
            .erikraft-page-agent-ai { position:relative; display:inline-flex; flex:0 0 auto; min-width:0; }
            .erikraft-page-agent-ai > button { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-width:42px; max-width:140px; height:40px; padding:0 10px; box-sizing:border-box; overflow:hidden; }
            .erikraft-page-agent-ai > button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .erikraft-page-agent-ai img { width:18px; height:18px; flex:0 0 18px; border-radius:5px; }
            #chat-form .erikraft-page-agent-ai { margin-inline-start:4px; }
            #chat-form .erikraft-page-agent-ai > button { width:40px; min-width:40px; padding:0; }
            #send-text-dialog .erikraft-page-agent-ai { margin-inline-end:auto; }
            .erikraft-page-agent-menu { position:fixed; z-index:2147482000; width:min(330px,calc(100vw - 24px)); max-height:min(70vh,520px); overflow:auto; overscroll-behavior:contain; padding:8px; box-sizing:border-box; border:1px solid rgba(123,105,255,.32); border-radius:16px; background:var(--background-color,#181818); box-shadow:0 18px 55px rgba(0,0,0,.42),0 0 0 1px rgba(88,185,255,.08); scrollbar-width:thin; }
            .erikraft-page-agent-menu[hidden] { display:none; }
            .erikraft-page-agent-menu button { width:100%; display:flex; align-items:center; min-height:42px; padding:9px 11px; border:0; border-radius:10px; background:transparent; color:inherit; text-align:left; cursor:pointer; }
            .erikraft-page-agent-menu button:hover { background:linear-gradient(90deg,rgba(123,105,255,.16),rgba(88,185,255,.12)); }
            .erikraft-page-agent-menu .label { padding:7px 11px; font-size:11px; opacity:.62; }
            .erikraft-page-agent-dialog { position:fixed; inset:0; z-index:2147481000; display:grid; place-items:center; padding:18px; box-sizing:border-box; background:rgba(8,8,14,.64); backdrop-filter:blur(7px); overflow:auto; }
            .erikraft-page-agent-dialog__panel { width:min(var(--page-agent-dialog-width),calc(100vw - 28px)); max-height:min(760px,calc(100vh - 28px)); display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(123,105,255,.36); border-radius:18px; background:var(--background-color,#181818); color:inherit; box-shadow:0 24px 80px rgba(0,0,0,.48),0 0 35px rgba(88,185,255,.10); }
            .erikraft-page-agent-dialog__header { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:10px; padding:14px 16px 12px; border-bottom:1px solid rgba(127,127,127,.18); background:linear-gradient(120deg,rgba(123,105,255,.13),rgba(88,185,255,.08)); }
            .erikraft-page-agent-dialog__brand { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; white-space:nowrap; }
            .erikraft-page-agent-dialog__brand img { width:24px; height:24px; border-radius:7px; }
            .erikraft-page-agent-dialog__title { margin:0; min-width:0; font-size:17px; line-height:1.25; }
            .erikraft-page-agent-dialog__close { width:34px; height:34px; border:0; border-radius:9px; background:transparent; color:inherit; font-size:25px; cursor:pointer; }
            .erikraft-page-agent-dialog__close:hover { background:rgba(127,127,127,.13); }
            .erikraft-page-agent-dialog__body { min-height:0; overflow:auto; padding:16px; }
            .erikraft-page-agent-dialog__description,.erikraft-page-agent-dialog__hint { margin:0 0 14px; opacity:.76; line-height:1.5; font-size:13px; }
            .erikraft-page-agent-dialog__field { display:block; margin:0 0 12px; }
            .erikraft-page-agent-dialog__field span { display:block; margin:0 0 6px; font-size:12px; font-weight:650; }
            .erikraft-page-agent-dialog__field input,.erikraft-page-agent-dialog__textarea { width:100%; box-sizing:border-box; border:1px solid rgba(127,127,127,.28); border-radius:11px; background:rgba(127,127,127,.07); color:inherit; outline:none; padding:10px 11px; font:inherit; }
            .erikraft-page-agent-dialog__field input:focus,.erikraft-page-agent-dialog__textarea:focus { border-color:rgba(123,105,255,.72); box-shadow:0 0 0 3px rgba(88,185,255,.10); }
            .erikraft-page-agent-dialog__textarea { min-height:150px; resize:vertical; line-height:1.45; }
            .erikraft-page-agent-dialog__actions { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid rgba(127,127,127,.16); }
            .erikraft-page-agent-dialog__primary,.erikraft-page-agent-dialog__secondary { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 13px; border-radius:10px; box-sizing:border-box; text-decoration:none; cursor:pointer; font:inherit; }
            .erikraft-page-agent-dialog__primary { border:1px solid rgba(123,105,255,.72); background:linear-gradient(120deg,#7b69ff,#58b9ff); color:#fff; }
            .erikraft-page-agent-dialog__secondary { border:1px solid rgba(88,185,255,.34); background:rgba(88,185,255,.08); color:inherit; }
            @media (max-width:760px) {
                .erikraft-page-agent-ai > button { width:40px; min-width:40px; padding:0; }
                .erikraft-page-agent-dialog { padding:10px; place-items:center; }
                .erikraft-page-agent-dialog__panel { width:calc(100vw - 20px); max-height:calc(100vh - 20px); border-radius:15px; }
                .erikraft-page-agent-dialog__header { grid-template-columns:auto 1fr auto; padding:12px; }
                .erikraft-page-agent-dialog__brand span { display:none; }
                .erikraft-page-agent-dialog__body { padding:12px; }
                .erikraft-page-agent-dialog__actions > * { flex:1 1 145px; }
            }
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
        if (!target || !host || host.querySelector('.erikraft-page-agent-ai')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'erikraft-page-agent-ai';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-rounded btn-grey';
        toggle.title = t('ai.page-agent-title', 'Page Agent Ext');
        toggle.setAttribute('aria-label', t('ai.page-agent-title', 'Page Agent Ext'));
        toggle.innerHTML = '<img src="https://raw.githubusercontent.com/alibaba/page-agent/main/packages/extension/public/assets/page-agent-64.png" alt="" aria-hidden="true"><span>Page Agent Ext</span>';

        const menu = document.createElement('div');
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
        addAction(t('ai.settings', 'Configurar LLM e autorização'), () => promptConfig());
        addAction(t('ai.stop', 'Parar tarefa atual'), () => window.PAGE_AGENT_EXT?.stop?.());

        const openMenu = event => {
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

        wrapper.appendChild(toggle);
        if (host.id === 'chat-form') {
            const sendButton = host.querySelector('#chat-send');
            host.insertBefore(wrapper, sendButton || null);
        } else {
            host.appendChild(wrapper);
        }
    };

    const attach = (target, host) => {
        if (!target || !host || !isDesktop()) return;
        createMenu(target, host);
    };

    const init = () => {
        if (!isDesktop()) return;
        style();
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