# 📚 Índice atual da documentação — ErikrafT Drop™

Este índice aponta para a documentação mantida no estado atual do repositório. Documentos de análise antigos continuam disponíveis como histórico, mas não devem ser usados como instruções de build ou de segurança atuais.

## 🚀 Começar

- [README principal](README.md) — produto, plataformas, downloads e recursos.
- [Documentação oficial](https://docsdrop.erikraft.com/) — guias publicados no site.
- [FAQ](docs/faq.md) — instalação, transferências e dúvidas comuns.
- [Como hospedar sua instância](docs/host-your-own.md) — Docker, Node.js, proxy e TURN.
- [Configuração do servidor](docs/reference/configuration.mdx) — variáveis efetivamente lidas pelo código.

## 🖥️ Desktop, Wine e Winlator

- [Guia atual de desenvolvimento e empacotamento](ELECTRON_DEVELOPMENT_GUIDE.md)
- [Compatibilidade com Wine e Winlator](docs/wine-winlator.md)
- [Configuração do electron-builder](electron-builder.yml)
- [Workflow de empacotamento e releases](.github/workflows/desktop-release.yml)

O executável Windows é x64. Wine e Winlator são ambientes de compatibilidade não certificados; a CI valida a geração dos artefatos, não a execução real nesses ambientes. O release publicado v10.1.7 contém o instalador NSIS, mas não o alvo portátil.

## 🔐 Segurança e arquitetura

- [Política de segurança e divulgação responsável](SECURITY.md)
- [Documentação técnica atual](docs/technical-documentation.md)
- [Arquitetura do servidor de sinalização](docs/architecture/signaling-server.mdx)
- [Arquitetura de failover](docs/failover-architecture.md)
- [Integração Page Agent / LLM](docs/page-agent.md)

## 🧩 Integrações

- [Bot do Discord](Discord/Bot/README.md)
- [Gateway Onion / Tor](onion-gateway/README.md)
- [Cloudflare Worker](cloudflare-worker/README.md)
- [Extensões](Extensions/README.md)
- [CLI](docs/how-to.md)

## 🧪 Desenvolvimento e validação

- Requisitos: Node.js >=22.12.0.
- Instalação reproduzível: npm ci.
- Testes: npm test.
- Linux DEB: npm run package:linux.
- Windows x64: npm run package:windows.

O comando de Windows gera o instalador NSIS e o executável portátil. A execução real em Wine/Winlator deve ser validada separadamente.

## 🗃️ Documentos históricos

Os arquivos abaixo registram análises ou checklists de versões anteriores. Eles foram mantidos para rastreabilidade, mas não são a fonte atual de verdade:

- CHECKLIST_FINAL.md
- ELECTRON_BUILDER_ANALYSIS.md
- ELECTRON_BUILDER_DIFF.md
- ELECTRON_MIGRATION_GUIDE.md
- FINAL_REPORT.md
- README_ELECTRON_FIX.md
- SUMMARY.md

Use sempre os guias atuais listados no início deste índice.

---

**Última revisão:** 2026-11-08  
**Versão do código-fonte consultada:** 10.1.10  
**Último release publicado consultado:** v10.1.7
