import * as vscode from 'vscode';

/**
 * Output Channel Manager - 输出面板管理
 */
class OutputChannelManager {
  private channel: vscode.OutputChannel;

  constructor(name: string = 'BBDev') {
    this.channel = vscode.window.createOutputChannel(name);
  }

  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.channel.appendLine(`[${timestamp}] ${message}`);
  }

  info(message: string) {
    this.log(`ℹ️ INFO: ${message}`);
  }

  warn(message: string) {
    this.log(`⚠️ WARN: ${message}`);
  }

  error(message: string) {
    this.log(`❌ ERROR: ${message}`);
  }

  success(message: string) {
    this.log(`✅ SUCCESS: ${message}`);
  }

  show() {
    this.channel.show();
  }

  hide() {
    this.channel.hide();
  }

  clear() {
    this.channel.clear();
  }

  dispose() {
    this.channel.dispose();
  }
}

export const outputChannel = new OutputChannelManager();

