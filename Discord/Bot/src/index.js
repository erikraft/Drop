import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const token = process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error('A variável de ambiente DISCORD_TOKEN não está definida.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');

async function loadCommands() {
    const files = await readdir(commandsPath);

    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath));

        if (commandModule.data && commandModule.execute) {
            client.commands.set(commandModule.data.name, commandModule);
        }
    }
}

async function main() {
    await loadCommands();

    client.once(Events.ClientReady, (readyClient) => {
        console.log(`Bot conectado como ${readyClient.user.tag}`);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(error);
            const content = 'Ocorreu um erro ao executar este comando.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content });
            }
            else {
                await interaction.reply({ content, ephemeral: true });
            }
        }
    });

    await client.login(token);
}

main();
