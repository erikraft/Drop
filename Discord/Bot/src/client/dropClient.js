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

function encodeTextPayload(text) {
    return Buffer.from(text, 'utf8').toString('base64');
}

function decodeTextPayload(encoded) {
    try {
        return Buffer.from(encoded, 'base64').toString('utf8');
    }
    catch (error) {
        throw new Error('Não foi possível decodificar o texto recebido.');
    }
}

export default class DropTransferClient extends EventEmitter {

    constructor(options) {
        super();
        this.baseUrl = options.baseUrl;
        this.signalOverride = options.signalUrl;
        this.pairKey = options.pairKey;
        this.files = options.files || [];
        this._displayName = (options.displayName || '').trim();
        this._statusCallback = () => {};

        this._ws = null;
        this._roomId = null;
        this._roomType = null;
        this._remotePeerId = null;
        this._selfPeerId = null;
        this._wsFallbackEnabled = false;

        this._mode = null;
        this._pendingTextAckTimeout = null;

        this._pendingPartitions = new Map();
        this._pendingFileComplete = null;
        this._completionPromise = null;
        this._resolveCompletion = null;
        this._rejectCompletion = null;
        this._completed = false;

        this._expectedFiles = [];
        this._receivedFiles = [];
        this._currentIncomingFile = null;
        this._totalBytesExpected = 0;
        this._bytesReceived = 0;
        this._lastProgressSent = 0;
        this._incomingSenderInfo = null;
        this._incomingText = null;
        this._textToSend = null;
    }

    async send(onStatus) {
        this._mode = 'send';
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
            if (this._mode === 'receive') {
                this._handleBinaryChunk(rawMessage);
            }
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
                this._applyDisplayName();
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
                if (this._mode === 'send') {
                    this._sendTransferRequest();
                }
                else if (this._mode === 'text-send') {
                    this._sendTextMessage();
                }
                break;
            case 'peers':
            case 'peer-joined':
                // Informational for UI clients – already handled via pair-device-joined.
                break;
            case 'files-transfer-response':
                if (this._mode === 'send') {
                    this._onTransferResponse(message);
                }
                break;
            case 'partition-received':
                if (this._mode === 'send') {
                    this._onPartitionReceived(message);
                }
                break;
            case 'partition':
                if (this._mode === 'receive') {
                    this._onPartitionRequest(message);
                }
                break;
            case 'progress':
                if (typeof message.progress === 'number') {
                    this._emitStatus({ stage: 'progress', value: message.progress, direction: 'send' });
                }
                break;
            case 'file-transfer-complete':
                if (this._mode === 'send') {
                    this._onFileTransferComplete();
                }
                break;
            case 'request':
                if (this._mode === 'receive') {
                    this._onIncomingRequest(message);
                }
                break;
            case 'header':
                if (this._mode === 'receive') {
                    this._onIncomingFileHeader(message);
                }
                break;
            case 'peer-left':
                if (message.peerId === this._remotePeerId) {
                    this._fail(new Error('O destinatário desconectou antes da conclusão da transferência.'));
                }
                break;
            case 'message-transfer-complete':
                if (this._mode === 'text-send') {
                    this._onTextTransferComplete();
                }
                break;
            case 'display-name-changed':
                break;
            case 'text':
                if (this._mode === 'receive') {
                    this._onIncomingText(message);
                }
                // Not used by the bot otherwise.
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
                this._emitStatus({ stage: 'sending-file', direction: 'send', file: file.name, index, total: this.files.length });
                await this._sendFile(file);
                this._emitStatus({ stage: 'file-complete', direction: 'send', file: file.name, index, total: this.files.length });
            }
            this._emitStatus({ stage: 'finished', direction: 'send' });
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

