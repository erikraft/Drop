import { SlashCommandBuilder } from 'discord.js';
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

    if (!/^\d{6}$/.test(pairKey)) {
        await interaction.editReply({
            content: '❌ Informe uma chave de pareamento com 6 dígitos (exemplo: `123 456`).'
        });
        return;
    }

    const attachments = ['arquivo1', 'arquivo2', 'arquivo3']
        .map(name => interaction.options.getAttachment(name))
        .filter(Boolean);

    if (attachments.length === 0) {
        await interaction.editReply({
            content: 'Envie pelo menos um anexo ao executar o comando `/drop`.'
        });
        return;
    }

    let editQueue = Promise.resolve();
    let lastMessage = '';
    let currentFileInfo = null;
    let lastProgress = -1;

    const queueMessage = (content) => {
        if (!content || content === lastMessage) return;
        lastMessage = content;
        editQueue = editQueue
            .then(() => interaction.editReply({ content }))
            .catch(error => console.error('Falha ao atualizar a resposta do comando /drop:', error));
    };

    queueMessage('📥 Baixando anexos do Discord...');

    try {
        const files = [];
        for (const attachment of attachments) {
            const data = await fetchAttachment(attachment);
            files.push({
                name: attachment.name,
                data,
                mime: attachment.contentType
            });
        }

        const transferClient = new DropTransferClient({
            baseUrl: DROP_BASE_URL,
            signalUrl: DROP_SIGNALING_URL,
            pairKey,
            files
        });

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
                    break;
                }
                case 'file-complete':
                    queueMessage(`✅ Arquivo "${status.file}" entregue com sucesso.`);
                    currentFileInfo = null;
                    break;
                default:
                    break;
            }
        };

        await transferClient.send(onStatus);

        await editQueue;

        const formattedKey = formatPairKey(pairKey);
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
    catch (error) {
        await editQueue;
        await interaction.editReply({
            content: `❌ Não foi possível concluir a transferência: ${error.message}`
        });
    }
}
