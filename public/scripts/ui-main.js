// Selector shortcuts
const $ = query => document.getElementById(query);
const $$ = query => document.querySelector(query);

class DiscoveryBadgeState {
    constructor() {
        this.DEBUG = false;
        this.RENDER_DEBOUNCE_MS = 75;
        this.HIDE_GRACE_MS = 1200;
        this.RECOVERY_TIMEOUT_MS = 2000;
        this.EVENT_QUEUE_DEBOUNCE_MS = 50;
        this.MAX_SYNC_ATTEMPTS = 3;

        this.state = {
            lan: false,
            ip: false,
            paired: false,
            publicRoom: false,
            publicRoomId: null
        };
        this.stateVersion = 0;
        this.recoveryToken = 0;
        this.isSyncing = false;
        this._pendingRenderWhileSyncing = false;
        this.stateMeta = {
            lastUpdated: 0,
            lastEventVersion: 0
        };
        this._syncRequirements = {
            peers: false,
            roomSecrets: false,
            publicRoom: false
        };
        this._syncAttempts = 0;
        this._renderTimer = null;
        this._recoveryTimer = null;
        this._eventQueueTimer = null;
        this._eventQueue = [];
        this._eventSequence = 0;
        this._hideTimers = new Map();
        this._wsConnected = false;

        Events.on('peers', e => this._enqueueEvent('peers', e.detail));
        Events.on('peer-joined', e => this._enqueueEvent('peer-joined', e.detail));
        Events.on('room-secrets', e => this._enqueueEvent('room-secrets', e.detail));
        Events.on('room-secrets-deleted', e => this._enqueueEvent('room-secrets-deleted', e.detail));
        Events.on('join-public-room', e => this._enqueueEvent('join-public-room', e.detail));
        Events.on('public-room-created', e => this._enqueueEvent('public-room-created', e.detail));
        Events.on('public-room-left', _ => this._enqueueEvent('public-room-left', {}));
        Events.on('discovery-public-room-id', e => this._enqueueEvent('public-room-created', e.detail));
        Events.on('ws-connected', _ => this._enqueueEvent('ws-connected', {}));
        Events.on('ws-disconnected', _ => this._enqueueEvent('ws-disconnected', {}));

        this.initialize();
    }

    async initialize() {
        await this._hydrateFromStorage();
        this.scheduleRender();
    }

    _enqueueEvent(type, detail) {
        this._eventQueue.push({
            type,
            detail,
            token: this.recoveryToken,
            version: ++this._eventSequence,
            receivedAt: Date.now()
        });

        clearTimeout(this._eventQueueTimer);
        this._eventQueueTimer = setTimeout(() => this._flushEventQueue(), this.EVENT_QUEUE_DEBOUNCE_MS);
    }

    _eventDedupKey(event) {
        if (event.type === 'peers') return `peers:${event.detail?.roomType || ''}:${event.detail?.roomId || ''}`;
        if (event.type === 'peer-joined') return `peer-joined:${event.detail?.roomType || ''}:${event.detail?.roomId || ''}`;
        if (event.type === 'room-secrets') return 'room-secrets';
        if (event.type === 'room-secrets-deleted') return 'room-secrets-deleted';
        if (event.type === 'public-room-created') return 'public-room-created';
        if (event.type === 'join-public-room') return 'join-public-room';
        if (event.type === 'ws-connected') return 'ws-connected';
        if (event.type === 'ws-disconnected') return 'ws-disconnected';
        return `${event.type}:${event.version}`;
    }

    _flushEventQueue() {
        if (!this._eventQueue.length) return;

        const deduped = new Map();
        this._eventQueue
            .sort((a, b) => a.version - b.version)
            .forEach(event => deduped.set(this._eventDedupKey(event), event));
        this._eventQueue = [];

        Array.from(deduped.values())
            .sort((a, b) => a.version - b.version)
            .forEach(event => this._processEvent(event));
    }

    async _hydrateFromStorage() {
        const publicRoomId = sessionStorage.getItem('public_room_id');
        this.patchState({
            publicRoom: !!publicRoomId,
            publicRoomId: publicRoomId || null
        }, { render: false, source: 'hydrate-storage', allowNullFields: ['publicRoomId'] });
        await this._refreshPairedFromStorage(false);
    }

