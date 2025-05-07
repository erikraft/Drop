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
const NSFW_THRESHOLD = 0.2; // Limiar para detecção de conteúdo explícito
const NSFW_CATEGORIES = ['porn', 'sexy', 'hentai', 'drawings', 'neutral', 'violence', 'gore'];

// Lista de palavras-chave bloqueadas (baseada em filtros do Google, Instagram e Facebook)
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

        if (isImage) {
            const image = await tf.node.decodeImage(file.buffer);
            const predictions = await model.classify(image);
            
            const nsfwScore = predictions.reduce((score, pred) => {
                if (NSFW_CATEGORIES.includes(pred.className)) {
                    return score + pred.probability;
                }
                return score;
            }, 0);

            image.dispose();
            
            return {
                isNSFW: nsfwScore > NSFW_THRESHOLD,
                score: nsfwScore,
                type: 'image'
            };
        } else if (isVideo) {
            return {
                isNSFW: isBlockedFilename(file.originalname),
                score: 1.0,
                type: 'video'
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
            isNSFW: false,
            score: 0,
            type: 'error'
        };
    }
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
        
        // Verifica domínios bloqueados
        if (BLOCKED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
            return true;
        }
        
        // Verifica palavras-chave na URL
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
                score: nsfwCheck.score
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
        // Verifica URLs bloqueadas
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
