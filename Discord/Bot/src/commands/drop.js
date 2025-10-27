import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import DropTransferClient from '../client/dropClient.js';

const DROP_BASE_URL = process.env.DROP_BASE_URL || 'https://drop.erikraft.com/';
const DROP_SIGNALING_URL = process.env.DROP_SIGNALING_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const INLINE_TEXT_THRESHOLD = 1_800;
const MAX_DISCORD_ATTACHMENTS = 10;

function formatMessage(text, options = {}) {
    const { emoji = '<:ErikrafT_Drop:1367869418167861338>' } = options;
    const lines = String(text ?? '').split('\n');
    const hasContent = lines.some(line => line.trim().length > 0);
    const emojiPrefix = typeof emoji === 'string' && emoji.length > 0 ? emoji : '';

    if (!hasContent) {
        return emojiPrefix.trim();
    }

    const firstContentIndex = lines.findIndex(line => line.trim().length > 0);

    if (firstContentIndex === -1) {
        return emojiPrefix.trim();
    }

    if (lines[firstContentIndex].startsWith('```')) {
        if (emojiPrefix) {
            lines.splice(firstContentIndex, 0, emojiPrefix);
        }
    }
    else if (emojiPrefix) {
        lines[firstContentIndex] = `${emojiPrefix} ${lines[firstContentIndex]}`.trim();
    }

    return lines.join('\n');
}

