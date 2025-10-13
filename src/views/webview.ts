import * as vscode from 'vscode';

export function openWebview(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'bbdevWebview',
    'BBDev Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = getWebviewContent();

  // 接收来自 webview 的消息
  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'alert':
          vscode.window.showInformationMessage(message.text);
          return;
      }
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BBDev Dashboard</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
    }
    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      margin: 10px 0;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    h1 { color: var(--vscode-titleBar-activeForeground); }
    .status { 
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #0f0;
      margin-right: 5px;
    }
  </style>
</head>
<body>
  <h1>🎯 BBDev Dashboard</h1>
  
  <div class="card">
    <h2>Build Status</h2>
    <p><span class="status"></span> All systems operational</p>
    <button onclick="sendMessage('Build started!')">Start Build</button>
    <button onclick="sendMessage('Tests running...')">Run Tests</button>
  </div>

  <div class="card">
    <h2>Quick Actions</h2>
    <button onclick="sendMessage('Opening terminal...')">Open Terminal</button>
    <button onclick="sendMessage('Cleaning build...')">Clean Build</button>
  </div>

  <div class="card">
    <h2>Statistics</h2>
    <p>Total builds: <strong>42</strong></p>
    <p>Success rate: <strong>95%</strong></p>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function sendMessage(text) {
      vscode.postMessage({
        command: 'alert',
        text: text
      });
    }
  </script>
</body>
</html>`;
}

