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
      <meta charset="UTF-8">
      <title>ErikrafT Drop</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
        }
        iframe {
          border: none;
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <iframe src="https://drop.erikraft.com/" allow="clipboard-write camera; microphone; autoplay;"></iframe>
    </body>
    </html>
  `;
}
