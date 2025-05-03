const vscode = require('vscode');
const path = require('path');

function activate(context) {
  // Registrar o comando para abrir a visualização
  let disposable = vscode.commands.registerCommand('erikraftDrop.open', function () {
    vscode.commands.executeCommand('workbench.view.extension.erikraftDrop');
  });

  // Registrar o provedor de visualização
  const viewProvider = new ErikrafTDropViewProvider(context.extensionPath);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('erikraftDrop.view', viewProvider)
  );

  context.subscriptions.push(disposable);
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
    const darkIconPath = webview.asWebviewUri(vscode.Uri.file(
      path.join(this.extensionPath, 'images', 'ui-icon-dark.svg')
    ));
    const lightIconPath = webview.asWebviewUri(vscode.Uri.file(
      path.join(this.extensionPath, 'images', 'ui-icon-light.svg')
    ));

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
            height: calc(100% - 40px);
            max-width: 400px;
            margin: 0 auto;
            display: block;
          }
          .icon-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
          }
          .icon-container img {
            max-width: 80px;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="icon-container">
          <picture>
            <source srcset="${darkIconPath}" media="(prefers-color-scheme: dark)" />
            <img src="${lightIconPath}" alt="ErikrafT Drop Icon" />
          </picture>
        </div>

        <iframe 
          src="https://drop.erikraft.com/" 
          allow="clipboard-write; camera; microphone; autoplay;"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        ></iframe>
      </body>
      </html>
    `;
  }
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;
