import * as vscode from 'vscode';

// TreeView 数据项
class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: TreeItem[]
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label} - Custom tooltip`;
    this.description = 'example';
  }
}

// TreeView 数据提供者
export class TreeViewProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private data: TreeItem[] = [
    new TreeItem('Build Tools', vscode.TreeItemCollapsibleState.Collapsed, [
      new TreeItem('Verilator', vscode.TreeItemCollapsibleState.None),
      new TreeItem('VCS', vscode.TreeItemCollapsibleState.None),
      new TreeItem('Vivado', vscode.TreeItemCollapsibleState.None)
    ]),
    new TreeItem('Tests', vscode.TreeItemCollapsibleState.Collapsed, [
      new TreeItem('Unit Tests', vscode.TreeItemCollapsibleState.None),
      new TreeItem('Integration Tests', vscode.TreeItemCollapsibleState.None)
    ]),
    new TreeItem('Documentation', vscode.TreeItemCollapsibleState.None)
  ];

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      return Promise.resolve(this.data);
    }
    return Promise.resolve(element.children || []);
  }
}

