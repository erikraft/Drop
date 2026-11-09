# 📚 ErikrafT Drop™ — Documentation Index

This index points to documentation maintained in this repository. Version-specific build results and old migration notes are historical records; they are not proof that the current source or release has been tested on every platform.

## 🚀 Start here

- [Project overview and quick links](README.md)
- [Frequently asked questions](docs/FAQ.md)
- [How to use ErikrafT Drop™](docs/how-to.md)
- [Self-hosting guide](docs/host-your-own.md)
- [Security policy and vulnerability reporting](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## 🖥️ Desktop application

- [Desktop development and packaging](ELECTRON_DEVELOPMENT_GUIDE.md)
- [Wine and Winlator compatibility](docs/wine-winlator.md)
- [Desktop migration notes](ELECTRON_MIGRATION_GUIDE.md)
- [Electron Builder configuration](electron-builder.yml)
- [Historical packaging analysis](ELECTRON_BUILDER_ANALYSIS.md)
- [Historical packaging diff](ELECTRON_BUILDER_DIFF.md)

## 🌐 Web application and infrastructure

- [Technical documentation](docs/technical-documentation.md)
- [Failover architecture](docs/failover-architecture.md)
- [Cloudflare Worker](cloudflare-worker/README.md)
- [Tor/onion gateway](onion-gateway/README.md)
- [PairDrop protocol compatibility](PAIRDROP-COMPATIBILITY.md)
- [ERIKRAFT-QR specification](ERIKRAFT-QR.md)

## 🔌 Integrations and companion clients

- [Browser and IDE extensions](Extensions/README.md)
- [VS Code extension](Extensions/IDE%20Extension/VS%20Code%20Extension/erikraft-drop/README.md)
- [Open VSX extension](Extensions/IDE%20Extension/Open%20VSX%20Registry%20Extension/erikraft-drop/README.md)
- [Discord bot](Discord/Bot/README.md)
- [Discord Activity](Discord/Atividades/README.md)
- [Shortcut integration](Shortcut/README.md)
- [Page Agent](docs/page-agent.md)

## 🧰 Project maintenance

- [Release notes](docs/release-notes.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Partnership information](PARTNERSHIP.md)
- [Final packaging checklist (historical record)](CHECKLIST_FINAL.md)
- [Packaging summary (historical record)](SUMMARY.md)
- [Packaging report (historical record)](FINAL_REPORT.md)
- [Packaging fix notes (historical record)](README_ELECTRON_FIX.md)

## 📝 Documentation conventions

- Relative links are resolved from the directory containing each Markdown file.
- Preserve existing emoji, badges, screenshots, and inline-image markup when editing documentation.
- Image examples such as `<img src="./path/to/image.png" width="20px" style="display:inline;">` are intentional Markdown/HTML content and must remain valid.
- Use fenced code blocks with a language identifier when practical; commands must match current scripts and paths in the repository.
- Do not describe a build, release, runtime test, or security property as verified unless the corresponding CI run, test, or source evidence supports that claim.