    async sendText(text, onStatus) {
        this._mode = 'text-send';
        this._textToSend = text;
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

    async receive(onStatus) {
        this._mode = 'receive';
        if (onStatus) {
            this._statusCallback = onStatus;
        }

        this._resetReceiveState();
        this._emitStatus({ stage: 'connecting' });

        this._completionPromise = new Promise((resolve, reject) => {
            this._resolveCompletion = resolve;
            this._rejectCompletion = reject;
        });

        this._openWebSocket();

        return this._completionPromise;
    }

    _resetReceiveState() {
        this._expectedFiles = [];
        this._receivedFiles = [];
        this._currentIncomingFile = null;
        this._totalBytesExpected = 0;
        this._bytesReceived = 0;
        this._lastProgressSent = 0;
        this._incomingSenderInfo = null;
        this._incomingText = null;
    }

    _onIncomingRequest(message) {
        if (message.sender?.id) {
            this._remotePeerId ||= message.sender.id;
        }

        const header = Array.isArray(message.header) ? message.header : [];
        this._expectedFiles = header.map(item => ({
            name: item?.name || 'arquivo',
            size: Number(item?.size) || 0,
            mime: sanitizeMime(item?.mime)
        }));

        this._totalBytesExpected = typeof message.totalSize === 'number'
            ? message.totalSize
            : this._expectedFiles.reduce((acc, item) => acc + item.size, 0);

        this._incomingSenderInfo = message.sender || null;

        if (!this._expectedFiles.length) {
            this._sendToPeer({ type: 'files-transfer-response', accepted: false });
            this._fail(new Error('Nenhum arquivo foi informado pelo remetente.'));
            return;
        }

        this._emitStatus({
            stage: 'request-received',
            totalSize: this._totalBytesExpected,
            files: this._expectedFiles.slice()
        });

        this._sendToPeer({ type: 'files-transfer-response', accepted: true });
        this._emitStatus({ stage: 'request-accepted', totalSize: this._totalBytesExpected });
    }

    _onIncomingFileHeader(message) {
        if (!this._expectedFiles.length) {
            return;
        }

        const index = this._receivedFiles.length;
        const expected = this._expectedFiles[index] || {};
        const size = Number(message.size) || expected.size || 0;
        const name = message.name || expected.name || `Arquivo ${index + 1}`;
        const mime = sanitizeMime(message.mime || expected.mime);

        this._currentIncomingFile = {
            index,
            expectedSize: size,
            name,
            mime,
            received: 0,
            chunks: []
        };

        this._emitStatus({
            stage: 'receiving-file',
            direction: 'receive',
            file: name,
            index,
            total: this._expectedFiles.length
        });

        if (size === 0) {
            this._finalizeIncomingFile();
        }
    }

    _handleBinaryChunk(chunkData) {
        if (!this._currentIncomingFile) {
            return;
        }

        const chunk = chunkData instanceof Buffer
            ? chunkData
            : Buffer.from(chunkData);

        if (!chunk.length) {
            return;
        }

        this._currentIncomingFile.chunks.push(chunk);
        this._currentIncomingFile.received += chunk.length;
        this._bytesReceived += chunk.length;

        const { expectedSize, received, name, index } = this._currentIncomingFile;

        if (expectedSize && received > expectedSize) {
            this._fail(new Error(`Quantidade de dados recebida para "${name}" excede o esperado.`));
            return;
        }

        const progress = expectedSize ? received / expectedSize : 1;
        this._emitStatus({
            stage: 'progress',
            direction: 'receive',
            value: progress,
            file: name,
            index,
            total: this._expectedFiles.length
        });

        if (this._totalBytesExpected > 0) {
            const overallProgress = this._bytesReceived / this._totalBytesExpected;
            if (overallProgress - this._lastProgressSent >= 0.05 || overallProgress >= 1) {
                this._sendToPeer({ type: 'progress', progress: overallProgress });
                this._lastProgressSent = overallProgress;
            }
        }

        if (!expectedSize || received === expectedSize) {
            this._finalizeIncomingFile();
        }
    }

    _finalizeIncomingFile() {
        if (!this._currentIncomingFile) return;

        const { expectedSize, received, chunks, name, mime, index } = this._currentIncomingFile;

        if (expectedSize && received !== expectedSize) {
            this._fail(new Error(`Arquivo "${name}" chegou incompleto.`));
            return;
        }

        const buffer = expectedSize
            ? Buffer.concat(chunks, expectedSize)
            : Buffer.concat(chunks);

        this._sendToPeer({ type: 'file-transfer-complete' });

        this._receivedFiles.push({ name, mime, data: buffer });
        this._emitStatus({
            stage: 'file-received',
            direction: 'receive',
            file: name,
            index,
            total: this._expectedFiles.length
        });

        this._currentIncomingFile = null;

        if (this._receivedFiles.length === this._expectedFiles.length) {
            this._emitStatus({ stage: 'finished', direction: 'receive' });
            this._resolve({
                files: this._receivedFiles.slice(),
                totalSize: this._totalBytesExpected,
                sender: this._incomingSenderInfo
            });
        }
    }

    _onPartitionRequest(message) {
        if (typeof message.offset !== 'number') return;
        this._sendToPeer({ type: 'partition-received', offset: message.offset });
    }

    _sendTextMessage() {
        if (!this._remotePeerId || !this._roomId) {
            this._fail(new Error('Não foi possível identificar o par remoto para enviar o texto.'));
            return;
        }

        if (!this._textToSend) {
            this._fail(new Error('Nenhum texto foi informado para envio.'));
            return;
        }

        if (this._pendingTextAckTimeout) {
            clearTimeout(this._pendingTextAckTimeout);
        }

        const encoded = encodeTextPayload(this._textToSend);

        this._emitStatus({ stage: 'sending-text' });
        this._sendToPeer({ type: 'text', text: encoded });
        this._emitStatus({ stage: 'text-sent' });

        this._pendingTextAckTimeout = setTimeout(() => {
            this._pendingTextAckTimeout = null;
            this._fail(new Error('Tempo limite aguardando a confirmação da mensagem de texto.'));
        }, ACK_TIMEOUT_MS);
    }

    _onTextTransferComplete() {
        if (this._pendingTextAckTimeout) {
            clearTimeout(this._pendingTextAckTimeout);
            this._pendingTextAckTimeout = null;
        }

        this._emitStatus({ stage: 'text-complete' });
        this._emitStatus({ stage: 'finished', direction: 'text-send' });
        this._resolve({ text: this._textToSend });
    }

    _onIncomingText(message) {
        if (typeof message.text !== 'string') {
            return;
        }

        if (message.sender?.id) {
            this._remotePeerId ||= message.sender.id;
        }

        let decoded;
        try {
            decoded = decodeTextPayload(message.text);
        }
        catch (error) {
            this._fail(error);
            return;
        }

        this._incomingSenderInfo = message.sender || null;
        this._incomingText = decoded;

        this._emitStatus({ stage: 'text-received', text: decoded });
        this._sendToPeer({ type: 'message-transfer-complete' });
        this._emitStatus({ stage: 'finished', direction: 'receive-text' });

        const totalSize = Buffer.byteLength(decoded, 'utf8');
        this._resolve({
            files: this._receivedFiles.slice(),
            totalSize,
            sender: this._incomingSenderInfo,
            text: decoded
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

    _resolve(result) {
        if (this._completed) return;
        this._completed = true;
        this._cleanup();
        this._resolveCompletion?.(result);
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
        this._currentIncomingFile = null;
        this._expectedFiles = [];
        this._receivedFiles = [];
        this._incomingText = null;
        this._textToSend = null;

        if (this._pendingTextAckTimeout) {
            clearTimeout(this._pendingTextAckTimeout);
            this._pendingTextAckTimeout = null;
        }

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

    _applyDisplayName() {
        if (!this._displayName) return;
        this._sendRaw({ type: 'display-name-changed', displayName: this._displayName });
    }
}
