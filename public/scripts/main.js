class ErikrafTdrop {

    constructor() {
        this.$headerNotificationBtn = $('notification');
        this.$headerEditPairedDevicesBtn = $('edit-paired-devices');
        this.$footerPairedDevicesBadge = $$('.discovery-wrapper .badge-room-secret');
        this.$chatFooterPairedDevicesBadge = $$('#chat-panel .badge-room-secret');
        this.$headerInstallBtn = $('install');

        this.deferredStyles = [
            'styles/styles-deferred.css'
        ];

        // IMPORTANT: content-moderation.js is loaded in index.html before main.js
        // to guarantee ContentModeration is defined before this file executes.
        this.deferredScripts = [
            'scripts/browser-tabs-connector.js',
            'scripts/util.js',
            'scripts/network.js',
            'scripts/ai-image-client.js',
            'scripts/ui.js',
            'scripts/libs/heic2any.min.js',
            'scripts/libs/no-sleep.min.js',
            'scripts/libs/qr-code.min.js',
            'scripts/libs/zip.min.js'
        ];

        this.server = null;
        this.peers = null;
        this.contentModeration = null;
    }

    static boot() {
        const start = () => {
            window.erikrafTdrop = new ErikrafTdrop();
            window.erikrafTdrop.initialize();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start, { once: true });
            return;
        }

        start();
    }

    async initialize() {
        this.registerServiceWorker();

        let startupError = null;

        try {
            await this.loadAssets();
            await this.hydrateUI();
            this.bindEvents();
        } catch (error) {
            startupError = error;
            console.error('[App] Initialization flow failed before networking step:', error);
        } finally {
            // Peer discovery must always run, even if previous phases had recoverable failures.
            await this.startPeerDiscovery();

            if (startupError) {
                console.warn('[App] App recovered partially. Networking started with reduced features.');
            } else {
                console.log('[App] Initialization completed successfully.');
            }
        }
    }

    async loadAssets() {
        await this.localizationSafeInit();
        await this.footerSafeLoadingState();

        await this.evaluatePermissionsAndRoomSecrets();
        await this.headerUI.evaluateOverflowing();
        await this.headerUI.fadeIn();
        await this.footerUI._evaluateFooterBadges();
        await this.footerUI.fadeIn();
        await this.centerUI.fadeIn();
        await this.backgroundCanvas.fadeIn();

        await this.loadDeferredAssets();
    }

    async hydrateUI() {
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
        this.lanModeDialog = new LanModeDialog();
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

        this.contentModeration = await this.createContentModeration();
    }

    bindEvents() {
        Events.on('beforeinstallprompt', e => this.onPwaInstallable(e));
        Events.on('ws-connected', () => this.evaluateUrlParams(), { once: true });
    }

    async startPeerDiscovery() {
        if (this.server && this.peers) {
            return;
        }

        if (typeof ServerConnection !== 'function' || typeof PeersManager !== 'function') {
            console.warn('[App] Peer discovery skipped: network classes are unavailable.');
            return;
        }

        this.server = new ServerConnection();
        this.peers = new PeersManager(this.server);
        console.log('[App] Peer discovery initialized.');
    }

    async createContentModeration() {
        if (typeof window.ContentModeration !== 'function') {
            console.warn('[Moderation] ContentModeration is unavailable. Moderation features disabled.');
            return null;
        }

        const moderation = new window.ContentModeration();
        if (moderation.modelLoading) {
            console.log('[Moderation] Model loading started in background.');
        }

        return moderation;
    }

    getContentModeration() {
        if (!this.contentModeration) {
            console.warn('[Moderation] Requested before initialization or unavailable.');
        }
        return this.contentModeration;
    }

    registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        navigator.serviceWorker
            .register('service-worker.js')
            .then(serviceWorker => {
                console.log('Service Worker registered');
                window.serviceWorker = serviceWorker;
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });
    }

    onPwaInstallable(e) {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            if (!this.$headerInstallBtn) {
                console.warn('[UI] Install button not found.');
                return e.preventDefault();
            }

            this.$headerInstallBtn.removeAttribute('hidden');
            this.$headerInstallBtn.addEventListener('click', () => {
                this.$headerInstallBtn.setAttribute('hidden', true);
                e.prompt();
            }, { once: true });
        }
        return e.preventDefault();
    }

    async evaluatePermissionsAndRoomSecrets() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            if (this.$headerNotificationBtn) {
                this.$headerNotificationBtn.removeAttribute('hidden');
            } else {
                console.warn('[UI] Notification button not found.');
            }
        }

        const roomSecrets = await PersistentStorage.getAllRoomSecrets();
        if (!roomSecrets.length) {
            return;
        }

        this.$headerEditPairedDevicesBtn?.removeAttribute('hidden');
        this.$footerPairedDevicesBadge?.removeAttribute('hidden');
        this.$chatFooterPairedDevicesBadge?.removeAttribute('hidden');
    }

    async localizationSafeInit() {
        this.persistentStorage = new PersistentStorage();
        this.localization = new Localization();
        this.themeUI = new ThemeUI();
        this.backgroundCanvas = new BackgroundCanvas();
        this.headerUI = new HeaderUI();
        this.centerUI = new CenterUI();
        this.footerUI = new FooterUI();

        await this.localization.setInitialTranslation();
    }

    async footerSafeLoadingState() {
        if (!this.footerUI || typeof this.footerUI.showLoading !== 'function') {
            console.warn('[UI] Footer UI unavailable during loading state.');
            return;
        }

        await this.footerUI.showLoading();
    }

    loadDeferredAssets() {
        const stylePromises = this.deferredStyles.map(url => this.loadAndApplyStylesheet(url));
        const scriptPromises = this.deferredScripts.map(url => this.loadAndApplyScript(url));
        return Promise.all([...stylePromises, ...scriptPromises]);
    }

    loadStyleSheet(url) {
        return new Promise((resolve, reject) => {
            const stylesheet = document.createElement('link');
            stylesheet.rel = 'preload';
            stylesheet.as = 'style';
            stylesheet.href = url;
            stylesheet.onload = () => {
                stylesheet.onload = null;
                stylesheet.rel = 'stylesheet';
                resolve();
            };
            stylesheet.onerror = reject;
            document.head.appendChild(stylesheet);
        });
    }

    async loadAndApplyStylesheet(url) {
        try {
            await this.loadStyleSheet(url);
            console.log(`Stylesheet loaded successfully: ${url}`);
        } catch (error) {
            console.error('Error loading stylesheet:', error);
        }
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = false;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    async loadAndApplyScript(url) {
        try {
            await this.loadScript(url);
            console.log(`Script loaded successfully: ${url}`);
        } catch (error) {
            console.error('Error loading script:', error);
        }
    }

    async evaluateUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash.substring(1);

        if (urlParams.has('pair_key')) {
            const pairKey = urlParams.get('pair_key');
            this.pairDeviceDialog?._pairDeviceJoin(pairKey);
        }
        else if (urlParams.has('room_id')) {
            const roomId = urlParams.get('room_id');
            this.publicRoomDialog?._joinPublicRoom(roomId);
        }
        else if (urlParams.has('base64text')) {
            const base64Text = urlParams.get('base64text');
            await this.base64Dialog?.evaluateBase64Text(base64Text, hash);
        }
        else if (urlParams.has('base64zip')) {
            const base64Zip = urlParams.get('base64zip');
            await this.base64Dialog?.evaluateBase64Zip(base64Zip, hash);
        }
        else if (urlParams.has('share_target')) {
            const shareTargetType = urlParams.get('share_target');
            const title = urlParams.get('title') || '';
            const text = urlParams.get('text') || '';
            const url = urlParams.get('url') || '';
            await this.webShareTargetUI?.evaluateShareTarget(shareTargetType, title, text, url);
        }
        else if (urlParams.has('file_handler')) {
            await this.webFileHandlersUI?.evaluateLaunchQueue();
        }
        else if (urlParams.has('init')) {
            const init = urlParams.get('init');
            if (init === 'pair') {
                this.pairDeviceDialog?._pairDeviceInitiate();
            }
            else if (init === 'public_room') {
                this.publicRoomDialog?._createPublicRoom();
            }
        }

        const urlWithoutParams = typeof getUrlWithoutArguments === 'function'
            ? getUrlWithoutArguments()
            : window.location.pathname;

        window.history.replaceState({}, 'Rewrite URL', urlWithoutParams);
    }
}

