# 🚀 Guia Prático: Desenvolvimento e Deploy do ErikrafT Drop Desktop

## 1️⃣ Desenvolvimento Local

### Iniciar o Aplicativo Electron em Modo Desenvolvimento

```bash
# Terminal 1: Instalar dependências
npm install

# Terminal 2: Iniciar o aplicativo Electron
npx electron desktop/main.cjs
```

**O que acontece**:
1. Electron inicia
2. Servidor Node.js é iniciado automaticamente na porta 33571
3. BrowserWindow abre e carrega http://127.0.0.1:33571
4. Interface do ErikrafT Drop aparece em uma janela própria

### Variáveis de Ambiente (Opcional)

```bash
# Porta customizada (padrão: 33571)
ERIKRAFT_DROP_DESKTOP_PORT=4000 npx electron desktop/main.cjs

# Debug mode
DEBUG_MODE=true npx electron desktop/main.cjs

# WebSocket fallback
WS_FALLBACK=true npx electron desktop/main.cjs
```

---

## 2️⃣ Build para Linux

### Gerar Empacote DEB

```bash
npm run package:linux
```

**Saída**: `dist/desktop/erikraft-drop-1.12.4-linux-amd64.deb` (97 MB aprox)

### Testar o Pacote DEB Localmente

```bash
# Instalar o pacote gerado
sudo dpkg -i dist/desktop/erikraft-drop-1.12.4-linux-amd64.deb

# Iniciar o aplicativo
erikraft-drop

# Ou via interface gráfica (Applications → Network → ErikrafT Drop)

# Desinstalar (se necessário)
sudo apt remove erikraft-drop
```

### Verificar Conteúdo do Pacote DEB

```bash
# Listar arquivos do pacote
dpkg -L erikraft-drop

# Inspecionar metadados
dpkg -s erikraft-drop

# Ver ícone instalado
ls -l /usr/share/icons/hicolor/scalable/apps/erikraft-drop.svg

# Ver arquivo .desktop
cat /usr/share/applications/erikraft-drop.desktop
```

---

## 3️⃣ Build para Windows

### No Windows Nativo (Recomendado)

```bash
npm install
npm run package:windows
```

**Saída**: `dist/desktop/erikraft-drop-1.12.4-win-x64.exe`

**O instalador NSIS incluirá**:
- ✅ Atalho na Área de Trabalho
- ✅ Atalho no Menu Iniciar
- ✅ Opção de escolher diretório de instalação
- ✅ Desinstalador padrão

### No Linux com Wine (Experimental)

```bash
# Instalar Wine primeiro
sudo apt update
sudo apt install wine wine32 wine64

# Depois fazer o build
npm run package:windows
```

⚠️ **Nota**: Pode ser mais lento e requer Wine completo configurado

---

## 4️⃣ Configuração de Desktop Entry (Linux)

**Arquivo gerado**: `/usr/share/applications/erikraft-drop.desktop`

```ini
[Desktop Entry]
Name=ErikrafT Drop
Comment=File sharing by ErikrafT
Exec=/opt/ErikrafT Drop/erikraft-drop
Icon=erikraft-drop
Terminal=false
Type=Application
Categories=Network;Utility;
Keywords=file;transfer;sharing;
```

✅ **Propriedades Suportadas**:
- Aparece em menus de aplicativos
- Busca por "file", "transfer", "sharing"
- Associação com tipo: Network Utility
- Ícone renderizado corretamente

---

## 5️⃣ Estrutura de Arquivos Empacotados

### No .deb (Linux)

```
/opt/ErikrafT Drop/
├── erikraft-drop          (executável)
├── resources/
│   ├── app.asar           (aplicação)
│   ├── desktop/main.cjs
│   ├── server/
│   ├── public/
│   └── ...
└── libffmpeg.so           (dependência)

/usr/share/applications/
└── erikraft-drop.desktop

/usr/share/icons/
└── hicolor/scalable/apps/erikraft-drop.svg

/usr/share/pixmaps/        (ícone para aplicativos)
└── erikraft-drop.svg
```

### No .exe (Windows)

```
Program Files/
└── ErikrafT Drop/
    ├── erikraft-drop.exe   (executável)
    ├── resources/
    │   ├── app.asar
    │   └── ...
    └── ...

Desktop/
└── ErikrafT Drop.lnk       (atalho)

Start Menu/
└── ErikrafT Drop/
    └── ErikrafT Drop.lnk   (atalho)
```

