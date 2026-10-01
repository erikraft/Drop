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
        if (typeof Events !== 'undefined') {
            Events.fire('notify-user', message);
        }
        console.info('[Page Agent]', message);
    };

    const getConfig = () => {
        try {
            return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        } catch {
            return {};
        }
    };

    const saveConfig = config => {
        localStorage.setItem(STORE_KEY, JSON.stringify({
            baseURL: config.baseURL,
            model: config.model
        }));
    };

    const getApiKey = () => sessionStorage.getItem(SESSION_KEY) || '';

    const setApiKey = value => {
        if (value) sessionStorage.setItem(SESSION_KEY, value);
        else sessionStorage.removeItem(SESSION_KEY);
    };

    const getTranslation = (key, fallback) => {
        try {
            return typeof Localization !== 'undefined'
                ? Localization.getTranslation(key)
                : fallback;
        } catch {
            return fallback;
        }
    };

    const promptConfig = () => {
        const current = getConfig();
        const baseURL = window.prompt(
            'Endpoint LLM compatível com OpenAI (ex.: http://localhost:11434/v1):',
            current.baseURL || ''
        );
        if (!baseURL) return null;

        const model = window.prompt(
            'Modelo com suporte a tool calls:',
            current.model || ''
        );
        if (!model) return null;

        const currentKey = getApiKey();
        const apiKey = window.prompt(
            'API key (opcional para Ollama/LM Studio; ficará apenas nesta sessão):',
            currentKey
        );

        saveConfig({ baseURL: baseURL.trim(), model: model.trim() });
        setApiKey((apiKey || '').trim());

        const token = window.localStorage.getItem('PageAgentExtUserAuthToken');
        if (!token) {
            const authToken = window.prompt(
                'Token do Page Agent Ext (copiado do painel da extensão):',
                ''
            );
            if (authToken) {
                window.localStorage.setItem('PageAgentExtUserAuthToken', authToken.trim());
            }
        }

        return {
            baseURL: baseURL.trim(),
            model: model.trim(),
            apiKey: (apiKey || '').trim()
        };
    };

    const ensureConfig = () => {
        const config = getConfig();
        if (!config.baseURL || !config.model) {
            return promptConfig();
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
            if (window.PAGE_AGENT_EXT && typeof window.PAGE_AGENT_EXT.execute === 'function') {
                return true;
            }
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
        const actions = {
            improve: 'Melhore clareza, naturalidade e organização do texto, preservando o significado.',
            correct: 'Corrija gramática, ortografia, pontuação e concordância, preservando o significado.',
            polish: 'Ajuste o texto para ficar mais profissional, objetivo e fácil de entender, sem inventar informações.',
            code: 'Revise o código quanto a erros de sintaxe, lógica e problemas óbvios. Corrija apenas o necessário e preserve a linguagem e a intenção do código.'
        };

        const task = actions[action] || instruction.trim();
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
            notify(getTranslation('ai.desktop-only', 'Page Agent AI is available on desktop only.'));
            return false;
        }
        if (!target) return false;

        const available = await waitForExtension();
        if (!available) {
            notify(getTranslation('ai.install-required', 'Install and authorize Page Agent Ext to use AI text actions.'));
            window.open(EXTENSION_URL, '_blank', 'noopener,noreferrer');
            return false;
        }

        const config = ensureConfig();
        if (!config) return false;

        const before = snapshotTarget(target);
        target.setAttribute(TARGET_ATTR, 'true');
        target.focus();

        try {
            const result = await window.PAGE_AGENT_EXT.execute(
                buildTask(action, instruction),
                {
                    baseURL: config.baseURL,
                    model: config.model,
                    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
                    includeInitialTab: true
                }
            );

            if (!result?.success) {
                restoreTarget(target, before);
                notify(result?.data || 'O Page Agent não conseguiu concluir a tarefa.');
                return false;
            }

            target.dispatchEvent(new Event('input', { bubbles: true }));
            notify(getTranslation('ai.completed', 'AI applied to the text.'));
            return true;
        } catch (error) {
            restoreTarget(target, before);
            console.error('[Page Agent] execution failed:', error);
            notify(error?.message || 'Falha ao executar o Page Agent.');
            return false;
        } finally {
            target.removeAttribute(TARGET_ATTR);
        }
    };

    const loadDemo = src => {
        if (!isDesktop()) return;
        const existing = document.querySelector('script[data-erikraft-page-agent-demo]');
        if (existing) {
            notify('Page Agent demo já está carregado.');
            return;
        }

        const script = document.createElement('script');
        script.src = src + '?lang=en-US&t=' + Math.random();
        script.crossOrigin = 'anonymous';
        script.type = 'text/javascript';
        script.dataset.erikraftPageAgentDemo = 'true';
        script.onload = () => notify('Page Agent carregado para avaliação técnica.');
        script.onerror = () => notify('Não foi possível carregar o Page Agent.');
        document.body.appendChild(script);
    };

    const createLogo = () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<image href="https://raw.githubusercontent.com/alibaba/page-agent/main/packages/extension/public/assets/page-agent-64.png" x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet"/>';
        return svg;
    };

    const style = () => {
        if (document.getElementById('erikraft-page-agent-ai-style')) return;
        const node = document.createElement('style');
        node.id = 'erikraft-page-agent-ai-style';
        node.textContent = `
            .erikraft-page-agent-ai { position:relative; display:inline-flex; }
            .erikraft-page-agent-ai > button { display:inline-flex; align-items:center; justify-content:center; gap:7px; }
            .erikraft-page-agent-ai svg { width:18px; height:18px; flex:0 0 18px; }
            .erikraft-page-agent-menu { position:absolute; z-index:10050; right:0; bottom:calc(100% + 8px); min-width:230px; max-width:min(320px,calc(100vw - 24px)); padding:8px; border:1px solid rgba(127,127,127,.25); border-radius:14px; background:var(--background-color,#181818); box-shadow:0 14px 40px rgba(0,0,0,.3); }
            .erikraft-page-agent-menu button,.erikraft-page-agent-menu a { width:100%; display:flex; align-items:center; gap:8px; box-sizing:border-box; padding:9px 10px; border:0; border-radius:9px; background:transparent; color:inherit; text-align:left; text-decoration:none; cursor:pointer; }
            .erikraft-page-agent-menu button:hover,.erikraft-page-agent-menu a:hover { background:rgba(127,127,127,.12); }
            .erikraft-page-agent-menu .label { padding:6px 10px; font-size:11px; opacity:.65; }
            .erikraft-page-agent-ai-target { outline:1px solid rgba(134,125,108,.55); }
            #send-text-dialog .erikraft-page-agent-ai { margin-inline-end:auto; }
        `;
        document.head.appendChild(node);
    };

    const menuButton = (label, action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', action);
        return button;
    };

    const createMenu = (target, host) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'erikraft-page-agent-ai';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-rounded btn-grey';
        toggle.title = getTranslation('ai.page-agent-title', 'Page Agent Ext');
        toggle.setAttribute('aria-label', getTranslation('ai.page-agent-title', 'Page Agent Ext'));
        toggle.appendChild(createLogo());

        const menu = document.createElement('div');
        menu.className = 'erikraft-page-agent-menu';
        menu.hidden = true;

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = getTranslation('ai.page-agent-title', 'Page Agent Ext');
        menu.appendChild(label);

        const actions = [
            [getTranslation('ai.improve', 'Improve text'), () => run(target, 'improve')],
            [getTranslation('ai.correct', 'Correct text'), () => run(target, 'correct')],
            [getTranslation('ai.polish', 'Polish text'), () => run(target, 'polish')],
            [getTranslation('ai.code', 'Fix/review code'), () => run(target, 'code')],
            [getTranslation('ai.custom', 'Custom instruction'), () => {
                const instruction = window.prompt('O que você quer que a IA faça com o texto/código?');
                if (instruction) run(target, 'custom', instruction);
            }]
        ];
        actions.forEach(([labelText, action]) => menu.appendChild(menuButton(labelText, action)));

        const separator = document.createElement('div');
        separator.className = 'label';
        separator.textContent = 'Configuração / ferramentas';
        menu.appendChild(separator);

        menu.appendChild(menuButton(getTranslation('ai.settings', 'Configure LLM and authorization'), () => promptConfig()));
        menu.appendChild(menuButton(getTranslation('ai.stop', 'Stop current task'), () => window.PAGE_AGENT_EXT?.stop?.()));
        menu.appendChild(menuButton(getTranslation('ai.download', 'Download Page Agent Ext'), () => window.open(EXTENSION_URL, '_blank', 'noopener,noreferrer')));
        menu.appendChild(menuButton(getTranslation('ai.cdn-jsdelivr', 'Page Agent — jsDelivr'), () => loadDemo(CDN_URL)));
        menu.appendChild(menuButton(getTranslation('ai.cdn-npmmirror', 'Page Agent — npmmirror'), () => loadDemo(MIRROR_URL)));

        const credits = document.createElement('a');
        credits.href = OFFICIAL_URL;
        credits.target = '_blank';
        credits.rel = 'noopener noreferrer';
        credits.textContent = getTranslation('ai.credits', 'Page Agent — credits and documentation');
        menu.appendChild(credits);

        toggle.addEventListener('click', event => {
            event.stopPropagation();
            menu.hidden = !menu.hidden;
        });

        wrapper.append(toggle, menu);
        host.appendChild(wrapper);

        document.addEventListener('click', event => {
            if (!wrapper.contains(event.target)) menu.hidden = true;
        });
    };

    const attach = (target, host) => {
        if (!target || !host || !isDesktop() || host.querySelector('.erikraft-page-agent-ai')) return;
        createMenu(target, host);
    };

    const init = () => {
        if (!isDesktop()) return;
        style();

        const chatInput = document.getElementById('chat-input');
        const chatHost = document.getElementById('chat-form');
        attach(chatInput, chatHost);

        const sendText = document.querySelector('#send-text-dialog .textarea');
        const sendHost = document.querySelector('#send-text-dialog .btn-row');
        attach(sendText, sendHost);

        const observer = new MutationObserver(() => {
            const input = document.getElementById('chat-input');
            const form = document.getElementById('chat-form');
            const dialogText = document.querySelector('#send-text-dialog .textarea');
            const dialogHost = document.querySelector('#send-text-dialog .btn-row');
            attach(input, form);
            attach(dialogText, dialogHost);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    window.ErikrafTPageAgentAI = Object.freeze({
        buildTask,
        loadDemo,
        run,
        openExtension: () => window.open(EXTENSION_URL, '_blank', 'noopener,noreferrer'),
        officialUrl: OFFICIAL_URL,
        repositoryUrl: REPOSITORY_URL,
        extensionUrl: EXTENSION_URL
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
