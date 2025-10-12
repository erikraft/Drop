import EventEmitter from 'node:events';
import WebSocket from 'ws';

const CHUNK_SIZE = 64_000; // 64 KB
const MAX_PARTITION_SIZE = 1_000_000; // 1 MB
const ACK_TIMEOUT_MS = 30_000;

function buildSignalUrl(baseUrl, overrideUrl) {
    let url;
    if (overrideUrl) {
        url = new URL(overrideUrl);
    }
    else {
        url = new URL('server', new URL(baseUrl));
    }

    if (url.protocol === 'https:') {
        url.protocol = 'wss:';
    }
    else if (url.protocol === 'http:') {
        url.protocol = 'ws:';
    }

    url.searchParams.set('webrtc_supported', 'false');
    url.searchParams.set('client_type', 'discord-bot');
    return url;
}

function sanitizeMime(mime) {
    return mime || 'application/octet-stream';
}

export default class DropTransferClient extends EventEmitter {

    constructor(options) {
        super();
        this.baseUrl = options.baseUrl;
        this.signalOverride = options.signalUrl;
        this.pairKey = options.pairKey;
        this.files = options.files || [];
        this._statusCallback = () => {};

        this._ws = null;
        this._roomId = null;
        this._roomType = null;
        this._remotePeerId = null;
        this._selfPeerId = null;
        this._wsFallbackEnabled = false;

        this._pendingPartitions = new Map();
        this._pendingFileComplete = null;
        this._completionPromise = null;
        this._resolveCompletion = null;
        this._rejectCompletion = null;
        this._completed = false;
    }

    async send(onStatus) {
        if (onStatus) {
            this._statusCallback = onStatus;
        }
        this._emitStatus({ stage: 'connecting' });

        this._completionPromise = new Promise((resolve, reject) => {
            this._resolveCompletion = resolve;
            this._rejectCompletion = reject;
        });

        this._openWebSocket();

        return this._completionPromise;
    }

    _openWebSocket() {
        const wsUrl = buildSignalUrl(this.baseUrl, this.signalOverride);
        const headers = { 'User-Agent': 'ErikrafT-Drop-DiscordBot' };

        this._ws = new WebSocket(wsUrl, { headers });

        this._ws.on('open', () => {
            this._emitStatus({ stage: 'socket-open' });
        });

        this._ws.on('message', data => this._handleMessage(data));
        this._ws.on('error', error => this._fail(error));
        this._ws.on('close', code => {
            if (this._completed) return;
            this._fail(new Error(`Conexão encerrada pelo servidor (${code}).`));
        });
    }

    _handleMessage(rawMessage) {
        if (rawMessage instanceof Buffer || rawMessage instanceof Uint8Array) {
            // The bot only sends data; receiving binary data is unexpected.
            return;
        }

        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        }
        catch (error) {
            console.warn('Mensagem inválida recebida do servidor:', rawMessage);
            return;
        }

