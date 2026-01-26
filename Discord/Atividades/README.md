# Discord Activity – ErikrafT Drop

<div align="center" style="display: inline_block; gap: 10px;"><br>
  <a href="https://discord.com/oauth2/authorize?client_id=1367869058707492955" target="_blank">
    <img alt="Get it on Discord" style="height: 80px;" src="https://raw.githubusercontent.com/erikraft/Drop/master/public/images/badges/Get%20it%20on%20Discord.png" alt="Get it on Discord">
  </a>
</div>

<p align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1367869058707492955" target="_blank">
    Adicionar o "ErikrafT Drop" ao Discord
  </a>
</p>

This directory contains a minimal HTML page example that can be used as a basis for publishing a custom Activity on Discord. The page simply embeds the ErikrafT Drop website inside an `iframe` and adds the `client_type=discord-activity` parameter so the device is identified with the Discord icon on the web interface.

## How to Use

1. Host the content of this folder on a domain accessible by Discord (HTTPS required).
2. In the [Discord Developer Portal](https://discord.com/developers/applications), create or select an application and enable the **Activities** option.
3. Provide the hosted URL to `index.html` as the *Activity URL*.
4. Publish the activity to your server and open it directly in Discord. ErikrafT Drop will load inside the client.

## `iframe` Permissions

The `iframe` tag is configured with the minimum necessary permissions:

- `clipboard-write`, `camera`, and `microphone` allow Drop to access device resources if the user authorizes it.
- `allow-same-origin allow-scripts allow-popups allow-forms` are required for the application to function correctly within Discord's sandbox.

## Customization

- Adjust the theme, colors, or logo according to your server's identity.
- Replace `https://drop.erikraft.com/` with another instance if you are hosting ErikrafT Drop on your own domain.

## Icon Synchronization

Thanks to the `client_type=discord-activity` parameter, any device using this activity will instantly appear on `public/index.html` with the Discord icon, maintaining a consistent experience across web, bot, and VS Code extension.
