import * as vscode from 'vscode';
import { BBDevError, BBDevErrorCategory } from '../models/types';
import { getLogger } from './logger';
import { OUTPUT_CHANNELS } from '../models/constants';

/**
 * Error recovery action interface
 */
export interface ErrorRecoveryAction {
  title: string;
  action: () => Promise<void>;
  isDefault?: boolean;
}

/**
 * Error context information
 */
export interface ErrorContext {
  operation?: string;
  command?: string;
  workspaceRoot?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Enhanced BBDev error class with recovery suggestions
 */
export class EnhancedBBDevError extends BBDevError {
  public recoveryActions: ErrorRecoveryAction[] = [];
  public context?: ErrorContext;
  public userFriendlyMessage?: string;
  public helpUrl?: string;

  constructor(
    message: string,
    category: BBDevErrorCategory,
    details?: any,
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(message, category, details, originalError);
    this.context = context;
    this.name = 'EnhancedBBDevError';
  }

  /**
   * Add a recovery action to this error
   */
  public addRecoveryAction(action: ErrorRecoveryAction): this {
    this.recoveryActions.push(action);
    return this;
  }

  /**
   * Set user-friendly message
   */
  public setUserFriendlyMessage(message: string): this {
    this.userFriendlyMessage = message;
    return this;
  }

  /**
   * Set help URL for more information
   */
  public setHelpUrl(url: string): this {
    this.helpUrl = url;
    return this;
  }
}

/**
 * Comprehensive error handler for BBDev operations
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger = getLogger();

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle any error and provide appropriate user feedback
   */
  public async handleError(error: Error, context?: ErrorContext): Promise<void> {
    let enhancedError: EnhancedBBDevError;

    if (error instanceof EnhancedBBDevError) {
      enhancedError = error;
    } else if (error instanceof BBDevError) {
      enhancedError = new EnhancedBBDevError(
        error.message,
        error.category,
        error.details,
        error.originalError,
        context
      );
    } else {
      enhancedError = this.categorizeError(error, context);
    }

    // Log the error
    this.logError(enhancedError);

    // Add category-specific recovery actions
    this.addCategorySpecificRecoveryActions(enhancedError);

    // Show error to user with recovery options
    await this.showErrorToUser(enhancedError);
  }

