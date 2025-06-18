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

  resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.extensionPath, 'images')),
        vscode.Uri.file(path.join(this.extensionPath, 'media'))
      ]
    };

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);
    // Listen for messages from the webview
    handleWebviewMessages(webviewView.webview);
  }
}

// Função para lidar com mensagens do webview
function handleWebviewMessages(webview) {
  webview.onDidReceiveMessage(async (message) => {
    if (message && message.type && message.url) {
      if (message.type === 'external-link' || message.type === 'download') {
        try {
          await vscode.env.openExternal(vscode.Uri.parse(message.url));
        } catch (err) {
          vscode.window.showErrorMessage('Não foi possível abrir o link externo: ' + message.url);
        }
      }
    }
  });
}


  getWebviewContent(webview) {
    return `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src ${webview.cspSource}; frame-src https://drop.erikraft.com;">
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
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
        <script>
          const vscode = acquireVsCodeApi();

          // Listen for messages coming from any embedded iframe (cross-origin)
          window.addEventListener('message', (event) => {
            if (event.data && (event.data.type === 'external-link' || event.data.type === 'download')) {
              vscode.postMessage(event.data);
            }
          });

          // Intercept clicks inside the webview itself
          document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (link && link.href.startsWith('http')) {
              event.preventDefault();
              vscode.postMessage({ type: 'external-link', url: link.href });
              return;
            }
            const downloadLink = event.target.closest('a[download]');
            if (downloadLink) {
              event.preventDefault();
              vscode.postMessage({ type: 'download', url: downloadLink.href });
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;