    validateState(state) {
        const nextState = {
            lan: !!state.lan,
            ip: !!state.ip,
            paired: !!state.paired,
            publicRoom: !!state.publicRoom,
            publicRoomId: typeof state.publicRoomId === 'string' && state.publicRoomId.trim()
                ? state.publicRoomId.trim().toLowerCase()
                : null
        };

        if (nextState.publicRoom && !nextState.publicRoomId) {
            nextState.publicRoom = false;
        }

        if (!nextState.publicRoomId) {
            nextState.publicRoom = false;
        }

        return nextState;
    }

    patchState(partialUpdate, options = {}) {
        const {
            render = true,
            allowNullFields = [],
            timestamp = Date.now(),
            source = 'unknown',
            eventVersion = this.stateMeta.lastEventVersion + 1,
            recoveryToken = this.recoveryToken,
            destructive = false,
            allowDuringSync = false
        } = options;

        if (recoveryToken !== this.recoveryToken) {
            return false;
        }

        if (eventVersion < this.stateMeta.lastEventVersion) {
            return false;
        }

        if (this.isSyncing && destructive && !allowDuringSync) {
            return false;
        }

        if (timestamp < this.stateMeta.lastUpdated) {
            return false;
        }

        const mergedState = { ...this.state };
        Object.keys(partialUpdate || {}).forEach(key => {
            if (!(key in mergedState)) return;
            const value = partialUpdate[key];
            if (typeof value === 'undefined') return;
            if (value === null && !allowNullFields.includes(key)) return;
            mergedState[key] = value;
        });

        const validatedState = this.validateState(mergedState);
        const hasChanged = Object.keys(validatedState).some(key => validatedState[key] !== this.state[key]);
        if (!hasChanged) {
            this.stateMeta.lastEventVersion = Math.max(this.stateMeta.lastEventVersion, eventVersion);
            return false;
        }

        this.state = validatedState;
        this.stateMeta.lastUpdated = timestamp;
        this.stateMeta.lastEventVersion = Math.max(this.stateMeta.lastEventVersion, eventVersion);
        this.stateVersion += 1;

        if (this.DEBUG) {
            console.log('[Discovery State]', {
                source,
                state: this.state,
                version: this.stateVersion,
                syncing: this.isSyncing,
                recoveryToken: this.recoveryToken
            });
        }

        if (render) {
            this.scheduleRender();
        }

        return true;
    }

    scheduleRender() {
        if (this.isSyncing) {
            this._pendingRenderWhileSyncing = true;
            return;
        }

        clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(() => this.renderBadges(), this.RENDER_DEBOUNCE_MS);
    }

    _requestResync(token) {
        if (token !== this.recoveryToken) return;
        Events.fire('join-ip-room');

        if (typeof PersistentStorage !== 'undefined' && typeof PersistentStorage.getAllRoomSecrets === 'function') {
            PersistentStorage.getAllRoomSecrets().then(roomSecrets => {
                if (token !== this.recoveryToken) return;
                Events.fire('room-secrets', roomSecrets);
            });
        }

        const publicRoomId = sessionStorage.getItem('public_room_id');
        if (publicRoomId) {
            Events.fire('join-public-room', { roomId: publicRoomId, createIfInvalid: true });
        }
        else {
            this._markSyncStep('publicRoom', token);
        }
    }

    _scheduleRecovery(token) {
        clearTimeout(this._recoveryTimer);
        this._recoveryTimer = setTimeout(() => {
            if (token !== this.recoveryToken) return;
            if (!this.isSyncing) return;

            this._syncAttempts += 1;
            if (this._syncAttempts >= this.MAX_SYNC_ATTEMPTS) {
                this.safeReset('sync-timeout');
                return;
            }

            this._requestResync(token);
            this._scheduleRecovery(token);
        }, this.RECOVERY_TIMEOUT_MS);
    }

    _processEvent(event) {
        switch (event.type) {
            case 'ws-connected':
                this._onWsConnected(event);
                break;
            case 'ws-disconnected':
                this._onWsDisconnected(event);
                break;
            case 'peers':
                this._onPeers(event);
                break;
            case 'peer-joined':
                this._onPeerJoined(event);
                break;
            case 'room-secrets':
                this._onRoomSecrets(event);
                break;
            case 'room-secrets-deleted':
                this._onRoomSecretsDeleted(event);
                break;
            case 'join-public-room':
                this._onJoinPublicRoom(event);
                break;
            case 'public-room-created':
                this._onPublicRoomCreated(event);
                break;
            case 'public-room-left':
                this._onPublicRoomLeft(event);
                break;
            default:
                break;
        }
    }

