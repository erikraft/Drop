import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import DropTransferClient from '../client/dropClient.js';

const DROP_BASE_URL = process.env.DROP_BASE_URL || 'https://drop.erikraft.com/';
const DROP_SIGNALING_URL = process.env.DROP_SIGNALING_URL;
const INLINE_TEXT_THRESHOLD = 1_800;
const MAX_DISCORD_ATTACHMENTS = 10;
const LOGO_EMOJI = '<:ErikrafT_Drop:1367869418167861338>';
const LOGO_NOTIFICATION_EMOJI = '<:ErikrafT_Drop_notification:1367869433065771119>';

function formatBilingualMessage(en, pt, options = {}) {
    const { emoji = LOGO_EMOJI, separator } = options;
    const decorate = (flag, text) => {
        const lines = String(text ?? '').split('\n');
        const prefix = `${emoji} ${flag}`;

        if (!lines.length || (lines.length === 1 && lines[0].length === 0)) {
            return prefix;
        }

        const firstContentIndex = lines.findIndex(line => line.trim().length > 0);

        if (firstContentIndex === -1) {
            return prefix;
        }

        if (lines[firstContentIndex].startsWith('```')) {
            lines.splice(firstContentIndex, 0, prefix);
        }
        else {
            lines[firstContentIndex] = `${prefix} ${lines[firstContentIndex]}`;
        }

        return lines.join('\n');
    };

    const englishBlock = decorate('🇺🇸', en);
    const portugueseBlock = decorate('🇧🇷', pt);
    const finalSeparator = separator ?? ((englishBlock.includes('\n') || portugueseBlock.includes('\n')) ? '\n\n' : '\n');
    return `${englishBlock}${finalSeparator}${portugueseBlock}`;
}

