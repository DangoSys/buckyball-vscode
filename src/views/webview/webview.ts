import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';
import { ConfigManager } from './configManager';
import { ApiClient } from './apiClient';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

let currentPanel: vscode.WebviewPanel | undefined;

export function openWebview(context: vscode.ExtensionContext) {
  // 如果已有面板，直接显示
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'bbdevAIChat',
    'AI Chat Assistant',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: []
    }
  );

  currentPanel = panel;

  // 面板关闭时清理引用
  panel.onDidDispose(() => {
    currentPanel = undefined;
  }, null, context.subscriptions);

  panel.webview.html = getWebviewContent();

  // 接收来自 webview 的消息
  panel.webview.onDidReceiveMessage(
    async (message: any) => {
      switch (message.command) {
        case 'getConfig':
          await ConfigManager.handleGetConfig(panel);
          break;
        case 'saveConfig':
          await ConfigManager.handleSaveConfig(context, message.data);
          break;
        case 'sendMessage':
          await ApiClient.handleSendMessage(panel, context, message.data);
          break;
        case 'showError':
          vscode.window.showErrorMessage(message.text);
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  // 发送初始配置
  setTimeout(() => {
    ConfigManager.handleGetConfig(panel);
  }, 100);
}