async function handleReceivedFile(file) {
    const app = window.erikrafTdrop;
    const moderation = app?.getContentModeration?.();

    if (!moderation) {
        return file;
    }

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const nsfwResult = await moderation.checkNSFW(file);
        if (nsfwResult?.isNSFW) {
            const shouldView = await moderation.showWarningDialog(file, 'explicit');
            if (!shouldView) return null;
        }
    }

    const spamCheck = moderation.isSpam(file.name);
    const hasOffensiveWords = moderation.hasBlockedWordsWithSubstitutions(file.name);

    if (spamCheck.isSpam || hasOffensiveWords) {
        const shouldView = await moderation.showWarningDialog(file, spamCheck.contentType || 'spam');
        if (!shouldView) return null;
    }

    if (file.type === 'text/plain') {
        const text = await file.text();
        const urls = text.match(/https?:\/\/[^\s]+/g) || [];

        for (const url of urls) {
            const isSuspicious = await moderation.checkUrl(url);
            if (isSuspicious) {
                const shouldView = await moderation.showWarningDialog(file, 'scam');
                if (!shouldView) return null;
            }
        }
    }

    return file;
}

function interceptWebRTC() {
    const originalPeerConnection = window.RTCPeerConnection;
    if (!originalPeerConnection) {
        console.warn('[WebRTC] RTCPeerConnection is unavailable.');
        return;
    }

    window.RTCPeerConnection = function (...args) {
        const pc = new originalPeerConnection(...args);

        if (typeof pc.send !== 'function') {
            return pc;
        }

        const originalSend = pc.send;
        pc.send = async function (data) {
            if (!(data instanceof Blob || data instanceof File)) {
                return originalSend.call(this, data);
            }

            const moderation = window.erikrafTdrop?.getContentModeration?.();
            if (!moderation) {
                return originalSend.call(this, data);
            }

            const result = await moderation.checkNSFW(data);
            if (result?.isNSFW) {
                if (localStorage.getItem('blockExplicitContent') === 'true') {
                    throw new Error('Content blocked by user settings');
                }

                const userResponse = await moderation.showFrameWarningDialog(
                    data,
                    result.blurredMedia,
                    result.contentType
                );

                if (!userResponse) {
                    throw new Error('Sending canceled by user');
                }
            }

            return originalSend.call(this, data);
        };

        return pc;
    };
}

function handleReceivedMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message;
    return messageElement;
}

function handlePushNotification(notification) {
    const moderation = window.erikrafTdrop?.getContentModeration?.();
    if (!moderation || typeof moderation.processPushNotification !== 'function') {
        return notification;
    }

    return moderation.processPushNotification(notification);
}

window.handleReceivedFile = handleReceivedFile;
window.handleReceivedMessage = handleReceivedMessage;
window.handlePushNotification = handlePushNotification;

interceptWebRTC();
ErikrafTdrop.boot();
