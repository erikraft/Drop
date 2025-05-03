const vscode = require('vscode');

function activate(context) {
  let disposable = vscode.commands.registerCommand('erikraftDrop.open', function () {
    const panel = vscode.window.createWebviewPanel(
      'erikraftDrop',
      'ErikrafT Drop',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    panel.webview.html = getWebviewContent();
  });

  context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;

function getWebviewContent() {
  return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8" />
      <title>ErikrafT Drop</title>
      <style>
        html, body {
          padding: 0;
          margin: 0;
          height: 100%;
          width: 100%;
          background-color: #fff;
        }
        iframe {
          border: none;
          width: 100%;
          height: 100%;
        }
        picture {
          display: block;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <!-- Ícone para temas claro e escuro -->
      <picture>
        <source srcset="images/ui-icon-dark.svg" media="(prefers-color-scheme: dark)" />
        <img src="images/ui-icon-light.svg" alt="ErikrafT Drop Icon" width="120" />
      </picture>

      <!-- GIFs para o README.md -->
      <div style="text-align: center; padding: 20px;">
        <img src="images/screenshot1.gif" alt="Demo 1" width="300"/>
        <img src="images/screenshot2.gif" alt="Demo 2" width="300"/>
      </div>

      <iframe src="https://drop.erikraft.com/" allow="clipboard-write; camera; microphone; autoplay;"></iframe>
    </body>
    </html>
  `;
}
