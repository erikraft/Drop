const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const https = require('https');

function activate(context) {
  // Registrar o provedor de visualização
  const viewProvider = new ErikrafTDropViewProvider(context.extensionPath);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('erikraftDrop.view', viewProvider)
  );
}

class ErikrafTDropViewProvider {
  constructor(extensionPath) {
    this.extensionPath = extensionPath;
  }

  resolveWebviewView(webviewView, context, token) {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.extensionPath, 'images')),
        vscode.Uri.file(path.join(this.extensionPath, 'media'))
      ]
    };

    // Adicionar listener para mensagens do webview
    webviewView.webview.onDidReceiveMessage(
      async message => {
        if (message.command === 'openExternal' && message.url) {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }

        if (message.command === 'downloadFiles' && Array.isArray(message.items)) {
          await this._handleDownload(message.items);
        }

        if (message.command === 'requestUpload') {
          await this._handleUpload();
        }
      },
      null,
      context.subscriptions
    );

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);
  }

  getWebviewContent(webview) {
    return `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; frame-src https://drop.erikraft.com/">
        <title>ErikrafT Drop</title>
        <style>
          html, body {
            padding: 0;
            margin: 0;
            height: 100%;
            width: 100%;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          iframe {
            border: none;
            width: 100%;
            height: 100%;
            max-width: 400px;
            margin: 0;
            display: block;
            position: fixed;
            left: 0;
            top: 0;
          }
        </style>
      </head>
      <body>
        <iframe
          src="https://drop.erikraft.com/?client_type=open-vsx-registry-extension"
          width="390"
          height="844"
          style="border: none; border-radius: 16px;"
          allow="clipboard-write; camera; microphone; autoplay;"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
        ></iframe>
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            const iframe = document.querySelector('iframe');

            window.addEventListener('message', event => {
              if (!event.data || typeof event.data !== 'object') {
                return;
              }

              const { type, payload } = event.data;

              if (type === 'download-files') {
                vscode.postMessage({ command: 'downloadFiles', items: payload });
              }

              if (type === 'request-upload') {
                vscode.postMessage({ command: 'requestUpload' });
              }

              if (type === 'link-open' && payload?.url) {
                vscode.postMessage({ command: 'openExternal', url: payload.url });
              }

              if (type === 'upload-result') {
                iframe.contentWindow.postMessage({ type: 'upload-result', payload }, '*');
              }
            });

            function postToIframe(message) {
              if (!iframe || !iframe.contentWindow) {
                return;
              }
              iframe.contentWindow.postMessage(message, '*');
            }

            function setupLinkHandler() {
              try {
                const iframeWindow = iframe.contentWindow;
                const iframeDocument = iframeWindow.document;

                // Função para abrir link externo
                function openExternalLink(url) {
                  vscode.postMessage({
                    command: 'openExternal',
                    url: url
                  });
                }

              // Injetar tipo de cliente para detecção na UI
              window.erikraftClientType = 'vs-code-extension';

              // Sobrescrever o comportamento padrão de links
              iframeWindow.addEventListener('click', function(e) {
                  const link = e.target.closest('a');
                  if (link && link.href && link.href.startsWith('http')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openExternalLink(link.href);
                  }
                }, true);

                // Sobrescrever window.open
                iframeWindow.open = function(url) {
                  if (url && url.startsWith('http')) {
                    openExternalLink(url);
                    return null;
                  }
                  return window.open.apply(this, arguments);
                };

                // Sobrescrever location.href
                Object.defineProperty(iframeWindow.location, 'href', {
                  set: function(url) {
                    if (url && url.startsWith('http')) {
                      openExternalLink(url);
                    } else {
                      iframeWindow.location = url;
                    }
                  }
                });

                // Intercept download intents emitted by the app
                iframeWindow.addEventListener('drop-download', event => {
                  if (!event.detail) return;
                  vscode.postMessage({ command: 'downloadFiles', items: event.detail });
                });

                iframeWindow.addEventListener('request-upload', () => {
                  vscode.postMessage({ command: 'requestUpload' });
                });

              } catch (error) {
                console.error('Erro ao configurar handler de links:', error);
              }
            }

            // Tentar configurar o handler quando o iframe carregar
            iframe.addEventListener('load', function() {
              setupLinkHandler();
              // Tentar novamente após um delay para garantir que o conteúdo esteja carregado
              setTimeout(setupLinkHandler, 1000);
            });

            // Backup: tentar configurar periodicamente
            let attempts = 0;
            const interval = setInterval(function() {
              if (attempts < 5) {
                setupLinkHandler();
                attempts++;
              } else {
                clearInterval(interval);
              }
            }, 1000);
          })();
        </script>
      </body>
      </html>
    `;
  }

  async _handleDownload(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return;
    }

    for (const item of items) {
      // Suporte a download via Base64 (buffer) ou URL direta
      if (!item.url && !item.data) continue;

      try {
        const defaultName = item.name || 'download';
        const defaultUri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', defaultName));

        const saveUri = await vscode.window.showSaveDialog({
          defaultUri,
          saveLabel: 'Salvar Download'
        });

        if (saveUri) {
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Baixando ${defaultName}...`,
            cancellable: false
          }, async () => {
            if (item.data) {
              // Download via Base64 data injection
              await this.saveFileFromBase64(item.data, saveUri.fsPath);
            } else if (item.url) {
              // Legacy / URL download
              await this.downloadFile(item.url, saveUri.fsPath);
            }
          });
          vscode.window.showInformationMessage(`Arquivo salvo com sucesso: ${path.basename(saveUri.fsPath)}`);
        }
      } catch (error) {
        console.error('Erro no download:', error);
        vscode.window.showErrorMessage(`Falha ao baixar arquivo: ${error.message}`);
      }
    }
  }

  saveFileFromBase64(base64Data, destPath) {
    return new Promise((resolve, reject) => {
      try {
        const MAX_VSCODE_DOWNLOAD_SIZE = 50 * 1024 * 1024; // 50MB
        // Estimate size from Base64 length
        const estimatedSize = (base64Data.length * 3) / 4;
        if (estimatedSize > MAX_VSCODE_DOWNLOAD_SIZE) {
          reject(new Error("File too large for VS Code extension (Max 50MB)."));
          return;
        }

        // Remove header se existir (e.g. "data:application/zip;base64,")
        const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const buffer = Buffer.from(base64Content, 'base64');
        fs.writeFile(destPath, buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Falha na requisição. Status Code: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => { });
        reject(err);
      });
    });
  }

  async _handleUpload() {
    try {
      const files = await vscode.window.showOpenDialog({
        canSelectMany: true,
        openLabel: 'Enviar com ErikrafT Drop'
      });

      if (!files) {
        return;
      }

      this.webviewView?.webview?.postMessage({
        command: 'uploadResult',
        items: files.map(file => ({
          name: file.fsPath.split(/\\/).pop(),
          uri: file.toString()
        }))
      });
    } catch (error) {
      console.error('Falha ao selecionar arquivos:', error);
      this.webviewView?.webview?.postMessage({ command: 'uploadResult', items: [] });
    }
  }
}

exports.activate = activate;

function deactivate() { }

exports.deactivate = deactivate;
