import { SlashCommandBuilder } from 'discord.js';
import { createBase64Archive, MAX_BASE64_LENGTH } from '../utils/zip.js';

const DROP_BASE_URL = process.env.DROP_BASE_URL || 'https://drop.erikraft.com/';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

async function fetchAttachment(attachment) {
    const response = await fetch(attachment.url, {
        headers: DISCORD_TOKEN ? { Authorization: `Bot ${DISCORD_TOKEN}` } : undefined
    });

    if (!response.ok) {
        throw new Error(`Não foi possível baixar o anexo ${attachment.name}.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

function buildDropUrl(base64) {
    const baseUrl = new URL(DROP_BASE_URL);
    baseUrl.searchParams.set('client_type', 'discord-bot');
    baseUrl.searchParams.set('base64zip', 'hash');
    baseUrl.hash = base64;
    return baseUrl.toString();
}

export const data = new SlashCommandBuilder()
    .setName('drop')
    .setDescription('Compartilha arquivos usando o ErikrafT Drop.')
    .addAttachmentOption(option =>
        option.setName('arquivo1').setDescription('Primeiro arquivo para enviar.'))
    .addAttachmentOption(option =>
        option.setName('arquivo2').setDescription('Segundo arquivo (opcional).'))
    .addAttachmentOption(option =>
        option.setName('arquivo3').setDescription('Terceiro arquivo (opcional).'));

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const attachments = ['arquivo1', 'arquivo2', 'arquivo3']
        .map(name => interaction.options.getAttachment(name))
        .filter(Boolean);

    if (attachments.length === 0) {
        const fallbackUrl = new URL(DROP_BASE_URL);
        fallbackUrl.searchParams.set('client_type', 'discord-bot');
        await interaction.editReply({
            content: `Nenhum anexo enviado. Abra ${fallbackUrl.toString()} para iniciar uma sessão manualmente.`
        });
        return;
    }

    try {
        const files = [];
        for (const attachment of attachments) {
            const data = await fetchAttachment(attachment);
            files.push({ name: attachment.name, data });
        }

        const archive = await createBase64Archive(files);

        if (archive.tooLarge) {
            await interaction.editReply({
                content: `Os arquivos compactados geraram ${archive.length} caracteres Base64, ultrapassando o limite recomendado (${MAX_BASE64_LENGTH}). Tente enviar arquivos menores.`
            });
            return;
        }

        const dropUrl = buildDropUrl(archive.base64);
        const details = attachments.map((attachment, index) => `${index + 1}. ${attachment.name} (${formatBytes(attachment.size)})`).join('\n');

        await interaction.editReply({
            content: [
                '✅ Arquivos prontos para envio! Abra o link abaixo para concluir a transferência:',
                dropUrl,
                '\nConteúdo:',
                details,
                '\nObservação: o link utiliza codificação Base64 no hash da URL, portanto o conteúdo não é enviado ao servidor até que você o carregue.'
            ].join('\n')
        });
    }
    catch (error) {
        console.error(error);
        await interaction.editReply({ content: 'Falha ao preparar os arquivos. Tente novamente.' });
    }
}