    _beginSyncHandshake() {
        this.recoveryToken += 1;
        const token = this.recoveryToken;
        this.isSyncing = true;
        this._syncAttempts = 0;
        this._syncRequirements = {
            peers: false,
            roomSecrets: false,
            publicRoom: false
        };

        this._requestResync(token);
        this._scheduleRecovery(token);
    }

    _markSyncStep(step, token) {
        if (token !== this.recoveryToken) return;
        if (!this.isSyncing) return;

        this._syncRequirements[step] = true;
        const completed = Object.values(this._syncRequirements).every(Boolean);
        if (!completed) return;

        clearTimeout(this._recoveryTimer);
        if (!this.assertConsistentState(this.state)) {
            this.safeReset('post-sync-inconsistent');
            return;
        }

        this.isSyncing = false;
        if (this._pendingRenderWhileSyncing) {
            this._pendingRenderWhileSyncing = false;
            this.scheduleRender();
        }
    }

    assertConsistentState(state) {
        const validated = this.validateState(state);
        return Object.keys(validated).every(key => validated[key] === state[key]);
    }

    safeReset(reason = 'unknown') {
        const token = this.recoveryToken;
        this.patchState({
            lan: false,
            ip: false,
            publicRoom: false,
            publicRoomId: null
        }, {
            source: `safe-reset:${reason}`,
            recoveryToken: token,
            allowNullFields: ['publicRoomId'],
            destructive: true,
            allowDuringSync: true
        });
        this._refreshPairedFromStorage();
        if (this._wsConnected) {
            this._beginSyncHandshake();
        }
    }

    _onPeers(event) {
        const message = event.detail;
        if (message?.roomType === 'lan') {
            this.patchState({ lan: true }, { source: 'peers-lan', eventVersion: event.version, recoveryToken: event.token });
        }
        if (message?.roomType === 'ip') {
            this.patchState({ ip: true }, { source: 'peers-ip', eventVersion: event.version, recoveryToken: event.token });
        }
        if (message?.roomType === 'public-id') {
            this.patchState({
                publicRoom: !!message.roomId,
                publicRoomId: message.roomId || null
            }, {
                source: 'peers-public',
                allowNullFields: ['publicRoomId'],
                eventVersion: event.version,
                recoveryToken: event.token
            });
        }
        this._markSyncStep('peers', event.token);
    }

    _onPeerJoined(event) {
        const message = event.detail;
        if (message?.roomType === 'lan') {
            this.patchState({ lan: true }, { source: 'peer-joined-lan', eventVersion: event.version, recoveryToken: event.token });
        }
        if (message?.roomType === 'ip') {
            this.patchState({ ip: true }, { source: 'peer-joined-ip', eventVersion: event.version, recoveryToken: event.token });
        }
        if (message?.roomType === 'public-id') {
            this.patchState({
                publicRoom: !!message.roomId,
                publicRoomId: message.roomId || null
            }, {
                source: 'peer-joined-public',
                allowNullFields: ['publicRoomId'],
                eventVersion: event.version,
                recoveryToken: event.token
            });
        }
        this._markSyncStep('peers', event.token);
    }

    _onRoomSecrets(event) {
        const roomSecrets = event.detail;
        if (Array.isArray(roomSecrets) && roomSecrets.length > 0) {
            this.patchState({ paired: true }, { source: 'room-secrets', eventVersion: event.version, recoveryToken: event.token });
        }
        this._refreshPairedFromStorage();
        this._markSyncStep('roomSecrets', event.token);
    }

    _onRoomSecretsDeleted(event) {
        this._refreshPairedFromStorage();
        this._markSyncStep('roomSecrets', event.token);
    }

    _onJoinPublicRoom(event) {
        const detail = event.detail;
        if (!detail?.roomId) return;
        this.patchState({
            publicRoom: true,
            publicRoomId: detail.roomId
        }, {
            source: 'join-public-room',
            eventVersion: event.version,
            recoveryToken: event.token
        });
        this._markSyncStep('publicRoom', event.token);
    }

    _onPublicRoomCreated(event) {
        const roomId = event.detail;
        if (!roomId) return;
        this.patchState({
            publicRoom: true,
            publicRoomId: roomId
        }, {
            source: 'public-room-created',
            eventVersion: event.version,
            recoveryToken: event.token
        });
        this._markSyncStep('publicRoom', event.token);
    }

