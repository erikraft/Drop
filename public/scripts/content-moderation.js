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
            
            // Termos NSFW e conteúdo adulto
            '🔞', '🍆', '🍑', '🥒', '🥵', 'PORN', 'Pornografia', 'pornografía', 'pornography',
            'nude', 'nudes', 'Onlyfans', 'OnlyFans', 'Leaks', 'Hentai', 'Teen Porn', 'E-Girls Porn',
            'Latina Nudes', 'xnudes',
            
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

        // Aqui você pode integrar com APIs de detecção de conteúdo NSFW
        // Por enquanto, vamos usar uma verificação básica de nome de arquivo
        const fileName = file.name.toLowerCase();
        return this.blockedWords.some(word => fileName.includes(word.toLowerCase()));
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
    isSpam(text) {
        // Verifica se é uma URL
        const urlMatch = text.match(/^(https?:\/\/[^\s]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})$/);
        if (urlMatch) {
            // Se for uma URL, verifica se é suspeita
            return this.isSuspiciousUrl(urlMatch[0]);
        }

        // Verifica palavras bloqueadas com substituições
        if (this.hasBlockedWordsWithSubstitutions(text)) {
            return true;
        }
        
        // Verifica padrões de spam
        return this.spamPatterns.some(pattern => pattern.test(text));
    }

    // Mostra o diálogo de aviso
    showWarningDialog(file) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'content-warning-dialog';
            
            // Cria um preview da imagem/vídeo com desfoque
            let mediaPreview = '';
            if (this.isMediaFile(file)) {
                const objectUrl = URL.createObjectURL(file);
                if (file.type.startsWith('image/')) {
                    mediaPreview = `
                        <div class="warning-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#e3e3e3">
                                <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                            </svg>
                        </div>
                        <div class="warning-text">
                            <p>Conteúdo Sensível</p>
                            <p>Este conteúdo pode ser impróprio ou conter golpes</p>
                        </div>
                        <div class="media-preview blurred">
                            <img src="${objectUrl}" alt="Preview">
                        </div>`;
                } else if (file.type.startsWith('video/')) {
                    mediaPreview = `
                        <div class="warning-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="#e3e3e3">
                                <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                            </svg>
                        </div>
                        <div class="warning-text">
                            <p>Conteúdo Sensível</p>
                            <p>Este conteúdo pode ser impróprio ou conter golpes</p>
                        </div>
                        <div class="media-preview blurred">
                            <video src="${objectUrl}" muted></video>
                        </div>`;
                }
            }

            dialog.innerHTML = `
                <div class="warning-content">
                    ${mediaPreview}
                    <div class="warning-buttons">
                        <button class="btn-cancel">Recusar</button>
                        <button class="btn-view">Ver</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // Adiciona evento para remover o URL do objeto quando o diálogo for fechado
            const cleanup = () => {
                if (this.isMediaFile(file)) {
                    URL.revokeObjectURL(objectUrl);
                }
            };

            dialog.querySelector('.btn-cancel').onclick = () => {
                cleanup();
                document.body.removeChild(dialog);
                resolve(false);
            };

            dialog.querySelector('.btn-view').onclick = () => {
                cleanup();
                document.body.removeChild(dialog);
                resolve(true);
            };
        });
    }

    // Processa um arquivo antes de enviar
    async processFile(file) {
        // Verifica spam no nome do arquivo
        if (this.isSpam(file.name)) {
            throw new Error('Arquivo bloqueado: Conteúdo impróprio detectado');
        }

        // Verifica conteúdo NSFW
        if (await this.checkNSFW(file)) {
            const shouldView = await this.showWarningDialog(file);
            if (!shouldView) {
                throw new Error('Arquivo bloqueado: Conteúdo impróprio');
            }
        }

        return file;
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
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .warning-content {
        background: #1a1a1a;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        text-align: center;
        color: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
    }

    .warning-icon {
        width: 64px;
        height: 64px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 10px;
    }

    .warning-icon svg {
        filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
    }

    .warning-text {
        text-align: center;
        margin-bottom: 20px;
    }

    .warning-text p:first-child {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #ff4444;
    }

    .warning-text p:last-child {
        font-size: 16px;
        color: #e3e3e3;
    }

    .media-preview {
        position: relative;
        width: 100%;
        max-height: 300px;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 10px;
    }

    .media-preview img,
    .media-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .blurred img,
    .blurred video {
        filter: blur(20px);
    }

    .warning-buttons {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 20px;
        width: 100%;
    }

    .warning-buttons button {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.3s ease;
        flex: 1;
        max-width: 200px;
    }

    .btn-cancel {
        background: #ff4444;
        color: white;
    }

    .btn-cancel:hover {
        background: #ff0000;
    }

    .btn-view {
        background: #4CAF50;
        color: white;
    }

    .btn-view:hover {
        background: #45a049;
    }
`;
document.head.appendChild(style);

export default ContentModeration; 
