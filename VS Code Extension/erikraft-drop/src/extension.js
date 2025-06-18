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
      message => {
        if (message.command === 'openExternal') {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
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
          src="https://drop.erikraft.com/" 
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
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;