function formatBilingualLines(enLines, ptLines, options = {}) {
    const en = enLines.join('\n');
    const pt = ptLines.join('\n');
    return formatBilingualMessage(en, pt, options);
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatCodeBlock(text) {
    const sanitized = text.replace(/```/g, '``\u200b`');
    return '```\n' + sanitized + '\n```';
}

function normalizePairKey(rawKey) {
    return (rawKey || '').replace(/\D/g, '').slice(0, 6);
}

function formatPairKey(pairKey) {
    return `${pairKey.substring(0, 3)} ${pairKey.substring(3, 6)}`;
}

export const data = new SlashCommandBuilder()
    .setName('receive')
    .setDescription('Receive files from ErikrafT Drop. / Receba arquivos do ErikrafT Drop.')
    .addStringOption(option =>
        option
            .setName('chave')
            .setDescription('Pairing key (6 digits) generated on the ErikrafT Drop website. / Chave de pareamento (6 dígitos) gerada no site do ErikrafT Drop.')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6))
    .addStringOption(option =>
        option
            .setName('nome')
            .setDescription('Display name shown for your bot on ErikrafT Drop (optional). / Nome exibido para o seu bot no ErikrafT Drop (opcional).')
            .setRequired(false)
            .setMaxLength(64));

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rawPairKey = interaction.options.getString('chave', true);
    const pairKey = normalizePairKey(rawPairKey);
    const rawDisplayName = interaction.options.getString('nome');
    const displayName = rawDisplayName?.trim().slice(0, 64) || undefined;

    if (!/^\d{6}$/.test(pairKey)) {
        await interaction.editReply({
            content: formatBilingualMessage(
                '❌ Error: Provide a 6-digit pairing key (example: `123 456`).',
                '❌ Erro: Informe uma chave de pareamento com 6 dígitos (exemplo: `123 456`).'
            )
        });
        return;
    }

    let editQueue = Promise.resolve();
    let lastMessage = '';
    let currentIncomingInfo = null;
    let lastIncomingProgress = -1;

    const queueMessage = (content) => {
        if (!content || content === lastMessage) return;
        lastMessage = content;
        editQueue = editQueue
            .then(() => interaction.editReply({ content }))
            .catch(error => console.error('Falha ao atualizar a resposta do comando /receive:', error));
    };

    try {
        const transferClient = new DropTransferClient({
            baseUrl: DROP_BASE_URL,
            signalUrl: DROP_SIGNALING_URL,
            pairKey,
            files: [],
            displayName
        });

        const onStatus = (status) => {
            switch (status.stage) {
                case 'connecting':
                    queueMessage(formatBilingualMessage(
                        '🔌 Connecting to ErikrafT Drop...',
                        '🔌 Conectando ao ErikrafT Drop...'
                    ));
                    break;
                case 'connected':
                    queueMessage(formatBilingualMessage(
                        '🔑 Session established. Validating the pairing key...',
                        '🔑 Sessão estabelecida. Validando a chave de pareamento...'
                    ));
                    break;
                case 'paired':
                    queueMessage(formatBilingualMessage(
                        '🔗 Device paired! Waiting for the sender to start the transfer...',
                        '🔗 Dispositivo pareado! Aguardando o remetente iniciar a transferência...'
                    ));
                    break;
                case 'request-received': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(formatBilingualMessage(
                        `📨 Transfer request received (${totalLabel}). Accepting...`,
                        `📨 Solicitação de transferência recebida (${totalLabel}). Aceitando...`
                    ));
                    break;
                }
                case 'request-accepted':
                    queueMessage(formatBilingualMessage(
                        '✅ Transfer accepted. Waiting for the files to arrive...',
                        '✅ Transferência aceita. Aguardando os arquivos chegarem...'
                    ));
                    break;
                case 'receiving-file':
                    currentIncomingInfo = status;
                    lastIncomingProgress = -1;
                    queueMessage(formatBilingualMessage(
                        `📥 Receiving file ${status.index + 1}/${status.total}: ${status.file}`,
                        `📥 Recebendo arquivo ${status.index + 1}/${status.total}: ${status.file}`
                    ));
                    break;
                case 'progress': {
                    if (status.direction !== 'receive') break;
                    if (!currentIncomingInfo) break;
                    const percent = Math.floor((status.value || 0) * 100);
                    if (percent >= 100 && lastIncomingProgress !== 100) {
                        queueMessage(formatBilingualMessage(
                            `📥 Receiving file ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — 100%`,
                            `📥 Recebendo arquivo ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — 100%`
                        ));
                        lastIncomingProgress = 100;
                    }
                    else if (percent - lastIncomingProgress >= 5) {
                        queueMessage(formatBilingualMessage(
                            `📥 Receiving file ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — ${percent}%`,
                            `📥 Recebendo arquivo ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — ${percent}%`
                        ));
                        lastIncomingProgress = percent;
                    }
                    break;
                }
                case 'file-received':
                    queueMessage(formatBilingualMessage(
                        `✅ File "${status.file}" received successfully.`,
                        `✅ Arquivo "${status.file}" recebido com sucesso.`
                    ));
                    currentIncomingInfo = null;
                    break;
                case 'text-received':
                    queueMessage(formatBilingualMessage(
                        '💬 Text message received! Processing the content...',
                        '💬 Mensagem de texto recebida! Processando o conteúdo...'
                    ));
                    break;
                case 'finished':
                    if (status.direction === 'receive') {
                        queueMessage(formatBilingualMessage(
                            '🎉 Transfer finished! Processing received files...',
                            '🎉 Transferência concluída! Processando arquivos recebidos...'
                        ));
                    }
                    else if (status.direction === 'receive-text') {
                        queueMessage(formatBilingualMessage(
                            '🎉 Text message received! Preparing delivery on Discord...',
                            '🎉 Mensagem de texto recebida! Preparando entrega no Discord...'
                        ));
                    }
                    break;
                default:
                    break;
            }
        };

        const receivedResult = await transferClient.receive(onStatus);
        const files = receivedResult?.files || [];
        const receivedText = typeof receivedResult?.text === 'string'
            ? receivedResult.text
            : undefined;
        const hasReceivedText = typeof receivedText === 'string';

        await editQueue;

        if (!files.length && !hasReceivedText) {
            await interaction.editReply({
                content: formatBilingualMessage(
                    '⚠️ No files or messages were received from the remote peer. Please try again.',
                    '⚠️ Não foram recebidos arquivos ou mensagens do par remoto. Tente novamente.'
                )
            });
            return;
        }

        const formattedKey = formatPairKey(pairKey);
        const MAX_DISCORD_ATTACHMENT_SIZE = 25 * 1024 * 1024;
        const replyAttachments = [];
        const skipped = [];
        const needsTextAttachment = hasReceivedText && receivedText.length > INLINE_TEXT_THRESHOLD;
        let maxFileAttachments = MAX_DISCORD_ATTACHMENTS;
        if (needsTextAttachment) {
            maxFileAttachments = Math.max(MAX_DISCORD_ATTACHMENTS - 1, 0);
        }

        for (const file of files) {
            const size = file.data?.length || 0;
            if (size > MAX_DISCORD_ATTACHMENT_SIZE) {
                skipped.push({
                    en: `${file.name} (${formatBytes(size)}) — above Discord's 25 MB attachment limit.`,
                    pt: `${file.name} (${formatBytes(size)}) — acima do limite de 25 MB do Discord.`
                });
                continue;
            }
            if (replyAttachments.length >= maxFileAttachments) {
                skipped.push({
                    en: `${file.name} (${formatBytes(size)}) — attachment limit reached.`,
                    pt: `${file.name} (${formatBytes(size)}) — limite de anexos atingido.`
                });
                continue;
            }
            replyAttachments.push(new AttachmentBuilder(file.data, { name: file.name }));
        }

        const englishLines = [
            '🎉 Content received successfully!',
            `Everything sent to the key **${formattedKey}** was delivered here on Discord.`
        ];
        const portugueseLines = [
            '🎉 Conteúdo recebido com sucesso!',
            `O que foi enviado para a chave **${formattedKey}** foi entregue aqui no Discord.`
        ];

        if (files.length) {
            const summary = files
                .map((file, index) => `${index + 1}. ${file.name} (${formatBytes(file.data.length)})`)
                .join('\n');
            englishLines.push('', '📂 Files received:', summary);
            portugueseLines.push('', '📂 Arquivos recebidos:', summary);
        }

        if (hasReceivedText) {
            const textBytes = Buffer.byteLength(receivedText, 'utf8');
            if (receivedText.length <= INLINE_TEXT_THRESHOLD) {
                englishLines.push('', '💬 Message received:', formatCodeBlock(receivedText));
                englishLines.push('', 'Copy the text directly above whenever you need it.');
                portugueseLines.push('', '💬 Mensagem recebida:', formatCodeBlock(receivedText));
                portugueseLines.push('', 'Copie o texto diretamente acima sempre que precisar.');
            }
            else if (replyAttachments.length < MAX_DISCORD_ATTACHMENTS) {
                replyAttachments.push(new AttachmentBuilder(Buffer.from(receivedText, 'utf8'), { name: 'mensagem.txt' }));
                englishLines.push('', `💬 Message received (${formatBytes(textBytes)}): the full content is inside the attached \`mensagem.txt\` file.`);
                portugueseLines.push('', `💬 Mensagem recebida (${formatBytes(textBytes)}): o conteúdo completo está no arquivo \`mensagem.txt\` em anexo.`);
            }
            else {
                const preview = receivedText.slice(0, INLINE_TEXT_THRESHOLD);
                const previewBlock = formatCodeBlock(preview + (receivedText.length > INLINE_TEXT_THRESHOLD ? '…' : ''));
                englishLines.push('', `💬 Message received (${formatBytes(textBytes)}): attaching the full text was not possible because of the attachment limit. Initial preview:`, previewBlock);
                portugueseLines.push('', `💬 Mensagem recebida (${formatBytes(textBytes)}): não foi possível anexar o texto completo por conta do limite de anexos. Trecho inicial:`, previewBlock);
            }
        }

        if (skipped.length) {
            englishLines.push('', '⚠️ The items below could not be attached automatically:');
            portugueseLines.push('', '⚠️ Os itens abaixo não puderam ser anexados automaticamente:');
            for (const item of skipped) {
                englishLines.push(item.en);
                portugueseLines.push(item.pt);
            }
        }

        const payload = {
            content: formatBilingualLines(englishLines, portugueseLines, { emoji: LOGO_NOTIFICATION_EMOJI })
        };

        if (replyAttachments.length) {
            payload.files = replyAttachments;
        }

        await interaction.editReply(payload);
    }
    catch (error) {
        await editQueue;
        await interaction.editReply({
            content: formatBilingualMessage(
                `❌ Unable to complete the transfer: ${error.message}`,
                `❌ Não foi possível concluir a transferência: ${error.message}`
            )
        });
    }
}
