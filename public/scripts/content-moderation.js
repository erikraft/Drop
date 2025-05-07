// Sistema de Moderação de Conteúdo
class ContentModeration {
    constructor() {
        this.blockedWords = [
            // URLs e Links suspeitos
            '.gg/HpZzvY5W', '.gg/TZsbat4tw6', 'discord.gg/doncommunity', 'discord.gg/P93HBWRp',
            'bit.ly', 'encurtador.com.br', 'is.gd', 'kurl.ru', 'l1nk.dev',
            'n9.cl', 'rb.gy', 'shorturl.at', 'shre.ink', 'surl.li', 't.ly', 't.me', 'tinyurl.com',
            'u.to', 'urlzs.com', 'zzb.bz', 'steamcommunity', 'steamgift', 'steamrconmmunity',
            'steamscommunuty', 'steamshort', 'steanmecomnmunity', 'store-steaempowered',
            'share.blood-strike.com', 'casumonster.top', 'abre.ai', 'abrir.link', 'open.ai', 'open.link',
            
            // Palavrões e termos ofensivos
            'arromb', 'asshole', 'babac', 'bastard', 'bct', 'boceta', 'bocetas', 'boquete', 'bosta',
            'bostinha', 'buceta', 'bucetas', 'burro', 'cacete', 'caralh', 'caralho', 'corno', 'corna',
            'crlh', 'cu', 'cuckold', 'cum', 'cumshot', 'cunt', 'cunts', 'cuz', 'desgraça', 'desgraçado',
            'dick', 'escrot', 'fdp', 'foda', 'fuck', 'gay', 'idiota', 'imbecil', 'merda', 'otario',
            'otário', 'pau', 'pinto', 'porra', 'puta', 'putas', 'puto', 'quenga', 'quengo', 'retardado',
            'safado', 'shit', 'shitty', 'viad', 'viado', 'xereca', 'xoxota', 'xvideos', 'xxxvideos',
            
            // Novos termos ofensivos
            'arrobado', 'vadia', 'vadio', 'vagabunda', 'vagabundo', 'piranha', 'prostituta', 'prostituto',
            'putinha', 'putinho', 'viadinho', 'viadinha', 'bocetinha', 'bucetinha', 'cuzinho', 'cuzinha',
            'caralhinho', 'caralhinha', 'pauzinho', 'pauzinha', 'pintinho', 'pintinha', 'merdinha',
            'merdinho', 'bostinha', 'bostinho', 'fodinha', 'fodinho', 'putinha', 'putinho',
            
            // Termos NSFW e conteúdo adulto
            '🔞', '🍆', '🍑', '🥒', '🥵', 'PORN', 'Pornografia', 'pornografía', 'pornography',
            'nude', 'nudes', 'Onlyfans', 'OnlyFans', 'Leaks', 'Hentai', 'Teen Porn', 'E-Girls Porn',
            'Latina Nudes', 'xnudes', 'xvideos', 'pornhub', 'xhamster', 'redtube', 'sexy', 'sexy girl',
            'sexo', 'sex',
            
            // Spam e golpes
            '$100', '$20 gift', '20$ gift', 'Bilhão de reais', 'Billion Dollars', 'Billion of reais',
            'Billion reais', 'buy now', 'cheap', 'click here', 'follow me', 'free gift', 'free nudes',
            'gift from steam', 'gifts', 'here', 'Hot', 'HOT', 'prize', 'vote for me',
            'withdrew $15647', 'Milhão de reais', 'Million Dollars', 'Million reais',
            
            // Outros termos ofensivos
            'dirty black', 'negro sujo', 'worm', 'verme', 'trash', 'worthless', 'idiot', 'imbecile',
            'shut up', 'cala a boca'
        ];

        this.spamPatterns = [
            /(.)\1{10,}/, // Caracteres repetidos (aumentado para 10+ repetições)
            /(.){1000,}/, // Textos muito longos (aumentado para 1000+ caracteres)
            /(.){1,10}\1{5,}/, // Padrões repetitivos
            /(.){1,5}\1{10,}/, // Caracteres repetidos em sequência
            /(.){1,3}\1{15,}/  // Caracteres muito repetidos
        ];

        // Mapeamento de substituições comuns
        this.characterSubstitutions = {
            'a': ['4', '@', 'α', 'а'],
            'o': ['0', '@', 'о', 'ο'],
            'e': ['3', 'ε', 'е'],
            'i': ['1', '!', 'і', 'ι'],
            's': ['$', '5', 'ѕ'],
            't': ['7', 'т'],
            'b': ['8', 'в'],
            'g': ['9', 'ɡ'],
            'l': ['1', '|', 'ł'],
            'z': ['2', 'з']
        };

        // Caracteres cirílicos que podem ser usados para enganar
        this.cyrillicChars = {
            'а': 'a', // cirílico 'а' vs latino 'a'
            'е': 'e', // cirílico 'е' vs latino 'e'
            'о': 'o', // cirílico 'о' vs latino 'o'
            'с': 'c', // cirílico 'с' vs latino 'c'
            'р': 'p', // cirílico 'р' vs latino 'p'
            'у': 'y', // cirílico 'у' vs latino 'y'
            'х': 'x', // cirílico 'х' vs latino 'x'
            'і': 'i', // cirílico 'і' vs latino 'i'
            'ѕ': 's', // cirílico 'ѕ' vs latino 's'
            'т': 't', // cirílico 'т' vs latino 't'
            'в': 'b', // cirílico 'в' vs latino 'b'
            'ɡ': 'g', // cirílico 'ɡ' vs latino 'g'
            'з': 'z', // cirílico 'з' vs latino 'z'
            'м': 'm', // cirílico 'м' vs latino 'm'
            'н': 'h', // cirílico 'н' vs latino 'h'
            'к': 'k', // cirílico 'к' vs latino 'k'
            'л': 'l', // cirílico 'л' vs latino 'l'
            'д': 'd', // cirílico 'д' vs latino 'd'
            'ф': 'f', // cirílico 'ф' vs latino 'f'
            'ц': 'c', // cirílico 'ц' vs latino 'c'
            'ч': 'ch', // cirílico 'ч' vs latino 'ch'
            'ш': 'sh', // cirílico 'ш' vs latino 'sh'
            'щ': 'sch', // cirílico 'щ' vs latino 'sch'
            'ъ': '', // cirílico 'ъ' (não tem equivalente)
            'ь': '', // cirílico 'ь' (não tem equivalente)
            'ю': 'yu', // cirílico 'ю' vs latino 'yu'
            'я': 'ya'  // cirílico 'я' vs latino 'ya'
        };

        // Inicializa o modelo NSFW
        this.nsfwModel = null;
        this.initNSFWModel();
    }

