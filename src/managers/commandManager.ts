import * as vscode from 'vscode';
import * as path from 'path';
import { ExecutionContext, ExecutionResult, BBDevError, ArgumentDefinition } from '../models/types';
import { getOperationDefinition } from '../models/commands';
import { ProcessUtils } from '../utils/processUtils';
import { getErrorHandler, handleErrors } from '../utils/errorHandler';
import { getLogger } from '../utils/logger';
import { OutputManager } from './outputManager';
import { ProgressManager } from './progressManager';
import { CONFIG_KEYS, DEFAULTS, OUTPUT_CHANNELS } from '../models/constants';

/**
 * Manages execution of bbdev commands in both script mode and server mode
 */
export class CommandManager {
  private static instance: CommandManager;
  private logger = getLogger();
  private outputManager = OutputManager.getInstance();
  private progressManager = ProgressManager.getInstance();
  private errorHandler = getErrorHandler();

  private constructor() {}

  public static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager();
    }
    return CommandManager.instance;
  }

  /**
   * Execute a bbdev command with the given context
   */
  public async executeCommand(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.info(`Executing command: ${context.command} ${context.operation}`, 'CommandManager');
    
    const channelName = context.outputChannel.name;
    
    try {
      // Validate the command and operation
      await this.validateExecution(context);

      // Get bbdev path from configuration
      const bbdevPath = vscode.workspace.getConfiguration().get<string>(CONFIG_KEYS.BBDEV_PATH, DEFAULTS.BBDEV_PATH);

      // Validate bbdev is available
      await ProcessUtils.validateBBDevCommand(bbdevPath);

      // Build command arguments
      const args = this.buildCommandArguments(context);

      // Start command execution in output
      this.outputManager.startCommandExecution(
        channelName,
        context.command,
        context.operation,
        context.arguments
      );

      // Create stream handlers
      const streamHandler = this.outputManager.createStreamHandler(channelName);

      // Execute the command
      const result = await ProcessUtils.executeCommand(
        bbdevPath,
        args,
        {
          cwd: context.workspaceRoot,
          cancellationToken: context.cancellationToken,
          onOutput: streamHandler.onOutput,
          onError: streamHandler.onError,
          onProgress: (info) => {
            streamHandler.onProgress(info.message, info.current, info.total);
          }
        }
      );

      // End command execution in output
      this.outputManager.endCommandExecution(
        channelName,
        result.success,
        result.duration,
        result.returnCode
      );

      // Log the result
      if (result.success) {
        this.logger.info(`Command completed successfully in ${result.duration}ms`, 'CommandManager');
      } else {
        this.logger.error(`Command failed with code ${result.returnCode}`, 'CommandManager');
      }

      return result;

    } catch (error) {
      // Handle cancellation
      if (context.cancellationToken?.isCancellationRequested) {
        this.outputManager.showCancellation(channelName);
      }

      const enhancedError = this.errorHandler.createCommandError(
        (error as Error).message,
        context.command,
        context.operation,
        { arguments: context.arguments },
        error as Error
      );
      
      await this.errorHandler.handleError(enhancedError, {
        operation: 'command-execution',
        command: context.command,
        workspaceRoot: context.workspaceRoot
      });
      throw enhancedError;
    }
  }

  /**
   * Execute a command with progress indication
   */
  public async executeCommandWithProgress(
    context: ExecutionContext,
    title?: string
  ): Promise<ExecutionResult> {
    const progressTitle = title || `Executing ${context.command} ${context.operation}`;
    
    // Start progress tracking
    const operationId = this.progressManager.startOperation(context, progressTitle);
    
    try {
      // Get cancellation token from progress manager
      const cancellationToken = this.progressManager.getCancellationToken(operationId);
      
      // Update context with cancellation token
      const progressContext: ExecutionContext = {
        ...context,
        cancellationToken
      };

      // Update progress
      this.progressManager.updateMessage(operationId, 'Starting...');
      this.progressManager.updateProgress(operationId, 10);

      // Execute the command
      const result = await this.executeCommand(progressContext);
      
      // Complete the operation
      this.progressManager.completeOperation(operationId, result);

      return result;
    } catch (error) {
      // Handle cancellation
      if (context.cancellationToken?.isCancellationRequested) {
        this.progressManager.cancelOperation(operationId);
      } else {
        // Create a failed result for progress tracking
        const failedResult: ExecutionResult = {
          success: false,
          returnCode: -1,
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
          startTime: new Date(),
          endTime: new Date()
        };
        this.progressManager.completeOperation(operationId, failedResult);
      }
      
      throw error;
    }
  }

  /**
   * Execute a command in server mode (HTTP API)
   */
  public async executeCommandViaServer(
    context: ExecutionContext,
    serverUrl: string
  ): Promise<ExecutionResult> {
    this.logger.info(`Executing command via server: ${serverUrl}`, 'CommandManager');
    
    try {
      // TODO: Implement HTTP API call to bbdev server
      // This would be implemented when server management is added
      throw new BBDevError(
        'Server mode execution not yet implemented',
        'server',
        { serverUrl, context }
      );
    } catch (error) {
      const enhancedError = this.errorHandler.createServerError(
        (error as Error).message,
        undefined,
        { operation: 'command-with-progress' },
        error as Error
      );
      
      await this.errorHandler.handleError(enhancedError, {
        operation: 'command-execution-with-progress',
        workspaceRoot: context.workspaceRoot
      });
      throw enhancedError;
    }
  }

  /**
   * Validate command execution context
   */
  private async validateExecution(context: ExecutionContext): Promise<void> {
    // Check if workspace is available
    if (!context.workspaceRoot) {
      throw new BBDevError(
        'No workspace folder found. Please open a workspace to execute bbdev commands.',
        'validation',
        { context }
      );
    }

    // Validate workspace directory exists
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(context.workspaceRoot));
    } catch {
      throw new BBDevError(
        `Workspace directory not found: ${context.workspaceRoot}`,
        'filesystem',
        { workspaceRoot: context.workspaceRoot }
      );
    }

    // Validate command and operation exist
    const operationDef = getOperationDefinition(context.command, context.operation);
    if (!operationDef) {
      throw new BBDevError(
        `Unknown command or operation: ${context.command} ${context.operation}`,
        'validation',
        { command: context.command, operation: context.operation }
      );
    }

    // Validate required arguments
    await this.validateArguments(context, operationDef.arguments);
  }

  /**
   * Validate command arguments
   */
  private async validateArguments(
    context: ExecutionContext,
    argumentDefs: ArgumentDefinition[]
  ): Promise<void> {
    for (const argDef of argumentDefs) {
      const value = context.arguments[argDef.name];

      // Check required arguments
      if (argDef.required && (value === undefined || value === null || value === '')) {
        throw new BBDevError(
          `Required argument missing: ${argDef.name}`,
          'validation',
          { argument: argDef.name, definition: argDef }
        );
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      await this.validateArgumentType(argDef, value);
    }
  }

  /**
   * Validate argument type and value
   */
  private async validateArgumentType(argDef: ArgumentDefinition, value: any): Promise<void> {
    switch (argDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new BBDevError(
            `Argument ${argDef.name} must be a string`,
            'validation',
            { argument: argDef.name, value, expectedType: 'string' }
          );
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new BBDevError(
            `Argument ${argDef.name} must be a number`,
            'validation',
            { argument: argDef.name, value, expectedType: 'number' }
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new BBDevError(
            `Argument ${argDef.name} must be a boolean`,
            'validation',
            { argument: argDef.name, value, expectedType: 'boolean' }
          );
        }
        break;

      case 'file':
        if (typeof value !== 'string') {
          throw new BBDevError(
            `File path argument ${argDef.name} must be a string`,
            'validation',
            { argument: argDef.name, value, expectedType: 'file path' }
          );
        }
        // Validate file exists
        try {
          const filePath = path.isAbsolute(value) ? value : path.resolve(value);
          const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
          if (stat.type !== vscode.FileType.File) {
            throw new BBDevError(
              `Path ${value} is not a file`,
              'filesystem',
              { argument: argDef.name, path: value }
            );
          }
        } catch (error) {
          throw new BBDevError(
            `File not found: ${value}`,
            'filesystem',
            { argument: argDef.name, path: value },
            error as Error
          );
        }
        break;

      case 'directory':
        if (typeof value !== 'string') {
          throw new BBDevError(
            `Directory path argument ${argDef.name} must be a string`,
            'validation',
            { argument: argDef.name, value, expectedType: 'directory path' }
          );
        }
        // Validate directory exists
        try {
          const dirPath = path.isAbsolute(value) ? value : path.resolve(value);
          const stat = await vscode.workspace.fs.stat(vscode.Uri.file(dirPath));
          if (stat.type !== vscode.FileType.Directory) {
            throw new BBDevError(
              `Path ${value} is not a directory`,
              'filesystem',
              { argument: argDef.name, path: value }
            );
          }
        } catch (error) {
          throw new BBDevError(
            `Directory not found: ${value}`,
            'filesystem',
            { argument: argDef.name, path: value },
            error as Error
          );
        }
        break;

      case 'choice':
        if (typeof value !== 'string') {
          throw new BBDevError(
            `Choice argument ${argDef.name} must be a string`,
            'validation',
            { argument: argDef.name, value, expectedType: 'choice' }
          );
        }
        if (argDef.choices && !argDef.choices.includes(value)) {
          throw new BBDevError(
            `Invalid choice for ${argDef.name}. Valid options: ${argDef.choices.join(', ')}`,
            'validation',
            { argument: argDef.name, value, validChoices: argDef.choices }
          );
        }
        break;
    }
  }

  /**
   * Build command line arguments from execution context
   */
  private buildCommandArguments(context: ExecutionContext): string[] {
    const args: string[] = [context.command, context.operation];

    // Add arguments
    for (const [key, value] of Object.entries(context.arguments)) {
      if (value !== undefined && value !== null && value !== '') {
        // Handle boolean arguments
        if (typeof value === 'boolean') {
          if (value) {
            args.push(`--${key}`);
          }
        } else {
          args.push(`--${key}`, String(value));
        }
      }
    }

    this.logger.debug(`Built command arguments: ${args.join(' ')}`, 'CommandManager');
    return args;
  }

  /**
   * Get or create output channel for a command
   */
  public getOutputChannel(commandName: string): vscode.OutputChannel {
    return this.outputManager.getCommandOutputChannel(commandName);
  }

  /**
   * Show output channel for a command
   */
  public showOutputChannel(commandName: string): void {
    const channelName = `${OUTPUT_CHANNELS.COMMANDS} - ${commandName}`;
    this.outputManager.showChannel(channelName);
  }

  /**
   * Clear output channel for a command
   */
  public clearOutputChannel(commandName: string): void {
    const channelName = `${OUTPUT_CHANNELS.COMMANDS} - ${commandName}`;
    this.outputManager.clearChannel(channelName);
  }

  /**
   * Parse command arguments from a string
   */
  public parseArgumentString(argumentString: string): Record<string, any> {
    const args: Record<string, any> = {};
    
    // Simple argument parsing - this could be enhanced
    const parts = argumentString.split(/\s+/);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.startsWith('--')) {
        const key = part.substring(2);
        
        // Check if next part is a value or another flag
        if (i + 1 < parts.length && !parts[i + 1].startsWith('--')) {
          const value = parts[i + 1];
          
          // Try to parse as number or boolean
          if (value === 'true') {
            args[key] = true;
          } else if (value === 'false') {
            args[key] = false;
          } else if (!isNaN(Number(value))) {
            args[key] = Number(value);
          } else {
            args[key] = value;
          }
          
          i++; // Skip the value part
        } else {
          // Boolean flag
          args[key] = true;
        }
      }
    }

    return args;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // OutputManager will be disposed separately
  }
}