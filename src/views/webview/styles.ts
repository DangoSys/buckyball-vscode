export function getStyles(): string {
  return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background-color: var(--vscode-titleBar-activeBackground);
    }

    .header h1 {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-titleBar-activeForeground);
    }

    .config-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .config-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      width: 100%;
      padding: 12px 16px;
      border-radius: 4px;
      line-height: 1.6;
      font-size: 13px;
      white-space: pre-wrap;
      word-wrap: break-word;
      border-left: 3px solid transparent;
    }

    .message.user {
      background: var(--vscode-editor-background);
      border-left-color: var(--vscode-button-background);
      color: var(--vscode-editor-foreground);
      font-weight: 500;
    }

    .message.user::before {
      content: "You: ";
      color: var(--vscode-button-background);
      font-weight: 600;
      margin-right: 8px;
    }

    .message.assistant {
      background: var(--vscode-input-background);
      border-left-color: var(--vscode-textLink-foreground);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-panel-border);
      border-left: 3px solid var(--vscode-textLink-foreground);
    }

    .message.assistant::before {
      content: "AI: ";
      color: var(--vscode-textLink-foreground);
      font-weight: 600;
      margin-right: 8px;
    }

    .message.system {
      align-self: center;
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
      font-size: 12px;
      padding: 6px 10px;
    }

    .message.error {
      align-self: center;
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      font-size: 12px;
      padding: 6px 10px;
    }

    .input-container {
      padding: 12px 16px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      gap: 8px;
    }

    .input-box {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px 12px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      resize: none;
      min-height: 36px;
      max-height: 120px;
    }

    .input-box:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .send-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }

    .modal.show {
      display: flex;
    }

    .modal-content {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 20px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--vscode-foreground);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      margin-bottom: 6px;
      color: var(--vscode-foreground);
    }

    .form-group input {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px 12px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .modal-actions button {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 13px;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .loading {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
  </style>`;
}

