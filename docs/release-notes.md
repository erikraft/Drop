==== 🇧🇷｜Português Brasil ====

# Notas de Lançamento — v1.11.8

## Destaques
- Novo fluxo de edição com IA: botões "Editar com IA", "Gerar variação" e "Criar nova imagem" disponíveis para imagens recebidas e compartilhadas.
- Opção de copiar imagens preservando qualidade enquanto aplicamos compressão seletiva em metadados EXIF, reduzindo tamanho sem perder dados essenciais.
- Aperfeiçoamos o service worker para ignorar requisições `/api/ai/image`, garantindo respostas em tempo real da IA.
- Refinamos a compressão de metadados EXIF em arquivos baixados/compartilhados, mantendo informações críticas e removendo redundâncias.
- Melhorias gerais de estabilidade, traduções e logs para depuração do fluxo de IA.

## O que mudou
- Adicionamos `ai-image-client.js` para consumir o endpoint `/api/ai/image` e converter respostas em arquivos reutilizáveis.
- Botões de IA aparecem automaticamente quando imagens são enviadas ou recebidas; o diálogo de recebimento compartilha thumbnails com o novo botão "Editar com IA".
- Ajustamos o botão "Copiar imagem" para respeitar o novo pipeline de compressão de EXIF, entregando imagens leves sem sacrificar qualidade perceptível.
- Service worker ignora `/api/**` e responde a Web Share Targets sem interferir nas chamadas de IA.
- Traduções atualizadas em múltiplos idiomas para os novos textos de IA e para mensagens relacionadas à cópia/metadata.

## Como atualizar
1. Limpe caches do navegador ou force a atualização do service worker (Ctrl+Shift+R) para carregar os novos assets (`cacheVersion` v1.11.8).
2. Verifique a presença da variável de ambiente `POE_API_KEY` no backend para habilitar a geração de imagens via IA.
3. Revise integrações que dependem do botão "Copiar imagem" ou de compressão de arquivos para garantir compatibilidade com a nova política de metadados.

## Agradecimentos
Obrigado por acompanhar o desenvolvimento contínuo do ErikrafT Drop! Feedbacks sobre a nova versão e as extensões 9.0.5 são muito bem-vindos.

==== 🇺🇸｜English ====

# Release Notes — v1.11.8

## Highlights
- Brand-new AI editing flow: "Edit with AI", "Generate variation", and "Create new image" buttons are now available for shared and received images.
- Copy Image keeps visual fidelity while applying selective EXIF metadata compression, shrinking payloads without stripping critical fields.
- Service worker now bypasses `/api/ai/image` so AI responses are fetched live without redirection issues.
- Enhanced EXIF compression pipeline for downloads/shares to remove redundant metadata but keep important camera information.
- General stability, localization, and logging improvements around the AI experience.

## What's Changed
- Added `ai-image-client.js` to consume the `/api/ai/image` endpoint and transform AI outputs into reusable `File` objects.
- AI buttons auto-display for image-only shares/receives; the receive dialog now exposes "Edit with AI" alongside thumbnail previews.
- Updated the "Copy image" button to comply with the new EXIF compression policy, keeping images lightweight with intact essential metadata.
- Service worker skips `/api/**` requests and still processes Web Share Targets without interfering with AI calls.
- Localization files refreshed across multiple languages for the new AI and copy/metadata strings.

## How to update
1. Clear browser caches or hard-refresh the service worker (Ctrl+Shift+R) to load the new assets (`cacheVersion` v1.11.8).
2. Ensure the `POE_API_KEY` environment variable is present on the backend to enable AI image generation.
3. Validate any automations that rely on "Copy image" or metadata-heavy workflows to align with the refined EXIF compression defaults.

## Thanks
Thank you for following the continued development of ErikrafT Drop! Feedback on the new version and extensions 9.0.5 is very welcome.