# Page Agent no ErikrafT Drop™

O Page Agent é uma integração opcional de automação assistida por IA. Ele não é necessário para descobrir dispositivos nem para transferir arquivos.

## Onde funciona

A integração é disponibilizada pela interface web do ErikrafT Drop™. O comportamento final depende do navegador, do provedor/modelo configurado e da biblioteca Page Agent externa.

## Page Agent Ext

A extensão complementar pode fornecer autenticação e recursos adicionais ao Page Agent. O token de autenticação da extensão é mantido no armazenamento local do navegador. Não compartilhe esse token em capturas de tela, logs ou mensagens de suporte.

## Ações rápidas

O ErikrafT Drop™ fornece atalhos e controles de interface para iniciar a integração. A execução de ações e a interpretação do conteúdo da página são feitas pela biblioteca/agente externo, não pelo servidor de transferência do Drop.

## Configuração LLM

A configuração do modelo e da chave de API é feita pelo usuário no fluxo do Page Agent. A chave de sessão usada pelo código do Drop permanece em memória durante a sessão e não é gravada pelo Drop em uma tabela ou banco de dados.

Verifique as políticas de retenção, privacidade, faturamento e uso de dados do provedor de IA escolhido. O custo do modelo é responsabilidade da conta/provedor configurado pelo usuário.

## CDN e cadeia de fornecimento

A integração carrega a biblioteca Page Agent de um CDN externo e possui uma origem alternativa. Esse código é executado no contexto da página do Drop e, por isso, deve ser tratado como uma dependência de terceiros com acesso à interface e ao armazenamento do navegador.

Use a integração somente quando confiar na biblioteca e no provedor. Não cole chaves permanentes ou credenciais que não devam ficar acessíveis a scripts executados na página.

## Prompt injection e permissões

Páginas externas podem conter instruções maliciosas destinadas a influenciar agentes de IA. Revise as ações sugeridas antes de permitir que o agente clique, navegue, envie conteúdo ou altere dados em páginas externas. O repositório do Drop não controla o modelo remoto nem comprova os mecanismos internos de proteção contra prompt injection da biblioteca Page Agent.

## Privacidade

O uso do Page Agent é opcional. O servidor de transferência do Drop não recebe automaticamente o conteúdo de todas as páginas visitadas pelo usuário; o que o agente lê ou envia depende da biblioteca, do modelo e das ações autorizadas na sessão.

## Créditos e licença

Consulte a licença e a documentação oficiais do Page Agent e da extensão complementar antes de redistribuir ou modificar esses componentes.