  /**
   * Categorize a generic error into a BBDev error
   */
  private categorizeError(error: Error, context?: ErrorContext): EnhancedBBDevError {
    let category: BBDevErrorCategory = 'command';
    let userFriendlyMessage = error.message;

    // Categorize based on error message patterns
    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      category = 'filesystem';
      userFriendlyMessage = 'File or command not found. Please check the path and ensure bbdev is installed.';
    } else if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      category = 'filesystem';
      userFriendlyMessage = 'Permission denied. Please check file permissions or run with appropriate privileges.';
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connection refused')) {
      category = 'network';
      userFriendlyMessage = 'Connection refused. The bbdev server may not be running or accessible.';
    } else if (error.message.includes('port') && error.message.includes('in use')) {
      category = 'server';
      userFriendlyMessage = 'Port is already in use. Please try a different port or stop the conflicting service.';
    } else if (error.message.includes('timeout')) {
      category = 'network';
      userFriendlyMessage = 'Operation timed out. Please check your network connection or try again.';
    }

    const enhancedError = new EnhancedBBDevError(
      error.message,
      category,
      { originalMessage: error.message },
      error,
      context
    );

    enhancedError.setUserFriendlyMessage(userFriendlyMessage);
    return enhancedError;
  }

  /**
   * Add category-specific recovery actions
   */
  private addCategorySpecificRecoveryActions(error: EnhancedBBDevError): void {
    switch (error.category) {
      case 'command':
        this.addCommandErrorRecoveryActions(error);
        break;
      case 'server':
        this.addServerErrorRecoveryActions(error);
        break;
      case 'filesystem':
        this.addFilesystemErrorRecoveryActions(error);
        break;
      case 'network':
        this.addNetworkErrorRecoveryActions(error);
        break;
      case 'validation':
        this.addValidationErrorRecoveryActions(error);
        break;
    }
  }

  /**
   * Add command-specific recovery actions
   */
  private addCommandErrorRecoveryActions(error: EnhancedBBDevError): void {
    // Check bbdev installation
    error.addRecoveryAction({
      title: 'Check BBDev Installation',
      action: async () => {
        await vscode.commands.executeCommand('bbdev.validateInstallation');
      }
    });

    // Show command help
    if (error.context?.command) {
      error.addRecoveryAction({
        title: 'Show Command Help',
        action: async () => {
          await vscode.commands.executeCommand('bbdev.showCommandHelp', error.context?.command);
        }
      });
    }

    // Open output channel
    error.addRecoveryAction({
      title: 'View Detailed Logs',
      action: async () => {
        this.logger.showChannel(OUTPUT_CHANNELS.COMMANDS);
      }
    });
  }

  /**
   * Add server-specific recovery actions
   */
  private addServerErrorRecoveryActions(error: EnhancedBBDevError): void {
    // Stop all servers
    error.addRecoveryAction({
      title: 'Stop All Servers',
      action: async () => {
        await vscode.commands.executeCommand('bbdev.stopAllServers');
      }
    });

    // Try different port
    error.addRecoveryAction({
      title: 'Start Server on Different Port',
      action: async () => {
        await vscode.commands.executeCommand('bbdev.startServerWithPortSelection');
      }
    });

    // Check server status
    error.addRecoveryAction({
      title: 'Check Server Status',
      action: async () => {
        await vscode.commands.executeCommand('bbdev.refreshServerStatus');
      }
    });
  }

  /**
   * Add filesystem-specific recovery actions
   */
  private addFilesystemErrorRecoveryActions(error: EnhancedBBDevError): void {
    // Open file picker
    error.addRecoveryAction({
      title: 'Select File/Directory',
      action: async () => {
        const result = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: true,
          canSelectMany: false
        });
        if (result && result[0]) {
          vscode.window.showInformationMessage(`Selected: ${result[0].fsPath}`);
        }
      }
    });

    // Check workspace
    error.addRecoveryAction({
      title: 'Check Workspace Configuration',
      action: async () => {
        await vscode.commands.executeCommand('bbdev.validateWorkspace');
      }
    });
  }

  /**
   * Add network-specific recovery actions
   */
  private addNetworkErrorRecoveryActions(error: EnhancedBBDevError): void {
    // Retry operation
    error.addRecoveryAction({
      title: 'Retry Operation',
      action: async () => {
        if (error.context?.operation) {
          vscode.window.showInformationMessage('Retrying operation...');
          // The actual retry logic would be implemented by the calling code
        }
      }
    });

    // Check network connectivity
    error.addRecoveryAction({
      title: 'Check Network Settings',
      action: async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'bbdev.network');
      }
    });
  }

  /**
   * Add validation-specific recovery actions
   */
  private addValidationErrorRecoveryActions(error: EnhancedBBDevError): void {
    // Open settings
    error.addRecoveryAction({
      title: 'Open Extension Settings',
      action: async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'bbdev');
      }
    });

    // Run setup wizard
    error.addRecoveryAction({
      title: 'Run Setup Wizard',
      action: async () => {
        await vscode.commands.executeCommand('bbdev.runSetupWizard');
      }
    });
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(error: EnhancedBBDevError): void {
    const contextInfo = error.context ? JSON.stringify(error.context, null, 2) : 'No context';
    const errorDetails = {
      category: error.category,
      context: error.context,
      details: error.details,
      stack: error.stack
    };

    this.logger.error(
      `${error.userFriendlyMessage || error.message}\nContext: ${contextInfo}`,
      error.context?.operation || 'Unknown',
      OUTPUT_CHANNELS.ERRORS
    );

    // Also log to main channel for visibility
    this.logger.error(
      error.userFriendlyMessage || error.message,
      error.context?.operation || 'Error',
      OUTPUT_CHANNELS.MAIN
    );
  }

  /**
   * Show error to user with recovery options
   */
  private async showErrorToUser(error: EnhancedBBDevError): Promise<void> {
    const message = error.userFriendlyMessage || error.message;
    const actions = error.recoveryActions.map(action => action.title);
    
    // Add standard actions
    actions.push('View Logs', 'Dismiss');

    const selection = await vscode.window.showErrorMessage(message, ...actions);

    if (selection) {
      if (selection === 'View Logs') {
        this.logger.showChannel(OUTPUT_CHANNELS.ERRORS);
      } else if (selection === 'Dismiss') {
        return;
      } else {
        // Find and execute the selected recovery action
        const recoveryAction = error.recoveryActions.find(action => action.title === selection);
        if (recoveryAction) {
          try {
            await recoveryAction.action();
          } catch (actionError) {
            this.logger.error(`Recovery action failed: ${actionError}`, 'ErrorHandler');
            vscode.window.showErrorMessage(`Recovery action failed: ${actionError}`);
          }
        }
      }
    }
  }

  /**
   * Create a command execution error
   */
  public createCommandError(
    message: string,
    command: string,
    operation: string,
    details?: any,
    originalError?: Error
  ): EnhancedBBDevError {
    return new EnhancedBBDevError(
      message,
      'command',
      details,
      originalError,
      { command, operation }
    ).setUserFriendlyMessage(`Failed to execute ${command} ${operation}: ${message}`);
  }

  /**
   * Create a server management error
   */
  public createServerError(
    message: string,
    port?: number,
    details?: any,
    originalError?: Error
  ): EnhancedBBDevError {
    return new EnhancedBBDevError(
      message,
      'server',
      { port, ...details },
      originalError,
      { operation: 'server-management' }
    ).setUserFriendlyMessage(`Server error: ${message}`);
  }

  /**
   * Create a filesystem error
   */
  public createFilesystemError(
    message: string,
    path?: string,
    details?: any,
    originalError?: Error
  ): EnhancedBBDevError {
    return new EnhancedBBDevError(
      message,
      'filesystem',
      { path, ...details },
      originalError,
      { operation: 'filesystem' }
    ).setUserFriendlyMessage(`File system error: ${message}`);
  }

  /**
   * Create a validation error
   */
  public createValidationError(
    message: string,
    field?: string,
    value?: any,
    details?: any
  ): EnhancedBBDevError {
    return new EnhancedBBDevError(
      message,
      'validation',
      { field, value, ...details },
      undefined,
      { operation: 'validation' }
    ).setUserFriendlyMessage(`Validation error: ${message}`);
  }

  /**
   * Handle graceful degradation for missing dependencies
   */
  public async handleMissingDependency(
    dependencyName: string,
    requiredFor: string,
    installInstructions?: string
  ): Promise<void> {
    const error = new EnhancedBBDevError(
      `Missing dependency: ${dependencyName}`,
      'validation',
      { dependency: dependencyName, requiredFor },
      undefined,
      { operation: 'dependency-check' }
    );

    error.setUserFriendlyMessage(
      `${dependencyName} is required for ${requiredFor} but is not installed or not found in PATH.`
    );

    // Add recovery actions
    if (installInstructions) {
      error.addRecoveryAction({
        title: 'Show Installation Instructions',
        action: async () => {
          const panel = vscode.window.createWebviewPanel(
            'bbdev-install-instructions',
            `Install ${dependencyName}`,
            vscode.ViewColumn.One,
            { enableScripts: false }
          );
          panel.webview.html = `
            <html>
              <body>
                <h1>Install ${dependencyName}</h1>
                <pre>${installInstructions}</pre>
              </body>
            </html>
          `;
        }
      });
    }

    error.addRecoveryAction({
      title: 'Open Extension Settings',
      action: async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'bbdev');
      }
    });

    error.addRecoveryAction({
      title: 'Continue Without This Feature',
      action: async () => {
        vscode.window.showInformationMessage(
          `Continuing without ${dependencyName}. Some features may be limited.`
        );
      }
    });

    await this.handleError(error);
  }
}

/**
 * Convenience function to get error handler instance
 */
export function getErrorHandler(): ErrorHandler {
  return ErrorHandler.getInstance();
}

/**
 * Decorator for automatic error handling
 */
export function handleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      const errorHandler = getErrorHandler();
      await errorHandler.handleError(error as Error, {
        operation: `${target.constructor.name}.${propertyName}`
      });
      throw error; // Re-throw to allow caller to handle if needed
    }
  };
}