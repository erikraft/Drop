# Bot do Discord – ErikrafT Drop

Este diretório contém um exemplo de bot baseado em [discord.js](https://discord.js.org/) que realiza transferências reais de arquivos através do ErikrafT Drop. O bot se conecta ao mesmo servidor de sinalização utilizado pelo site, participa das salas secretas por meio de uma chave de pareamento e envia os arquivos utilizando o fallback WebSocket oficial. O dispositivo correspondente aparece instantaneamente em `public/index.html` com o ícone do Discord.

## Funcionalidades

- Registro automático do *slash command* `/drop`.
- Download dos anexos enviados no comando diretamente da API do Discord.
- Conexão ao ErikrafT Drop via WebSocket utilizando o `client_type=discord-bot`, garantindo que o dispositivo seja exibido na interface web em tempo real.
- Envio dos arquivos pela mesma fila de mensagens utilizada pelos navegadores: o destinatário recebe a solicitação, aceita e os arquivos são transmitidos por blocos até a confirmação final.
- Respostas efêmeras (apenas para quem executa o comando), evitando vazamento de conteúdo em canais públicos.

> **Requisito importante:** o servidor ErikrafT Drop precisa estar com o fallback via WebSocket habilitado (`wsFallback: true`). A instância pública `https://drop.erikraft.com/` já possui este recurso ativado.

## Pré‑requisitos

- Node.js 20 ou superior.
- Um aplicativo de bot registrado no [Portal do Discord para Desenvolvedores](https://discord.com/developers/applications).
- Permissões para registrar *slash commands* no servidor desejado.
- Uma instância do ErikrafT Drop (pública ou auto-hospedada) com fallback WebSocket habilitado.

## Configuração

1. Copie `.env.example` para `.env` e preencha as variáveis:

   ```bash
   cp .env.example .env
   ```

   | Variável                      | Descrição                                                                 |
   |-------------------------------|----------------------------------------------------------------------------|
   | `DISCORD_TOKEN`               | Token do bot gerado no portal do Discord.                                 |
   | `DISCORD_APPLICATION_ID`      | ID do aplicativo (Client ID).                                             |
   | `DISCORD_GUILD_ID` (opcional) | Informe para registrar comandos apenas em um servidor durante os testes. |
   | `DROP_BASE_URL` (opcional)    | URL base do ErikrafT Drop (usada para identificar o cliente).             |
   | `DROP_SIGNALING_URL` (opcional)| URL completa do servidor de sinalização (`wss://.../server`).           |

   > Quando `DROP_SIGNALING_URL` não é informado, o bot utiliza `server` relativo a `DROP_BASE_URL`.

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Registre os comandos (execute novamente sempre que modificar `src/commands`):

   ```bash
   npm run register:commands
   ```

4. Inicie o bot:

   ```bash
   npm start
   ```

## Estrutura

- `src/index.js` – Inicializa o cliente do Discord, carrega os comandos e responde às interações.
- `src/registerCommands.js` – Utilitário para registrar os *slash commands* via REST.
- `src/commands/drop.js` – Implementação do comando `/drop` com controle de fluxo e feedback ao usuário.
- `src/client/dropClient.js` – Cliente ErikrafT Drop headless responsável por conectar-se via WebSocket e enviar os arquivos.

## Fluxo de uso

1. No ErikrafT Drop, abra o menu **Parear Dispositivo** e gere uma chave de 6 dígitos.
2. Execute o comando `/drop`, informe a chave e envie até três anexos.
3. O bot baixa os anexos, conecta-se ao servidor de sinalização, entra na sala secreta e solicita a transferência ao destinatário.
4. Assim que o destinatário aceitar no site, os arquivos são transmitidos em blocos e aparecem automaticamente na interface web.

## Segurança

- Os arquivos não são gravados em disco; tudo permanece na memória enquanto o comando é processado.
- Os dados trafegam diretamente para o destinatário através do WebSocket do ErikrafT Drop (ou pelo TURN configurado na instância), respeitando o mesmo fluxo de verificação e confirmação do cliente web.
- Tokens e segredos **não** estão versionados; mantenha seu arquivo `.env` em segurança.

## Hospedagem gratuita sugerida

Para colocar o bot online 24/7 sem custos, recomendamos as seguintes plataformas de *hosting* gratuito:

- [Shard Cloud](https://shardcloud.app/pt-br/dash)
- [Discloud](https://discloud.com/dashboard)

Aproveite como base para personalizar automações ou fluxos de upload no seu servidor Discord!
