import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import multer from 'multer';
import bodyParser from 'body-parser';
import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configurações do modelo NSFW
const NSFW_THRESHOLD = 0.15; // Reduzido para ser mais sensível
const NSFW_CATEGORIES = ['porn', 'sexy', 'hentai', 'drawings', 'neutral', 'violence', 'gore'];

// Lista de palavras-chave bloqueadas
const BLOCKED_KEYWORDS = [
    // Palavras em português
    'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'nsfw', '18+',
    'pornografia', 'sexo', 'adulto', 'nu', 'nua', 'nudez', 'erótico',
    'erotico', 'sensual', 'proibido', 'proibida', 'privado', 'privada',
    'intimo', 'íntimo', 'intima', 'íntima', 'mulher', 'homem', 'corpo',
    'peito', 'bunda', 'pernas', 'lingerie', 'biquini', 'calcinha', 'cueca',
    // Palavras relacionadas a golpes
    'golpe', 'scam', 'fraude', 'phishing', 'hack', 'crack', 'pirata',
    'pirataria', 'ilegal', 'contrabando', 'drogas', 'drogas ilícitas',
    // Palavras de violência
    'violência', 'violencia', 'sangue', 'morte', 'assassinato', 'crime',
    // Emojis e símbolos
    '🔞', '🍆', '🍑', '🥒', '🥵', '💦', '👙', '👄', '💋', '💘',
    // Termos do Instagram/Facebook
    'onlyfans', 'leaks', 'vazados', 'vazado', 'privado', 'privada',
    'conteúdo adulto', 'conteudo adulto', 'conteúdo +18', 'conteudo +18'
];

// Lista de domínios bloqueados
const BLOCKED_DOMAINS = [
    // Sites adultos
    'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com',
    'youporn.com', 'xhamster.com', 'brazzers.com', 'onlyfans.com',
    'chaturbate.com', 'myfreecams.com', 'stripchat.com', 'bongacams.com',
    'cam4.com', 'streamate.com', 'adultfriendfinder.com', 'ashleymadison.com',
    'fling.com', 'adultmatchmaker.com', 'adultdating.com', 'adultchat.com',
    // Sites de golpes
    'hack.com', 'crack.com', 'pirate.com', 'torrent.com', 'warez.com',
    // Sites de conteúdo ilegal
    'illegal.com', 'drugs.com', 'weapons.com', 'hacking.com'
];

// Carrega o modelo NSFW
let model;
async function loadModel() {
    try {
        model = await tf.loadLayersModel('file://./model/model.json');
        console.log('Modelo NSFW carregado com sucesso');
    } catch (error) {
        console.error('Erro ao carregar modelo NSFW:', error);
    }
}
loadModel();

// Função para verificar conteúdo NSFW
async function checkNSFW(file) {
    try {
        const fileExt = path.extname(file.originalname).toLowerCase();
        const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(fileExt);
        const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'].includes(fileExt);

        // Verifica metadados do arquivo
        const metadata = await extractMetadata(file);
        if (metadata.isNSFW) {
            return {
                isNSFW: true,
                score: metadata.confidence,
                type: 'metadata',
                details: metadata
            };
        }

        if (isImage) {
            // Processa a imagem em diferentes tamanhos para melhor detecção
            const image = await tf.node.decodeImage(file.buffer);
            const resized = tf.image.resizeBilinear(image, [224, 224]);
            const expanded = resized.expandDims(0);
            const normalized = expanded.div(255.0);

            const predictions = await model.predict(normalized).data();

            // Libera a memória
            image.dispose();
            resized.dispose();
            expanded.dispose();
            normalized.dispose();

            // Calcula o score NSFW
            const nsfwScore = predictions[1]; // Índice 1 é geralmente a classe NSFW

            // Verifica APIs externas se necessário
            if (nsfwScore > 0.1) {
                const externalResults = await checkExternalApis(file);
                if (externalResults.isNSFW) {
                    return {
                        isNSFW: true,
                        score: Math.max(nsfwScore, externalResults.confidence),
                        type: 'image',
                        details: {
                            safe: predictions[0],
                            nsfw: predictions[1],
                            external: externalResults
                        }
                    };
                }
            }

            return {
                isNSFW: nsfwScore > NSFW_THRESHOLD,
                score: nsfwScore,
                type: 'image',
                details: {
                    safe: predictions[0],
                    nsfw: predictions[1]
                }
            };
        } else if (isVideo) {
            // Para vídeos, verifica o nome e extensão
            const isBlocked = isBlockedFilename(file.originalname);
            return {
                isNSFW: isBlocked,
                score: isBlocked ? 1.0 : 0.0,
                type: 'video',
                details: {
                    filename: file.originalname,
                    size: file.size
                }
            };
        }

        return {
            isNSFW: false,
            score: 0,
            type: 'other'
        };
    } catch (error) {
        console.error('Erro ao verificar NSFW:', error);
        return {
            isNSFW: true, // Em caso de erro, bloqueia por segurança
            score: 1.0,
            type: 'error',
            details: { error: error.message }
        };
    }
}