    async initNSFWModel() {
        try {
            // Carrega o modelo NSFW do TensorFlow.js
            this.nsfwModel = await tf.loadGraphModel('https://d1zv2aa70wpiur.cloudfront.net/tfjs_models/tfjs_nsfw_mobilenet/model.json');
        } catch (error) {
            console.error('Erro ao carregar modelo NSFW:', error);
        }
    }

    // Normaliza o texto removendo substituições de caracteres
    normalizeText(text) {
        let normalized = text.toLowerCase();
        
        // Substitui caracteres especiais de volta para suas formas normais
        for (const [normal, substitutes] of Object.entries(this.characterSubstitutions)) {
            for (const substitute of substitutes) {
                normalized = normalized.replace(new RegExp(substitute, 'g'), normal);
            }
        }
        
        return normalized;
    }

    // Verifica se o texto contém palavras bloqueadas mesmo com substituições
    hasBlockedWordsWithSubstitutions(text) {
        const normalized = this.normalizeText(text);
        return this.blockedWords.some(word => normalized.includes(word.toLowerCase()));
    }

    // Verifica se o arquivo é uma imagem ou vídeo
    isMediaFile(file) {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
    }

    // Verifica se o conteúdo é NSFW
    async checkNSFW(file) {
        if (!this.isMediaFile(file)) return false;

        try {
            // Verifica primeiro pelo nome do arquivo
            const fileName = file.name.toLowerCase();
            if (this.blockedWords.some(word => fileName.includes(word.toLowerCase()))) {
                return true;
            }

            // Se for uma imagem ou vídeo, verifica o conteúdo
            if (file.type.startsWith('image/')) {
                return await this.checkImageNSFW(file);
            } else if (file.type.startsWith('video/')) {
                return await this.checkVideoNSFW(file);
            }

            return false;
        } catch (error) {
            console.error('Erro ao verificar NSFW:', error);
            return false;
        }
    }

