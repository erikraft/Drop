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
const NSFW_THRESHOLD = 0.3; // Reduzido para ser mais sensível
const NSFW_CATEGORIES = ['porn', 'sexy', 'hentai', 'drawings', 'neutral'];

// Lista expandida de palavras-chave bloqueadas
const BLOCKED_KEYWORDS = [
    'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'nsfw', '18+',
    'pornografia', 'sexo', 'adulto', 'nu', 'nua', 'nudez', 'erótico',
    'erotico', 'sensual', 'proibido', 'proibida', 'privado', 'privada',
    'intimo', 'íntimo', 'intima', 'íntima', 'mulher', 'homem', 'corpo',
    'peito', 'bunda', 'pernas', 'lingerie', 'biquini', 'calcinha', 'cueca'
];

// Lista expandida de domínios bloqueados
const BLOCKED_DOMAINS = [
    'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com',
    'youporn.com', 'xhamster.com', 'brazzers.com', 'onlyfans.com',
    'chaturbate.com', 'myfreecams.com', 'stripchat.com', 'bongacams.com',
    'cam4.com', 'streamate.com', 'adultfriendfinder.com', 'ashleymadison.com',
    'fling.com', 'adultmatchmaker.com', 'adultdating.com', 'adultchat.com'
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

// Função melhorada para verificar conteúdo NSFW
async function checkNSFW(file) {
    try {
        const image = await tf.node.decodeImage(file.buffer);
        const predictions = await model.classify(image);
        
        // Verifica todas as categorias NSFW
        const nsfwScore = predictions.reduce((score, pred) => {
            if (NSFW_CATEGORIES.includes(pred.className)) {
                return score + pred.probability;
            }
            return score;
        }, 0);

        // Libera a memória
        image.dispose();
        
        return nsfwScore > NSFW_THRESHOLD;
    } catch (error) {
        console.error('Erro ao verificar NSFW:', error);
        return false;
    }
}

// Função melhorada para verificar nome do arquivo
function isBlockedFilename(filename) {
    const lowerFilename = filename.toLowerCase();
    return BLOCKED_KEYWORDS.some(keyword => lowerFilename.includes(keyword));
}

// Função melhorada para verificar URL
function isBlockedUrl(url) {
    try {
        const urlObj = new URL(url);
        return BLOCKED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
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
            return res.status(400).json({ error: '🚫 CONTEÚDO BLOQUEADO' });
        }

        // Verifica o nome do arquivo
        if (isBlockedFilename(req.file.originalname)) {
            return res.status(403).json({ error: '🚫 CONTEÚDO BLOQUEADO' });
        }

        // Verifica o conteúdo do arquivo
        const isNSFW = await checkNSFW(req.file);
        if (isNSFW) {
            return res.status(403).json({ error: '🚫 CONTEÚDO BLOQUEADO' });
        }

        // Processa o arquivo normalmente
        res.json({ message: 'Arquivo processado com sucesso' });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: '🚫 CONTEÚDO BLOQUEADO' });
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
            res.status(403).json({ error: '🚫 CONTEÚDO BLOQUEADO' });
            return;
        }
    }
});

app.use('/api', proxy);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor proxy rodando na porta ${PORT}`);
}); 
