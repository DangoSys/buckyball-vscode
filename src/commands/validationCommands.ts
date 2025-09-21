import * as vscode from 'vscode';
import { getValidator } from '../utils/validator';
import { getErrorHandler } from '../utils/errorHandler';
import { getLogger } from '../utils/logger';
import { getSetupGuide } from '../utils/setupGuide';
import { COMMANDS } from '../models/constants';

/**
 * Register validation-related commands
 */
export function registerValidationCommands(context: vscode.ExtensionContext): void {
  const validator = getValidator();
  const errorHandler = getErrorHandler();
  const logger = getLogger();
  const setupGuide = getSetupGuide();

  // Validate installation command
  const validateInstallationCommand = vscode.commands.registerCommand(
    COMMANDS.VALIDATE_INSTALLATION,
    async () => {
      try {
        logger.info('Starting installation validation', 'ValidationCommands');
        
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Validating BBDev Installation...',
            cancellable: false
          },
          async (progress) => {
            progress.report({ increment: 0, message: 'Checking dependencies...' });
            
            const results = await validator.validateWorkspace();
            
            progress.report({ increment: 100, message: 'Validation complete' });
            
            await validator.showValidationResults(results);
          }
        );
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'installation-validation'
        });
      }
    }
  );

  // Validate workspace command
  const validateWorkspaceCommand = vscode.commands.registerCommand(
    COMMANDS.VALIDATE_WORKSPACE,
    async () => {
      try {
        logger.info('Starting workspace validation', 'ValidationCommands');
        
        const results = await validator.validateWorkspace();
        await validator.showValidationResults(results);
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'workspace-validation'
        });
      }
    }
  );

  // Show command help
  const showCommandHelpCommand = vscode.commands.registerCommand(
    COMMANDS.SHOW_COMMAND_HELP,
    async (commandName?: string) => {
      try {
        if (!commandName) {
          const quickPick = vscode.window.createQuickPick();
          quickPick.placeholder = 'Select a command to get help for';
          quickPick.items = [
            { label: 'verilator', description: 'Verilator simulation commands' },
            { label: 'vcs', description: 'VCS simulation commands' },
            { label: 'sardine', description: 'Sardine test framework commands' },
            { label: 'agent', description: 'Agent workflow commands' },
            { label: 'workload', description: 'Workload management commands' },
            { label: 'doc', description: 'Documentation commands' },
            { label: 'marshal', description: 'Marshal commands' },
            { label: 'firesim', description: 'FireSim commands' },
            { label: 'compiler', description: 'Compiler commands' },
            { label: 'funcsim', description: 'Functional simulation commands' },
            { label: 'uvm', description: 'UVM commands' }
          ];

          quickPick.onDidChangeSelection(async (selection) => {
            if (selection[0]) {
              await showHelpForCommand(selection[0].label);
              quickPick.hide();
            }
          });

          quickPick.show();
        } else {
          await showHelpForCommand(commandName);
        }
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'show-command-help',
          command: commandName
        });
      }
    }
  );

  // Run setup wizard command
  const runSetupWizardCommand = vscode.commands.registerCommand(
    COMMANDS.RUN_SETUP_WIZARD,
    async () => {
      try {
        logger.info('Starting setup wizard', 'ValidationCommands');
        
        await runSetupWizard();
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'setup-wizard'
        });
      }
    }
  );

  // Show setup guide command
  const showSetupGuideCommand = vscode.commands.registerCommand(
    'bbdev.showSetupGuide',
    async () => {
      try {
        logger.info('Showing setup guide', 'ValidationCommands');
        await setupGuide.showSetupGuidance();
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'show-setup-guide'
        });
      }
    }
  );

  // Register all commands
  context.subscriptions.push(
    validateInstallationCommand,
    validateWorkspaceCommand,
    showCommandHelpCommand,
    runSetupWizardCommand,
    showSetupGuideCommand
  );
}

/**
 * Show help for a specific command
 */
