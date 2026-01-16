import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId) {
    throw new Error('As variáveis DISCORD_TOKEN e DISCORD_APPLICATION_ID são obrigatórias.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');

async function collectCommands() {
    const files = await readdir(commandsPath);
    const commands = [];

    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath));
        if (commandModule.data) {
            commands.push(commandModule.data.toJSON());
        }
    }

    return commands;
}

async function registerCommands() {
    const commands = await collectCommands();
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        // ✅ GUILD (seguro, instantâneo)
        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(applicationId, guildId),
                { body: commands }
            );
            console.log(`✅ Comandos registrados para o servidor ${guildId}.`);
            return;
        }

        // ✅ GLOBAL (sync correto)
        const existing = await rest.get(
            Routes.applicationCommands(applicationId)
        );

        // Mantém comandos que não são seus (ex: Entry Point)
        const preserved = existing.filter(
            cmd => !commands.some(c => c.name === cmd.name)
        );

        const merged = [...preserved, ...commands];

        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: merged }
        );

        console.log('✅ Comandos registrados globalmente (sync seguro).');
    }
    catch (error) {
        console.error('❌ Falha ao registrar comandos:', error);
    }
}

registerCommands();
