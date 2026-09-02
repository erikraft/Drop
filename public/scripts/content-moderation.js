// Sistema de Moderação de Conteúdo
class ContentModeration {
    constructor() {
        this.keywordGroups = {
            explicit: ['porn', 'sex', 'xxx', 'nude', 'nudes', 'onlyfans', 'hentai', 'nsfw', '18+'],
            offensive: ['fuck', 'shit', 'caralh', 'puta', 'merda', 'asshole', 'buceta', 'crlh', 'viad'],
            scam: ['free', 'gift', 'bitcoin', 'crypto', 'prêmio', 'premio', 'ganhe', 'click here', 'win'],
            suspiciousDomains: ['bit.ly', 'tinyurl.com', 't.me', 'rb.gy', 'shorturl.at']
        };

        this.blockedWordPatterns = [
            { type: 'explicit', pattern: /\b(porn|sex|xxx|nude|nudes|onlyfans|hentai|nsfw|18\+|🔞|🍆|🍑|🥵)\b/i },
            { type: 'offensive', pattern: /\b(fuck|shit|merda|bosta|puta|puto|caralh|crlh|arromb|cuckold|cunt)\b/i },
            { type: 'scam', pattern: /\b(free|gift|bitcoin|crypto|pix|premi[oó]|ganhe|win|click here|steam ?gift)\b/i },
            { type: 'suspicious', pattern: /(bit\.ly|tinyurl\.com|t\.me\/[a-z0-9]+|rb\.gy|shorturl\.at|steamcommunity|store-steam)/i }
        ];

        this.spamPatterns = [
            /(.)\1{8,}/,
            /.{1200,}/,
            /(http(s)?:\/\/[^\s]+\s?){3,}/
        ];

        this.characterSubstitutions = {
            'a': ['4', '@', 'α', 'а'],
            'o': ['0', 'ο', 'о'],
            'e': ['3', 'ε', 'е'],
            'i': ['1', '!', 'і', 'ι'],
            's': ['$', '5', 'ѕ'],
            't': ['7', 'т'],
            'b': ['8', 'в'],
            'g': ['9', 'ɡ'],
            'l': ['1', '|', 'ł'],
            'z': ['2', 'з']
        };

        this.cyrillicChars = {
            'а': 'a',
            'е': 'e',
            'о': 'o',
            'с': 'c',
            'р': 'p',
            'у': 'y',
            'х': 'x',
            'і': 'i',
            'ѕ': 's',
            'т': 't',
            'в': 'b',
            'ɡ': 'g',
            'з': 'z',
            'м': 'm',
            'н': 'h',
            'к': 'k',
            'л': 'l',
            'д': 'd',
            'ф': 'f',
            'ц': 'c',
            'ч': 'ch',
            'ш': 'sh',
            'щ': 'sch',
            'ъ': '',
            'ь': '',
            'ю': 'yu',
            'я': 'ya'
        };

        // Múltiplos modelos NSFW
        this.nsfwModels = {
            default: null,
            mobilenet: null,
            inception: null,
            resnet: null
        };

        // Status de carregamento dos modelos
        this.modelLoading = false;
    }

    async loadAllModels() {
        // NSFWJS model loading disabled - CDN is no longer available
        // This functionality has been deprecated due to broken CDN links
        console.log('NSFWJS model loading disabled - legacy feature');
        this.modelLoading = false;
    }

    // Normaliza o texto removendo substituições de caracteres
    normalizeText(text) {
        let normalized = text.toLowerCase();

        for (const [normal, substitutes] of Object.entries(this.characterSubstitutions)) {
            for (const substitute of substitutes) {
                normalized = normalized.replace(new RegExp(substitute, 'g'), normal);
            }
        }

        return normalized;
    }

    matchBlockedPatterns(text, filterTypes = null) {
        const normalized = this.normalizeText(text);
        const matches = [];

        for (const entry of this.blockedWordPatterns) {
            if (filterTypes && !filterTypes.includes(entry.type)) continue;
            if (entry.pattern.test(normalized)) {
                matches.push(entry.type);
            }
        }

        return matches;
    }

