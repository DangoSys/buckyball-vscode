import * as vscode from 'vscode';

export function getText() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found!');
    return;
  }
  
  const text = editor.document.getText();
  vscode.window.showInformationMessage(`Text length: ${text.length} characters`);
  console.log('Current file text:', text.substring(0, 100) + '...');
}

