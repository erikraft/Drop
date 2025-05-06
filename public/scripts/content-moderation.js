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
    showWarningDialog(file, contentType = 'spam') {
        const dialog = document.createElement('div');
        dialog.className = 'content-warning-dialog';

        // Define o ícone e mensagem baseado no tipo de conteúdo
        let icon, title, message;
        switch (contentType) {
            case 'explicit':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                    <line x1="3" y1="3" x2="21" y2="21"/>
                </svg>`;
                title = 'Conteúdo Explícito';
                message = 'Este conteúdo pode conter material adulto ou impróprio';
                break;
            case 'profanity':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
                </svg>`;
                title = 'Linguagem Imprópria';
                message = 'Este conteúdo contém linguagem ofensiva ou inadequada';
                break;
            case 'scam':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>`;
                title = 'Possível Golpe';
                message = 'Este conteúdo pode ser uma tentativa de golpe ou fraude';
                break;
            default:
                icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>`;
                title = 'Possível Spam';
                message = 'Este conteúdo pode ser spam ou tentativa de golpe';
        }

        const content = document.createElement('div');
        content.className = 'warning-content';
        content.innerHTML = `
            <div class="warning-icon">
                ${icon}
            </div>
            <div class="warning-text">
                <p>${title}</p>
                <p>${message}</p>
            </div>
            <div class="media-preview blurred">
                ${file.type.startsWith('image/') ? 
                    `<img src="${URL.createObjectURL(file)}" alt="Preview">` :
                    `<video src="${URL.createObjectURL(file)}" muted></video>`
                }
            </div>
            <div class="warning-buttons">
                <button class="btn-cancel">Recusar</button>
                <button class="btn-view">Ver</button>
            </div>
        `;

        dialog.appendChild(content);
        document.body.appendChild(dialog);

        // Adiciona eventos aos botões
        const cancelBtn = content.querySelector('.btn-cancel');
        const viewBtn = content.querySelector('.btn-view');
        const mediaPreview = content.querySelector('.media-preview');

        cancelBtn.onclick = () => {
            dialog.remove();
            URL.revokeObjectURL(mediaPreview.querySelector('img, video').src);
        };

        viewBtn.onclick = () => {
            mediaPreview.classList.remove('blurred');
            viewBtn.style.display = 'none';
            cancelBtn.textContent = 'Fechar';
        };

        // Adiciona evento para fechar com ESC
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                dialog.remove();
                URL.revokeObjectURL(mediaPreview.querySelector('img, video').src);
                document.removeEventListener('keydown', escHandler);
            }
        });
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
    .content-warning-dialog {
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