    hasBlockedWordsWithSubstitutions(text) {
        return this.matchBlockedPatterns(text).length > 0;
    }

    // Verifica se o arquivo é uma imagem ou vídeo
    isMediaFile(file) {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
    }

    // Verifica se o conteúdo é NSFW
    async checkNSFW(file) {
        if (!this.isMediaFile(file)) return false;

        try {
            console.log('Iniciando verificação NSFW básica para:', file.name);

            // Verifica o nome do arquivo primeiro
            const fileName = file.name.toLowerCase();
            const explicitMatches = this.matchBlockedPatterns(fileName, ['explicit']);
            if (explicitMatches.length) {
                return this._handleExplicitContent(file, 'Nome do arquivo bloqueado', 'explicit');
            }

            // NSFWJS model disabled - only filename checking available
            return { isNSFW: false };
        } catch (error) {
            console.error('Erro na verificação NSFW:', error);
            return { isNSFW: false };
        }
    }

    async processMediaFrames(file) {
        // NSFWJS model disabled - this function no longer processes media frames
        // Only filename-based checking is available
        return false;
    }

    _handleExplicitContent(file, reason, contentType) {
        const blurredMedia = this.createBlurredPreview(file);
        return {
            isNSFW: true,
            reason,
            contentType,
            blurredMedia
        };
    }

    createBlurredPreview(file) {
        const media = document.createElement(file.type.startsWith('image/') ? 'img' : 'video');
        media.src = URL.createObjectURL(file);
        media.style.filter = 'blur(20px)';
        media.className = 'blurred-preview';
        return media;
    }

    async showFrameWarningDialog(file, blurredPreview, contentType = 'explicit') {
        return new Promise((resolve) => {
            let resolved = false;

            const dialog = document.createElement('div');
            dialog.className = 'frame-warning-dialog';

            const content = document.createElement('div');
            content.className = 'frame-warning-content';

            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'frame-warning-icons';

            const visibilityIcon = document.createElement('img');
            visibilityIcon.src = 'images/svg/svg_icons/visibility_off.svg';
            visibilityIcon.alt = 'Conteúdo oculto';

            const blockIcon = document.createElement('img');
            blockIcon.src = 'images/svg/svg_icons/block.svg';
            blockIcon.alt = 'Conteúdo bloqueado';

            iconWrapper.appendChild(visibilityIcon);
            iconWrapper.appendChild(blockIcon);

            const title = document.createElement('h2');
            title.className = 'frame-warning-title';
            title.textContent = Localization.getTranslation('dialogs.moderation-warning-title');

            const message = document.createElement('p');
            message.className = 'frame-warning-message';
            message.textContent = Localization.getTranslation('dialogs.moderation-warning-message');

            const mediaContainer = document.createElement('div');
            mediaContainer.className = 'frame-warning-media';
            blurredPreview.classList.add('frame-warning-preview');
            mediaContainer.appendChild(blurredPreview);

            const actions = document.createElement('div');
            actions.className = 'frame-warning-actions';

            const noButton = document.createElement('button');
            noButton.type = 'button';
            noButton.className = 'frame-warning-btn frame-warning-btn-no';
            noButton.textContent = Localization.getTranslation('dialogs.moderation-no');

            const yesButton = document.createElement('button');
            yesButton.type = 'button';
            yesButton.className = 'frame-warning-btn frame-warning-btn-yes';
            yesButton.textContent = Localization.getTranslation('dialogs.moderation-yes');

            actions.appendChild(noButton);
            actions.appendChild(yesButton);

            content.appendChild(iconWrapper);
            content.appendChild(title);
            content.appendChild(message);
            content.appendChild(mediaContainer);
            content.appendChild(actions);

            dialog.appendChild(content);
            document.body.appendChild(dialog);

            const removeDialog = (result) => {
                if (resolved) return;
                resolved = true;
                document.removeEventListener('keydown', handleKeydown);
                if (dialog.parentNode) {
                    document.body.removeChild(dialog);
                }
                resolve(result);
            };

            const handleKeydown = (event) => {
                if (event.key === 'Escape') {
                    removeDialog(false);
                }
            };

            document.addEventListener('keydown', handleKeydown);

            noButton.addEventListener('click', () => removeDialog(false));
            yesButton.addEventListener('click', () => removeDialog(true));
        });
    }

