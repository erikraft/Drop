import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import DropTransferClient from '../client/dropClient.js';

const DROP_BASE_URL = process.env.DROP_BASE_URL || 'https://drop.erikraft.com/';
const DROP_SIGNALING_URL = process.env.DROP_SIGNALING_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
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
    .setDescription('Share files with ErikrafT Drop in real time. / Compartilha arquivos usando o ErikrafT Drop em tempo real.')
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
            .setMaxLength(64))
    .addStringOption(option =>
        option
            .setName('mensagem')
            .setDescription('Text message to send to the paired device (optional). / Mensagem de texto para enviar ao dispositivo pareado (opcional).')
            .setRequired(false)
            .setMaxLength(2000))
    .addAttachmentOption(option =>
        option.setName('arquivo1').setDescription('First file to send. / Primeiro arquivo para enviar.'))
    .addAttachmentOption(option =>
        option.setName('arquivo2').setDescription('Second file (optional). / Segundo arquivo (opcional).'))
    .addAttachmentOption(option =>
        option.setName('arquivo3').setDescription('Third file (optional). / Terceiro arquivo (opcional).'));

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

    const attachments = ['arquivo1', 'arquivo2', 'arquivo3']
        .map(name => interaction.options.getAttachment(name))
        .filter(Boolean);

    const rawTextOption = interaction.options.getString('mensagem');
    const normalizedTextOption = typeof rawTextOption === 'string'
        ? rawTextOption.replace(/\r\n/g, '\n')
        : undefined;
    const hasTextToSend = typeof normalizedTextOption === 'string'
        && normalizedTextOption.trim().length > 0;
    const textMessage = hasTextToSend ? normalizedTextOption : undefined;

    if (attachments.length > 0 && hasTextToSend) {
        await interaction.editReply({
            content: formatBilingualMessage(
                '⚠️ Send files **or** a text message at a time. Remove one of the fields and try again.',
                '⚠️ Envie arquivos **ou** uma mensagem de texto por vez. Remova um dos campos e tente novamente.'
            )
        });
        return;
    }

    const transferMode = attachments.length > 0
        ? 'send'
        : hasTextToSend
            ? 'send-text'
            : 'receive';

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
        let textSendResult = null;

        if (transferMode === 'send') {
            queueMessage(formatBilingualMessage(
                '📥 Downloading attachments from Discord...',
                '📥 Baixando anexos do Discord...'
            ));
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
                    if (transferMode === 'send') {
                        queueMessage(formatBilingualMessage(
                            '🔗 Device found! Waiting for the recipient to accept the transfer in the browser.',
                            '🔗 Dispositivo encontrado! Aguarde o destinatário aceitar a transferência no navegador.'
                        ));
                    }
                    else if (transferMode === 'send-text') {
                        queueMessage(formatBilingualMessage(
                            '🔗 Device found! Preparing to send the text message...',
                            '🔗 Dispositivo encontrado! Preparando o envio da mensagem de texto...'
                        ));
                    }
                    else {
                        queueMessage(formatBilingualMessage(
                            '🔗 Device found! Waiting for the sender to start the transfer...',
                            '🔗 Dispositivo encontrado! Aguardando o remetente iniciar a transferência...'
                        ));
                    }
                    break;
                case 'request-sent': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(formatBilingualMessage(
                        `📨 Request sent to the recipient (${totalLabel}). Waiting for confirmation...`,
                        `📨 Pedido enviado ao destinatário (${totalLabel}). Aguardando confirmação...`
                    ));
                    break;
                }
                case 'accepted':
                    queueMessage(formatBilingualMessage(
                        '✅ The recipient accepted the request. Preparing the transfer...',
                        '✅ O destinatário aceitou a solicitação. Preparando o envio...'
                    ));
                    break;
                case 'sending-file':
                    currentFileInfo = status;
                    lastProgress = -1;
                    queueMessage(formatBilingualMessage(
                        `📤 Sending file ${status.index + 1}/${status.total}: ${status.file}`,
                        `📤 Enviando arquivo ${status.index + 1}/${status.total}: ${status.file}`
                    ));
                    break;
                case 'progress': {
                    if (status.direction === 'send') {
                        if (!currentFileInfo) break;
                        const percent = Math.floor((status.value || 0) * 100);
                        if (percent >= 100 && lastProgress !== 100) {
                            queueMessage(formatBilingualMessage(
                                `📤 Sending file ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — 100%`,
                                `📤 Enviando arquivo ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — 100%`
                            ));
                            lastProgress = 100;
                        }
                        else if (percent - lastProgress >= 5) {
                            queueMessage(formatBilingualMessage(
                                `📤 Sending file ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — ${percent}%`,
                                `📤 Enviando arquivo ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — ${percent}%`
                            ));
                            lastProgress = percent;
                        }
                    }
                    else if (status.direction === 'receive') {
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
                    }
                    break;
                }
                case 'file-complete':
                    queueMessage(formatBilingualMessage(
                        `✅ File "${status.file}" delivered successfully.`,
                        `✅ Arquivo "${status.file}" entregue com sucesso.`
                    ));
                    currentFileInfo = null;
                    break;
                case 'request-received': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(formatBilingualMessage(
                        `📨 Request received from the remote peer (${totalLabel}). Accepting...`,
                        `📨 Pedido recebido do par remoto (${totalLabel}). Aceitando...`
                    ));
                    break;
                }
                case 'request-accepted':
                    queueMessage(formatBilingualMessage(
                        '✅ Request accepted. Waiting for the files to arrive...',
                        '✅ Solicitação aceita. Aguardando envio dos arquivos...'
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
                case 'file-received':
                    queueMessage(formatBilingualMessage(
                        `✅ File "${status.file}" received successfully.`,
                        `✅ Arquivo "${status.file}" recebido com sucesso.`
                    ));
                    currentIncomingInfo = null;
                    break;
                case 'sending-text':
                    queueMessage(formatBilingualMessage(
                        '💬 Sending text message to the recipient...',
                        '💬 Enviando mensagem de texto para o destinatário...'
                    ));
                    break;
                case 'text-sent':
                    queueMessage(formatBilingualMessage(
                        '📨 Message sent. Waiting for the recipient to confirm...',
                        '📨 Mensagem enviada. Aguardando confirmação do destinatário...'
                    ));
                    break;
                case 'text-complete':
                    queueMessage(formatBilingualMessage(
                        '✅ The recipient confirmed receipt of the text message.',
                        '✅ O destinatário confirmou o recebimento da mensagem de texto.'
                    ));
                    break;
                case 'text-received':
                    queueMessage(formatBilingualMessage(
                        '💬 Text message received! Processing the content...',
                        '💬 Mensagem de texto recebida! Processando conteúdo...'
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
                            '🎉 Text message received! Processing delivery on Discord...',
                            '🎉 Mensagem de texto recebida! Processando entrega no Discord...'
                        ));
                    }
                    else if (status.direction === 'text-send') {
                        queueMessage(formatBilingualMessage(
                            '✅ Text message confirmed by the recipient. Wrapping up...',
                            '✅ Mensagem de texto confirmada pelo destinatário. Finalizando...'
                        ));
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
        else if (transferMode === 'send-text') {
            textSendResult = await transferClient.sendText(textMessage, onStatus);
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

            const finalMessage = formatBilingualLines(
                [
                    '🎉 Transfer complete!',
                    `The files were delivered to the device paired with key **${formattedKey}**.`,
                    '',
                    '📦 Files sent:',
                    details,
                    '',
                    'If the recipient does not view the notification immediately, ask them to check the ErikrafT Drop tab.'
                ],
                [
                    '🎉 Transferência concluída!',
                    `Os arquivos foram entregues ao dispositivo conectado com a chave **${formattedKey}**.`,
                    '',
                    '📦 Arquivos enviados:',
                    details,
                    '',
                    'Se o destinatário não visualizar a notificação imediatamente, peça para verificar a aba do ErikrafT Drop.'
                ],
                { emoji: LOGO_NOTIFICATION_EMOJI }
            );

            await interaction.editReply({ content: finalMessage });
        }
        else if (transferMode === 'send-text') {
            const sentText = typeof textMessage === 'string'
                ? textMessage
                : textSendResult?.text || '';
            const textBytes = Buffer.byteLength(sentText, 'utf8');
            const inlineAllowed = sentText.length <= INLINE_TEXT_THRESHOLD;

            const englishLines = [
                '🎉 Message sent successfully!',
                `The text was delivered to the device paired with key **${formattedKey}**.`
            ];
            const portugueseLines = [
                '🎉 Mensagem enviada com sucesso!',
                `O texto foi entregue ao dispositivo conectado com a chave **${formattedKey}**.`
            ];

            if (inlineAllowed) {
                englishLines.push('', '💬 Delivered text:', formatCodeBlock(sentText));
                englishLines.push('', 'To copy it, select the text above directly in Discord.');
                portugueseLines.push('', '💬 Conteúdo enviado:', formatCodeBlock(sentText));
                portugueseLines.push('', 'Para copiar, selecione o texto acima diretamente no Discord.');

                const content = formatBilingualLines(englishLines, portugueseLines, { emoji: LOGO_NOTIFICATION_EMOJI });
                await interaction.editReply({ content });
            }
            else {
                const attachment = new AttachmentBuilder(Buffer.from(sentText, 'utf8'), { name: 'mensagem.txt' });
                englishLines.push('', `💬 Delivered text (${formatBytes(textBytes)}): check the attached \`mensagem.txt\` file to copy everything.`);
                portugueseLines.push('', `💬 Conteúdo enviado (${formatBytes(textBytes)}): confira o arquivo \`mensagem.txt\` em anexo para copiar tudo.`);

                const content = formatBilingualLines(englishLines, portugueseLines, { emoji: LOGO_NOTIFICATION_EMOJI });
                await interaction.editReply({ content, files: [attachment] });
            }
        }
        else {
            const receivedFiles = files || [];
            const receivedText = typeof receivedResult?.text === 'string'
                ? receivedResult.text
                : undefined;
            const hasReceivedText = typeof receivedText === 'string';

            if (!receivedFiles.length && !hasReceivedText) {
                await interaction.editReply({
                    content: formatBilingualMessage(
                        '⚠️ No files or messages were received from the remote peer. Please try again.',
                        '⚠️ Não foram recebidos arquivos ou mensagens do par remoto. Tente novamente.'
                    )
                });
                return;
            }

            const MAX_DISCORD_ATTACHMENT_SIZE = 25 * 1024 * 1024;
            const replyAttachments = [];
            const skipped = [];
            const needsTextAttachment = hasReceivedText && receivedText.length > INLINE_TEXT_THRESHOLD;
            let maxFileAttachments = MAX_DISCORD_ATTACHMENTS;
            if (needsTextAttachment) {
                maxFileAttachments = Math.max(MAX_DISCORD_ATTACHMENTS - 1, 0);
            }

            for (const file of receivedFiles) {
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

            if (receivedFiles.length) {
                const summary = receivedFiles
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