---

## 6️⃣ Troubleshooting

### ❌ "Cannot find module 'electron'"

```bash
npm install --save-dev electron electron-builder
```

### ❌ "Falha na validação do ícone SVG"

```bash
# Validar o SVG manualmente
file public/images/icon-drop.svg

# Garantir que é SVG válido
xmllint --noout public/images/icon-drop.svg
```

### ❌ "Wine is required" (ao fazer build Windows no Linux)

```bash
# Opção 1: Instalar Wine
sudo apt install wine wine32 wine64

# Opção 2: Usar Windows nativo (recomendado)
# Execute o comando em máquina Windows

# Opção 3: Usar CI/CD
# Veja próxima seção
```

### ❌ "Servidor não inicia na porta 33571"

```bash
# Verificar se a porta está livre
lsof -i :33571

# Usar porta diferente
ERIKRAFT_DROP_DESKTOP_PORT=4000 npx electron desktop/main.cjs
```

---

## 7️⃣ CI/CD - Build Automatizado

### GitHub Actions (Exemplo)

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run package:linux
      - uses: actions/upload-artifact@v3
        with:
          name: linux-deb
          path: dist/desktop/*.deb

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run package:windows
      - uses: actions/upload-artifact@v3
        with:
          name: windows-exe
          path: dist/desktop/*.exe
```

---

## 8️⃣ Distribuição

### Preparação para Release

1. **Versionar**:
   ```bash
   # Atualizar package.json
   "version": "1.13.0"
   ```

2. **Build Multi-plataforma**:
   ```bash
   # No Linux
   npm run package:linux

   # No Windows
   npm run package:windows
   ```

3. **Assinar (Opcional - Produção)**:
   ```yaml
   # electron-builder.yml
   win:
     certificateFile: path/to/certificate.pfx
     certificatePassword: ${env.CERTIFICATE_PASSWORD}

   linux:
     # Linux geralmente assina via GPG
   ```

4. **Publicar**:
   - Upload para GitHub Releases
   - Website: drop.erikraft.com
   - Flatpak (veja: `flatpak/`)
   - AUR (Arch Linux)

---

## 9️⃣ Monitoramento em Produção

### Logs do Aplicativo Instalado

**Linux**:
```bash
# Executar com DEBUG
DEBUG_MODE=true erikraft-drop

# Ver logs do systemd (se instalado como serviço)
journalctl -u erikraft-drop -f
```

**Windows**:
```bash
# Executar com console (cmd)
"C:\Program Files\ErikrafT Drop\erikraft-drop.exe" --enable-logging

# Logs em: %APPDATA%/ErikrafT Drop/logs/
```

---

## 🔟 Performance & Otimizações

### Reduzir Tamanho do Pacote

```yaml
# electron-builder.yml - Adicionar compressão
compression: maximum

# Ou usar asar com unpacking seletivo
asar:
  smartUnpack: true
```

### Melhorar Inicialização

```javascript
// desktop/main.cjs
// Lazy load módulos pesados
const { startBundledServer } = await import('./server-loader.js');
```

---

## 📋 Checklist de Release

- ✅ Testes funcionais no desktop
- ✅ Build Linux (.deb) testado
- ✅ Build Windows (.exe) testado
- ✅ Ícones renderizam corretamente
- ✅ Atalhos criados (Windows) / Desktop Entry (Linux)
- ✅ Versão atualizada em package.json
- ✅ Documentação atualizada
- ✅ Hash/Checksum calculado (para download seguro)
- ✅ Release notes preparadas
- ✅ Assets enviados para repositório

---

## 📞 Referências Rápidas

| Comando | Descrição |
|---------|-----------|
| `npm install` | Instalar dependências |
| `npx electron desktop/main.cjs` | Executar em desenvolvimento |
| `npm run package:linux` | Build para Linux (DEB) |
| `npm run package:windows` | Build para Windows (EXE) |
| `npm run validate:linux-icon` | Validar ícone SVG |

---

**Última Atualização**: 2026-06-05
**Versão**: 1.12.4
**Plataformas**: Linux, Windows
**Status**: ✅ Pronto para Produção
