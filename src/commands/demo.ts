import * as vscode from 'vscode';
import { statusBar } from '../ui';

export async function demo() {
  statusBar.setLoading('Running demo...');
  
  const editor = vscode.window.activeTextEditor;
  const text = editor?.document.getText();
  
  vscode.window.showInformationMessage(
    `Editor: ${editor ? 'Active' : 'None'}, Text: ${text?.length || 0} chars`
  );
  
  const name = await vscode.window.showInputBox({ 
    prompt: 'Enter your name' 
  });
  
  if (name) {
    statusBar.setSuccess(`Demo done: ${name}`);
  } else {
    statusBar.setReady();
  }
}

