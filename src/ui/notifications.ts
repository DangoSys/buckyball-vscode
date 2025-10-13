import * as vscode from 'vscode';

/**
 * Notification Manager - 统一管理各种通知
 */
export class NotificationManager {
  
  static showInfo(message: string, ...actions: string[]): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...actions);
  }

  static showWarning(message: string, ...actions: string[]): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message, ...actions);
  }

  static showError(message: string, ...actions: string[]): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...actions);
  }

  static async showProgress<T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      task
    );
  }

  // 显示带进度的任务
  static async showTask(title: string, steps: Array<{ message: string; action: () => Promise<void> }>) {
    return this.showProgress(title, async (progress) => {
      const increment = 100 / steps.length;
      for (const step of steps) {
        progress.report({ message: step.message, increment });
        await step.action();
      }
    });
  }
}