    _onPublicRoomLeft(event) {
        this.patchState({
            publicRoom: false,
            publicRoomId: null
        }, {
            source: 'public-room-left',
            allowNullFields: ['publicRoomId'],
            eventVersion: event.version,
            recoveryToken: event.token,
            destructive: true
        });
        this._markSyncStep('publicRoom', event.token);
    }

    async _onWsConnected() {
        this._wsConnected = true;
        await this._hydrateFromStorage();
        this._beginSyncHandshake();
    }

    _onWsDisconnected() {
        this._wsConnected = false;
        this.recoveryToken += 1;
        this.isSyncing = false;
        this._pendingRenderWhileSyncing = false;
        clearTimeout(this._recoveryTimer);
        clearTimeout(this._eventQueueTimer);
    }

    async _refreshPairedFromStorage(render = true) {
        if (typeof PersistentStorage === 'undefined' || typeof PersistentStorage.getAllRoomSecrets !== 'function') {
            return;
        }
        const roomSecrets = await PersistentStorage.getAllRoomSecrets();
        this.patchState(
            { paired: Array.isArray(roomSecrets) && roomSecrets.length > 0 },
            { render, source: 'refresh-paired', eventVersion: this.stateMeta.lastEventVersion + 1 }
        );
    }

    renderBadges() {
        if (this.isSyncing) {
            this._pendingRenderWhileSyncing = true;
            return;
        }

        this.state = this.validateState(this.state);

        this._renderBooleanBadge('lan', this.state.lan);
        this._renderBooleanBadge('ip', this.state.ip);
        this._renderBooleanBadge('paired', this.state.paired);
        this._renderPublicBadge(this.state.publicRoom && !!this.state.publicRoomId, this.state.publicRoomId);

        Events.fire('evaluate-footer-badges');
    }

    _renderBooleanBadge(badgeKey, visible) {
        document.querySelectorAll(`[data-badge="${badgeKey}"]`).forEach((el, index) => {
            const timerKey = `${badgeKey}-${index}`;
            clearTimeout(this._hideTimers.get(timerKey));
            if (visible) {
                el.hidden = false;
                this._hideTimers.delete(timerKey);
                return;
            }

            this._hideTimers.set(timerKey, setTimeout(() => {
                if (!this.state[badgeKey]) {
                    el.hidden = true;
                }
                this._hideTimers.delete(timerKey);
            }, this.HIDE_GRACE_MS));
        });
    }

    _renderPublicBadge(visible, publicRoomId) {
        document.querySelectorAll('[data-badge="public"]').forEach((el, index) => {
            const timerKey = `public-${index}`;
            clearTimeout(this._hideTimers.get(timerKey));
            if (visible) {
                el.hidden = false;
                el.textContent = `na sala ${publicRoomId.toUpperCase()}`;
                this._hideTimers.delete(timerKey);
                return;
            }

            this._hideTimers.set(timerKey, setTimeout(() => {
                if (!this.state.publicRoom || !this.state.publicRoomId) {
                    el.hidden = true;
                }
                this._hideTimers.delete(timerKey);
            }, this.HIDE_GRACE_MS));
        });
    }
}

// Event listener shortcuts
class Events {
    static fire(type, detail = {}) {
        window.dispatchEvent(new CustomEvent(type, { detail: detail }));
    }

    static on(type, callback, options) {
        return window.addEventListener(type, callback, options);
    }

    static off(type, callback, options) {
        return window.removeEventListener(type, callback, options);
    }
}

// UIs needed on start
class ThemeUI {

    constructor() {
        this.prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.prefersLightTheme = window.matchMedia('(prefers-color-scheme: light)').matches;

        this.$themeAutoBtn = document.getElementById('theme-auto');
        this.$themeLightBtn = document.getElementById('theme-light');
        this.$themeDarkBtn = document.getElementById('theme-dark');

        let currentTheme = this.getCurrentTheme();
        if (currentTheme === 'dark') {
            this.setModeToDark();
        } else if (currentTheme === 'light') {
            this.setModeToLight();
        }

        this.$themeAutoBtn.addEventListener('click', _ => this.onClickAuto());
        this.$themeLightBtn.addEventListener('click', _ => this.onClickLight());
        this.$themeDarkBtn.addEventListener('click', _ => this.onClickDark());
    }

    getCurrentTheme() {
        return localStorage.getItem('theme');
    }

    setCurrentTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    onClickAuto() {
        if (this.getCurrentTheme()) {
            this.setModeToAuto();
        } else {
            this.setModeToDark();
        }
    }