    // Verifica se uma URL contém caracteres cirílicos
    hasCyrillicChars(url) {
        const cyrillicPattern = /[\u0400-\u04FF]/;
        return cyrillicPattern.test(url);
    }

    // Normaliza uma URL removendo caracteres cirílicos
    normalizeUrl(url) {
        let normalized = url.toLowerCase();
        for (const [cyrillic, latin] of Object.entries(this.cyrillicChars)) {
            normalized = normalized.replace(new RegExp(cyrillic, 'g'), latin);
        }
        return normalized;
    }

    // Verifica se uma URL é suspeita
    isSuspiciousUrl(url) {
        // Verifica se contém caracteres cirílicos
        if (this.hasCyrillicChars(url)) {
            return true;
        }

        // Verifica se a URL normalizada contém palavras bloqueadas
        const normalizedUrl = this.normalizeUrl(url);
        return this.blockedWordPatterns
            .filter(entry => entry.type === 'suspicious')
            .some(entry => entry.pattern.test(normalizedUrl));
    }

    // Verifica se é spam ou contém palavras bloqueadas
    isSpam(text, file) {
        if (!text) return { isSpam: false, contentType: null };

        // Normaliza o texto para comparação
        const normalizedText = this.normalizeText(text.toLowerCase());

        // Sistema de pontuação para determinar o tipo de conteúdo
        let spamScore = 0;
        let offensiveScore = 0;
        let explicitScore = 0;
        let scamScore = 0;

        // Log inicial
        console.log('Verificando mensagem:', text);

        const patternMatches = this.matchBlockedPatterns(normalizedText);
        const countByType = patternMatches.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        if (countByType.explicit) {
            explicitScore += countByType.explicit * 2;
            console.log('Padrões explícitos detectados:', countByType.explicit);
        }

        if (countByType.offensive) {
            offensiveScore += countByType.offensive * 2;
            console.log('Padrões ofensivos detectados:', countByType.offensive);
        }

        if (countByType.scam || countByType.suspicious) {
            scamScore += ((countByType.scam || 0) + (countByType.suspicious || 0)) * 2;
            console.log('Padrões de golpe detectados:', countByType.scam || 0, countByType.suspicious || 0);
        }

        if (patternMatches.length && !explicitScore && !offensiveScore && !scamScore) {
            spamScore += patternMatches.length;
        }

        // Verifica padrões de spam
        if (/(.)\1{4,}/.test(normalizedText)) {
            spamScore += 2;
            console.log('Caracteres repetidos detectados');
        }
        if (text.length > 500) {
            spamScore += 1;
            console.log('Mensagem muito longa detectada');
        }
        if ((text.match(/[A-Z]/g) || []).length > text.length * 0.7) {
            spamScore += 2;
            console.log('Muitas maiúsculas detectadas');
        }

        // Verifica URLs suspeitas
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];
        for (const url of urls) {
            if (this.isSuspiciousUrl(url)) {
                scamScore += 3;
                console.log('URL suspeita detectada:', url);
            }
        }

        // Verifica emojis impróprios
        if (this.hasInappropriateEmojis(text)) {
            explicitScore += 2;
            console.log('Emojis impróprios detectados');
        }

        // Log dos scores
        console.log('Scores finais:', {
            spamScore,
            offensiveScore,
            explicitScore,
            scamScore
        });

        // Determina o tipo de conteúdo baseado nos scores
        let contentType = null;
        let isSpam = false;

        if (explicitScore >= 2) {
            contentType = 'explicit';
            isSpam = true;
        } else if (scamScore >= 3) {
            contentType = 'scam';
            isSpam = true;
        } else if (offensiveScore >= 2) {
            contentType = 'offensive';
            isSpam = true;
        } else if (spamScore >= 3) {
            contentType = 'spam';
            isSpam = true;
        }

