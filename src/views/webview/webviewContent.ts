import { getStyles } from './styles';
import { getScripts } from './scripts';

export function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chat Assistant</title>
  ${getStyles()}
</head>
<body>
  <div class="header">
    <h1>🤖 AI Chat Assistant</h1>
    <button class="config-btn" onclick="openConfigModal()">⚙️ 配置</button>
  </div>

  <div class="chat-container" id="chatContainer">
    <div class="message system">欢迎使用 AI 助手！点击右上角配置 API 信息后开始对话。</div>
  </div>

  <div class="input-container">
    <textarea 
      class="input-box" 
      id="messageInput" 
      placeholder="输入消息..."
      rows="1"
    ></textarea>
    <button class="send-btn" id="sendBtn" onclick="sendMessage()">发送</button>
  </div>

  <div class="modal" id="configModal">
    <div class="modal-content">
      <div class="modal-header">配置 AI API</div>
      
      <div class="form-group">
        <label>Workflow URL:</label>
        <input type="text" id="workflowUrl" placeholder="http://localhost:3000" />
      </div>

      <div class="form-group">
        <label>API Key:</label>
        <input type="password" id="apiKey" placeholder="输入你的 API Key" />
      </div>

      <div class="form-group">
        <label>Base URL:</label>
        <input type="text" id="baseUrl" placeholder="https://api.deepseek.com/v1" />
      </div>

      <div class="form-group">
        <label>Model:</label>
        <input type="text" id="model" placeholder="deepseek-chat" />
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeConfigModal()">取消</button>
        <button class="btn-primary" onclick="saveConfig()">保存</button>
      </div>
    </div>
  </div>

  ${getScripts()}
</body>
</html>`;
}

