export function getScripts(): string {
  return `<script>
    const vscode = acquireVsCodeApi();
    let config = {};
    let isWaiting = false;

    // 自动调整输入框高度
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // 回车发送（Shift+Enter换行）
    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // 接收来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'configLoaded':
          config = message.data;
          document.getElementById('workflowUrl').value = config.workflowUrl || '';
          document.getElementById('apiKey').value = config.apiKey || '';
          document.getElementById('baseUrl').value = config.baseUrl || '';
          document.getElementById('model').value = config.model || '';
          break;
          
        case 'messageReceived':
          addMessage('assistant', message.data.content);
          isWaiting = false;
          updateSendButton();
          break;
          
        case 'error':
          addMessage('error', message.data.error);
          isWaiting = false;
          updateSendButton();
          break;
      }
    });

    function openConfigModal() {
      document.getElementById('configModal').classList.add('show');
      vscode.postMessage({ command: 'getConfig' });
    }

    function closeConfigModal() {
      document.getElementById('configModal').classList.remove('show');
    }

    function saveConfig() {
      const configData = {
        workflowUrl: document.getElementById('workflowUrl').value,
        apiKey: document.getElementById('apiKey').value,
        baseUrl: document.getElementById('baseUrl').value,
        model: document.getElementById('model').value
      };
      
      vscode.postMessage({
        command: 'saveConfig',
        data: configData
      });
      
      config = configData;
      closeConfigModal();
    }

    function sendMessage() {
      if (isWaiting) return;
      
      const input = document.getElementById('messageInput');
      const message = input.value.trim();
      
      if (!message) return;
      
      if (!config.apiKey || !config.baseUrl) {
        addMessage('error', '请先配置 API Key 和 Base URL');
        return;
      }

      // 添加用户消息
      addMessage('user', message);
      
      // 清空输入框
      input.value = '';
      input.style.height = 'auto';
      
      // 显示等待状态
      isWaiting = true;
      updateSendButton();
      addMessage('system', '正在思考...');
      
      // 发送消息到后端
      vscode.postMessage({
        command: 'sendMessage',
        data: { message: message }
      });
    }

    function addMessage(role, content) {
      const container = document.getElementById('chatContainer');
      
      // 移除之前的"正在思考..."消息
      if (role !== 'system' || content !== '正在思考...') {
        const loadingMessages = container.querySelectorAll('.message.system .loading, .message.system:last-child');
        loadingMessages.forEach(msg => {
          if (msg.textContent === '正在思考...') {
            msg.remove();
          }
        });
      }
      
      const messageDiv = document.createElement('div');
      messageDiv.className = \`message \${role}\`;
      
      if (role === 'system' && content === '正在思考...') {
        messageDiv.innerHTML = '<span class="loading">正在思考...</span>';
      } else {
        messageDiv.textContent = content;
      }
      
      container.appendChild(messageDiv);
      container.scrollTop = container.scrollHeight;
    }

    function updateSendButton() {
      const btn = document.getElementById('sendBtn');
      btn.disabled = isWaiting;
      btn.textContent = isWaiting ? '等待中...' : '发送';
    }

    // 请求初始配置
    vscode.postMessage({ command: 'getConfig' });
  </script>`;
}

