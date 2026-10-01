# WebTorrent — status do experimento

O ErikrafT Drop™ não expõe mais o experimento WebTorrent no cliente web.

## Decisão

A auditoria encontrou um caminho experimental em `public/scripts/webtorrent-transfer.js` que:

- era carregado como asset diferido da aplicação;
- dependia de importação dinâmica externa de `esm.sh`;
- dependia de trackers WebSocket externos;
- possuía teste contratual estrutural, mas não um teste ponta a ponta entre dois navegadores;
- adicionava uma superfície de UI de transferência que não fazia parte do transporte P2P principal do Drop.

Sem validação end-to-end reproduzível no CI e sem uma necessidade funcional que justifique manter a dependência externa, o caminho foi removido em vez de ser apresentado como uma transferência confiável.

## Escopo da remoção

A mudança remove somente o experimento WebTorrent e suas referências:

- módulo `public/scripts/webtorrent-transfer.js`;
- teste estrutural `test/webtorrent-transfer.test.js`;
- carregamento diferido no `main.js`;
- pré-cache do módulo no Service Worker;
- comando de teste correspondente no `package.json`.

O transporte P2P existente do ErikrafT Drop™ não é substituído nem alterado por esta decisão.

## Compatibilidade e risco

A remoção elimina a dependência externa do experimento durante a inicialização e evita manter uma UI que não possui validação real de interoperabilidade entre peers.

Magnet URIs e arquivos `.torrent` deixam de ser tratados pela UI experimental do Drop web. Isso é intencional e deve ser considerado antes de reintroduzir a funcionalidade.

## Reintrodução futura

Uma futura implementação deve ser uma Issue/PR separada e somente deve ser reintroduzida após:

1. dependência browser versionada e carregamento resiliente;
2. descoberta de peers WebRTC validada;
3. teste end-to-end entre dois navegadores;
4. materialização e integridade do arquivo validadas;
5. estados de erro, timeout e limpeza de cliente cobertos;
6. fallback que não prejudique o transporte principal;
7. revisão de CSP/offline e compatibilidade de navegadores.

Enquanto esses critérios não forem demonstrados, o ErikrafT Drop™ não anuncia WebTorrent como transporte disponível.
