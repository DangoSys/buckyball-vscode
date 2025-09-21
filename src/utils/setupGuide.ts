import * as vscode from 'vscode';
import * as os from 'os';
import { getValidator, DependencyValidationResult } from './validator';
import { getErrorHandler } from './errorHandler';
import { getLogger } from './logger';

/**
 * Setup guide for helping users configure their environment
 */
export class SetupGuide {
  private static instance: SetupGuide;
  private validator = getValidator();
  private errorHandler = getErrorHandler();
  private logger = getLogger();

  private constructor() {}

  public static getInstance(): SetupGuide {
    if (!SetupGuide.instance) {
      SetupGuide.instance = new SetupGuide();
    }
    return SetupGuide.instance;
  }

  /**
   * Show setup guidance based on current system state
   */
  public async showSetupGuidance(): Promise<void> {
    const results = await this.validator.validateWorkspace();
    
    if (results.isValid) {
      vscode.window.showInformationMessage(
        'Your BBDev environment is properly configured!',
        'View Details'
      ).then(selection => {
        if (selection === 'View Details') {
          this.validator.showValidationResults(results);
        }
      });
      return;
    }

    // Show setup guidance panel
    const panel = vscode.window.createWebviewPanel(
      'bbdev-setup-guide',
      'BBDev Setup Guide',
      vscode.ViewColumn.One,
      { 
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.generateSetupGuideHtml(results.dependencies);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'installDependency':
          await this.handleInstallDependency(message.dependencyName);
          break;
        case 'refreshValidation':
          const newResults = await this.validator.validateWorkspace();
          panel.webview.html = this.generateSetupGuideHtml(newResults.dependencies);
          break;
        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'bbdev');
          break;
        case 'runSetupWizard':
          await vscode.commands.executeCommand('bbdev.runSetupWizard');
          panel.dispose();
          break;
      }
    });
  }

  /**
   * Generate HTML for setup guide
   */
  private generateSetupGuideHtml(dependencies: DependencyValidationResult[]): string {
    const platform = os.platform();
    const missingDeps = dependencies.filter(dep => !dep.isInstalled);
    const installedDeps = dependencies.filter(dep => dep.isInstalled);

    const missingDepsHtml = missingDeps.map(dep => `
      <div class="dependency missing">
        <div class="dep-header">
          <span class="dep-icon">❌</span>
          <h3>${dep.dependency.name}</h3>
          <span class="dep-status">Missing</span>
        </div>
        <p class="dep-description">${dep.dependency.description}</p>
        <div class="dep-install">
          <h4>Installation Instructions:</h4>
          <pre class="install-code">${this.getInstallInstructions(dep.dependency.name, platform)}</pre>
          <button onclick="installDependency('${dep.dependency.name}')">
            Copy Install Command
          </button>
        </div>
      </div>
    `).join('');

    const installedDepsHtml = installedDeps.map(dep => `
      <div class="dependency installed">
        <div class="dep-header">
          <span class="dep-icon">✅</span>
          <h3>${dep.dependency.name}</h3>
          <span class="dep-status">Installed${dep.installedVersion ? ` (${dep.installedVersion})` : ''}</span>
        </div>
        <p class="dep-description">${dep.dependency.description}</p>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
          }
          
          .header h1 {
            color: var(--vscode-textLink-foreground);
            margin: 0 0 10px 0;
          }
          
          .header p {
            margin: 0;
            opacity: 0.8;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section h2 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 5px;
          }
          
          .dependency {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid;
          }
          
          .dependency.missing {
            background-color: var(--vscode-inputValidation-errorBackground);
            border-left-color: var(--vscode-inputValidation-errorBorder);
          }
          
          .dependency.installed {
            background-color: var(--vscode-textCodeBlock-background);
            border-left-color: var(--vscode-terminal-ansiGreen);
          }
          
          .dep-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .dep-icon {
            font-size: 20px;
            margin-right: 10px;
          }
          
          .dep-header h3 {
            margin: 0;
            flex-grow: 1;
          }
          
          .dep-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
          }
          
          .dep-description {
            margin: 0 0 15px 0;
            opacity: 0.9;
          }
          
          .dep-install h4 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
          }
          
          .install-code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            margin: 10px 0;
            white-space: pre-wrap;
          }
          
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px 5px 5px 0;
          }
          
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          button.primary {
            background-color: var(--vscode-textLink-foreground);
            color: var(--vscode-editor-background);
          }
          
          .actions {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
          }
          
          .platform-info {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          
          .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            margin: 20px 0;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            background-color: var(--vscode-textLink-foreground);
            transition: width 0.3s ease;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 BBDev Setup Guide</h1>
          <p>Let's get your BBDev environment configured properly</p>
        </div>
        
        <div class="platform-info">
          <strong>Detected Platform:</strong> ${this.getPlatformName(platform)} (${platform})
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(installedDeps.length / dependencies.length) * 100}%"></div>
        </div>
        <p style="text-align: center; margin: 0;">
          ${installedDeps.length} of ${dependencies.length} dependencies installed
        </p>
        
        ${missingDeps.length > 0 ? `
          <div class="section">
            <h2>❌ Missing Dependencies</h2>
            <p>The following dependencies need to be installed:</p>
            ${missingDepsHtml}
          </div>
        ` : ''}
        
        ${installedDeps.length > 0 ? `
          <div class="section">
            <h2>✅ Installed Dependencies</h2>
            <p>These dependencies are properly configured:</p>
            ${installedDepsHtml}
          </div>
        ` : ''}
        
        <div class="actions">
          <button onclick="refreshValidation()">🔄 Refresh Status</button>
          <button onclick="openSettings()">⚙️ Open Settings</button>
          <button class="primary" onclick="runSetupWizard()">🧙‍♂️ Run Setup Wizard</button>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function installDependency(dependencyName) {
            // Copy install command to clipboard
            const installCode = document.querySelector(\`[onclick="installDependency('\${dependencyName}')"] + .install-code\`);
            if (installCode) {
              navigator.clipboard.writeText(installCode.textContent.trim()).then(() => {
                vscode.postMessage({ command: 'installDependency', dependencyName: dependencyName });
              });
            }
          }
          
          function refreshValidation() {
            vscode.postMessage({ command: 'refreshValidation' });
          }
          
          function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
          }
          
          function runSetupWizard() {
            vscode.postMessage({ command: 'runSetupWizard' });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Get platform-specific install instructions
   */
  private getInstallInstructions(dependencyName: string, platform: string): string {
    const instructions: Record<string, Record<string, string>> = {
      'Python': {
        'darwin': 'brew install python3\n# or download from https://python.org/downloads/',
        'linux': 'sudo apt update && sudo apt install python3 python3-pip\n# Ubuntu/Debian\n\nsudo yum install python3 python3-pip\n# RHEL/CentOS/Fedora',
        'win32': '# Download and install from https://python.org/downloads/\n# Make sure to check "Add Python to PATH" during installation'
      },
      'BBDev Tool': {
        'darwin': 'cd /path/to/bbdev/workflow\npip3 install -e .\n# Make sure bbdev is in your PATH',
        'linux': 'cd /path/to/bbdev/workflow\npip3 install -e .\n# Make sure bbdev is in your PATH',
        'win32': 'cd C:\\path\\to\\bbdev\\workflow\npip install -e .\n# Make sure bbdev is in your PATH'
      },
      'Git': {
        'darwin': 'brew install git\n# or install Xcode Command Line Tools:\nxcode-select --install',
        'linux': 'sudo apt install git\n# Ubuntu/Debian\n\nsudo yum install git\n# RHEL/CentOS/Fedora',
        'win32': '# Download and install from https://git-scm.com/downloads\n# Or use winget:\nwinget install Git.Git'
      },
      'Make': {
        'darwin': 'brew install make\n# or install Xcode Command Line Tools:\nxcode-select --install',
        'linux': 'sudo apt install build-essential\n# Ubuntu/Debian\n\nsudo yum groupinstall "Development Tools"\n# RHEL/CentOS/Fedora',
        'win32': '# Install through MSYS2:\n# Download from https://www.msys2.org/\n# Then run: pacman -S make\n\n# Or use WSL (Windows Subsystem for Linux)'
      }
    };

    return instructions[dependencyName]?.[platform] || 
           `Please install ${dependencyName} according to your system's package manager or from the official website.`;
  }

  /**
   * Get human-readable platform name
   */
  private getPlatformName(platform: string): string {
    switch (platform) {
      case 'darwin': return 'macOS';
      case 'linux': return 'Linux';
      case 'win32': return 'Windows';
      default: return platform;
    }
  }

  /**
   * Handle dependency installation
   */
  private async handleInstallDependency(dependencyName: string): Promise<void> {
    const message = `Install command for ${dependencyName} has been copied to your clipboard. ` +
                   `Please run the command in your terminal and then refresh the validation status.`;
    
    const action = await vscode.window.showInformationMessage(
      message,
      'Open Terminal',
      'Refresh Status',
      'Dismiss'
    );

    switch (action) {
      case 'Open Terminal':
        await vscode.commands.executeCommand('workbench.action.terminal.new');
        break;
      case 'Refresh Status':
        const results = await this.validator.validateWorkspace();
        await this.validator.showValidationResults(results);
        break;
    }
  }

  /**
   * Check if user needs setup guidance
   */
  public async checkIfSetupNeeded(): Promise<boolean> {
    try {
      const results = await this.validator.validateWorkspace();
      const errorCount = results.results.filter(r => r.severity === 'error').length +
                        results.dependencies.filter(r => r.severity === 'error').length;
      
      return errorCount > 0;
    } catch (error) {
      this.logger.error(`Failed to check setup status: ${error}`, 'SetupGuide');
      return true; // Assume setup is needed if we can't validate
    }
  }

  /**
   * Show setup notification if needed
   */
  public async showSetupNotificationIfNeeded(): Promise<void> {
    const config = vscode.workspace.getConfiguration('bbdev');
    const showNotifications = config.get<boolean>('showValidationNotifications', true);
    
    if (!showNotifications) {
      return;
    }

    const setupNeeded = await this.checkIfSetupNeeded();
    
    if (setupNeeded) {
      const action = await vscode.window.showWarningMessage(
        'BBDev extension detected configuration issues. Would you like to run the setup guide?',
        'Run Setup Guide',
        'Run Setup Wizard',
        'Don\'t Show Again',
        'Dismiss'
      );

      switch (action) {
        case 'Run Setup Guide':
          await this.showSetupGuidance();
          break;
        case 'Run Setup Wizard':
          await vscode.commands.executeCommand('bbdev.runSetupWizard');
          break;
        case 'Don\'t Show Again':
          await config.update('showValidationNotifications', false, vscode.ConfigurationTarget.Global);
          break;
      }
    }
  }
}

/**
 * Convenience function to get setup guide instance
 */
export function getSetupGuide(): SetupGuide {
  return SetupGuide.getInstance();
}