const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const multer = require('multer');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

class ProxyServer {
    constructor() {
        this.app = express();
        this.port = process.env.PROXY_PORT || 3001;
        this.nsfwModel = null;
        this.setupMiddleware();
        this.setupRoutes();
        this.initNSFWModel();
    }

    async initNSFWModel() {
        try {
            // Carrega o modelo NSFW do TensorFlow.js
            this.nsfwModel = await tf.loadGraphModel('https://d1zv2aa70wpiur.cloudfront.net/tfjs_models/tfjs_nsfw_mobilenet/model.json');
            console.log('Modelo NSFW carregado com sucesso');
        } catch (error) {
            console.error('Erro ao carregar modelo NSFW:', error);
        }
    }

    setupMiddleware() {
        // Configuração do multer para upload de arquivos
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadDir = path.join(__dirname, '../uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                cb(null, Date.now() + '-' + file.originalname);
            }
        });

        this.upload = multer({ storage: storage });

        // Middleware para análise de conteúdo
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Rota para verificar conteúdo
        this.app.post('/check-content', this.upload.single('file'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
                }

                const result = await this.checkContent(req.file);
                res.json(result);
            } catch (error) {
                console.error('Erro ao verificar conteúdo:', error);
                res.status(500).json({ error: 'Erro ao processar arquivo' });
            }
        });

        // Rota para verificar URL
        this.app.post('/check-url', async (req, res) => {
            try {
                const { url } = req.body;
                if (!url) {
                    return res.status(400).json({ error: 'URL não fornecida' });
                }

                const result = await this.checkUrl(url);
                res.json(result);
            } catch (error) {
                console.error('Erro ao verificar URL:', error);
                res.status(500).json({ error: 'Erro ao processar URL' });
            }
        });

        // Configuração do proxy
        this.app.use('/', createProxyMiddleware({
            target: 'http://localhost:3000',
            changeOrigin: true,
            onProxyReq: async (proxyReq, req, res) => {
                // Verifica URLs suspeitas
                if (req.url.includes('http')) {
                    const isBlocked = await this.checkUrl(req.url);
                    if (isBlocked) {
                        res.status(403).json({
                            error: 'Conteúdo bloqueado',
                            reason: 'URL suspeita detectada'
                        });
                        return;
                    }
                }
            }
        }));
    }

    async checkContent(file) {
        // Verifica o nome do arquivo
        const fileName = file.originalname.toLowerCase();
        const blockedWords = [
            'porn', 'sex', 'nude', 'nudes', 'onlyfans', 'leaks', 'hentai',
            '🔞', '🍆', '🍑', '🥒', '🥵', 'PORN', 'Pornografia'
        ];

        if (blockedWords.some(word => fileName.includes(word))) {
            return {
                blocked: true,
                reason: 'Nome do arquivo contém termos impróprios'
            };
        }

        // Verifica o conteúdo do arquivo
        if (file.mimetype.startsWith('image/')) {
            return await this.checkImageContent(file.path);
        } else if (file.mimetype.startsWith('video/')) {
            return await this.checkVideoContent(file.path);
        }

        return { blocked: false };
    }

    async checkImageContent(filePath) {
        if (!this.nsfwModel) return { blocked: false };

        try {
            const imageBuffer = fs.readFileSync(filePath);
            const tfImage = tf.node.decodeImage(imageBuffer);
            const resized = tf.image.resizeBilinear(tfImage, [224, 224]);
            const expanded = resized.expandDims(0);
            const normalized = expanded.div(255.0);

            const predictions = await this.nsfwModel.predict(normalized).data();
            
            tfImage.dispose();
            resized.dispose();
            expanded.dispose();
            normalized.dispose();

            const nsfwScore = predictions[1];
            return {
                blocked: nsfwScore > 0.5,
                reason: nsfwScore > 0.5 ? 'Conteúdo impróprio detectado' : null,
                score: nsfwScore
            };
        } catch (error) {
            console.error('Erro ao verificar imagem:', error);
            return { blocked: false };
        }
    }

    async checkVideoContent(filePath) {
        if (!this.nsfwModel) return { blocked: false };

        try {
            // Aqui você pode implementar a verificação de frames do vídeo
            // Por enquanto, vamos apenas verificar o nome do arquivo
            return { blocked: false };
        } catch (error) {
            console.error('Erro ao verificar vídeo:', error);
            return { blocked: false };
        }
    }

    async checkUrl(url) {
        const blockedDomains = [
            'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com',
            'onlyfans.com', 'xhamster.com', 'brazzers.com'
        ];

        const blockedKeywords = [
            'porn', 'sex', 'nude', 'nudes', 'onlyfans', 'leaks', 'hentai'
        ];

        // Verifica domínios bloqueados
        if (blockedDomains.some(domain => url.includes(domain))) {
            return {
                blocked: true,
                reason: 'Domínio bloqueado'
            };
        }

        // Verifica palavras-chave bloqueadas
        if (blockedKeywords.some(keyword => url.toLowerCase().includes(keyword))) {
            return {
                blocked: true,
                reason: 'URL contém termos impróprios'
            };
        }

        return { blocked: false };
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Servidor proxy rodando na porta ${this.port}`);
        });
    }
}

// Inicia o servidor
const proxyServer = new ProxyServer();
proxyServer.start();

module.exports = ProxyServer; 