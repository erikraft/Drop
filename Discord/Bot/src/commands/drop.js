import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import DropTransferClient from '../client/dropClient.js';

const DROP_BASE_URL = process.env.DROP_BASE_URL || 'https://drop.erikraft.com/';
const DROP_SIGNALING_URL = process.env.DROP_SIGNALING_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

async function fetchAttachment(attachment) {
    const headers = DISCORD_TOKEN ? { Authorization: `Bot ${DISCORD_TOKEN}` } : undefined;
    const response = await fetch(attachment.url, { headers });

    if (!response.ok) {
        throw new Error(`Não foi possível baixar o anexo ${attachment.name}.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

function normalizePairKey(rawKey) {
    return (rawKey || '').replace(/\D/g, '').slice(0, 6);
}

function formatPairKey(pairKey) {
    return `${pairKey.substring(0, 3)} ${pairKey.substring(3, 6)}`;
}

export const data = new SlashCommandBuilder()
    .setName('drop')
    .setDescription('Compartilha arquivos usando o ErikrafT Drop em tempo real.')
    .addStringOption(option =>
        option
            .setName('chave')
            .setDescription('Chave de pareamento (6 dígitos) gerada no site do ErikrafT Drop.')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6))
    .addStringOption(option =>
        option
            .setName('nome')
            .setDescription('Nome exibido para o seu bot no ErikrafT Drop (opcional).')
            .setRequired(false)
            .setMaxLength(64))
    .addAttachmentOption(option =>
        option.setName('arquivo1').setDescription('Primeiro arquivo para enviar.'))
    .addAttachmentOption(option =>
        option.setName('arquivo2').setDescription('Segundo arquivo (opcional).'))
    .addAttachmentOption(option =>
        option.setName('arquivo3').setDescription('Terceiro arquivo (opcional).'));

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rawPairKey = interaction.options.getString('chave', true);
    const pairKey = normalizePairKey(rawPairKey);
    const rawDisplayName = interaction.options.getString('nome');
    const displayName = rawDisplayName?.trim().slice(0, 64) || undefined;

    if (!/^\d{6}$/.test(pairKey)) {
        await interaction.editReply({
            content: '❌ Informe uma chave de pareamento com 6 dígitos (exemplo: `123 456`).'
        });
        return;
    }

    const attachments = ['arquivo1', 'arquivo2', 'arquivo3']
        .map(name => interaction.options.getAttachment(name))
        .filter(Boolean);

    const transferMode = attachments.length > 0 ? 'send' : 'receive';

    let editQueue = Promise.resolve();
    let lastMessage = '';
    let currentFileInfo = null;
    let lastProgress = -1;
    let currentIncomingInfo = null;
    let lastIncomingProgress = -1;

    const queueMessage = (content) => {
        if (!content || content === lastMessage) return;
        lastMessage = content;
        editQueue = editQueue
            .then(() => interaction.editReply({ content }))
            .catch(error => console.error('Falha ao atualizar a resposta do comando /drop:', error));
    };

    try {
        const transferClient = new DropTransferClient({
            baseUrl: DROP_BASE_URL,
            signalUrl: DROP_SIGNALING_URL,
            pairKey,
            files: [],
            displayName
        });

        let files = [];

        if (transferMode === 'send') {
            queueMessage('📥 Baixando anexos do Discord...');
            files = [];
            for (const attachment of attachments) {
                const data = await fetchAttachment(attachment);
                files.push({
                    name: attachment.name,
                    data,
                    mime: attachment.contentType
                });
            }

            transferClient.files = files;
        }

        const onStatus = (status) => {
            switch (status.stage) {
                case 'connecting':
                    queueMessage('🔌 Conectando ao ErikrafT Drop...');
                    break;
                case 'connected':
                    queueMessage('🔑 Sessão estabelecida. Validando a chave de pareamento...');
                    break;
                case 'paired':
                    queueMessage('🔗 Dispositivo encontrado! Aguarde o destinatário aceitar a transferência no navegador.');
                    break;
                case 'request-sent': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(`📨 Pedido enviado ao destinatário (${totalLabel}). Aguardando confirmação...`);
                    break;
                }
                case 'accepted':
                    queueMessage('✅ O destinatário aceitou a solicitação. Preparando o envio...');
                    break;
                case 'sending-file':
                    currentFileInfo = status;
                    lastProgress = -1;
                    queueMessage(`📤 Enviando arquivo ${status.index + 1}/${status.total}: ${status.file}`);
                    break;
                case 'progress': {
                    if (status.direction === 'send') {
                        if (!currentFileInfo) break;
                        const percent = Math.floor((status.value || 0) * 100);
                        if (percent >= 100 && lastProgress !== 100) {
                            queueMessage(`📤 Enviando arquivo ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — 100%`);
                            lastProgress = 100;
                        }
                        else if (percent - lastProgress >= 5) {
                            queueMessage(`📤 Enviando arquivo ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — ${percent}%`);
                            lastProgress = percent;
                        }
                    }
                    else if (status.direction === 'receive') {
                        if (!currentIncomingInfo) break;
                        const percent = Math.floor((status.value || 0) * 100);
                        if (percent >= 100 && lastIncomingProgress !== 100) {
                            queueMessage(`📥 Recebendo arquivo ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — 100%`);
                            lastIncomingProgress = 100;
                        }
                        else if (percent - lastIncomingProgress >= 5) {
                            queueMessage(`📥 Recebendo arquivo ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — ${percent}%`);
                            lastIncomingProgress = percent;
                        }
                    }
                    break;
                }
                case 'file-complete':
                    queueMessage(`✅ Arquivo "${status.file}" entregue com sucesso.`);
                    currentFileInfo = null;
                    break;
                case 'request-received': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(`📨 Pedido recebido do par remoto (${totalLabel}). Aceitando...`);
                    break;
                }
                case 'request-accepted':
                    queueMessage('✅ Solicitação aceita. Aguardando envio dos arquivos...');
                    break;
                case 'receiving-file':
                    currentIncomingInfo = status;
                    lastIncomingProgress = -1;
                    queueMessage(`📥 Recebendo arquivo ${status.index + 1}/${status.total}: ${status.file}`);
                    break;
                case 'file-received':
                    queueMessage(`✅ Arquivo "${status.file}" recebido com sucesso.`);
                    currentIncomingInfo = null;
                    break;
                case 'finished':
                    if (status.direction === 'receive') {
                        queueMessage('🎉 Transferência concluída! Processando arquivos recebidos...');
                    }
                    break;
                default:
                    break;
            }
        };

        let receivedResult = null;

        if (transferMode === 'send') {
            await transferClient.send(onStatus);
        }
        else {
            receivedResult = await transferClient.receive(onStatus);
            files = receivedResult?.files || [];
        }

        await editQueue;

        const formattedKey = formatPairKey(pairKey);
        if (transferMode === 'send') {
            const details = files
                .map((file, index) => `${index + 1}. ${file.name} (${formatBytes(file.data.length)})`)
                .join('\n');

            const finalMessage = [
                '🎉 Transferência concluída!',
                `Os arquivos foram entregues ao dispositivo conectado com a chave **${formattedKey}**.`,
                '',
                '📦 Arquivos enviados:',
                details,
                '',
                'Se o destinatário não visualizar a notificação imediatamente, peça para verificar a aba do ErikrafT Drop.'
            ].join('\n');

            await interaction.editReply({ content: finalMessage });
        }
        else {
            const receivedFiles = files || [];
            if (!receivedFiles.length) {
                await interaction.editReply({
                    content: '⚠️ Não foram recebidos arquivos do par remoto. Tente novamente.'
                });
                return;
            }

            const MAX_DISCORD_ATTACHMENT_SIZE = 25 * 1024 * 1024;
            const MAX_DISCORD_ATTACHMENTS = 10;
            const attachmentsToSend = [];
            const skipped = [];

            for (const file of receivedFiles) {
                const size = file.data?.length || 0;
                if (size > MAX_DISCORD_ATTACHMENT_SIZE) {
                    skipped.push(`${file.name} (${formatBytes(size)}) — acima do limite de 25 MB do Discord.`);
                    continue;
                }
                if (attachmentsToSend.length >= MAX_DISCORD_ATTACHMENTS) {
                    skipped.push(`${file.name} (${formatBytes(size)}) — limite de 10 anexos por mensagem atingido.`);
                    continue;
                }
                attachmentsToSend.push(new AttachmentBuilder(file.data, { name: file.name }));
            }

            const summary = receivedFiles
                .map((file, index) => `${index + 1}. ${file.name} (${formatBytes(file.data.length)})`)
                .join('\n');

            const messageLines = [
                '📦 Arquivos recebidos com sucesso!',
                `Os arquivos enviados para a chave **${formattedKey}** foram entregues aqui no Discord.`,
                '',
                '📂 Conteúdo recebido:',
                summary
            ];

            if (skipped.length) {
                messageLines.push('', '⚠️ Os itens abaixo não puderam ser anexados automaticamente:', ...skipped);
            }

            await interaction.editReply({
                content: messageLines.join('\n'),
                files: attachmentsToSend
            });
        }
    }
    catch (error) {
        await editQueue;
        await interaction.editReply({
            content: `❌ Não foi possível concluir a transferência: ${error.message}`
        });
    }
}