    async checkImageNSFW(file) {
        if (!this.nsfwModel) return false;

        try {
            const img = await createImageBitmap(file);
            const tensor = tf.browser.fromPixels(img)
                .resizeBilinear([224, 224])
                .expandDims()
                .toFloat()
                .div(255.0);

            const predictions = await this.nsfwModel.predict(tensor).data();
            tensor.dispose();

            // Verifica se o conteúdo é NSFW
            const nsfwScore = predictions[1]; // Índice 1 é para conteúdo NSFW
            return nsfwScore > 0.5; // Threshold de 50%
        } catch (error) {
            console.error('Erro ao verificar imagem NSFW:', error);
            return false;
        }
    }

    async checkVideoNSFW(file) {
        if (!this.nsfwModel) return false;

        try {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            
            return new Promise((resolve) => {
                video.onloadeddata = async () => {
                    // Captura frames do vídeo para análise
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');

                    // Analisa alguns frames do vídeo
                    const frameCount = 5;
                    const interval = video.duration / frameCount;
                    let nsfwFrames = 0;

                    for (let i = 0; i < frameCount; i++) {
                        video.currentTime = i * interval;
                        await new Promise(r => video.onseeked = r);
                        
                        ctx.drawImage(video, 0, 0);
                        const tensor = tf.browser.fromPixels(canvas)
                            .resizeBilinear([224, 224])
                            .expandDims()
                            .toFloat()
                            .div(255.0);

                        const predictions = await this.nsfwModel.predict(tensor).data();
                        tensor.dispose();

                        if (predictions[1] > 0.5) {
                            nsfwFrames++;
                        }
                    }

                    URL.revokeObjectURL(video.src);
                    resolve(nsfwFrames > frameCount / 2); // Se mais da metade dos frames for NSFW
                };
            });
        } catch (error) {
            console.error('Erro ao verificar vídeo NSFW:', error);
            return false;
        }
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
        return this.blockedWords.some(word => normalizedUrl.includes(word.toLowerCase()));
    }

