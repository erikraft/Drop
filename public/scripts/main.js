class ErikrafTdrop {

    constructor() {
        this.$headerNotificationBtn = $('notification');
        this.$headerEditPairedDevicesBtn = $('edit-paired-devices');
        this.$footerPairedDevicesBadge = $$('.discovery-wrapper .badge-room-secret');
        this.$chatFooterPairedDevicesBadge = $$('#chat-panel .badge-room-secret');
        this.$headerInstallBtn = $('install');

        this.deferredStyles = [
            "styles/styles-deferred.css"
        ];
        this.deferredScripts = [
            "scripts/browser-tabs-connector.js",
            "scripts/util.js",
            "scripts/network.js",
            "scripts/ai-image-client.js",
            "scripts/ui.js",
            "scripts/libs/heic2any.min.js",
            "scripts/libs/no-sleep.min.js",
            "scripts/libs/qr-code.min.js",
            "scripts/libs/zip.min.js",
            "scripts/content-moderation.js"
        ];

        this.registerServiceWorker();

        Events.on('beforeinstallprompt', e => this.onPwaInstallable(e));

        this.persistentStorage = new PersistentStorage();
        this.localization = new Localization();
        this.themeUI = new ThemeUI();
        this.backgroundCanvas = new BackgroundCanvas();
        this.headerUI = new HeaderUI();
        this.centerUI = new CenterUI();
        this.footerUI = new FooterUI();

        this.initialize()
            .then(_ => {
                console.log("Initialization completed.");
            });
    }

    async initialize() {
        // Translate page before fading in
        await this.localization.setInitialTranslation()
        console.log("Initial translation successful.");

        // Show "Loading..." until connected to WsServer
        await this.footerUI.showLoading();

        // Evaluate css shifting UI elements and fade in UI elements
        await this.evaluatePermissionsAndRoomSecrets();
        await this.headerUI.evaluateOverflowing();
        await this.headerUI.fadeIn();
        await this.footerUI._evaluateFooterBadges();
        await this.footerUI.fadeIn();
        await this.centerUI.fadeIn();
        await this.backgroundCanvas.fadeIn();

        // Load deferred assets
        console.log("Load deferred assets...");
        await this.loadDeferredAssets();
        console.log("Loading of deferred assets completed.");

        console.log("Hydrate UI...");
        await this.hydrate();
        console.log("UI hydrated.");

        // Evaluate url params as soon as ws is connected
        console.log("Evaluate URL params as soon as websocket connection is established.");
        Events.on('ws-connected', _ => this.evaluateUrlParams(), {once: true});
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('service-worker.js')
                .then(serviceWorker => {
                    console.log('Service Worker registered');
                    window.serviceWorker = serviceWorker
                });
        }
    }

    onPwaInstallable(e) {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            // only display install btn when not installed
            this.$headerInstallBtn.removeAttribute('hidden');
            this.$headerInstallBtn.addEventListener('click', () => {
                this.$headerInstallBtn.setAttribute('hidden', true);
                e.prompt();
            });
        }
        return e.preventDefault();
    }

    async evaluatePermissionsAndRoomSecrets() {
        // Check whether notification permissions have already been granted
        if ('Notification' in window && Notification.permission !== 'granted') {
            this.$headerNotificationBtn.removeAttribute('hidden');
        }

        let roomSecrets = await PersistentStorage.getAllRoomSecrets();
        if (roomSecrets.length > 0) {
            this.$headerEditPairedDevicesBtn.removeAttribute('hidden');
            this.$footerPairedDevicesBadge.removeAttribute('hidden');
            if (this.$chatFooterPairedDevicesBadge) {
                this.$chatFooterPairedDevicesBadge.removeAttribute('hidden');
            }
        }
    }

    loadDeferredAssets() {
        const stylePromises = this.deferredStyles.map(url => this.loadAndApplyStylesheet(url));
        const scriptPromises = this.deferredScripts.map(url => this.loadAndApplyScript(url));

        return Promise.all([...stylePromises, ...scriptPromises]);
    }

    loadStyleSheet(url) {
        return new Promise((resolve, reject) => {
            let stylesheet = document.createElement('link');
            stylesheet.rel = 'preload';
            stylesheet.as = 'style';
            stylesheet.href = url;
            stylesheet.onload = _ => {
                stylesheet.onload = null;
                stylesheet.rel = 'stylesheet';
                resolve();
            };
            stylesheet.onerror = reject;

            document.head.appendChild(stylesheet);
        });
    }

    loadAndApplyStylesheet(url) {
        return new Promise( async (resolve) => {
            try {
                await this.loadStyleSheet(url);
                console.log(`Stylesheet loaded successfully: ${url}`);
                resolve();
            } catch (error) {
                console.error('Error loading stylesheet:', error);
            }
        });
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;

            document.body.appendChild(script);
        });
    }

    loadAndApplyScript(url) {
        return new Promise( async (resolve) => {
            try {
                await this.loadScript(url);
                console.log(`Script loaded successfully: ${url}`);
                resolve();
            } catch (error) {
                console.error('Error loading script:', error);
            }
        });
    }

    async hydrate() {
        this.aboutUI = new AboutUI();
        this.peersUI = new PeersUI();
        this.languageSelectDialog = new LanguageSelectDialog();
        this.receiveFileDialog = new ReceiveFileDialog();
        this.receiveRequestDialog = new ReceiveRequestDialog();
        this.sendTextDialog = new SendTextDialog();
        this.receiveTextDialog = new ReceiveTextDialog();
        this.pairDeviceDialog = new PairDeviceDialog();
        this.clearDevicesDialog = new EditPairedDevicesDialog();
        this.publicRoomDialog = new PublicRoomDialog();
        this.base64Dialog = new Base64Dialog();
        this.shareTextDialog = new ShareTextDialog();
        this.toast = new Toast();
        this.notifications = new Notifications();
        this.networkStatusUI = new NetworkStatusUI();
        this.webShareTargetUI = new WebShareTargetUI();
        this.webFileHandlersUI = new WebFileHandlersUI();
        this.noSleepUI = new NoSleepUI();
        this.chatUI = new ChatUI();
        this.broadCast = new BrowserTabsConnector();
        this.server = new ServerConnection();
        this.peers = new PeersManager(this.server);
        this.contentModeration = new ContentModeration();
    }

    async evaluateUrlParams() {
        // get url params
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash.substring(1);

        // evaluate url params
        if (urlParams.has('pair_key')) {
            const pairKey = urlParams.get('pair_key');
            this.pairDeviceDialog._pairDeviceJoin(pairKey);
        }
        else if (urlParams.has('room_id')) {
            const roomId = urlParams.get('room_id');
            this.publicRoomDialog._joinPublicRoom(roomId);
        }
        else if (urlParams.has('base64text')) {
            const base64Text = urlParams.get('base64text');
            await this.base64Dialog.evaluateBase64Text(base64Text, hash);
        }
        else if (urlParams.has('base64zip')) {
            const base64Zip = urlParams.get('base64zip');
            await this.base64Dialog.evaluateBase64Zip(base64Zip, hash);
        }
        else if (urlParams.has("share_target")) {
            const shareTargetType = urlParams.get("share_target");
            const title = urlParams.get('title') || '';
            const text = urlParams.get('text') || '';
            const url = urlParams.get('url') || '';
            await this.webShareTargetUI.evaluateShareTarget(shareTargetType, title, text, url);
        }
        else if (urlParams.has("file_handler")) {
            await this.webFileHandlersUI.evaluateLaunchQueue();
        }
        else if (urlParams.has("init")) {
            const init = urlParams.get("init");
            if (init === "pair") {
                this.pairDeviceDialog._pairDeviceInitiate();
            }
            else if (init === "public_room") {
                this.publicRoomDialog._createPublicRoom();
            }
        }

        // remove url params from url
        const urlWithoutParams = getUrlWithoutArguments();
        window.history.replaceState({}, "Rewrite URL", urlWithoutParams);

        console.log("URL params evaluated.");
    }
}

