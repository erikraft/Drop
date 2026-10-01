# Page Agent no ErikrafT Drop™

O ErikrafT Drop™ integra opcionalmente o **Page Agent / Page Agent Ext**, projeto open source sob licença MIT.

- Oficial: https://alibaba.github.io/page-agent/
- Repositório: https://github.com/alibaba/page-agent
- Extensão Chrome: https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj
- Versão CDN usada nos atalhos de avaliação: **1.12.4**

## Onde funciona

A integração de IA é intencionalmente habilitada somente em ambientes desktop com ponteiro preciso: Windows, Linux, macOS e navegadores desktop. O Android/iOS/mobile não recebe os controles de IA.

O Electron do ErikrafT Drop™ carrega a mesma aplicação web localmente, portanto a integração é reaproveitada no aplicativo desktop sem criar um segundo motor de IA.

## Page Agent Ext

O caminho principal é a API autorizada da extensão através de `window.PAGE_AGENT_EXT`. O Page Agent Ext exige um token de autorização que o usuário deve copiar do painel da extensão e fornecer ao site. O ErikrafT Drop™ não gera nem descobre esse token.

A extensão pode controlar páginas e múltiplas abas; por isso as ações do Drop são deliberadamente restritas ao campo de texto/código marcado pelo próprio Drop e instruem o agente a não enviar, submeter ou alterar outros controles.

## Ações rápidas

Nos campos de WebChat e de mensagem iniciada pelo clique direito:

- Melhorar texto
- Corrigir texto
- Ajustar texto
- Corrigir/revisar código
- Instrução personalizada

O resultado fica no campo para revisão humana. O ErikrafT Drop™ não envia a mensagem automaticamente.

## Configuração LLM

A integração pede:

- endpoint compatível com a API OpenAI;
- modelo com suporte a tool calls;
- API key, quando o provedor exigir;
- token do Page Agent Ext.

Endpoint e modelo ficam em `localStorage`; a API key informada pelo Drop fica somente em `sessionStorage`. O usuário também pode usar um endpoint local como Ollama/LM Studio.

Nunca coloque uma chave LLM no código-fonte.

## CDN de avaliação

O menu também oferece os dois caminhos solicitados:

- jsDelivr: `https://cdn.jsdelivr.net/npm/page-agent@1.12.4/dist/iife/page-agent.demo.js`
- npmmirror: `https://registry.npmmirror.com/page-agent/1.12.4/files/dist/iife/page-agent.demo.js`

Esses bundles demo usam a API de teste do Page Agent e devem ser tratados somente como **avaliação técnica/R&D**, nunca como backend de produção. Não envie PII, dados financeiros, médicos, confidenciais ou outros dados sensíveis ao usar essa opção.

## Privacidade

O Page Agent é client-side/BYOK. Quando uma tarefa é iniciada, as instruções e uma representação simplificada da página podem ser enviadas ao endpoint LLM configurado pelo usuário. A política do provedor escolhido também se aplica.

## Créditos

O ErikrafT Drop™ credita o projeto **Alibaba Page Agent**, seus mantenedores e o repositório oficial. A integração não reivindica autoria do Page Agent.

## Licença

A integração usa o Page Agent como software MIT-licensed. Os avisos e créditos do projeto original devem ser preservados quando componentes do projeto forem redistribuídos.
