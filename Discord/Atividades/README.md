# Atividade do Discord – ErikrafT Drop

Este diretório contém um exemplo mínimo de página HTML que pode ser utilizada como base para publicar uma Atividade personalizada no Discord. A página simplesmente encapsula o site do ErikrafT Drop em um `iframe` e adiciona o parâmetro `client_type=discord-activity` para que o dispositivo seja identificado com o ícone do Discord na interface web.

## Como usar

1. Hospede o conteúdo desta pasta em um domínio acessível pelo Discord (HTTPS obrigatório).
2. No [Portal de Desenvolvedores do Discord](https://discord.com/developers/applications), crie ou selecione um aplicativo e habilite a opção **Activities**.
3. Informe a URL hospedada em `index.html` como *Activity URL*.
4. Publique a atividade para o seu servidor e abra-a diretamente no Discord. O ErikrafT Drop será carregado dentro do cliente.

## Permissões do `iframe`

A tag `iframe` está configurada com as permissões mínimas necessárias:

- `clipboard-write`, `camera` e `microphone` permitem que o Drop acesse recursos do dispositivo se o usuário autorizar.
- `allow-same-origin allow-scripts allow-popups allow-forms` são exigidos para que a aplicação funcione corretamente dentro do sandbox do Discord.

## Personalização

- Ajuste o tema, cores ou logo conforme a identidade do seu servidor.
- Substitua `https://drop.erikraft.com/` por outra instância caso esteja hospedando o ErikrafT Drop em domínio próprio.

## Sincronização dos ícones

Graças ao parâmetro `client_type=discord-activity`, qualquer dispositivo que utilizar esta atividade aparecerá instantaneamente no `public/index.html` com o ícone do Discord, mantendo a experiência consistente entre web, bot e extensão VS Code.
