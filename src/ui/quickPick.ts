import * as vscode from 'vscode';

/**
 * QuickPick Manager - 快速选择菜单
 */
export class QuickPickManager {
  
  // 简单选择
  static async showSimplePick(
    items: string[],
    options?: vscode.QuickPickOptions
  ): Promise<string | undefined> {
    return vscode.window.showQuickPick(items, options);
  }

  // 多选
  static async showMultiPick(
    items: string[],
    options?: vscode.QuickPickOptions
  ): Promise<string[] | undefined> {
    return vscode.window.showQuickPick(items, { ...options, canPickMany: true });
  }

  // 带图标和描述的选择
  static async showAdvancedPick<T extends vscode.QuickPickItem>(
    items: T[],
    options?: vscode.QuickPickOptions
  ): Promise<T | undefined> {
    return vscode.window.showQuickPick(items, options);
  }

  // 自定义 QuickPick（可以动态更新）
  static createCustomPick<T extends vscode.QuickPickItem>(): vscode.QuickPick<T> {
    const quickPick = vscode.window.createQuickPick<T>();
    quickPick.placeholder = 'Select an option...';
    return quickPick;
  }
}

