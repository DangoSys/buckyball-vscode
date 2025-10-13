import * as vscode from 'vscode';

class StatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.text = "BBDev Ready";
    this.item.show();
  }

  setText(text: string) {
    this.item.text = text;
  }

  setLoading(message: string = "Loading...") {
    this.item.text = `$(sync~spin) ${message}`;
  }

  setReady() {
    this.item.text = "BBDev Ready";
  }

  setSuccess(message: string) {
    this.item.text = `$(check) ${message}`;
  }

  dispose() {
    this.item.dispose();
  }

  getItem(): vscode.StatusBarItem {
    return this.item;
  }
}

export const statusBar = new StatusBar();