const erikrafTdrop = new ErikrafTdrop();

// Inicializa o sistema de moderação
const contentModeration = new ContentModeration();

// Função para processar arquivos recebidos
async function handleReceivedFile(file) {
    try {
        console.log('Processando arquivo:', file.name, file.type);

        // Verifica se é uma imagem ou vídeo
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            console.log('Verificando conteúdo NSFW...');
            const nsfwResult = await contentModeration.checkNSFW(file);
            console.log('Resultado NSFW:', nsfwResult);

            if (nsfwResult.isNSFW) {
                console.log('Conteúdo explícito detectado, mostrando aviso...');

                // Cria elemento borrado
                const mediaElement = document.createElement(file.type.startsWith('image/') ? 'img' : 'video');
                mediaElement.className = 'media-preview blurred-content';
                mediaElement.src = URL.createObjectURL(file);

                // Aplica blur e overlay
                contentModeration.applyBlurAndOverlay(mediaElement, 'explicit');

                // Mostra diálogo de aviso
                const shouldView = await contentModeration.showWarningDialog(file, 'explicit');
                if (!shouldView) {
                    console.log('Usuário recusou visualizar o conteúdo');
                    return;
                }
            }
        }

        // Verifica nome do arquivo por spam/ofensas
        const spamCheck = contentModeration.isSpam(file.name);
        const hasOffensiveWords = contentModeration.hasBlockedWordsWithSubstitutions(file.name);

        if (spamCheck.isSpam || hasOffensiveWords) {
            console.log('Conteúdo potencialmente perigoso detectado');
            const shouldView = await contentModeration.showWarningDialog(file, spamCheck.contentType || 'spam');
            if (!shouldView) {
                console.log('Usuário recusou visualizar o conteúdo');
                return;
            }
        }

        // Verifica URLs no conteúdo
        if (file.type === 'text/plain') {
            const text = await file.text();
            const urlRegex = /https?:\/\/[^\s]+/g;
            const urls = text.match(urlRegex) || [];

            for (const url of urls) {
                const isSuspicious = await contentModeration.checkUrl(url);
                if (isSuspicious) {
                    console.log('URL suspeita detectada:', url);
                    const shouldView = await contentModeration.showWarningDialog(file, 'scam');
                    if (!shouldView) {
                        console.log('Usuário recusou visualizar o conteúdo');
                        return;
                    }
                }
            }
        }

        // Processa o arquivo normalmente
        return file;
    } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        throw error;
    }
}

