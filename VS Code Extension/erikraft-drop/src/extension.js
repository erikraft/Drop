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
          // Handle external links from iframe
          window.addEventListener('message', (event) => {
            if (event.data.type === 'external-link') {
              parent.postMessage({ type: 'open-link', url: event.data.url }, '*');
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
