import * as vscode from 'vscode';
import { statusBar } from '../ui';

export async function showInput() {
  const name = await vscode.window.showInputBox({ 
    prompt: 'Enter your name',
    placeHolder: 'Your name here...'
  });
  
  if (name) {
    vscode.window.showInformationMessage(`Hello, ${name}!`);
    statusBar.setText(`Hello ${name}`);
  }
}

