# 🚀 Guia de desenvolvimento e empacotamento — ErikrafT Drop™ Desktop

Este documento descreve o wrapper Electron e os artefatos que o repositório realmente gera. O aplicativo desktop carrega a instância web selecionada; ele **não inicia um servidor Node.js local na porta 33571** e não transforma o serviço remoto em um aplicativo offline.

## 1. Requisitos

- Node.js >=22.12.0 (a CI de release usa Node.js 22.23.4).
- npm.
- Windows para o build Windows recomendado; Linux para o pacote DEB.
- Wine é necessário em alguns cenários de build Windows a partir do Linux, mas isso é diferente de executar o .exe com Wine.

Instale dependências com npm ci e execute o wrapper em desenvolvimento com npx electron desktop/main.cjs.

Na primeira execução, o seletor permite escolher o servidor. O endereço padrão é a instância oficial. O Electron usa contextIsolation, sandbox e nodeIntegration: false; permissões de mídia são concedidas somente à origem selecionada.

## 2. Build Linux

Execute npm run package:linux.

Saída configurada: dist/desktop/erikraft-drop-linux-amd64.deb.

A validação do ícone Linux é executada antes do empacotamento.

## 3. Build Windows x64

Em Windows nativo, execute npm ci e npm run package:windows.

O script prepara o runtime WinSparkle e executa Electron Builder 27.0.0-alpha.9. São esperados dois artefatos:

- erikraft-drop-10.1.10-win-x64.exe — instalador NSIS.
- erikraft-drop-10.1.10-win-x64-portable.exe — executável portátil.

Os nomes incluem a versão definida em package.json; substitua 10.1.10 quando a versão do projeto mudar.

O instalador NSIS mantém atalhos, desinstalador e integração com o atualizador WinSparkle. A variante portátil não depende do fluxo de instalação NSIS e desativa o atualizador nativo.

## 4. Wine (Linux) e Winlator (Android)

### Wine

Crie um prefixo Windows de 64 bits com WINEARCH=win64 e WINEPREFIX="$HOME/.wine-erikraft-drop", executando wineboot --init.

Execute preferencialmente o artefato portátil com Wine, dentro desse prefixo.

O aplicativo reconhece marcadores comuns do Wine (WINEPREFIX, WINELOADERNOEXEC, WINEDLLPATH, WINEDEBUG e WINEARCH) e evita inicializar o WinSparkle nativo. Se o ambiente não propagar esses marcadores, defina ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1.

Isso desativa apenas o atualizador WinSparkle; não desativa transferências nem a aplicação principal.

### Winlator

1. Crie um container Windows x64 compatível com a versão do Winlator e com a camada de tradução disponível no dispositivo.
2. Copie o executável portátil x64 para uma pasta acessível dentro do container.
3. Execute-o pelo Winlator ou crie um atalho.
4. Se necessário, defina ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1 nas variáveis de ambiente do container.

O binário não é APK nem ARM nativo. Compatibilidade de GPU, áudio, câmera, microfone, clipboard, WebRTC e rede depende do dispositivo e da configuração do Winlator.

**Importante sobre os downloads:** o último release publicado consultado é v10.1.7 e contém o instalador NSIS, mas não o executável portátil. O alvo portátil existe na configuração atual e é validado pelo workflow de release; confira os assets do release antes de tentar baixá-lo. Consulte também docs/wine-winlator.md.

## 5. CI/CD e releases

O workflow .github/workflows/desktop-release.yml:

- constrói o DEB em runner Linux;
- constrói o instalador e o executável portátil em runner Windows;
- valida que os arquivos foram gerados;
- publica os artefatos em releases quando executado por uma tag v*.*.*;
- gera o appcast assinado do WinSparkle quando o segredo WINSPARKLE_ED25519_PRIVATE_KEY está configurado.

A CI de empacotamento **não executa Wine nem Winlator**. Ela comprova a geração dos artefatos em runners nativos, não a compatibilidade em cada ambiente de terceiros.

## 6. Testes

Execute a suíte do repositório com npm test.

Antes de publicar uma versão, valide manualmente o instalador e o executável portátil em Windows x64. Testes de Wine/Winlator devem ser registrados separadamente, com a versão do Wine/Winlator, arquitetura, dispositivo e resultado.

## 7. Troubleshooting

- **O build Windows no Linux informa que Wine é necessário:** instale uma versão compatível do Wine ou use um runner Windows.
- **O .exe abre, mas a janela fica em branco:** teste --disable-gpu no atalho; isso pode reduzir desempenho.
- **WinSparkle falha em Wine/Winlator:** use o executável portátil ou defina ERIKRAFT_DROP_COMPATIBILITY_RUNTIME=1.
- **A câmera/microfone não funciona:** verifique o passthrough de dispositivos e as permissões do ambiente de compatibilidade.
- **WebRTC não conecta:** verifique a rede, firewall e disponibilidade do servidor; o wrapper Electron não substitui o servidor de sinalização.

## 8. Versões

- Versão do código-fonte consultada neste guia: 10.1.10.
- Último release publicado consultado: v10.1.7 (2026-10-07).
- A versão do código-fonte não deve ser apresentada como release publicado até existir uma tag e seus assets no GitHub Releases.