function formatLines(lines, options = {}) {
    return formatMessage(lines.join('\n'), options);
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
        throw new Error(`Unable to download the attachment ${attachment.name}.`);
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
    .setDescription('Send or receive with ErikrafT Drop.')
    .addStringOption(option =>
        option
            .setName('key')
            .setDescription('Pairing key (6 digits).')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6))
    .addStringOption(option =>
        option
            .setName('name')
            .setDescription('Display name on ErikrafT Drop (optional).')
            .setRequired(false)
            .setMaxLength(64))
    .addStringOption(option =>
        option
            .setName('message')
            .setDescription('Text to send to the paired device (optional).')
            .setRequired(false)
            .setMaxLength(2000))
    .addAttachmentOption(option =>
        option.setName('file1').setDescription('First file to send.'))
    .addAttachmentOption(option =>
        option.setName('file2').setDescription('Second file (optional).'))
    .addAttachmentOption(option =>
        option.setName('file3').setDescription('Third file (optional).'));

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rawPairKey = interaction.options.getString('key', true);
    const pairKey = normalizePairKey(rawPairKey);
    const rawDisplayName = interaction.options.getString('name');
    const displayName = rawDisplayName?.trim().slice(0, 64) || undefined;

    if (!/^\d{6}$/.test(pairKey)) {
        await interaction.editReply({
            content: formatMessage('❌ Provide a valid 6-digit pairing key (example: `123 456`).')
        });
        return;
    }

    const attachments = ['file1', 'file2', 'file3']
        .map(name => interaction.options.getAttachment(name))
        .filter(Boolean);

    const rawTextOption = interaction.options.getString('message');
    const normalizedTextOption = typeof rawTextOption === 'string'
        ? rawTextOption.replace(/\r\n/g, '\n')
        : undefined;
    const hasTextToSend = typeof normalizedTextOption === 'string'
        && normalizedTextOption.trim().length > 0;
    const textMessage = hasTextToSend ? normalizedTextOption : undefined;

    if (attachments.length > 0 && hasTextToSend) {
        await interaction.editReply({
            content: formatMessage('⚠️ Send files **or** a text message at a time. Remove one of the fields and try again.')
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
            .catch(error => console.error('Failed to update the /drop response:', error));
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
            queueMessage(formatMessage('<a:Loading:1432449524500271175> Downloading attachments from Discord...'));
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
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> Connecting to ErikrafT Drop...'));
                    break;
                case 'connected':
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> Session established. Validating the pairing key...'));
                    break;
                case 'paired':
                    if (transferMode === 'send') {
                        queueMessage(formatMessage('<a:Loading:1432449524500271175> Device found! Waiting for the recipient to accept the transfer in the browser.'));
                    }
                    else if (transferMode === 'send-text') {
                        queueMessage(formatMessage('<a:Loading:1432449524500271175> Device found! Preparing to send the text message...'));
                    }
                    else {
                        queueMessage(formatMessage('<a:Loading:1432449524500271175> Device found! Waiting for the sender to start the transfer...'));
                    }
                    break;
                case 'request-sent': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(formatMessage(`<a:Loading:1432449524500271175> Request sent to the recipient (${totalLabel}). Waiting for confirmation...`));
                    break;
                }
                case 'accepted':
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> The recipient accepted the request. Preparing the transfer...'));
                    break;
                case 'sending-file':
                    currentFileInfo = status;
                    lastProgress = -1;
                    queueMessage(formatMessage(`📤 Sending file ${status.index + 1}/${status.total}: ${status.file}`));
                    break;
                case 'progress': {
                    if (status.direction === 'send') {
                        if (!currentFileInfo) break;
                        const percent = Math.floor((status.value || 0) * 100);
                        if (percent >= 100 && lastProgress !== 100) {
                            queueMessage(formatMessage(`📤 Sending file ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — 100%`));
                            lastProgress = 100;
                        }
                        else if (percent - lastProgress >= 5) {
                            queueMessage(formatMessage(`📤 Sending file ${currentFileInfo.index + 1}/${currentFileInfo.total}: ${currentFileInfo.file} — ${percent}%`));
                            lastProgress = percent;
                        }
                    }
                    else if (status.direction === 'receive') {
                        if (!currentIncomingInfo) break;
                        const percent = Math.floor((status.value || 0) * 100);
                        if (percent >= 100 && lastIncomingProgress !== 100) {
                            queueMessage(formatMessage(`📥 Receiving file ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — 100%`));
                            lastIncomingProgress = 100;
                        }
                        else if (percent - lastIncomingProgress >= 5) {
                            queueMessage(formatMessage(`📥 Receiving file ${currentIncomingInfo.index + 1}/${currentIncomingInfo.total}: ${currentIncomingInfo.file} — ${percent}%`));
                            lastIncomingProgress = percent;
                        }
                    }
                    break;
                }
                case 'file-complete':
                    queueMessage(formatMessage(`✅ File "${status.file}" delivered successfully.`));
                    currentFileInfo = null;
                    break;
                case 'request-received': {
                    const totalLabel = formatBytes(status.totalSize || 0);
                    queueMessage(formatMessage(`<a:Loading:1432449524500271175> Request received from the remote peer (${totalLabel}). Accepting...`));
                    break;
                }
                case 'request-accepted':
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> Request accepted. Waiting for the files to arrive...'));
                    break;
                case 'receiving-file':
                    currentIncomingInfo = status;
                    lastIncomingProgress = -1;
                    queueMessage(formatMessage(`📥 Receiving file ${status.index + 1}/${status.total}: ${status.file}`));
                    break;
                case 'file-received':
                    queueMessage(formatMessage(`✅ File "${status.file}" received successfully.`));
                    currentIncomingInfo = null;
                    break;
                case 'sending-text':
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> Sending text message to the recipient...'));
                    break;
                case 'text-sent':
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> Message sent. Waiting for the recipient to confirm...'));
                    break;
                case 'text-received':
                    queueMessage(formatMessage('<a:Loading:1432449524500271175> Text message received! Processing the content...'));
                    break;
                case 'finished':
                    if (status.direction === 'receive') {
                        queueMessage(formatMessage('<a:Loading:1432449524500271175> Transfer finished! Processing received files...'));
                    }
                    else if (status.direction === 'receive-text') {
                        queueMessage(formatMessage('<a:Loading:1432449524500271175> Text message received! Processing delivery on Discord...'));
                    }
                    else if (status.direction === 'text-send') {
                        queueMessage(formatMessage('✅ Text message confirmed by the recipient. Wrapping up...'));
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

            const lines = [
                '🎉 Transfer complete!',
                `The files were delivered to the device paired with key **${formattedKey}**.`
            ];

            if (files.length) {
                lines.push('', '📦 Files sent:', details);
            }

            lines.push('', 'If the recipient does not see the notification immediately, ask them to check the ErikrafT Drop tab.');

            const finalMessage = formatLines(lines, { emoji: '<:ErikrafT_Drop_notification:1367869433065771119>' });

            await interaction.editReply({ content: finalMessage });
        }
        else if (transferMode === 'send-text') {
            const sentText = typeof textMessage === 'string'
                ? textMessage
                : textSendResult?.text || '';
            const textBytes = Buffer.byteLength(sentText, 'utf8');
            const inlineAllowed = sentText.length <= INLINE_TEXT_THRESHOLD;

            const lines = [
                '🎉 Message sent successfully!',
                `The text was delivered to the device paired with key **${formattedKey}**.`
            ];

            if (inlineAllowed) {
                lines.push('', '💬 Delivered text:', formatCodeBlock(sentText));
                lines.push('', 'Copy or reuse the text directly from the block above.');

                const content = formatLines(lines, { emoji: '<:ErikrafT_Drop_notification:1367869433065771119>' });
                await interaction.editReply({ content });
            }
            else {
                const attachment = new AttachmentBuilder(Buffer.from(sentText, 'utf8'), { name: 'message.txt' });
                lines.push('', `💬 Delivered text (${formatBytes(textBytes)}): the full content is in the attached \`message.txt\` file.`);

                const content = formatLines(lines, { emoji: '<:ErikrafT_Drop_notification:1367869433065771119>' });
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
                    content: formatMessage('⚠️ No files or messages were received from the remote peer. Please try again.')
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
                    skipped.push(`${file.name} (${formatBytes(size)}) — above Discord's 25 MB attachment limit.`);
                    continue;
                }
                if (replyAttachments.length >= maxFileAttachments) {
                    skipped.push(`${file.name} (${formatBytes(size)}) — attachment limit reached.`);
                    continue;
                }
                replyAttachments.push(new AttachmentBuilder(file.data, { name: file.name }));
            }

            const lines = [
                '🎉 Content received successfully!',
                `Everything sent to the key **${formattedKey}** was delivered here on Discord.`
            ];

            if (receivedFiles.length) {
                const summary = receivedFiles
                    .map((file, index) => `${index + 1}. ${file.name} (${formatBytes(file.data.length)})`)
                    .join('\n');
                lines.push('', '📂 Files received:', summary);
            }

            if (hasReceivedText) {
                const textBytes = Buffer.byteLength(receivedText, 'utf8');
                if (receivedText.length <= INLINE_TEXT_THRESHOLD) {
                    lines.push('', '💬 Message received:', formatCodeBlock(receivedText));
                    lines.push('', 'Copy the text directly above whenever you need it.');
                }
                else if (replyAttachments.length < MAX_DISCORD_ATTACHMENTS) {
                    replyAttachments.push(new AttachmentBuilder(Buffer.from(receivedText, 'utf8'), { name: 'message.txt' }));
                    lines.push('', `💬 Message received (${formatBytes(textBytes)}): the full content is in the attached \`message.txt\` file.`);
                }
                else {
                    const preview = receivedText.slice(0, INLINE_TEXT_THRESHOLD);
                    const previewBlock = formatCodeBlock(preview + (receivedText.length > INLINE_TEXT_THRESHOLD ? '…' : ''));
                    lines.push('', `💬 Message received (${formatBytes(textBytes)}): attaching the full text was not possible because of the attachment limit. Initial preview:`, previewBlock);
                }
            }

            if (skipped.length) {
                lines.push('', '⚠️ The items below could not be attached automatically:');
                for (const item of skipped) {
                    lines.push(item);
                }
            }

            const payload = {
                content: formatLines(lines, { emoji: '<:ErikrafT_Drop_notification:1367869433065771119>' })
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
            content: formatMessage(`❌ Unable to complete the transfer: ${error.message}`)
        });
    }
}
