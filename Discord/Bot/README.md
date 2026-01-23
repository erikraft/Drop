# Discord Bot – ErikrafT Drop

This directory contains an example bot built on [discord.js](https://discord.js.org/) that performs real file transfers through ErikrafT Drop. The bot connects to the same signaling server used by the website, joins secret rooms via a pairing key, and sends files using the official WebSocket fallback. The corresponding device appears instantly in `public/index.html` with the Discord icon.

## Features

- Automatic registration of the slash command `/drop`.
- Downloads attachments sent with the command directly from the Discord API.
- Connects to ErikrafT Drop via WebSocket using `client_type=discord-bot`, ensuring the device is displayed on the web interface in real time.
- Sends files through the same message queue used by browsers: the recipient receives the request, accepts it, and files are transmitted in chunks until final confirmation.
- Ephemeral responses (visible only to the command user), preventing content leaks in public channels.

> **Important requirement:** The ErikrafT Drop server must have the WebSocket fallback enabled (`wsFallback: true`). The public instance `https://drop.erikraft.com/` already has this feature enabled.

## Prerequisites

- Node.js 20 or higher.
- A registered bot application on the [Discord Developer Portal](https://discord.com/developers/applications).
- Permissions to register slash commands in the desired server.
- An ErikrafT Drop instance (public or self-hosted) with WebSocket fallback enabled.

## Configuration

1. Copy `.env.example` to `.env` and fill in the variables:

   ```bash
   cp .env.example .env
   ```

   | Variable                      | Description                                                                 |
   |-------------------------------|-----------------------------------------------------------------------------|
   | `DISCORD_TOKEN`               | Bot token generated on the Discord portal.                                  |
   | `DISCORD_APPLICATION_ID`      | Application ID (Client ID).                                                 |
   | `DISCORD_GUILD_ID` (optional) | Provide to register commands only on one server for testing.                |
   | `DROP_BASE_URL` (optional)    | Base URL of the ErikrafT Drop (used to identify the client).                |
   | `DROP_SIGNALING_URL` (optional)| Full URL of the signaling server (`wss://.../server`).                      |

   > When `DROP_SIGNALING_URL` is not provided, the bot uses `server` relative to `DROP_BASE_URL`.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Register commands (run again whenever you modify `src/commands`):

   ```bash
   npm run register:commands
   ```

4. Start the bot:

   ```bash
   npm start
   ```

## Structure

- `src/index.js` – Initializes the Discord client, loads commands, and handles interactions.
- `src/registerCommands.js` – Utility for registering slash commands via REST.
- `src/commands/drop.js` – Implementation of the `/drop` command with flow control and user feedback.
- `src/client/dropClient.js` – Headless ErikrafT Drop client responsible for connecting via WebSocket and sending files.

## Usage Flow

1. In ErikrafT Drop, open the **Pair Device** menu and generate a 6-digit key.
2. Run the `/drop` command, enter the key, and send up to three attachments.
3. The bot downloads the attachments, connects to the signaling server, enters the secret room, and requests the transfer from the recipient.
4. As soon as the recipient accepts on the website, files are transmitted in chunks and automatically appear on the web interface.

## Security

- Files are not written to disk; everything remains in memory while the command is being processed.
- Data is transmitted directly to the recipient through the ErikrafT Drop WebSocket (or via the TURN server configured for the instance), following the same verification and confirmation flow as the web client.
- Tokens and secrets are **not** versioned; keep your `.env` file secure.

## Suggested Free Hosting

To keep the bot online 24/7 for free, we recommend the following free hosting platforms:

- [Shard Cloud](https://shardcloud.app/pt-br/dash)
- [Discloud](https://discloud.com/dashboard)

Use this as a base to customize automations or upload flows for your Discord server!
