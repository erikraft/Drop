# Bot do Discord – ErikrafT Drop

Este diretório contém um exemplo de bot baseado em [discord.js](https://discord.js.org/) que automatiza o envio de arquivos através do ErikrafT Drop. O objetivo é oferecer uma experiência coerente com a interface web, incluindo a identificação do dispositivo com o ícone do Discord quando a transferência for iniciada a partir do bot.

## Funcionalidades

- Registro automático do *slash command* `/drop`.
- Download de anexos enviados no comando, criação de um arquivo `.zip` e geração de um link do ErikrafT Drop com o conteúdo em Base64.
- Os links criados já incluem `client_type=discord-bot`, fazendo com que o site exiba o ícone do Discord em tempo real.
- Respostas efêmeras (apenas para quem executa o comando), evitando vazamento de conteúdo em canais públicos.

> **Limitações:** O modo de compartilhamento por Base64 segue a mesma estratégia utilizada no `erikraftdrop-cli`. Arquivos maiores podem ultrapassar o limite recomendado para URLs; nesses casos o bot avisa o usuário para reduzir o tamanho do envio.

## Pré‑requisitos

- Node.js 20 ou superior.
- Um aplicativo de bot registrado no [Portal do Discord para Desenvolvedores](https://discord.com/developers/applications).
- Permissões para registrar *slash commands* no servidor desejado.

## Configuração

1. Copie `.env.example` para `.env` e preencha as variáveis:

   ```bash
   cp .env.example .env
   ```

   | Variável                     | Descrição                                                                 |
   |------------------------------|----------------------------------------------------------------------------|
   | `DISCORD_TOKEN`              | Token do bot gerado no portal do Discord.                                 |
   | `DISCORD_APPLICATION_ID`     | ID do aplicativo (Client ID).                                             |
   | `DISCORD_GUILD_ID` (opcional)| Informe para registrar comandos apenas em um servidor durante os testes. |
   | `DROP_BASE_URL` (opcional)   | Altere se estiver executando uma instância própria do ErikrafT Drop.      |

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Registre os comandos (rodar novamente sempre que modificar `src/commands`):

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
- `src/commands/drop.js` – Implementação do comando `/drop`.
- `src/utils/zip.js` – Converte anexos em um arquivo `.zip` Base64 compatível com o ErikrafT Drop.

## Fluxo de uso

1. Execute o comando `/drop` e envie até três anexos.
2. O bot compacta os arquivos e gera um link seguro como `https://drop.erikraft.com/?client_type=discord-bot&base64zip=hash#<BASE64>`.
3. Abra o link (o navegador interno do Discord também funciona). O dispositivo aparecerá instantaneamente no site com o ícone do Discord.
4. O destinatário pode baixar os arquivos normalmente dentro do ErikrafT Drop.

## Segurança

- O bot não armazena arquivos em disco: tudo é mantido na memória enquanto o comando é processado.
- O link gerado utiliza `#hash`, portanto o conteúdo codificado não é enviado ao servidor.
- Tokens e segredos **não** estão versionados; mantenha seu arquivo `.env` em segurança.

## Desenvolvimento futuro

- Integração completa com o modo de *fallback* WebSocket para receber arquivos diretamente no bot.
- Persistência temporária usando armazenamento externo quando o tamanho exceder o limite de URL.

Sinta‑se à vontade para adaptar o código conforme as necessidades do seu servidor.
