==== 🇧🇷｜Português Brasil ====

# Notas de Lançamento — v1.11.7

## Destaques
- Atualizamos as extensões ErikrafT Drop para a versão **9.0.5**, trazendo suporte completo de upload e download diretamente pelos complementos.
- Revisamos a presença no **Open VSX**, com novo cliente dedicado, ícones atualizados e metadados alinhados ao repositório oficial.
- Ajustamos a moderação e a experiência de uso no site/app, com refinamentos visuais e melhorias de segurança.
- Otimizamos integrações com Discord, incluindo links de OAuth2 e limpeza da lista de domínios suspeitos.
- Atualização do cache do service worker para garantir que clientes recebam os novos assets (cache version bump).

## O que mudou
- Pacotes VSIX 9.0.5 disponíveis em `Extensions/`, substituindo artefatos antigos e atualizando manifestos.
- Service worker, UI e assets receberam ajustes de estilo e comportamento vindos do commit de moderação/UI. (Cache atualizado para v1.11.7)
- Inclusão do exemplo de configuração `discloud` para facilitar deploys alternativos.
- Corrigimos largura, altura e aspect ratio do ícone principal para evitar distorções em marketplaces.
- Pequenas correções de bugs, melhorias nas traduções e ajustes de segurança em dependências de runtime.

## Como atualizar
1. Instale ou atualize as extensões para a versão `9.0.5` a partir dos novos VSIX (VS Code, Edge, Chrome, Firefox, Open VSX).
2. Limpe caches do navegador ou reinicie o service worker para carregar os novos assets.
3. Revise integrações automáticas (bots, scripts) para usar os links OAuth2 atualizados e a nova configuração `discloud`, se aplicável.

## Agradecimentos
Obrigado por acompanhar o desenvolvimento contínuo do ErikrafT Drop! Feedbacks sobre a nova versão e as extensões 9.0.5 são muito bem-vindos.

==== 🇺🇸｜English ====

# Release Notes — v1.11.7

## Highlights
- We've updated the ErikrafT Drop extensions to version **9.0.5**, bringing full support for uploading and downloading directly through add-ons.
- We've overhauled the **Open VSX** presence, with a new dedicated client, updated icons, and metadata aligned with the official repository.
- We've adjusted moderation and the user experience on the website/app, with visual refinements and security improvements.
- We've optimized Discord integrations, including OAuth2 links and cleaning up the suspicious domain list.
- Service worker cache bumped so clients get new assets immediately (cache version v1.11.7).

## What's Changed
- VSIX 9.0.5 packages are available in `Extensions/`, replacing old artifacts and updating manifests.
- Service worker, UI, and assets have received style and behavior adjustments from the moderation/UI commit. (cache updated to v1.11.7)
- Added the `discloud` configuration example to facilitate alternative deployments.
- We've fixed the width, height, and aspect ratio of the main icon to prevent distortions in marketplaces.
- Minor bugfixes, translation updates and dependency/security adjustments.

## How to update
1. Install or update extensions to version 9.0.5 from the new VSIX (VS Code, Edge, Chrome, Firefox, Open VSX).
2. Clear browser caches or restart the service worker to load the new assets.
3. Review automatic integrations (bots, scripts) to use the updated OAuth2 links and the new 'discloud' setting, if applicable.

## Thanks
Thank you for following the continued development of ErikrafT Drop! Feedback on the new version and extensions 9.0.5 is very welcome.