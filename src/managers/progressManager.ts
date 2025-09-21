import * as vscode from 'vscode';
import { ExecutionContext, ExecutionResult, ProgressInfo } from '../models/types';
import { getLogger } from '../utils/logger';

/**
 * Progress tracking information for operations
 */
export interface OperationProgress {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    message: string;
  };
  context: ExecutionContext;
  result?: ExecutionResult;
  cancellationToken?: vscode.CancellationTokenSource;
}

/**
 * Operation history entry
 */
export interface OperationHistoryEntry {
  id: string;
  title: string;
  command: string;
  operation: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'completed' | 'failed' | 'cancelled';
  success: boolean;
  returnCode?: number;
  errorMessage?: string;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  showCompletionNotifications: boolean;
  showErrorNotifications: boolean;
  showProgressNotifications: boolean;
  notificationTimeout: number;
  soundEnabled: boolean;
}

/**
 * Manages progress tracking, notifications, and operation history
 */
export class ProgressManager {
  private static instance: ProgressManager;
  private logger = getLogger();
  private activeOperations: Map<string, OperationProgress> = new Map();
  private operationHistory: OperationHistoryEntry[] = [];
  private notificationConfig: NotificationConfig;
  private progressReporters: Map<string, vscode.Progress<ProgressInfo>> = new Map();

  private constructor() {
    this.notificationConfig = {
      showCompletionNotifications: true,
      showErrorNotifications: true,
      showProgressNotifications: true,
      notificationTimeout: 5000,
      soundEnabled: false
    };
  }