    onClickLight() {
        if (this.getCurrentTheme() !== 'light') {
            this.setModeToLight();
        } else {
            this.setModeToAuto();
        }
    }

    onClickDark() {
        if (this.getCurrentTheme() !== 'dark') {
            this.setModeToDark();
        } else {
            this.setModeToLight();
        }
    }

    setModeToDark() {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');

        this.setCurrentTheme('dark');

        this.$themeAutoBtn.classList.remove("selected");
        this.$themeLightBtn.classList.remove("selected");
        this.$themeDarkBtn.classList.add("selected");
    }

    setModeToLight() {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');

        this.setCurrentTheme('light');

        this.$themeAutoBtn.classList.remove("selected");
        this.$themeLightBtn.classList.add("selected");
        this.$themeDarkBtn.classList.remove("selected");
    }

    setModeToAuto() {
        document.body.classList.remove('dark-theme');
        document.body.classList.remove('light-theme');
        if (this.prefersDarkTheme) {
            document.body.classList.add('dark-theme');
        }
        else if (this.prefersLightTheme) {
            document.body.classList.add('light-theme');
        }
        localStorage.removeItem('theme');

        this.$themeAutoBtn.classList.add("selected");
        this.$themeLightBtn.classList.remove("selected");
        this.$themeDarkBtn.classList.remove("selected");
    }
}

class HeaderUI {

    constructor() {
        this.$header = $$('header');
        this.$expandBtn = $('expand');
        Events.on("resize", _ => this.evaluateOverflowing());
        this.$expandBtn.addEventListener('click', _ => this.onExpandBtnClick());
    }

    async fadeIn() {
        this.$header.classList.remove('opacity-0');
    }

    async evaluateOverflowing() {
        // remove bracket icon before evaluating
        this.$expandBtn.setAttribute('hidden', true);
        // reset bracket icon rotation and header overflow
        this.$expandBtn.classList.add('flipped');
        this.$header.classList.remove('overflow-expanded');


        const rtlLocale = Localization.currentLocaleIsRtl();
        let icon;
        const $headerIconsShown = document.querySelectorAll('body > header:first-of-type > *:not([hidden])');

        for (let i = 1; i < $headerIconsShown.length; i++) {
            let isFurtherLeftThanLastIcon = $headerIconsShown[i].offsetLeft >= $headerIconsShown[i - 1].offsetLeft;
            let isFurtherRightThanLastIcon = $headerIconsShown[i].offsetLeft <= $headerIconsShown[i - 1].offsetLeft;
            if ((!rtlLocale && isFurtherLeftThanLastIcon) || (rtlLocale && isFurtherRightThanLastIcon)) {
                // we have found the first icon on second row. Use previous icon.
                icon = $headerIconsShown[i - 1];
                break;
            }
        }
        if (icon) {
            // overflowing
            // add overflowing-hidden class
            this.$header.classList.add('overflow-hidden');
            // add expand btn 2 before icon
            this.$expandBtn.removeAttribute('hidden');
            this.$expandBtn.style.display = '';
            icon.before(this.$expandBtn);
        }
        else {
            // no overflowing
            // remove overflowing-hidden class
            this.$header.classList.remove('overflow-hidden');
        }
    }

    onExpandBtnClick() {
        // toggle overflowing-hidden class and flip expand btn icon
        if (this.$header.classList.contains('overflow-hidden')) {
            this.$header.classList.remove('overflow-hidden');
            this.$header.classList.add('overflow-expanded');
            this.$expandBtn.classList.remove('flipped');
        }
        else {
            this.$header.classList.add('overflow-hidden');
            this.$header.classList.remove('overflow-expanded');
            this.$expandBtn.classList.add('flipped');
        }
        Events.fire('header-changed');
    }
}

class CenterUI {

    constructor() {
        this.$center = $$('#center');
        this.$xNoPeers = $$('x-no-peers');
    }

    async fadeIn() {
        this.$center.classList.remove('opacity-0');

        // Prevent flickering on load
        setTimeout(() => {
            this.$xNoPeers.classList.remove('no-animation-on-load');
        }, 600);
    }
}

class FooterUI {