        return {
            isSpam,
            contentType,
            scores: {
                explicit: explicitScore,
                scam: scamScore,
                offensive: offensiveScore,
                spam: spamScore
            }
        };
    }

    // Método para verificar emojis impróprios
    hasInappropriateEmojis(text) {
        const inappropriateEmojis = ['🔞', '🍆', '🍑', '🥒', '🥵', '💦', '👅', '👙', '👄', '💋'];
        return inappropriateEmojis.some(emoji => text.includes(emoji));
    }

    // Método para verificar conteúdo explícito
    isExplicitContent(text) {
        return this.matchBlockedPatterns(text, ['explicit']).length > 0;
    }

    // Mostra o diálogo de aviso
    async showWarningDialog(file, contentType = 'spam') {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'content-moderation-warning';

            let title, message, icon;

            switch (contentType) {
                case 'explicit':
                    title = '🚫 Conteúdo Explícito Detectado';
                    message = 'Este conteúdo pode conter material explícito ou inadequado.';
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#ff4444">
                        <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                    </svg>`;
                    break;
                case 'spam':
                    title = '🚫 Possível Spam/Golpe Detectado';
                    message = 'Este conteúdo pode ser spam ou tentativa de golpe.';
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#ff4444">
                        <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm371-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Z"/>
                    </svg>`;
                    break;
                case 'offensive':
                    title = '🚫 Conteúdo Ofensivo Detectado';
                    message = 'Este conteúdo contém linguagem ofensiva.';
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#ff4444">
                        <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440ZM363-120q-16 0-30.5-6T307-143L143-307q-11-11-17-25.5t-6-30.5v-234q0-16 6-30.5t17-25.5l164-164q11-11 25.5-17t30.5-6h234q16 0 30.5 6t25.5 17l164 164q11 11 17 25.5t6 30.5v234q0 16-6 30.5T817-307L653-143q-11 11-25.5 17t-30.5 6H363Z"/>
                    </svg>`;
                    break;
            }

            // Constrói o HTML estático do diálogo sem inserir valores controlados pelo usuário diretamente
            dialog.innerHTML = `
                <div class="warning-content">
                    <div class="warning-icon" data-type="${contentType}">${icon}</div>
                    <div class="warning-title" data-type="${contentType}">${title}</div>
                    <div class="warning-message">${message}</div>
                    <div class="warning-preview blurred"></div>
                    <div class="warning-notice" data-type="${contentType}">
                        <p>⚠️ Este conteúdo foi identificado como potencialmente perigoso.</p>
                    </div>
                    <div class="warning-buttons">
                        <button class="warning-button show">Mostrar Conteúdo</button>
                        <button class="warning-button close">Fechar</button>
                        <button class="warning-button block">Sempre Recusar Conteúdos Perigosos</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            const showButton = dialog.querySelector('.warning-button.show');
            const closeButton = dialog.querySelector('.warning-button.close');
            const blockButton = dialog.querySelector('.warning-button.block');
            const preview = dialog.querySelector('.warning-preview');

            // Insere preview de forma segura sem usar innerHTML para valores controlados
            try {
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.alt = 'Preview';
                    img.src = URL.createObjectURL(file);
                    preview.appendChild(img);
                }
                else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.setAttribute('controls', '');
                    video.src = URL.createObjectURL(file);
                    preview.appendChild(video);
                }
                else {
                    const info = document.createElement('div');
                    info.className = 'file-info';
                    info.textContent = file.name || '';
                    preview.appendChild(info);
                }
            }
            catch (err) {
                console.error('Erro ao inserir preview seguro:', err);
            }

            showButton.onclick = () => {
                preview.classList.remove('blurred');
                showButton.style.display = 'none';
            };

            closeButton.onclick = () => {
                document.body.removeChild(dialog);
                resolve(false);
            };

            blockButton.onclick = () => {
                localStorage.setItem('blockDangerousContent', 'true');
                document.body.removeChild(dialog);
                resolve(false);
            };

            // Fecha o diálogo com ESC
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    document.body.removeChild(dialog);
                    document.removeEventListener('keydown', escHandler);
                    resolve(false);
                }
            });
        });
    }

    // Aplica blur e overlay em conteúdo sensível
    applyBlurAndOverlay(element, contentType) {
        element.classList.add('blurred-content');

        const overlay = document.createElement('div');
        overlay.className = 'warning-overlay';

        let icon, text;
        switch (contentType) {
            case 'explicit':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ffdd00">
                    <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                </svg>`;
                text = Localization.getTranslation('dialogs.explicit-content-detected');
                break;
            case 'spam':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ff0000">
                    <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm371-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Z"/>
                </svg>`;
                text = Localization.getTranslation('dialogs.spam-content-detected');
                break;
            case 'offensive':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ffdd00">
                    <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440ZM363-120q-16 0-30.5-6T307-143L143-307q-11-11-17-25.5t-6-30.5v-234q0-16 6-30.5t17-25.5l164-164q11-11 25.5-17t30.5-6h234q16 0 30.5 6t25.5 17l164 164q11 11 17 25.5t6 30.5v234q0 16-6 30.5T817-307L653-143q-11 11-25.5 17t-30.5 6H363Z"/>
                </svg>`;
                text = Localization.getTranslation('dialogs.offensive-content-detected');
                break;
        }

        overlay.innerHTML = `
            <div class="warning-icon">${icon}</div>
            <div class="warning-text">${text}</div>
        `;

        element.appendChild(overlay);
    }

    // Processa notificações push
    processPushNotification(notification) {
        try {
            const text = notification.body || '';
            const title = notification.title || '';

            // Verifica título e corpo da notificação
            const titleCheck = this.isSpam(title);
            const bodyCheck = this.isSpam(text);

            // Se qualquer parte da notificação for imprópria
            if (titleCheck.isSpam || bodyCheck.isSpam) {
                const contentType = titleCheck.contentType || bodyCheck.contentType;
                const scores = {
                    title: titleCheck.scores,
                    body: bodyCheck.scores
                };

                // Cria uma notificação segura
                const safeNotification = {
                    title: this.getSafeNotificationTitle(contentType),
                    body: this.getSafeNotificationBody(contentType),
                    icon: this.getWarningIcon(contentType),
                    tag: `blocked-${Date.now()}`,
                    data: {
                        originalType: contentType,
                        scores: scores,
                        timestamp: Date.now()
                    },
                    requireInteraction: true,
                    silent: false,
                    vibrate: [200, 100, 200],
                    actions: [
                        {
                            action: 'view',
                            title: 'Ver Detalhes'
                        },
                        {
                            action: 'close',
                            title: 'Fechar'
                        }
                    ]
                };

                // Registra a notificação bloqueada para análise
                this.logBlockedNotification({
                    originalTitle: title,
                    originalBody: text,
                    contentType: contentType,
                    scores: scores,
                    timestamp: Date.now()
                });

                return safeNotification;
            }

            // Se a notificação for segura, adiciona metadados
            return {
                ...notification,
                data: {
                    ...notification.data,
                    safeContent: true,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error('Erro ao processar notificação:', error);
            return null;
        }
    }

    // Obtém título seguro para notificação
    getSafeNotificationTitle(contentType) {
        switch (contentType) {
            case 'explicit':
                return '🚫 Conteúdo Explícito Bloqueado';
            case 'spam':
                return '🚫 Spam Detectado';
            case 'offensive':
                return '🚫 Conteúdo Ofensivo Bloqueado';
            case 'scam':
                return '🚫 Possível Golpe Detectado';
            default:
                return '🚫 Conteúdo Bloqueado';
        }
    }

    // Obtém corpo seguro para notificação
    getSafeNotificationBody(contentType) {
        switch (contentType) {
            case 'explicit':
                return 'Uma notificação com conteúdo explícito foi bloqueada para sua segurança.';
            case 'spam':
                return 'Uma notificação de spam foi bloqueada.';
            case 'offensive':
                return 'Uma notificação com conteúdo ofensivo foi bloqueada.';
            case 'scam':
                return 'Uma notificação suspeita foi bloqueada para sua segurança.';
            default:
                return 'Uma notificação imprópria foi bloqueada.';
        }
    }

    // Obtém ícone de aviso apropriado
    getWarningIcon(contentType) {
        switch (contentType) {
            case 'explicit':
                return '/images/warning-explicit.png';
            case 'spam':
                return '/images/warning-spam.png';
            case 'offensive':
                return '/images/warning-offensive.png';
            case 'scam':
                return '/images/warning-scam.png';
            default:
                return '/images/warning-default.png';
        }
    }

    // Registra notificação bloqueada para análise
    logBlockedNotification(data) {
        try {
            const blockedNotifications = JSON.parse(localStorage.getItem('blockedNotifications') || '[]');
            blockedNotifications.push(data);

            // Mantém apenas as últimas 100 notificações
            if (blockedNotifications.length > 100) {
                blockedNotifications.shift();
            }

            localStorage.setItem('blockedNotifications', JSON.stringify(blockedNotifications));
        } catch (error) {
            console.error('Erro ao registrar notificação bloqueada:', error);
        }
    }

    // Processa um arquivo antes de enviar
    async processFile(file) {
        try {
            // Verifica o arquivo no servidor proxy
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:3001/check-content', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.blocked) {
                const shouldView = await this.showWarningDialog(file, 'explicit');
                if (!shouldView) {
                    throw new Error(`Arquivo bloqueado: ${result.reason}`);
                }
            }

            return file;
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            throw error;
        }
    }

    async checkUrl(url) {
        try {
            const response = await fetch('http://localhost:3001/check-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const result = await response.json();
            return result.blocked;
        } catch (error) {
            console.error('Erro ao verificar URL:', error);
            return false;
        }
    }
}

// Adiciona estilos para o diálogo de aviso
const style = document.createElement('style');
style.textContent = `
    .content-moderation-warning {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(10px);
        animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .warning-content {
        background: #1a1a1a;
        padding: 30px;
        border-radius: 16px;
        max-width: 500px;
        text-align: center;
        color: white;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        animation: slideUp 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
    }

    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .warning-icon {
        width: 80px;
        height: 80px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 10px;
        animation: pulse 2s infinite;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
    }

    @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.05); }
        100% { transform: translate(-50%, -50%) scale(1); }
    }

    .warning-icon svg {
        filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
        width: 64px;
        height: 64px;
    }

    .warning-text {
        text-align: center;
        margin-bottom: 20px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
        width: 100%;
        padding: 0 20px;
    }

    .warning-text p:first-child {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 10px;
        background: linear-gradient(45deg, #ff4444, #ff0000);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .warning-text p:last-child {
        font-size: 18px;
        color: #e3e3e3;
        line-height: 1.5;
    }

    .media-preview {
        position: relative;
        width: 100%;
        max-height: 300px;
        border-radius: 12px;
        overflow: hidden;
        margin-top: 10px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
    }

    .media-preview img,
    .media-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: filter 0.3s ease;
    }

    .blurred img,
    .blurred video {
        filter: blur(25px) brightness(0.7);
    }

    .warning-buttons {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 20px;
        width: 100%;
        position: absolute;
        bottom: 30px;
        left: 0;
        z-index: 2;
    }

    .warning-buttons button {
        padding: 14px 28px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.3s ease;
        flex: 1;
        max-width: 200px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .btn-cancel {
        background: linear-gradient(45deg, #ff4444, #ff0000);
        color: white;
        box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3);
    }

    .btn-cancel:hover {
        background: linear-gradient(45deg, #ff0000, #cc0000);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 0, 0, 0.4);
    }

    .btn-view {
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }

    .btn-view:hover {
        background: linear-gradient(45deg, #45a049, #388e3c);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }

    /* Estilo para notificações de golpe */
    .scam-warning {
        background: linear-gradient(45deg, #ff6b6b, #ff0000);
        color: white;
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
        font-weight: bold;
        text-align: center;
        animation: shake 0.5s ease;
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

window.ContentModeration = ContentModeration;