  public static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }

  /**
   * Start tracking a new operation
   */
  public startOperation(
    context: ExecutionContext,
    title?: string
  ): string {
    const operationId = this.generateOperationId();
    const operationTitle = title || `${context.command} ${context.operation}`;
    
    const operation: OperationProgress = {
      id: operationId,
      title: operationTitle,
      startTime: new Date(),
      status: 'running',
      progress: {
        current: 0,
        total: 100,
        message: 'Starting...'
      },
      context,
      cancellationToken: new vscode.CancellationTokenSource()
    };

    this.activeOperations.set(operationId, operation);
    
    this.logger.info(`Started operation: ${operationTitle}`, 'ProgressManager', operationId);
    
    // Show progress notification if enabled
    if (this.notificationConfig.showProgressNotifications) {
      this.showProgressWithNotification(operationId, operationTitle);
    }

    return operationId;
  }

  /**
   * Update operation progress
   */
  public updateProgress(
    operationId: string,
    current: number,
    total: number = 100,
    message?: string
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return;
    }

    operation.progress = {
      current: Math.min(current, total),
      total,
      message: message || operation.progress.message
    };

    // Update progress reporter if exists
    const reporter = this.progressReporters.get(operationId);
    if (reporter) {
      const increment = current - operation.progress.current;
      reporter.report({
        message: operation.progress.message,
        increment: increment > 0 ? increment : undefined
      });
    }

    this.logger.debug(
      `Progress update: ${current}/${total} - ${message}`,
      'ProgressManager',
      operationId
    );
  }

  /**
   * Update operation message
   */
  public updateMessage(operationId: string, message: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return;
    }

    operation.progress.message = message;

    // Update progress reporter if exists
    const reporter = this.progressReporters.get(operationId);
    if (reporter) {
      reporter.report({ message });
    }

    this.logger.debug(`Message update: ${message}`, 'ProgressManager', operationId);
  }

  /**
   * Complete an operation successfully
   */
  public completeOperation(
    operationId: string,
    result: ExecutionResult
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return;
    }

    operation.endTime = new Date();
    operation.duration = operation.endTime.getTime() - operation.startTime.getTime();
    operation.status = result.success ? 'completed' : 'failed';
    operation.result = result;
    operation.progress.current = operation.progress.total;
    operation.progress.message = result.success ? 'Completed successfully' : 'Failed';

    // Add to history
    this.addToHistory(operation);

    // Clean up
    this.cleanupOperation(operationId);

    // Show completion notification
    if (result.success && this.notificationConfig.showCompletionNotifications) {
      this.showCompletionNotification(operation);
    } else if (!result.success && this.notificationConfig.showErrorNotifications) {
      this.showErrorNotification(operation);
    }

    this.logger.info(
      `Operation ${result.success ? 'completed' : 'failed'}: ${operation.title} (${operation.duration}ms)`,
      'ProgressManager',
      operationId
    );
  }

  /**
   * Cancel an operation
   */
  public cancelOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return;
    }

    operation.endTime = new Date();
    operation.duration = operation.endTime.getTime() - operation.startTime.getTime();
    operation.status = 'cancelled';
    operation.progress.message = 'Cancelled by user';

    // Cancel the token
    if (operation.cancellationToken) {
      operation.cancellationToken.cancel();
    }

    // Add to history
    this.addToHistory(operation);

    // Clean up
    this.cleanupOperation(operationId);

    this.logger.info(`Operation cancelled: ${operation.title}`, 'ProgressManager', operationId);
  }

  /**
   * Get cancellation token for an operation
   */
  public getCancellationToken(operationId: string): vscode.CancellationToken | undefined {
    const operation = this.activeOperations.get(operationId);
    return operation?.cancellationToken?.token;
  }

  /**
   * Get active operations
   */
  public getActiveOperations(): OperationProgress[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Get operation history
   */
  public getOperationHistory(limit?: number): OperationHistoryEntry[] {
    const history = [...this.operationHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear operation history
   */
  public clearHistory(): void {
    this.operationHistory = [];
    this.logger.info('Operation history cleared', 'ProgressManager');
  }

  /**
   * Get operation statistics
   */
  public getStatistics(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    cancelledOperations: number;
    averageDuration: number;
    activeOperations: number;
  } {
    const stats = {
      totalOperations: this.operationHistory.length,
      successfulOperations: 0,
      failedOperations: 0,
      cancelledOperations: 0,
      averageDuration: 0,
      activeOperations: this.activeOperations.size
    };

    let totalDuration = 0;

    this.operationHistory.forEach(entry => {
      switch (entry.status) {
        case 'completed':
          if (entry.success) {
            stats.successfulOperations++;
          } else {
            stats.failedOperations++;
          }
          break;
        case 'failed':
          stats.failedOperations++;
          break;
        case 'cancelled':
          stats.cancelledOperations++;
          break;
      }
      totalDuration += entry.duration;
    });

    if (stats.totalOperations > 0) {
      stats.averageDuration = Math.round(totalDuration / stats.totalOperations);
    }

    return stats;
  }

  /**
   * Update notification configuration
   */
  public updateNotificationConfig(config: Partial<NotificationConfig>): void {
    this.notificationConfig = { ...this.notificationConfig, ...config };
    this.logger.info('Notification configuration updated', 'ProgressManager');
  }

  /**
   * Get notification configuration
   */
  public getNotificationConfig(): NotificationConfig {
    return { ...this.notificationConfig };
  }

  /**
   * Export operation history
   */
  public exportHistory(): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      statistics: this.getStatistics(),
      history: this.operationHistory
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Show progress with VSCode progress API
   */
  private showProgressWithNotification(operationId: string, title: string): void {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      (progress, token) => {
        return new Promise<void>((resolve, reject) => {
          // Store progress reporter
          this.progressReporters.set(operationId, progress);

          // Handle cancellation
          token.onCancellationRequested(() => {
            this.cancelOperation(operationId);
            reject(new Error('Operation cancelled by user'));
          });

          // Monitor operation completion
          const checkCompletion = () => {
            const operation = this.activeOperations.get(operationId);
            if (!operation) {
              resolve();
              return;
            }

            if (operation.status !== 'running') {
              resolve();
              return;
            }

            setTimeout(checkCompletion, 100);
          };

          checkCompletion();
        });
      }
    );
  }

  /**
   * Show completion notification
   */
  private showCompletionNotification(operation: OperationProgress): void {
    const message = `${operation.title} completed successfully in ${this.formatDuration(operation.duration!)}`;
    
    vscode.window.showInformationMessage(
      message,
      'Show Output',
      'View History'
    ).then(selection => {
      switch (selection) {
        case 'Show Output':
          if (operation.context.outputChannel) {
            operation.context.outputChannel.show();
          }
          break;
        case 'View History':
          this.showHistoryQuickPick();
          break;
      }
    });
  }

  /**
   * Show error notification
   */
  private showErrorNotification(operation: OperationProgress): void {
    const message = `${operation.title} failed after ${this.formatDuration(operation.duration!)}`;
    
    vscode.window.showErrorMessage(
      message,
      'Show Output',
      'View Details',
      'Retry'
    ).then(selection => {
      switch (selection) {
        case 'Show Output':
          if (operation.context.outputChannel) {
            operation.context.outputChannel.show();
          }
          break;
        case 'View Details':
          this.showOperationDetails(operation);
          break;
        case 'Retry':
          // Trigger retry command
          vscode.commands.executeCommand('bbdev.executeOperation', 
            operation.context.command, 
            operation.context.operation
          );
          break;
      }
    });
  }

  /**
   * Show operation details
   */
  private showOperationDetails(operation: OperationProgress): void {
    const details = [
      `Operation: ${operation.title}`,
      `Command: ${operation.context.command} ${operation.context.operation}`,
      `Status: ${operation.status}`,
      `Duration: ${this.formatDuration(operation.duration!)}`,
      `Started: ${operation.startTime.toLocaleString()}`,
      `Ended: ${operation.endTime?.toLocaleString() || 'N/A'}`
    ];

    if (operation.result) {
      details.push(`Return Code: ${operation.result.returnCode}`);
      if (operation.result.stderr) {
        details.push(`Error Output: ${operation.result.stderr.substring(0, 200)}...`);
      }
    }

    vscode.window.showInformationMessage(
      details.join('\n'),
      { modal: true }
    );
  }

  /**
   * Show history quick pick
   */
  private showHistoryQuickPick(): void {
    const history = this.getOperationHistory(20);
    
    if (history.length === 0) {
      vscode.window.showInformationMessage('No operation history available');
      return;
    }

    const items = history.map(entry => ({
      label: entry.title,
      description: `${entry.status} • ${this.formatDuration(entry.duration)}`,
      detail: `${entry.startTime.toLocaleString()} • ${entry.command} ${entry.operation}`,
      entry
    }));

    vscode.window.showQuickPick(items, {
      placeHolder: 'Select operation to view details'
    }).then(selected => {
      if (selected) {
        this.showHistoryEntryDetails(selected.entry);
      }
    });
  }

  /**
   * Show history entry details
   */
  private showHistoryEntryDetails(entry: OperationHistoryEntry): void {
    const details = [
      `Operation: ${entry.title}`,
      `Command: ${entry.command} ${entry.operation}`,
      `Status: ${entry.status}`,
      `Success: ${entry.success ? 'Yes' : 'No'}`,
      `Duration: ${this.formatDuration(entry.duration)}`,
      `Started: ${entry.startTime.toLocaleString()}`,
      `Ended: ${entry.endTime.toLocaleString()}`
    ];

    if (entry.returnCode !== undefined) {
      details.push(`Return Code: ${entry.returnCode}`);
    }

    if (entry.errorMessage) {
      details.push(`Error: ${entry.errorMessage}`);
    }

    vscode.window.showInformationMessage(
      details.join('\n'),
      { modal: true }
    );
  }

  /**
   * Add operation to history
   */
  private addToHistory(operation: OperationProgress): void {
    const historyEntry: OperationHistoryEntry = {
      id: operation.id,
      title: operation.title,
      command: operation.context.command,
      operation: operation.context.operation,
      startTime: operation.startTime,
      endTime: operation.endTime!,
      duration: operation.duration!,
      status: operation.status as 'completed' | 'failed' | 'cancelled',
      success: operation.result?.success || false,
      returnCode: operation.result?.returnCode,
      errorMessage: operation.result?.stderr
    };

    this.operationHistory.push(historyEntry);

    // Keep only last 100 entries
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100);
    }
  }

  /**
   * Clean up operation resources
   */
  private cleanupOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      // Dispose cancellation token
      if (operation.cancellationToken) {
        operation.cancellationToken.dispose();
      }
    }

    // Remove from active operations
    this.activeOperations.delete(operationId);
    
    // Remove progress reporter
    this.progressReporters.delete(operationId);
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Cancel all active operations
    this.activeOperations.forEach((operation, id) => {
      this.cancelOperation(id);
    });

    // Clear collections
    this.activeOperations.clear();
    this.progressReporters.clear();
    this.operationHistory = [];

    this.logger.info('ProgressManager disposed', 'ProgressManager');
  }
}