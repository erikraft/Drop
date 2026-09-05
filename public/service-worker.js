const cacheVersion = 'v1.16.1';
const cacheTitle = `erikraftdrop-cache-${cacheVersion}`;

// Keep this list limited to resources that are part of the current client shell.
// Individual cache failures must never make the Service Worker installation fail.
const relativePathsToCache = [
    './',
    'index.html',
    'manifest.json',
    'ads.html',
    'styles/styles-main.css',
    'styles/styles-deferred.css',
    'styles/content-moderation.css',
    'scripts/browser-tabs-connector.js',
    'scripts/localization.js',
    'scripts/main.js',
    'scripts/network.js',
    'scripts/persistent-storage.js',
    'scripts/ui.js',
    'scripts/ui-main.js',
    'scripts/util.js',
    'scripts/content-moderation.js',
    'scripts/pairdrop-adapter.js',
    'scripts/erikraft-qr.js',
    'scripts/security-layer.js',
    'scripts/animated-qr-controls.js',
    'scripts/animated-qr-file-size.js',
    'scripts/animated-qr-screen-awake.js',
    'scripts/worker/canvas-worker.js',
    'scripts/libs/heic2any.min.js',
    'scripts/libs/jsQR.js',
    'scripts/libs/no-sleep.min.js',
    'scripts/libs/qr-code-styling.js',
    'scripts/qr-helper.js',
    'scripts/libs/zip.min.js',
    'sounds/blop.mp3',
    'sounds/blop.ogg',
    'sounds/ads.mp3',
    'images/favicon-96x96.png',
    'images/favicon-96x96-notification.png',
    'images/android-chrome-192x192.png',
    'images/android-chrome-192x192-maskable.png',
    'images/android-chrome-512x512.png',
    'images/android-chrome-512x512-maskable.png',
    'images/apple-touch-icon.png',
    'images/badges/BadgeLinux.png',
    'images/badges/F-Droid-get-it-on.png',
    'images/badges/Get-it-from-Opera-Addons.png',
    'images/badges/Get_it_on_APKPure_English.png',
    'images/badges/Get_it_on_Google_Play_Store_English.png',
    'images/badges/Get_it_on_Shortcuts_English.png',
    'images/badges/Get_the_add-on_Thunderbird.png',
    'images/badges/Support_me_on_Ko-fi.png',
    'images/badges/Get it on WEB.png',
    'fonts/OpenSans/static/OpenSans-Medium.ttf',
    'lang/ar.json', 'lang/be.json', 'lang/bg.json', 'lang/ca.json',
    'lang/cs.json', 'lang/da.json', 'lang/de.json', 'lang/en.json',
    'lang/es.json', 'lang/et.json', 'lang/eu.json', 'lang/fa.json',
    'lang/fr.json', 'lang/he.json', 'lang/hu.json', 'lang/id.json',
    'lang/it.json', 'lang/ja.json', 'lang/kn.json', 'lang/ko.json',
    'lang/nb.json', 'lang/nl.json', 'lang/nn.json', 'lang/pl.json',
    'lang/pt-BR.json', 'lang/ro.json', 'lang/ru.json', 'lang/sk.json',
    'lang/ta.json', 'lang/tr.json', 'lang/uk.json', 'lang/zh-CN.json',
    'lang/zh-HK.json', 'lang/zh-TW.json'
];

const relativePathsNotToCache = ['config'];
const criticalExtensions = new Set(['.html', '.js', '.css', '.json']);

const rootUrl = new URL('./', self.location.href).href;

const isSameOrigin = request => new URL(request.url).origin === self.location.origin;

const isNavigationRequest = request => request.mode === 'navigate' ||
    (request.destination === 'document' && request.method === 'GET');

const isCriticalRequest = request => {
    const url = new URL(request.url);
    return isNavigationRequest(request) || criticalExtensions.has(url.pathname.slice(url.pathname.lastIndexOf('.')));
};

const doNotCacheRequest = request => {
    const url = new URL(request.url);
    const requestRelativePath = request.url.substring(rootUrl.length);
    if (url.pathname.startsWith('/api/')) return true;
    return relativePathsNotToCache.includes(requestRelativePath);
};

const cacheResponseIfValid = async (request, response) => {
    if (!response || !response.ok || response.type === 'opaque' || doNotCacheRequest(request)) return;
    try {
        const cache = await caches.open(cacheTitle);
        await cache.put(request, response.clone());
    } catch (error) {
        console.warn('[SW] Could not update cache for:', request.url, error);
    }
};