    constructor() {
        this.$footer = $$('footer');
        this.$displayName = $('display-name');
        this.$chatDisplayName = $('chat-display-name');
        this.$discoveryWrapper = $$('footer .discovery-wrapper');
        this.$profilePhotoInput = $('profile-photo-upload');
        this.$deviceAvatarsContainer = $('device-avatars-container');

        [this.$displayName, this.$chatDisplayName].filter(Boolean).forEach(displayNameEl => {
            displayNameEl.addEventListener('keydown', e => this._onKeyDownDisplayName(e));
            displayNameEl.addEventListener('focus', e => this._onFocusDisplayName(e));
            displayNameEl.addEventListener('blur', e => this._onBlurDisplayName(e));
        });

        if (this.$profilePhotoInput) {
            this.$profilePhotoInput.addEventListener('change', e => this._onProfilePhotoChange(e));
        }

        Events.on('display-name', e => this._onDisplayName(e.detail.displayName));
        Events.on('self-display-name-changed', e => this._insertDisplayName(e.detail));
        Events.on('evaluate-footer-badges', _ => this._evaluateFooterBadges());

        // Listen for profile photo updates from other devices
        Events.on('profile-photo-updated', e => this._onProfilePhotoUpdated(e.detail));
    }

    async showLoading() {
        [this.$displayName, this.$chatDisplayName].filter(Boolean).forEach(displayNameEl => {
            displayNameEl.setAttribute('placeholder', displayNameEl.dataset.placeholder);
        });
    }

    _onProfilePhotoChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64Image = reader.result;
            // Emit the base64 image via socket or event
            Events.fire('broadcast-send', { type: 'profile-photo-updated', detail: base64Image });
            // Update local UI
            this._updateLocalProfilePhoto(base64Image);
        };
        reader.readAsDataURL(file);
    }

    _updateLocalProfilePhoto(base64Image) {
        if (!this.$deviceAvatarsContainer) return;

        let localAvatar = this.$deviceAvatarsContainer.querySelector('.device-avatar.local');
        if (!localAvatar) {
            localAvatar = document.createElement('div');
            localAvatar.classList.add('device-avatar', 'local');
            this.$deviceAvatarsContainer.appendChild(localAvatar);
        }
        localAvatar.style.backgroundImage = `url(${base64Image})`;
    }

    _onProfilePhotoUpdated(base64Image) {
        if (!this.$deviceAvatarsContainer) return;

        // For simplicity, update or add a generic avatar for other devices
        let otherAvatar = this.$deviceAvatarsContainer.querySelector('.device-avatar.remote');
        if (!otherAvatar) {
            otherAvatar = document.createElement('div');
            otherAvatar.classList.add('device-avatar', 'remote');
            this.$deviceAvatarsContainer.appendChild(otherAvatar);
        }
        otherAvatar.style.backgroundImage = `url(${base64Image})`;
    }

    async fadeIn() {
        this.$footer.classList.remove('opacity-0');
    }

    async _evaluateFooterBadges() {
        if (this.$discoveryWrapper.querySelectorAll('div:last-of-type > span[hidden]').length < 2) {
            this.$discoveryWrapper.classList.remove('row');
            this.$discoveryWrapper.classList.add('column');
        }
        else {
            this.$discoveryWrapper.classList.remove('column');
            this.$discoveryWrapper.classList.add('row');
        }
        Events.fire('redraw-canvas');
    }

    async _loadSavedDisplayName() {
        const displayNameSaved = await this._getSavedDisplayName()

        if (!displayNameSaved) return;

        console.log("Retrieved edited display name:", displayNameSaved)
        Events.fire('self-display-name-changed', displayNameSaved);
    }

    async _onDisplayName(displayNameServer) {
        // load saved displayname first to prevent flickering
        await this._loadSavedDisplayName();

        // set original display name as placeholder
        [this.$displayName, this.$chatDisplayName].filter(Boolean).forEach(displayNameEl => {
            displayNameEl.setAttribute('placeholder', displayNameServer);
        });
    }


    _insertDisplayName(displayName) {
        [this.$displayName, this.$chatDisplayName].filter(Boolean).forEach(displayNameEl => {
            displayNameEl.textContent = displayName;
        });
    }

    _onKeyDownDisplayName(e) {
        if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            e.target.blur();
        }
    }

    _onFocusDisplayName(e) {
        if (!e.target.innerText) {
            // Fix z-position of cursor when div is completely empty (Firefox only)
            e.target.innerText = "\n";

            // On Chromium based browsers the cursor position is lost when adding sth. to the focused node. This adds it back.
            let sel = window.getSelection();
            sel.collapse(e.target.lastChild);
        }
    }

    async _onBlurDisplayName(e) {
        // fix for Firefox inserting a linebreak into div on edit which prevents the placeholder from showing automatically when it is empty
        if (/^(\n|\r|\r\n)$/.test(e.target.innerText)) {
            e.target.innerText = '';
        }

        // Remove selection from text
        window.getSelection().removeAllRanges();

        await this._saveDisplayName(e.target.innerText)
    }

    async _saveDisplayName(newDisplayName) {
        newDisplayName = newDisplayName.replace(/(\n|\r|\r\n)/, '')
        const savedDisplayName = await this._getSavedDisplayName();
        if (newDisplayName === savedDisplayName) return;

        if (newDisplayName) {
            PersistentStorage.set('edited_display_name', newDisplayName)
                .then(_ => {
                    Events.fire('notify-user', Localization.getTranslation("notifications.display-name-changed-permanently"));
                })
                .catch(_ => {
                    console.log("This browser does not support IndexedDB. Use localStorage instead.");
                    localStorage.setItem('edited_display_name', newDisplayName);
                    Events.fire('notify-user', Localization.getTranslation("notifications.display-name-changed-temporarily"));
                })
                .finally(() => {
                    Events.fire('self-display-name-changed', newDisplayName);
                    Events.fire('broadcast-send', { type: 'self-display-name-changed', detail: newDisplayName });
                });
        }
        else {
            PersistentStorage.delete('edited_display_name')
                .catch(_ => {
                    console.log("This browser does not support IndexedDB. Use localStorage instead.")
                    localStorage.removeItem('edited_display_name');
                })
                .finally(() => {
                    Events.fire('notify-user', Localization.getTranslation("notifications.display-name-random-again"));
                    Events.fire('self-display-name-changed', '');
                    Events.fire('broadcast-send', { type: 'self-display-name-changed', detail: '' });
                });
        }
    }

    _getSavedDisplayName() {
        return new Promise((resolve) => {
            PersistentStorage.get('edited_display_name')
                .then(displayName => {
                    if (!displayName) displayName = "";
                    resolve(displayName);
                })
                .catch(_ => {
                    let displayName = localStorage.getItem('edited_display_name');
                    if (!displayName) displayName = "";
                    resolve(displayName);
                })
        });
    }
}

