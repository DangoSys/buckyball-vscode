import * as vscode from 'vscode';
import { statusBar } from './ui';
import * as commands from './commands';
import { TreeViewProvider, openWebview } from './views';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "bbdev" is now active!');

  // Initialize status bar
  context.subscriptions.push(statusBar.getItem());

  // Register TreeView in sidebar
  const treeViewProvider = new TreeViewProvider();
  vscode.window.registerTreeDataProvider('bbdevTreeView', treeViewProvider);

  // Register all commands
  const cmdList = [
    { id: 'bbdev.helloWorld', handler: commands.helloWorld },
    { id: 'bbdev.getText', handler: commands.getText },
    { id: 'bbdev.showInput', handler: commands.showInput },
    { id: 'bbdev.demo', handler: commands.demo },
    { id: 'bbdev.openWebview', handler: () => openWebview(context) },
    { id: 'bbdev.refreshTreeView', handler: () => treeViewProvider.refresh() }
  ];

  cmdList.forEach(cmd => {
    const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
    context.subscriptions.push(disposable);
  });
}

// This method is called when your extension is deactivated
export function deactivate() {
  statusBar.dispose();
}