// Extrai metadados do arquivo
async function extractMetadata(file) {
    try {
        if (file.mimetype.startsWith('image/')) {
            const image = await tf.node.decodeImage(file.buffer);

            // Verifica dimensões suspeitas
            const isSuspiciousSize = image.shape[0] > 2000 || image.shape[1] > 2000;

            // Verifica proporção suspeita
            const ratio = image.shape[1] / image.shape[0];
            const isSuspiciousRatio = ratio < 0.5 || ratio > 2;

            // Verifica tamanho do arquivo
            const isSuspiciousFileSize = file.size > 10 * 1024 * 1024; // 10MB

            image.dispose();

            return {
                isNSFW: isSuspiciousSize || isSuspiciousRatio || isSuspiciousFileSize,
                confidence: (isSuspiciousSize || isSuspiciousRatio || isSuspiciousFileSize) ? 0.3 : 0,
                width: image.shape[1],
                height: image.shape[0],
                ratio: ratio,
                fileSize: file.size
            };
        }

        return { isNSFW: false, confidence: 0 };
    } catch (error) {
        console.error('Erro ao extrair metadados:', error);
        return { isNSFW: true, confidence: 0.5 }; // Em caso de erro, bloqueia por segurança
    }
}

// Verifica APIs externas
async function checkExternalApis(file) {
    const apis = [
        {
            name: 'deepai',
            url: 'https://api.deepai.org/api/nsfw-detector',
            key: process.env.DEEPAI_API_KEY
        },
        {
            name: 'sightengine',
            url: 'https://api.sightengine.com/1.0/check.json',
            key: process.env.SIGHTENGINE_API_KEY
        },
        {
            name: 'moderatecontent',
            url: 'https://api.moderatecontent.com/moderate/',
            key: process.env.MODERATECONTENT_API_KEY
        }
    ];

    for (const api of apis) {
        try {
            const formData = new FormData();
            formData.append('file', file.buffer);
            if (api.key) {
                formData.append('api_key', api.key);
            }

            const response = await fetch(api.url, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                if (result.isNSFW || result.nsfw_score > 0.15) {
                    return {
                        isNSFW: true,
                        confidence: result.nsfw_score || 0.5,
                        api: api.name
                    };
                }
            }
        } catch (error) {
            console.error(`Erro na API ${api.name}:`, error);
        }
    }

    return { isNSFW: false, confidence: 0 };
}

// Função para verificar nome do arquivo
function isBlockedFilename(filename) {
    const lowerFilename = filename.toLowerCase();
    return BLOCKED_KEYWORDS.some(keyword => lowerFilename.includes(keyword));
}

// Função para verificar URL
function isBlockedUrl(url) {
    try {
        const urlObj = new URL(url);
        const lowerUrl = url.toLowerCase();

        if (BLOCKED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
            return true;
        }

        return BLOCKED_KEYWORDS.some(keyword => lowerUrl.includes(keyword));
    } catch {
        return false;
    }
}

// Middleware para verificar conteúdo
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rota para upload de arquivos
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: '🚫 CONTEÚDO BLOQUEADO',
                message: 'Nenhum arquivo enviado'
            });
        }

        // Verifica o nome do arquivo
        if (isBlockedFilename(req.file.originalname)) {
            return res.status(403).json({
                error: '🚫 CONTEÚDO BLOQUEADO',
                message: 'Este conteúdo pode ser sensível',
                warning: true,
                options: {
                    view: 'Ver conteúdo',
                    reject: 'Recusar'
                }
            });
        }

        // Verifica o conteúdo do arquivo
        const nsfwCheck = await checkNSFW(req.file);
        if (nsfwCheck.isNSFW) {
            return res.status(403).json({
                error: '🚫 CONTEÚDO BLOQUEADO',
                message: 'Este conteúdo pode ser sensível',
                warning: true,
                options: {
                    view: 'Ver conteúdo',
                    reject: 'Recusar'
                },
                type: nsfwCheck.type,
                score: nsfwCheck.score,
                details: nsfwCheck.details
            });
        }

        // Processa o arquivo normalmente
        res.json({
            message: 'Arquivo processado com sucesso',
            type: nsfwCheck.type
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({
            error: '🚫 CONTEÚDO BLOQUEADO',
            message: 'Erro ao processar arquivo'
        });
    }
});

// Configuração do proxy
const proxy = createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
        '^/api': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        if (isBlockedUrl(req.url)) {
            res.status(403).json({
                error: '🚫 CONTEÚDO BLOQUEADO',
                message: 'Este conteúdo pode ser sensível',
                warning: true,
                options: {
                    view: 'Ver conteúdo',
                    reject: 'Recusar'
                }
            });
            return;
        }
    }
});

app.use('/api', proxy);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor proxy rodando na porta ${PORT}`);
});