const fetchNetwork = async request => {
    const response = await fetch(request, {cache: 'no-store'});
    if (!response.ok) throw new Error(`Network response ${response.status} for ${request.url}`);
    await cacheResponseIfValid(request, response);
    return response;
};

const fetchCritical = async request => {
    try {
        // HTML/CSS/JS/JSON must prefer the network so a new shell cannot be
        // combined with an old shell merely because an old cache entry exists.
        return await fetchNetwork(request);
    } catch (error) {
        console.warn('[SW] Network unavailable, trying versioned cache:', request.url, error);
        const cache = await caches.open(cacheTitle);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
    }
};

const fetchRuntime = async request => {
    try {
        return await fetchNetwork(request);
    } catch (error) {
        const cache = await caches.open(cacheTitle);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
    }
};

self.addEventListener('install', event => {
    console.log('[SW] Installing:', cacheVersion);
    event.waitUntil((async () => {
        const cache = await caches.open(cacheTitle);
        const results = await Promise.allSettled(relativePathsToCache.map(async path => {
            try {
                const response = await fetch(new URL(path, rootUrl), {cache: 'no-store'});
                if (!response.ok || response.type === 'opaque') {
                    throw new Error(`HTTP ${response.status} for ${path}`);
                }
                await cache.put(new Request(new URL(path, rootUrl).href), response);
                return path;
            } catch (error) {
                console.warn('[SW] Optional pre-cache failed:', path, error);
                return null;
            }
        }));

        const cachedCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
        console.log(`[SW] Pre-cache completed: ${cachedCount}/${relativePathsToCache.length} resources available.`);

        // The SW is an enhancement. Never block activation on a pre-cache miss.
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating:', cacheVersion);
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => {
            if (cacheName.startsWith('erikraftdrop-cache-') && cacheName !== cacheTitle) {
                console.log('[SW] Deleting stale cache:', cacheName);
                return caches.delete(cacheName);
            }
            return Promise.resolve(false);
        }));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || !isSameOrigin(request)) {
        if (request.method === 'POST' && isSameOrigin(request)) {
            const url = new URL(request.url);
            if (url.pathname.startsWith('/api/')) {
                event.respondWith(fetch(request));
                return;
            }
            event.respondWith((async () => {
                const shareUrl = await evaluateRequestData(request);
                return Response.redirect(encodeURI(shareUrl), 302);
            })());
        } else if (!isSameOrigin(request)) {
            event.respondWith(fetch(request));
        }
        return;
    }

    if (doNotCacheRequest(request)) {
        event.respondWith(fetch(request, {cache: 'no-store'}));
        return;
    }

    event.respondWith(isCriticalRequest(request) ? fetchCritical(request) : fetchRuntime(request));
});

const evaluateRequestData = async request => {
    try {
        const formData = await request.formData();
        const title = formData.get('title');
        const text = formData.get('text');
        const url = formData.get('url');
        const files = formData.getAll('allfiles');
        const erikrafTdropUrl = request.url;

        if (files && files.length > 0) {
            const fileObjects = [];
            for (let i = 0; i < files.length; i++) {
                fileObjects.push({name: files[i].name, buffer: await files[i].arrayBuffer()});
            }

            const db = await new Promise((resolve, reject) => {
                const requestDb = indexedDB.open('erikraftdrop_store');
                requestDb.onsuccess = event => resolve(event.target.result);
                requestDb.onerror = () => reject(requestDb.error || new Error('IndexedDB unavailable'));
            });

            await Promise.all(fileObjects.map(fileObject => new Promise((resolve, reject) => {
                try {
                    const transaction = db.transaction('share_target_files', 'readwrite');
                    const objectStore = transaction.objectStore('share_target_files');
                    const objectStoreRequest = objectStore.add(fileObject);
                    objectStoreRequest.onsuccess = () => resolve();
                    objectStoreRequest.onerror = () => reject(objectStoreRequest.error || new Error('Share target write failed'));
                } catch (error) {
                    reject(error);
                }
            })));

            return erikrafTdropUrl + '?share_target=files';
        }

        const params = new URLSearchParams();
        params.set('share_target', 'text');
        if (title) params.set('title', title);
        if (text) params.set('text', text);
        if (url) params.set('url', url);
        return `${erikrafTdropUrl}?${params.toString()}`;
    } catch (error) {
        console.error('[SW] Share Target processing failed:', error);
        return new URL('./', request.url).href;
    }
};
