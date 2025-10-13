import * as vscode from 'vscode';

export class ConfigManager {
  static async handleGetConfig(panel: vscode.WebviewPanel) {
    const config = vscode.workspace.getConfiguration('bbdev.ai');
    panel.webview.postMessage({
      command: 'configLoaded',
      data: {
        apiKey: config.get('apiKey', ''),
        baseUrl: config.get('baseUrl', 'https://api.deepseek.com/v1'),
        model: config.get('model', 'deepseek-chat'),
        workflowUrl: config.get('workflowUrl', 'http://localhost:3000')
      }
    });
  }

  static async handleSaveConfig(context: vscode.ExtensionContext, data: any) {
    const config = vscode.workspace.getConfiguration('bbdev.ai');
    
    try {
      await config.update('apiKey', data.apiKey, vscode.ConfigurationTarget.Global);
      await config.update('baseUrl', data.baseUrl, vscode.ConfigurationTarget.Global);
      await config.update('model', data.model, vscode.ConfigurationTarget.Global);
      await config.update('workflowUrl', data.workflowUrl, vscode.ConfigurationTarget.Global);
      
      vscode.window.showInformationMessage('配置已保存');
    } catch (error: any) {
      vscode.window.showErrorMessage(`保存配置失败: ${error.message}`);
    }
  }
}

