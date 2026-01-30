const vscode = require('vscode');
const path = require('path');

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
    const uris = items
      .filter(item => typeof item?.url === 'string')
      .map(item => vscode.Uri.parse(item.url));

    if (uris.length === 0) {
      return;
    }

    for (const uri of uris) {
      try {
        await vscode.env.openExternal(uri);
      } catch (error) {
        console.error('Falha ao abrir download:', error);
      }
    }
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
