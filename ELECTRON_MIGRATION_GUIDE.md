# 🔄 Guia de Migração: Electron Builder 24.x/25.x → 26.x

Para usuários que precisam migrar de versões antigas do Electron Builder.

---

## 🚀 Mudanças Principais entre Versões

### Electron Builder 24.x → 25.x
- ✅ Sem mudanças quebradas no `electron-builder.yml`
- 🎯 Melhorias internas

### Electron Builder 25.x → 26.0
- ⚠️ **MUDANÇA QUEBRADA**: `linux.desktop` reformatada

| Versão | `linux.desktop` | Formato |
|--------|-----------------|---------|
| < 26.0 | Propriedades flat | `Name:`, `Comment:`, etc como chaves diretas |
| ≥ 26.0 | Estrutura aninhada | `entry:` com propriedades aninhadas |

---

## 📋 Checklist de Migração

### Se você tem versão < 26.0:

- [ ] **Passo 1**: Backup do `electron-builder.yml`
  ```bash
  cp electron-builder.yml electron-builder.yml.backup
  ```

- [ ] **Passo 2**: Atualizar package.json
  ```bash
  npm install --save-dev electron-builder@^26.8.1
  ```

- [ ] **Passo 3**: Refatorar `linux.desktop`

  **ANTES**:
  ```yaml
  linux:
    desktop:
      Name: Seu App
      Comment: Descrição
      Icon: seu-app
      Terminal: 'false'
      Type: Application
      Categories: Utility;
  ```

  **DEPOIS**:
  ```yaml
  linux:
    desktop:
      entry:
        Name: Seu App
        Comment: Descrição
        Icon: seu-app
        Terminal: 'false'
        Type: Application
        Categories: Utility;
  ```

- [ ] **Passo 4**: Verificar ícone Windows

  Se usar SVG e construir em Linux:
  ```yaml
  # ❌ Pode falhar em Linux
  win:
    icon: app/icon.svg

  # ✅ Use PNG ou espere Windows
  win:
    icon: app/icon-512x512.png
  ```

- [ ] **Passo 5**: Validar build

  ```bash
  npm run package:linux
  npm run package:windows  # (em Windows ou com Wine)
  ```

---

## 🔍 Detecção de Incompatibilidade

### Script para Verificar seu electron-builder.yml

```javascript
// check-compat.js
const fs = require('fs');
const yaml = require('js-yaml');

const config = yaml.load(fs.readFileSync('electron-builder.yml', 'utf8'));

const issues = [];

// Check 1: linux.desktop properties
if (config.linux?.desktop) {
  const desktop = config.linux.desktop;

  // Se for flat (qualquer chave que não seja 'entry')
  if (!desktop.entry && (desktop.Name || desktop.Comment || desktop.Icon)) {
    issues.push('❌ linux.desktop usa formato antigo (flat)');
    issues.push('   Solução: Aninhe propriedades em linux.desktop.entry');
  }
}

// Check 2: Windows icon formato
if (config.win?.icon?.endsWith('.svg')) {
  issues.push('⚠️  win.icon usa SVG (pode falhar em Linux)');
  issues.push('   Solução: Use PNG ou ICO em vez de SVG');
}

// Check 3: Propriedades removidas
const deprecated = ['proton', 'libui', 'nsis.useUninstaller'];
deprecated.forEach(prop => {
  if (config[prop] !== undefined) {
    issues.push(`❌ Propriedade removida: ${prop}`);
  }
});

if (issues.length === 0) {
  console.log('✅ Configuração compatível com Electron Builder 26.x');
} else {
  console.log('Problemas encontrados:');
  issues.forEach(issue => console.log(issue));
}
```

**Usar**:
```bash
node check-compat.js
```

---

## 🆘 Problemas Comuns Pós-Migração

### Problema 1: "Unknown property 'Name'"

```
electron-builder 26.8.1 has been initialized using a configuration object that
does not match the API schema.
- configuration.linux has an unknown property 'Name'
```

**Solução**:
```yaml
# ❌ ERRADO
linux:
  desktop:
    Name: App

# ✅ CORRETO
linux:
  desktop:
    entry:
      Name: App
```

---

### Problema 2: "wine is required" (Build Windows no Linux)

```
⨯ wine is required, please see
https://electron.build/multi-platform-build#linux
```

**Soluções**:

**Opção A**: Instalar Wine
```bash
sudo apt update
sudo apt install wine wine32 wine64
npm run package:windows
```

**Opção B**: Build em Windows nativo (recomendado)
```bash
# Windows
npm run package:windows
```

**Opção C**: CI/CD com build multi-plataforma
```yaml
# .github/workflows/build.yml
jobs:
  build-linux:
    runs-on: ubuntu-latest
  build-windows:
    runs-on: windows-latest
```

---

### Problema 3: Ícone SVG falha em Linux

```
open : no such file or directory
ConvertIcon: Failed to process SVG
```

**Solução**:

Usar PNG em vez de SVG para Windows:
```yaml
win:
  # ❌ Problema
  icon: public/icon.svg

  # ✅ Solução
  icon: public/icon-512x512.png
```

---

## 📚 Referências Úteis

### Documentação Oficial

- [Electron Builder 26 - Linux](https://www.electron.build/linux)
- [Electron Builder 26 - Windows](https://www.electron.build/win)
- [FreeDesktop Desktop Entry Spec](https://specifications.freedesktop.org/desktop-entry-spec/)

### Exemplos

- [Projeto atual (ErikrafT Drop)](../electron-builder.yml)
- [Comunidade Electron](https://github.com/electron/electron/discussions)

### Ferramentas

```bash
# Validar Desktop Entry Linux
desktop-file-validate /usr/share/applications/seu-app.desktop

# Validar SVG
xmllint --noout seu-icon.svg

# Converter imagens
convert icon.svg icon-512x512.png      # SVG → PNG
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico  # PNG → ICO
```

---

## 🎯 Roadmap Futuro

### Electron Builder 27.0 (Planejado)

- `syncDesktopName` será `true` por padrão
- Suporte para assinatura automática
- Melhorias em notarização macOS

### Sua Ação

```yaml
# Preparar-se para v27
linux:
  syncDesktopName: true    # (Será padrão em v27)
```

---

## ✅ Validação Pós-Migração

Use este checklist depois de atualizar:

- [ ] `npm install` executado
- [ ] `npm run package:linux` bem-sucedido
- [ ] Arquivo .deb criado
- [ ] Instalação do .deb bem-sucedida (`sudo dpkg -i ...`)
- [ ] Aplicativo inicia corretamente
- [ ] Ícone renderiza
- [ ] Desktop Entry validado: `desktop-file-validate`
- [ ] `npm run package:windows` executado (Windows nativo)
- [ ] Arquivo .exe/NSIS criado
- [ ] Instalação Windows bem-sucedida
- [ ] Atalhos criados (Desktop + Menu Iniciar)

---

## 📞 Suporte

Se encontrar problemas:

1. **Consulte a documentação**: https://www.electron.build/
2. **Abra issue**: https://github.com/electron-userland/electron-builder/issues
3. **Comunidade**: Discord da comunidade Electron

---

**Guia de Migração Versão**: 1.0
**Atualizado**: 2026-06-05
**Compatibilidade**: Electron Builder 24.x → 26.x