class BackgroundCanvas {
    constructor() {
        this.$canvas = $$('canvas');
        this.$footer = $$('footer');

        this.initAnimation();
    }

    async fadeIn() {
        this.$canvas.classList.remove('opacity-0');
    }

    initAnimation() {
        this.baseColorNormal = '168 168 168';
        this.baseColorShareMode = '168 168 255';
        this.baseOpacityNormal = 0.3;
        this.baseOpacityShareMode = 0.8;
        this.speed = 0.5;
        this.fps = 60;

        // if browser supports OffscreenCanvas
        //      -> put canvas drawing into serviceworker to unblock main thread
        // otherwise
        //      -> use main thread
        let { init, startAnimation, switchAnimation, onShareModeChange } =
            this.$canvas.transferControlToOffscreen
                ? this.initAnimationOffscreen()
                : this.initAnimationOnscreen();

        init();
        startAnimation();

        // redraw canvas
        Events.on('resize', _ => init());
        Events.on('redraw-canvas', _ => init());
        Events.on('translation-loaded', _ => init());

        // ShareMode
        Events.on('share-mode-changed', e => onShareModeChange(e.detail.active));

        // Start and stop animation
        Events.on('background-animation', e => switchAnimation(e.detail.animate))
        Events.on('offline', _ => switchAnimation(false));
        Events.on('online', _ => switchAnimation(true));
    }