// Intercepta o WebRTC para verificar arquivos antes do compartilhamento
function interceptWebRTC() {
    const originalPeerConnection = window.RTCPeerConnection;

    window.RTCPeerConnection = function(...args) {
        const pc = new originalPeerConnection(...args);

        const originalSend = pc.send;
        pc.send = async function(data) {
            if (data instanceof Blob || data instanceof File) {
                try {
                    // Verifica conteúdo explícito
                    const result = await contentModeration.checkNSFW(data);

                    if (result.isNSFW) {
                        if (localStorage.getItem('blockExplicitContent') === 'true') {
                            throw new Error('Conteúdo bloqueado pelas configurações do usuário');
                        }

                        const userResponse = await contentModeration.showFrameWarningDialog(
                            data,
                            result.blurredMedia,
                            result.contentType
                        );

                        if (!userResponse) {
                            throw new Error('Envio cancelado pelo usuário');
                        }
                    }

                    return originalSend.call(this, data);
                } catch (error) {
                    console.error('Erro ao processar arquivo:', error);
                    throw error;
                }
            }
            return originalSend.call(this, data);
        };

        return pc;
    };
}

// Inicializa a interceptação do WebRTC
interceptWebRTC();

// Função para processar mensagens recebidas
function handleReceivedMessage(message) {
    try {
        // Retorna a mensagem normalmente sem verificação
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.textContent = message;
        return messageElement;
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        return null;
    }
}

// Função para processar notificações push
function handlePushNotification(notification) {
    return contentModeration.processPushNotification(notification);
}
