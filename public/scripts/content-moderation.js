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

        // Termos explícitos
        this.explicitTerms = [
            'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'nsfw', '18+',
            'pornografia', 'sexo', 'adulto', 'nu', 'nua', 'nudez', 'erótico',
            'onlyfans', 'leaks', 'hentai', 'pussy', 'buceta', 'xereca', 'xereka',
            'chereca', 'hentai', 'pornhub', 'xhamster', 'redtube', 'sexy', 'sexy girl',
            'sexo', 'sex', 'porn', 'pornografia', 'erótico', 'erótica',
        ];

        // Termos ofensivos
        this.offensiveTerms = [
            'arromb', 'asshole', 'babac', 'bastard', 'bct', 'boceta', 'boquete',
            'burro', 'cacete', 'caralh', 'corno', 'corna', 'crlh', 'cu', 'puta'
        ];

        // Termos de golpe
        this.scamTerms = [
            'hack', 'crack', 'pirata', 'gratis', 'free', 'win', 'premio', 'prêmio',
            'ganhou', 'bitcoin', 'crypto', 'investment', 'investimento', 'money'
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

        // Múltiplos modelos NSFW
        this.nsfwModels = {
            default: null,
            mobilenet: null,
            inception: null,
            resnet: null
        };
        
        // Status de carregamento dos modelos
        this.modelLoading = false;
        
        // URLs dos modelos
        this.modelUrls = {
            default: 'https://cdn.jsdelivr.net/npm/nsfwjs@2.4.0/dist/model/',
            mobilenet: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/model.json',
            inception: 'https://storage.googleapis.com/tfjs-models/tfjs/inception_v3/2/model.json',
            resnet: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/toxicity@1.2.2/dist/model.json'
        };

        // APIs externas de moderação
        this.externalApis = {
            deepai: 'https://api.deepai.org/api/nsfw-detector',
            sightengine: 'https://api.sightengine.com/1.0/check.json',
            moderatecontent: 'https://api.moderatecontent.com/moderate/',
            imagga: 'https://api.imagga.com/v2/categories/nsfw_beta',
            cloudmersive: 'https://api.cloudmersive.com/image/nsfw/classify'
        };

        // Inicializa todos os modelos
        this.loadAllModels();
    }

    async loadAllModels() {
        if (this.modelLoading) return;
        this.modelLoading = true;
        
        try {
            console.log('Carregando múltiplos modelos NSFW...');
            
            // Carrega modelo principal do NSFWJS
            this.nsfwModels.default = await nsfwjs.load(this.modelUrls.default);
            console.log('Modelo NSFWJS principal carregado');
            
            // Carrega MobileNet para detecção adicional
            this.nsfwModels.mobilenet = await tf.loadLayersModel(this.modelUrls.mobilenet);
            console.log('Modelo MobileNet carregado');
            
            // Carrega Inception para classificação avançada
            this.nsfwModels.inception = await tf.loadLayersModel(this.modelUrls.inception);
            console.log('Modelo Inception carregado');
            
            // Carrega ResNet para detecção de características
            this.nsfwModels.resnet = await tf.loadLayersModel(this.modelUrls.resnet);
            console.log('Modelo ResNet carregado');
            
        } catch (error) {
            console.error('Erro ao carregar modelos:', error);
        }
        
        this.modelLoading = false;
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
            console.log('Iniciando verificação NSFW completa para:', file.name);
            
            // Verifica o nome do arquivo primeiro
            const fileName = file.name.toLowerCase();
            if (this.blockedWords.some(word => fileName.includes(word.toLowerCase()))) {
                console.log('Nome do arquivo contém palavras bloqueadas');
                return {
                    isNSFW: true,
                    confidence: 1.0,
                    reason: 'Nome do arquivo bloqueado'
                };
            }

            // Verifica metadados do arquivo
            if (file.type.includes('image') || file.type.includes('video')) {
                const metadata = await this.extractMetadata(file);
                if (metadata.isNSFW) {
                    return {
                        isNSFW: true,
                        confidence: metadata.confidence,
                        reason: 'Metadados suspeitos'
                    };
                }
            }

            // Garante que os modelos estão carregados
            if (!this.nsfwModels.default) {
                await this.loadAllModels();
            }

            let isNSFW = false;
            let confidence = 0;
            let modelResults = {};

            if (file.type.startsWith('image/')) {
                const results = await this.checkImageWithAllModels(file);
                isNSFW = results.isNSFW;
                confidence = results.confidence;
                modelResults = results.modelResults;
            } else if (file.type.startsWith('video/')) {
                const results = await this.checkVideoWithAllModels(file);
                isNSFW = results.isNSFW;
                confidence = results.confidence;
                modelResults = results.modelResults;
            }

            // Verifica APIs externas se necessário
            if (confidence > 0.1) { // Se houver alguma suspeita
                const externalResults = await this.checkExternalApis(file);
                if (externalResults.isNSFW) {
                    isNSFW = true;
                    confidence = Math.max(confidence, externalResults.confidence);
                }
            }

            // Se o conteúdo for NSFW, aplica blur automaticamente
            if (isNSFW) {
                const element = document.querySelector(`[data-file-id="${file.name}"]`);
                if (element) {
                    this.applyBlurAndOverlay(element, 'explicit');
                }
            }

            return {
                isNSFW,
                confidence,
                modelResults,
                fileType: file.type.startsWith('image/') ? 'image' : 'video'
            };

        } catch (error) {
            console.error('Erro na verificação NSFW:', error);
            return {
                isNSFW: false,
                confidence: 0,
                modelResults: {},
                error: error.message
            };
        }
    }

    // Extrai metadados do arquivo
    async extractMetadata(file) {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    // Verifica dimensões suspeitas
                    const isSuspiciousSize = img.width > 2000 || img.height > 2000;
                    // Verifica proporção suspeita
                    const ratio = img.width / img.height;
                    const isSuspiciousRatio = ratio < 0.5 || ratio > 2;
                    
                    resolve({
                        isNSFW: isSuspiciousSize || isSuspiciousRatio,
                        confidence: (isSuspiciousSize || isSuspiciousRatio) ? 0.3 : 0,
                        width: img.width,
                        height: img.height,
                        ratio: ratio
                    });
                };
                img.src = URL.createObjectURL(file);
            } else {
                resolve({ isNSFW: false, confidence: 0 });
            }
        });
    }

    // Verifica APIs externas
    async checkExternalApis(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Tenta cada API em sequência
            for (const [name, url] of Object.entries(this.externalApis)) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.isNSFW || result.nsfw_score > 0.15) {
                            return {
                                isNSFW: true,
                                confidence: result.nsfw_score || 0.5,
                                api: name
                            };
                        }
                    }
                } catch (error) {
                    console.error(`Erro na API ${name}:`, error);
                }
            }
            
            return { isNSFW: false, confidence: 0 };
        } catch (error) {
            console.error('Erro ao verificar APIs externas:', error);
            return { isNSFW: false, confidence: 0 };
        }
    }

    async checkImageWithAllModels(file) {
        return new Promise(async (resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = async () => {
                try {
                    console.log('Analisando imagem com múltiplos modelos...');
                    
                    // Resultados de cada modelo
                    const modelResults = {
                        nsfwjs: null,
                        mobilenet: null,
                        inception: null,
                        resnet: null
                    };

                    // NSFWJS
                    const nsfwPredictions = await this.nsfwModels.default.classify(img);
                    modelResults.nsfwjs = nsfwPredictions;
                    
                    // MobileNet
                    const mobilenetPredictions = await this.nsfwModels.mobilenet.classify(img);
                    modelResults.mobilenet = mobilenetPredictions;
                    
                    // Inception
                    const inceptionPredictions = await this.nsfwModels.inception.classify(img);
                    modelResults.inception = inceptionPredictions;
                    
                    // ResNet
                    const resnetPredictions = await this.nsfwModels.resnet.classify(img);
                    modelResults.resnet = resnetPredictions;

                    // Análise ponderada dos resultados
                    let nsfwScore = 0;
                    let totalConfidence = 0;

                    // NSFWJS (peso 2)
                    const nsfwjsScore = nsfwPredictions.find(p => p.className === 'Porn' || p.className === 'Hentai');
                    if (nsfwjsScore) {
                        nsfwScore += nsfwjsScore.probability * 2;
                        totalConfidence += 2;
                    }

                    // MobileNet (peso 1)
                    const mobilenetScore = mobilenetPredictions.find(p => p.className.toLowerCase().includes('explicit'));
                    if (mobilenetScore) {
                        nsfwScore += mobilenetScore.probability;
                        totalConfidence += 1;
                    }

                    // Inception (peso 1.5)
                    const inceptionScore = inceptionPredictions.find(p => p.className.toLowerCase().includes('adult'));
                    if (inceptionScore) {
                        nsfwScore += inceptionScore.probability * 1.5;
                        totalConfidence += 1.5;
                    }

                    // ResNet (peso 1.5)
                    const resnetScore = resnetPredictions.find(p => p.className.toLowerCase().includes('nsfw'));
                    if (resnetScore) {
                        nsfwScore += resnetScore.probability * 1.5;
                        totalConfidence += 1.5;
                    }

                    // Calcula a média ponderada
                    const finalScore = nsfwScore / totalConfidence;
                    const isNSFW = finalScore > 0.15; // Threshold reduzido para 15%

                    console.log('Resultado final NSFW:', {
                        isNSFW,
                        confidence: finalScore,
                        modelResults
                    });

                    resolve({
                        isNSFW,
                        confidence: finalScore,
                        modelResults
                    });
                } catch (error) {
                    console.error('Erro ao analisar imagem:', error);
                    resolve({
                        isNSFW: false,
                        confidence: 0,
                        modelResults: {},
                        error: error.message
                    });
                }
            };

            img.onerror = () => {
                console.error('Erro ao carregar imagem para análise');
                resolve({
                    isNSFW: false,
                    confidence: 0,
                    modelResults: {},
                    error: 'Erro ao carregar imagem'
                });
            };

            img.src = URL.createObjectURL(file);
        });
    }

    async checkVideoWithAllModels(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;

            video.onloadedmetadata = async () => {
                try {
                    console.log('Analisando vídeo com múltiplos modelos...');
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Configurações para análise de frames
                    const frameInterval = 1000; // 1 frame por segundo
                    const maxFrames = Math.min(10, Math.floor(video.duration)); // Máximo 10 frames
                    let framesAnalyzed = 0;
                    let totalNSFWScore = 0;
                    
                    // Array para armazenar resultados de cada frame
                    const frameResults = [];
                    
                    // Função para analisar um frame específico
                    const analyzeFrame = async (time) => {
                        video.currentTime = time;
                        await new Promise(resolve => video.onseeked = resolve);
                        
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Análise com múltiplos modelos
                        const [nsfwResults, mobilenetResults, inceptionResults] = await Promise.all([
                            this.nsfwModels.default.classify(canvas),
                            this.nsfwModels.mobilenet.classify(canvas),
                            this.nsfwModels.inception.classify(canvas)
                        ]);
                        
                        // Calcula score NSFW para o frame
                        let frameScore = 0;
                        let totalWeight = 0;
                        
                        // NSFWJS (peso 2)
                        const nsfwScore = nsfwResults.find(p => p.className === 'Porn' || p.className === 'Hentai');
                        if (nsfwScore) {
                            frameScore += nsfwScore.probability * 2;
                            totalWeight += 2;
                        }
                        
                        // MobileNet (peso 1)
                        const mobilenetScore = mobilenetResults.find(p => p.className.toLowerCase().includes('explicit'));
                        if (mobilenetScore) {
                            frameScore += mobilenetScore.probability;
                            totalWeight += 1;
                        }
                        
                        // Inception (peso 1.5)
                        const inceptionScore = inceptionResults.find(p => p.className.toLowerCase().includes('adult'));
                        if (inceptionScore) {
                            frameScore += inceptionScore.probability * 1.5;
                            totalWeight += 1.5;
                        }
                        
                        return {
                            time,
                            score: frameScore / totalWeight,
                            results: {
                                nsfwjs: nsfwResults,
                                mobilenet: mobilenetResults,
                                inception: inceptionResults
                            }
                        };
                    };
                    
                    // Analisa frames em intervalos regulares
                    for (let i = 0; i < maxFrames; i++) {
                        const time = i * (video.duration / maxFrames);
                        const frameResult = await analyzeFrame(time);
                        frameResults.push(frameResult);
                        totalNSFWScore += frameResult.score;
                        framesAnalyzed++;
                    }
                    
                    // Calcula média final
                    const averageScore = totalNSFWScore / framesAnalyzed;
                    const isNSFW = averageScore > 0.15; // Threshold reduzido para 15%
                    
                    console.log('Resultado final vídeo:', {
                        isNSFW,
                        confidence: averageScore,
                        frameResults
                    });
                    
                    resolve({
                        isNSFW,
                        confidence: averageScore,
                        modelResults: frameResults
                    });
                    
                } catch (error) {
                    console.error('Erro ao analisar vídeo:', error);
                    resolve({
                        isNSFW: false,
                        confidence: 0,
                        modelResults: {},
                        error: error.message
                    });
                }
            };

            video.onerror = () => {
                console.error('Erro ao carregar vídeo para análise');
                resolve({
                    isNSFW: false,
                    confidence: 0,
                    modelResults: {},
                    error: 'Erro ao carregar vídeo'
                });
            };

            video.src = URL.createObjectURL(file);
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
        return this.blockedWords.some(word => normalizedUrl.includes(word.toLowerCase()));
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
        
        // Verifica palavras bloqueadas com sistema de pontuação
        for (const word of this.blockedWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(normalizedText)) {
                if (this.explicitTerms.includes(word)) explicitScore += 2;
                else if (this.offensiveTerms.includes(word)) offensiveScore += 2;
                else if (this.scamTerms.includes(word)) scamScore += 2;
                else spamScore += 1;
            }
        }
        
        // Verifica padrões de spam
        if (/(.)\\1{4,}/.test(normalizedText)) spamScore += 2; // Caracteres repetidos
        if (text.length > 500) spamScore += 1; // Mensagens muito longas
        if ((text.match(/[A-Z]/g) || []).length > text.length * 0.7) spamScore += 2; // Muitas maiúsculas
        
        // Verifica URLs suspeitas
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];
        for (const url of urls) {
            if (this.isSuspiciousUrl(url)) {
                scamScore += 3;
            }
        }
        
        // Verifica emojis impróprios
        if (this.hasInappropriateEmojis(text)) {
            explicitScore += 2;
        }
        
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

            dialog.innerHTML = `
                <div class="warning-content">
                    <div class="warning-icon" data-type="${contentType}">${icon}</div>
                    <div class="warning-title" data-type="${contentType}">${title}</div>
                    <div class="warning-message">${message}</div>
                    <div class="warning-preview blurred">
                        ${file.type.startsWith('image/') ? 
                            `<img src="${URL.createObjectURL(file)}" alt="Preview">` :
                            file.type.startsWith('video/') ?
                            `<video src="${URL.createObjectURL(file)}" controls></video>` :
                            `<div class="file-info">${file.name}</div>`
                        }
                    </div>
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
        switch(contentType) {
            case 'explicit':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ffdd00">
                    <path d="M764-84 624-222q-35 11-71 16.5t-73 5.5q-134 0-245-72T61-462q-5-9-7.5-18.5T51-500q0-10 2.5-19.5T61-538q22-39 47-76t58-66l-83-84q-11-11-11-27.5T84-820q11-11 28-11t28 11l680 680q11 11 11.5 27.5T820-84q-11 11-28 11t-28-11ZM480-320q11 0 21-1t20-4L305-541q-3 10-4 20t-1 21q0 75 52.5 127.5T480-320Zm0-480q134 0 245.5 72.5T900-537q5 8 7.5 17.5T910-500q0 10-2 19.5t-7 17.5q-19 37-42.5 70T806-331q-14 14-33 13t-33-15l-80-80q-7-7-9-16.5t1-19.5q4-13 6-25t2-26q0-75-52.5-127.5T480-680q-14 0-26 2t-25 6q-10 3-20 1t-17-9l-33-33q-19-19-12.5-44t31.5-32q25-5 50.5-8t51.5-3Zm79 226q11 13 18.5 28.5T587-513q1 8-6 11t-13-3l-82-82q-6-6-2.5-13t11.5-7q19 2 35 10.5t29 22.5Z"/>
                </svg>`;
                text = 'Conteúdo Explícito Detectado';
                break;
            case 'spam':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ff0000">
                    <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm371-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Z"/>
                </svg>`;
                text = 'Possível Spam/Golpe Detectado';
                break;
            case 'offensive':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="#ffdd00">
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
        switch(contentType) {
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
        switch(contentType) {
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
        switch(contentType) {
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

export default ContentModeration; 