        switch (message.type) {
            case 'ws-config':
                this._wsFallbackEnabled = Boolean(message.wsConfig?.wsFallback);
                if (!this._wsFallbackEnabled) {
                    this._fail(new Error('A instância do ErikrafT Drop não está com o fallback via WebSocket habilitado.'));
                }
                break;
            case 'display-name':
                this._selfPeerId = message.peerId;
                this._emitStatus({ stage: 'connected', deviceName: message.deviceName });
                this._sendRaw({ type: 'pair-device-join', pairKey: this.pairKey });
                break;
            case 'ping':
                this._sendRaw({ type: 'pong' });
                break;
            case 'pair-device-join-key-invalid':
                this._fail(new Error('A chave de pareamento informada é inválida ou expirou.'));
                break;
            case 'join-key-rate-limit':
                this._fail(new Error('Muitas tentativas de pareamento. Aguarde alguns segundos e tente novamente.'));
                break;
            case 'pair-device-joined':
                this._roomId = message.roomSecret;
                this._roomType = 'secret';
                this._remotePeerId = message.peerId;
                this._emitStatus({ stage: 'paired', roomSecret: message.roomSecret });
                this._sendTransferRequest();
                break;
            case 'peers':
            case 'peer-joined':
                // Informational for UI clients – already handled via pair-device-joined.
                break;
            case 'files-transfer-response':
                this._onTransferResponse(message);
                break;
            case 'partition-received':
                this._onPartitionReceived(message);
                break;
            case 'progress':
                if (typeof message.progress === 'number') {
                    this._emitStatus({ stage: 'progress', value: message.progress });
                }
                break;
            case 'file-transfer-complete':
                this._onFileTransferComplete();
                break;
            case 'peer-left':
                if (message.peerId === this._remotePeerId) {
                    this._fail(new Error('O destinatário desconectou antes da conclusão da transferência.'));
                }
                break;
            case 'message-transfer-complete':
            case 'display-name-changed':
            case 'text':
                // Not used by the bot.
                break;
            default:
                console.log('Mensagem ignorada:', message);
        }
    }

    _onTransferResponse(message) {
        if (message.sender?.id !== this._remotePeerId) return;
        if (!message.accepted) {
            const reason = message.reason === 'ios-memory-limit'
                ? 'O destinatário está utilizando iOS e não consegue receber arquivos grandes.'
                : 'O destinatário recusou a transferência.';
            this._fail(new Error(reason));
            return;
        }
        this._emitStatus({ stage: 'accepted' });
        this._sendFilesSequence();
    }

    async _sendFilesSequence() {
        try {
            for (let index = 0; index < this.files.length; index += 1) {
                const file = this.files[index];
                this._emitStatus({ stage: 'sending-file', file: file.name, index, total: this.files.length });
                await this._sendFile(file);
                this._emitStatus({ stage: 'file-complete', file: file.name, index, total: this.files.length });
            }
            this._emitStatus({ stage: 'finished' });
            this._resolve();
        }
        catch (error) {
            this._fail(error);
        }
    }

    async _sendFile(file) {
        const data = file.data;
        const headerPayload = {
            type: 'header',
            size: data?.length || 0,
            name: file.name,
            mime: sanitizeMime(file.mime)
        };

        this._sendToPeer(headerPayload);

        if (!data || !data.length) {
            // Envie um chunk vazio para que o receptor finalize o fluxo corretamente.
            this._ws.send(Buffer.alloc(0));
            await this._awaitFileConfirmation();
            return;
        }


        let offset = 0;
        let partitionBytes = 0;

        while (offset < data.length) {
            const end = Math.min(offset + CHUNK_SIZE, data.length);
            const chunk = data.subarray(offset, end);
            this._ws.send(chunk);
            offset = end;
            partitionBytes += chunk.length;

            if (offset < data.length && partitionBytes >= MAX_PARTITION_SIZE) {
                await this._sendPartition(offset);
                partitionBytes = 0;
            }
        }

        await this._awaitFileConfirmation();
    }

    async _sendPartition(offset) {
        const ackPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._pendingPartitions.delete(offset);
                reject(new Error('Tempo limite aguardando a confirmação do bloco de dados.'));
            }, ACK_TIMEOUT_MS);

            this._pendingPartitions.set(offset, { resolve, timeout });
        });

        this._sendToPeer({ type: 'partition', offset });
        await ackPromise;
    }

    _onPartitionReceived(message) {
        const ack = this._pendingPartitions.get(message.offset);
        if (!ack) return;
        clearTimeout(ack.timeout);
        this._pendingPartitions.delete(message.offset);
        ack.resolve();
    }

    _awaitFileConfirmation() {
        if (this._pendingFileComplete) {
            throw new Error('Estado inválido: já existe uma confirmação de arquivo pendente.');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._pendingFileComplete = null;
                reject(new Error('Tempo limite aguardando a confirmação do arquivo.'));
            }, ACK_TIMEOUT_MS);

            this._pendingFileComplete = {
                resolve: () => {
                    clearTimeout(timeout);
                    this._pendingFileComplete = null;
                    resolve();
                }
            };
        });
    }

    _onFileTransferComplete() {
        if (this._pendingFileComplete) {
            this._pendingFileComplete.resolve();
        }
    }

    _sendTransferRequest() {
        if (!this._remotePeerId || !this._roomId) {
            this._fail(new Error('Não foi possível identificar o par remoto para enviar os arquivos.'));
            return;
        }

        const header = this.files.map(file => ({
            name: file.name,
            mime: sanitizeMime(file.mime),
            size: file.data?.length || 0
        }));

        const totalSize = header.reduce((acc, item) => acc + item.size, 0);
        const imagesOnly = header.length > 0 && header.every(item => item.mime.startsWith('image/'));

        this._emitStatus({ stage: 'request-sent', totalSize });

        this._sendToPeer({
            type: 'request',
            header,
            totalSize,
            imagesOnly,
            thumbnailDataUrl: ''
        });
    }

    _sendToPeer(payload) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
        payload.to = this._remotePeerId;
        payload.roomType = this._roomType;
        payload.roomId = this._roomId;
        this._ws.send(JSON.stringify(payload));
    }

    _sendRaw(payload) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
        this._ws.send(JSON.stringify(payload));
    }

    _emitStatus(status) {
        try {
            this._statusCallback(status);
        }
        catch (error) {
            console.error('Falha ao propagar status do DropTransferClient:', error);
        }
    }

    _resolve() {
        if (this._completed) return;
        this._completed = true;
        this._cleanup();
        this._resolveCompletion?.();
    }

    _fail(error) {
        if (this._completed) return;
        this._completed = true;
        this._cleanup();
        if (!(error instanceof Error)) {
            error = new Error(String(error));
        }
        this._rejectCompletion?.(error);
    }

    _cleanup() {
        for (const [, ack] of this._pendingPartitions.entries()) {
            clearTimeout(ack.timeout);
        }
        this._pendingPartitions.clear();
        this._pendingFileComplete = null;

        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            try {
                this._sendRaw({ type: 'disconnect' });
            }
            catch (error) {
                console.error('Falha ao enviar mensagem de desconexão:', error);
            }
            this._ws.close();
        }
    }
}
