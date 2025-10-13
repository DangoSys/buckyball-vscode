import * as vscode from 'vscode';

export class ApiClient {
  static async handleSendMessage(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, data: any) {
    const config = vscode.workspace.getConfiguration('bbdev.ai');
    const workflowUrl = config.get('workflowUrl', 'http://localhost:3000');
    const apiKey = config.get('apiKey', '');
    const baseUrl = config.get('baseUrl', 'https://api.deepseek.com/v1');
    const model = config.get('model', 'deepseek-chat');

    if (!apiKey || !baseUrl) {
      panel.webview.postMessage({
        command: 'error',
        data: { error: '请先配置 API Key 和 Base URL' }
      });
      return;
    }

    try {
      // 调用后端 API，等待处理完成后返回
      const response = await fetch(`${workflowUrl}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: data.message,
          model: model,
          apiKey: apiKey,
          baseUrl: baseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // 检查结果状态
      if (result.success) {
        // 成功获取结果
        panel.webview.postMessage({
          command: 'messageReceived',
          data: { 
            content: result.body?.response || result.response || '处理完成',
            timestamp: Date.now()
          }
        });
      } else if (result.failure) {
        // 处理失败
        panel.webview.postMessage({
          command: 'error',
          data: { error: result.body?.error || result.error || '处理失败' }
        });
      } else {
        // 未知状态
        panel.webview.postMessage({
          command: 'error',
          data: { error: '未知的响应状态' }
        });
      }

    } catch (error: any) {
      panel.webview.postMessage({
        command: 'error',
        data: { error: error.message }
      });
    }
  }
}

