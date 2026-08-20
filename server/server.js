import express from "express";
import RateLimit from "express-rate-limit";
import {fileURLToPath} from "url";
import path, {dirname} from "path";
import http from "http";
import fs from "fs";
import multer from "multer";
import {handleAiImageRequest} from "./services/ai-image.js";

// Ensure fetch/FormData/File exist for runtimes without native support (Node < 18)
if (typeof fetch === "undefined" || typeof FormData === "undefined" || typeof File === "undefined") {
    const undici = await import("undici");

    if (typeof fetch === "undefined" && undici.fetch) {
        globalThis.fetch = undici.fetch;
    }

    if (typeof FormData === "undefined" && undici.FormData) {
        globalThis.FormData = undici.FormData;
    }

    if (typeof File === "undefined" && undici.File) {
        globalThis.File = undici.File;
    }
}

export default class ErikrafTdropServer {

    constructor(conf) {
        const app = express();
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 100 * 1024 * 1024 // 100 MB
            }
        });

        if (conf.rateLimit) {
            const limiter = RateLimit({
                windowMs: 5 * 60 * 1000, // 5 minutes
                max: 1000, // Limit each IP to 1000 requests per `window` (here, per 5 minutes)
                message: 'Too many requests from this IP Address, please try again after 5 minutes.',
                standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
                legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            })

            app.use(limiter);
            // ensure correct client ip and not the ip of the reverse proxy is used for rate limiting
            // see https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues

            app.set('trust proxy', conf.rateLimit);

            if (!conf.debugMode) {
                console.log("Use DEBUG_MODE=true to find correct number for RATE_LIMIT.");
            }
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const publicPathAbs = path.join(__dirname, '../public');
        app.use(express.static(publicPathAbs));

        if (conf.debugMode && conf.rateLimit) {
            console.debug("\n");
            console.debug("----DEBUG RATE_LIMIT----")
            console.debug("To find out the correct value for RATE_LIMIT go to '/ip' and ensure the returned IP-address is the IP-address of your client.")
            console.debug("See https://github.com/express-rate-limit/express-rate-limit#troubleshooting-proxy-issues for more info")
            app.get('/ip', (req, res) => {
                res.send(req.ip);
            })
        }

        // By default, clients connecting to your instance use the signaling server of your instance to connect to other devices.
        // By using `WS_SERVER`, you can host an instance that uses another signaling server.
        app.post('/api/cloud-upload', upload.single('file'), async (req, res) => {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo enviado.'
                });
            }

            const allowedExpiry = new Set(['1h', '3h', '5h', '1d']);
            const requestedExpiry = req.body?.expiry;
            const expiry = allowedExpiry.has(requestedExpiry) ? requestedExpiry : '1d';

            try {
                const upstreamForm = new FormData();
                const uploadedFile = new File([req.file.buffer], req.file.originalname || 'upload', {
                    type: req.file.mimetype || 'application/octet-stream'
                });

                upstreamForm.append('file', uploadedFile);
                upstreamForm.append('expires', expiry);

                const upstreamResponse = await fetch('https://file.io', {
                    method: 'POST',
                    body: upstreamForm
                });

                const upstreamData = await upstreamResponse.json().catch(() => null);

                if (!upstreamResponse.ok || !upstreamData?.success) {
                    console.error('Erro ao enviar arquivo para file.io', upstreamData);
                    return res.status(502).json({
                        success: false,
                        message: 'Serviço de hospedagem indisponível. Tente novamente mais tarde.'
                    });
                }

                return res.json({
                    success: true,
                    link: upstreamData.link,
                    expiresAt: upstreamData.expiry || upstreamData.expire || null
                });
            } catch (error) {
                console.error('Erro interno ao enviar arquivo para a nuvem:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno ao enviar arquivo.'
                });
            }
        });

        app.post('/api/ai/image', upload.single('image'), handleAiImageRequest);

        app.get('/api/onion-info', (req, res) => {
            const torHostnamePath = '/var/lib/tor/erikraft_drop_onion/hostname';
            try {
                if (fs.existsSync(torHostnamePath)) {
                    const onionAddress = fs.readFileSync(torHostnamePath, 'utf8').trim();
                    return res.json({ success: true, onionAddress });
                }
            } catch (err) {
                console.error("Error reading Tor hostname file:", err);
            }
            return res.json({ success: false, onionAddress: null });
        });

        app.get('/api/cli', (req, res) => {
            res.json({
                version: 1,
                client: {
                    name: 'ErikrafT Drop',
                    cli: true,
                    officialClient: 'iSearch CLI™'
                },
                title: 'ErikrafT Drop',
                description: 'Fast peer-to-peer file transfer.',
                features: [
                    'Send files',
                    'Receive files',
                    'Cross-platform',
                    'Device discovery',
                    'Pairing',
                    'Progress updates',
                    'Integrity validation'
                ],
                protocol: {
                    websocket: '/server?client_type=isearch-cli&webrtc_supported=false',
                    clientIdentification: {
                        clientType: 'isearch-cli',
                        userAgent: 'iSearchCLI/<version>',
                        queryParameters: ['client_name', 'version', 'platform', 'architecture']
                    },
                    messages: [
                        'ws-config',
                        'display-name',
                        'peer-joined',
                        'peer-left',
                        'signal',
                        'request',
                        'files-transfer-response',
                        'header',
                        'partition',
                        'partition-received',
                        'progress',
                        'file-transfer-complete',
                        'disconnect'
                    ]
                },
                security: {
                    executeReceivedFiles: false,
                    executeReceivedCode: false,
                    secretsInResponse: false
                }
            });
        });

        app.get('/config', (req, res) => {
            res.send({
                signalingServer: conf.signalingServer,
                buttons: conf.buttons
            });
        });

        app.use((req, res) => {
            res.redirect(301, '/');
        });

        app.get('/', (req, res) => {
            res.sendFile('index.html');
            console.log(`Serving client files from:\n${publicPathAbs}`)
        });

        const hostname = conf.localhostOnly ? '127.0.0.1' : null;
        const server = http.createServer(app);
        this.server = server;

        server.listen(conf.port, hostname, () => {
            console.log(`Server running at http://${hostname}:${conf.port}/`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(err);
                console.info("Error EADDRINUSE received, exiting process without restarting process...");
                process.exit(1);
            }
        });
    }
}