    initAnimationOnscreen() {
        let $canvas = this.$canvas;
        let $footer = this.$footer;

        let baseColorNormal = this.baseColorNormal;
        let baseColorShareMode = this.baseColorShareMode;
        let baseOpacityNormal = this.baseOpacityNormal;
        let baseOpacityShareMode = this.baseOpacityShareMode;
        let speed = this.speed;
        let fps = this.fps;

        let c;
        let cCtx;

        let x0, y0, w, h, dw, offset;

        let startTime;
        let animate = true;
        let currentFrame = 0;
        let lastFrame;
        let baseColor;
        let baseOpacity;

        function createCanvas() {
            c = $canvas;
            cCtx = c.getContext('2d');

            lastFrame = fps / speed - 1;
            baseColor = baseColorNormal;
            baseOpacity = baseOpacityNormal;
        }

        function init() {
            initCanvas($footer.offsetHeight, document.documentElement.clientWidth, document.documentElement.clientHeight);
        }

        function initCanvas(footerOffsetHeight, clientWidth, clientHeight) {
            let oldW = w;
            let oldH = h;
            let oldOffset = offset;
            w = clientWidth;
            h = clientHeight;
            offset = footerOffsetHeight - 28;

            if (oldW === w && oldH === h && oldOffset === offset) return; // nothing has changed

            c.width = w;
            c.height = h;
            x0 = w / 2;
            y0 = h - offset;
            dw = Math.round(Math.min(Math.max(0.6 * w, h)) / 10);

            drawFrame(currentFrame);
        }

        function startAnimation() {
            startTime = Date.now();
            animateBg();
        }

        function switchAnimation(state) {
            if (!animate && state) {
                // animation starts again. Set startTime to specific value to prevent frame jump
                startTime = Date.now() - 1000 * currentFrame / fps;
            }
            animate = state;
            requestAnimationFrame(animateBg);
        }

        function onShareModeChange(active) {
            baseColor = active ? baseColorShareMode : baseColorNormal;
            baseOpacity = active ? baseOpacityShareMode : baseOpacityNormal;
            drawFrame(currentFrame);
        }

        function drawCircle(ctx, radius) {
            ctx.lineWidth = 2;

            let opacity = Math.max(0, baseOpacity * (1 - 1.2 * radius / Math.max(w, h)));
            if (radius > dw * 7) {
                opacity *= (8 * dw - radius) / dw
            }

            if (ctx.setStrokeColor) {
                // older blink/webkit browsers do not understand opacity in strokeStyle. Use deprecated setStrokeColor
                // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle#webkitblink-specific_note
                ctx.setStrokeColor("grey", opacity);
            }
            else {
                ctx.strokeStyle = `rgb(${baseColor} / ${opacity})`;
            }
            ctx.beginPath();
            ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }

        function drawCircles(ctx, frame) {
            ctx.clearRect(0, 0, w, h);
            for (let i = 7; i >= 0; i--) {
                drawCircle(ctx, dw * i + speed * dw * frame / fps + 33);
            }
        }

        function drawFrame(frame) {
            cCtx.clearRect(0, 0, w, h);
            drawCircles(cCtx, frame);
        }

        function animateBg() {
            let now = Date.now();

            if (!animate && currentFrame === lastFrame) {
                // Animation stopped and cycle finished -> stop drawing frames
                return;
            }

            let timeSinceLastFullCycle = (now - startTime) % (1000 / speed);
            let nextFrame = Math.trunc(fps * timeSinceLastFullCycle / 1000);

            // Only draw frame if it differs from current frame
            if (nextFrame !== currentFrame) {
                drawFrame(nextFrame);
                currentFrame = nextFrame;
            }

            requestAnimationFrame(animateBg);
        }

        createCanvas();

        return { init, startAnimation, switchAnimation, onShareModeChange };
    }

    initAnimationOffscreen() {
        console.log("Use OffscreenCanvas to draw background animation.")

        let baseColorNormal = this.baseColorNormal;
        let baseColorShareMode = this.baseColorShareMode;
        let baseOpacityNormal = this.baseOpacityNormal;
        let baseOpacityShareMode = this.baseOpacityShareMode;
        let speed = this.speed;
        let fps = this.fps;
        let $canvas = this.$canvas;
        let $footer = this.$footer;

        const offscreen = $canvas.transferControlToOffscreen();
        const worker = new Worker("scripts/worker/canvas-worker.js");

        function createCanvas() {
            worker.postMessage({
                type: "createCanvas",
                canvas: offscreen,
                baseColorNormal: baseColorNormal,
                baseColorShareMode: baseColorShareMode,
                baseOpacityNormal: baseOpacityNormal,
                baseOpacityShareMode: baseOpacityShareMode,
                speed: speed,
                fps: fps
            }, [offscreen]);
        }

        function init() {
            worker.postMessage({
                type: "initCanvas",
                footerOffsetHeight: $footer.offsetHeight,
                clientWidth: document.documentElement.clientWidth,
                clientHeight: document.documentElement.clientHeight
            });
        }

        function startAnimation() {
            worker.postMessage({ type: "startAnimation" });
        }

        function onShareModeChange(active) {
            worker.postMessage({ type: "onShareModeChange", active: active });
        }

        function switchAnimation(animate) {
            worker.postMessage({ type: "switchAnimation", animate: animate });
        }

        createCanvas();

        return { init, startAnimation, switchAnimation, onShareModeChange };
    }
}