async function showHelpForCommand(commandName: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('bbdev');
  const bbdevPath = config.get<string>('bbdevPath', 'bbdev');

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`${bbdevPath} ${commandName} --help`, { timeout: 10000 });

    const panel = vscode.window.createWebviewPanel(
      'bbdev-command-help',
      `BBDev ${commandName} Help`,
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            margin: 20px; 
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          pre { 
            white-space: pre-wrap; 
            word-wrap: break-word;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
          }
          h1 { color: var(--vscode-textLink-foreground); }
        </style>
      </head>
      <body>
        <h1>BBDev ${commandName} Help</h1>
        <pre>${stdout}</pre>
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to get help for ${commandName}: ${error}`);
  }
}

/**
 * Run the setup wizard to guide users through initial configuration
 */
async function runSetupWizard(): Promise<void> {
  const validator = getValidator();
  
  // Step 1: Welcome
  const startSetup = await vscode.window.showInformationMessage(
    'Welcome to the BBDev Setup Wizard! This will help you configure the extension and validate your environment.',
    'Start Setup',
    'Cancel'
  );

  if (startSetup !== 'Start Setup') {
    return;
  }

  // Step 2: Validate dependencies
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Checking Dependencies...',
      cancellable: false
    },
    async (progress) => {
      const results = await validator.validateWorkspace();
      
      const errorCount = results.results.filter(r => r.severity === 'error').length +
                        results.dependencies.filter(r => r.severity === 'error').length;

      if (errorCount > 0) {
        const fixIssues = await vscode.window.showWarningMessage(
          `Found ${errorCount} issues that need to be resolved. Would you like to see the details?`,
          'View Issues',
          'Continue Anyway',
          'Cancel'
        );

        if (fixIssues === 'View Issues') {
          await validator.showValidationResults(results);
          return;
        } else if (fixIssues === 'Cancel') {
          return;
        }
      }
    }
  );

  // Step 3: Configure BBDev path
  const config = vscode.workspace.getConfiguration('bbdev');
  const currentPath = config.get<string>('bbdevPath', 'bbdev');
  
  const customPath = await vscode.window.showInputBox({
    prompt: 'Enter the path to the bbdev command (leave empty to use default)',
    value: currentPath === 'bbdev' ? '' : currentPath,
    placeHolder: 'e.g., /usr/local/bin/bbdev or leave empty for default'
  });

  if (customPath !== undefined) {
    const pathToSet = customPath.trim() || 'bbdev';
    await config.update('bbdevPath', pathToSet, vscode.ConfigurationTarget.Workspace);
  }

  // Step 4: Configure default port
  const currentPort = config.get<number>('defaultPort', 8080);
  const portInput = await vscode.window.showInputBox({
    prompt: 'Enter the default port for bbdev servers',
    value: currentPort.toString(),
    validateInput: (value) => {
      const port = parseInt(value);
      if (isNaN(port) || port < 1024 || port > 65535) {
        return 'Port must be a number between 1024 and 65535';
      }
      return null;
    }
  });

  if (portInput) {
    await config.update('defaultPort', parseInt(portInput), vscode.ConfigurationTarget.Workspace);
  }

  // Step 5: Configure auto-start server
  const autoStart = await vscode.window.showQuickPick(
    [
      { label: 'Yes', description: 'Automatically start bbdev server when needed' },
      { label: 'No', description: 'Manually start servers when needed' }
    ],
    {
      placeHolder: 'Should the extension automatically start bbdev servers?'
    }
  );

  if (autoStart) {
    await config.update('autoStartServer', autoStart.label === 'Yes', vscode.ConfigurationTarget.Workspace);
  }

  // Step 6: Final validation
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Finalizing Setup...',
      cancellable: false
    },
    async (progress) => {
      const finalResults = await validator.validateWorkspace();
      
      const errorCount = finalResults.results.filter(r => r.severity === 'error').length +
                        finalResults.dependencies.filter(r => r.severity === 'error').length;

      if (errorCount === 0) {
        vscode.window.showInformationMessage(
          'Setup completed successfully! The BBDev extension is ready to use.',
          'View Commands'
        ).then(selection => {
          if (selection === 'View Commands') {
            vscode.commands.executeCommand('workbench.view.extension.bbdev');
          }
        });
      } else {
        vscode.window.showWarningMessage(
          `Setup completed with ${errorCount} remaining issues. You may need to resolve these manually.`,
          'View Issues'
        ).then(selection => {
          if (selection === 'View Issues') {
            validator.showValidationResults(finalResults);
          }
        });
      }
    }
  );
}