    // Verifica se é spam ou contém palavras bloqueadas
    isSpam(text, file) {
        // Verifica se o texto contém palavras bloqueadas
        const hasBlockedWords = this.blockedWords.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(text);
        });

        // Verifica se o texto contém palavras bloqueadas com substituições
        const hasBlockedWordsWithSubs = this.hasBlockedWordsWithSubstitutions(text);

        // Verifica se o texto contém URLs suspeitas
        const hasSuspiciousUrls = this.isSuspiciousUrl(text);

        // Verifica se o texto contém caracteres cirílicos
        const hasCyrillicChars = this.hasCyrillicChars(text);

        // Verifica se o texto contém emojis impróprios
        const hasInappropriateEmojis = this.hasInappropriateEmojis(text);

        // Verifica se o texto contém padrões de spam
        const hasSpamPatterns = this.spamPatterns.some(pattern => {
            if (pattern.type === 'repeated') {
                return pattern.regex.test(text);
            } else if (pattern.type === 'length') {
                return text.length > pattern.threshold;
            } else if (pattern.type === 'repetitive') {
                return pattern.regex.test(text);
            }
            return false;
        });

        // Determina o tipo de conteúdo impróprio
        let contentType = 'spam';
        if (hasBlockedWords || hasBlockedWordsWithSubs) {
            contentType = 'profanity';
        }
        if (hasInappropriateEmojis || this.isExplicitContent(text)) {
            contentType = 'explicit';
        }
        if (hasSuspiciousUrls || hasCyrillicChars) {
            contentType = 'scam';
        }

        // Retorna o resultado com o tipo de conteúdo
        return {
            isSpam: hasBlockedWords || hasBlockedWordsWithSubs || hasSuspiciousUrls || 
                   hasCyrillicChars || hasInappropriateEmojis || hasSpamPatterns,
            contentType: contentType
        };
    }

    // Método para verificar emojis impróprios
    hasInappropriateEmojis(text) {
        const inappropriateEmojis = ['🔞', '🍆', '🍑', '🥒', '🥵', '💦', '👅', '👙', '👄', '💋'];
        return inappropriateEmojis.some(emoji => text.includes(emoji));
    }

    // Método para verificar conteúdo explícito
    isExplicitContent(text) {
        const explicitTerms = ['porn', 'sex', 'nude', 'nudes', 'onlyfans', 'leaks', 'hentai'];
        return explicitTerms.some(term => text.toLowerCase().includes(term));
    }

    // Mostra o diálogo de aviso
    async showWarningDialog(file, contentType = 'spam') {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'content-moderation-warning';
            
            let title, message, icon;
            
            switch(contentType) {
                case 'explicit':
                    title = '🚫 Conteúdo Explícito Detectado';
                    message = 'Este conteúdo pode conter material explícito ou inadequado. Tem certeza que deseja visualizar?';
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#ff4444">
                        <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                    </svg>`;
                    break;
                case 'spam':
                    title = '🚫 Possível Spam/Golpe Detectado';
                    message = 'Este conteúdo pode ser spam ou tentativa de golpe. Deseja visualizar mesmo assim?';
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#ff4444">
                        <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm371-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Z"/>
                    </svg>`;
                    break;
                case 'offensive':
                    title = '🚫 Conteúdo Ofensivo Detectado';
                    message = 'Este conteúdo contém linguagem ofensiva. Deseja visualizar mesmo assim?';
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#ff4444">
                        <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440ZM363-120q-16 0-30.5-6T307-143L143-307q-11-11-17-25.5t-6-30.5v-234q0-16 6-30.5t17-25.5l164-164q11-11 25.5-17t30.5-6h234q16 0 30.5 6t25.5 17l164 164q11 11 17 25.5t6 30.5v234q0 16-6 30.5T817-307L653-143q-11 11-25.5 17t-30.5 6H363Z"/>
                    </svg>`;
                    break;
            }

            dialog.innerHTML = `
                <div class="warning-icon">${icon}</div>
                <div class="warning-title">${title}</div>
                <div class="warning-message">${message}</div>
                <div class="warning-buttons">
                    <button class="warning-button view">Ver</button>
                    <button class="warning-button reject">Recusar</button>
                </div>
            `;

            document.body.appendChild(dialog);

            const viewButton = dialog.querySelector('.warning-button.view');
            const rejectButton = dialog.querySelector('.warning-button.reject');

            viewButton.onclick = () => {
                document.body.removeChild(dialog);
                resolve(true);
            };

            rejectButton.onclick = () => {
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
        switch(contentType) {
            case 'explicit':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ff4444">
                    <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                </svg>`;
                text = 'Conteúdo Explícito Detectado';
                break;
            case 'spam':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ff4444">
                    <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm371-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Z"/>
                </svg>`;
                text = 'Possível Spam/Golpe Detectado';
                break;
            case 'offensive':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ff4444">
                    <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440ZM363-120q-16 0-30.5-6T307-143L143-307q-11-11-17-25.5t-6-30.5v-234q0-16 6-30.5t17-25.5l164-164q11-11 25.5-17t30.5-6h234q16 0 30.5 6t25.5 17l164 164q11 11 17 25.5t6 30.5v234q0 16-6 30.5T817-307L653-143q-11 11-25.5 17t-30.5 6H363Z"/>
                </svg>`;
                text = 'Conteúdo Ofensivo Detectado';
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
        const text = notification.body || '';
        
        if (this.hasBlockedWordsWithSubstitutions(text) || this.isSpam(text)) {
            notification.body = '🚫 CONTEÚDO BLOQUEADO';
            notification.icon = '/images/warning-icon.png';
        }
        
        return notification;
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

export default ContentModeration; 
