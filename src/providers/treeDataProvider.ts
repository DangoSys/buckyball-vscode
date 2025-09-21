import * as vscode from 'vscode';
import { BBDevTreeItem, CommandDefinition, OperationDefinition, ServerInstance, CommandPreset } from '../models/types';
import { BBDEV_COMMANDS } from '../models/commands';
import { ServerManager } from '../managers/serverManager';
import { ConfigurationManager } from '../managers/configurationManager';
import { CONTEXT_VALUES, ICONS } from '../models/constants';

/**
 * Tree data provider for BBDev commands and operations
 * Displays bbdev commands hierarchically in the VSCode sidebar
 */
export class BBDevTreeDataProvider implements vscode.TreeDataProvider<BBDevTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BBDevTreeItem | undefined | null | void> = new vscode.EventEmitter<BBDevTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<BBDevTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  private serverManager: ServerManager;
  private configurationManager: ConfigurationManager | undefined;

  constructor() {
    this.serverManager = ServerManager.getInstance();
    
    // Configuration manager will be set after extension context is available
    try {
      this.configurationManager = ConfigurationManager.getInstance();
    } catch {
      // Will be set later when context is available
    }
    
    // Refresh tree when servers change
    setInterval(() => {
      this.refresh();
    }, 5000); // Refresh every 5 seconds
  }

  /**
   * Set the configuration manager (called after extension context is available)
   */
  setConfigurationManager(configurationManager: ConfigurationManager): void {
    this.configurationManager = configurationManager;
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation for display
   */
  getTreeItem(element: BBDevTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
    
    treeItem.id = element.id;
    treeItem.description = element.description;
    treeItem.tooltip = element.tooltip;
    treeItem.contextValue = element.contextValue;
    treeItem.command = element.command;
    treeItem.iconPath = element.iconPath;

    return treeItem;
  }

  /**
   * Get children for a tree item
   */
  getChildren(element?: BBDevTreeItem): Thenable<BBDevTreeItem[]> {
    if (!element) {
      // Root level - return servers section, presets section, and commands section
      return Promise.resolve(this.getRootItems());
    } else if (element.contextValue === 'servers-section') {
      // Servers section - return all server instances
      return Promise.resolve(this.getServerItems());
    } else if (element.contextValue === 'presets-section') {
      // Presets section - return all presets
      return Promise.resolve(this.getPresetItems());
    } else if (element.contextValue === 'commands-section') {
      // Commands section - return all commands
      return Promise.resolve(this.getCommandItems());
    } else if (element.contextValue === 'bbdev-command') {
      // Command level - return operations for this command
      return Promise.resolve(this.getOperationItems(element.id));
    } else {
      // Operation level, server level, or preset level - no children
      return Promise.resolve([]);
    }
  }

  /**
   * Get root level items (servers, presets, and commands sections)
   */
  private getRootItems(): BBDevTreeItem[] {
    const items: BBDevTreeItem[] = [];
    
    // Servers section
    const runningServers = this.serverManager.getRunningServers();
    const allServers = this.serverManager.getAllServers();
    const serverCount = allServers.length;
    const runningCount = runningServers.length;
    
    let serverLabel = 'Servers';
    let serverDescription = '';
    
    if (serverCount === 0) {
      serverDescription = 'No servers';
    } else if (runningCount === 0) {
      serverDescription = `${serverCount} stopped`;
    } else if (runningCount === serverCount) {
      serverDescription = `${runningCount} running`;
    } else {
      serverDescription = `${runningCount}/${serverCount} running`;
    }
    
    items.push({
      id: 'servers',
      label: serverLabel,
      description: serverDescription,
      tooltip: this.createServersTooltip(allServers),
      contextValue: 'servers-section',
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      iconPath: new vscode.ThemeIcon(ICONS.SERVER_RUNNING),
      children: []
    });
    
    // Presets section
    const presets = this.configurationManager?.getPresets() || [];
    const presetCount = presets.length;
    
    items.push({
      id: 'presets',
      label: 'Presets',
      description: presetCount === 0 ? 'No presets' : `${presetCount} saved`,
      tooltip: this.createPresetsTooltip(presets),
      contextValue: 'presets-section',
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      iconPath: new vscode.ThemeIcon(ICONS.PRESET_FOLDER),
      children: []
    });
    
    // Commands section
    items.push({
      id: 'commands',
      label: 'Commands',
      description: `${BBDEV_COMMANDS.length} available`,
      tooltip: 'BBDev commands and operations',
      contextValue: 'commands-section',
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      iconPath: new vscode.ThemeIcon(ICONS.COMMAND),
      children: []
    });
    
    return items;
  }

  /**
   * Get tree items for all server instances
   */
  private getServerItems(): BBDevTreeItem[] {
    const servers = this.serverManager.getAllServers();
    
    if (servers.length === 0) {
      return [{
        id: 'no-servers',
        label: 'No servers',
        description: 'Click to start a server',
        tooltip: 'No BBDev servers are currently configured.\nClick to start a new server.',
        contextValue: 'no-servers',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        iconPath: new vscode.ThemeIcon(ICONS.INFO),
        command: {
          command: 'bbdev.startServer',
          title: 'Start Server'
        }
      }];
    }
    
    return servers.map(server => this.createServerItem(server));
  }

  /**
   * Get tree items for all presets
   */
  private getPresetItems(): BBDevTreeItem[] {
    if (!this.configurationManager) {
      return [{
        id: 'no-presets',
        label: 'No presets',
        description: 'Save commands as presets for quick access',
        tooltip: 'No presets saved yet.\nExecute a command and save it as a preset for quick access.',
        contextValue: 'no-presets',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        iconPath: new vscode.ThemeIcon(ICONS.INFO),
        children: []
      }];
    }
    
    const presets = this.configurationManager.getPresets();
    
    if (presets.length === 0) {
      return [{
        id: 'no-presets',
        label: 'No presets',
        description: 'Save commands as presets for quick access',
        tooltip: 'No presets saved yet.\nExecute a command and save it as a preset for quick access.',
        contextValue: 'no-presets',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        iconPath: new vscode.ThemeIcon(ICONS.INFO),
        children: []
      }];
    }
    
    return presets.map(preset => this.createPresetItem(preset));
  }

  /**
   * Get tree items for all bbdev commands
   */
  private getCommandItems(): BBDevTreeItem[] {
    return BBDEV_COMMANDS.map(command => this.createCommandItem(command));
  }

  /**
   * Create a tree item for a server instance
   */
  private createServerItem(server: ServerInstance): BBDevTreeItem {
    const tooltip = this.createServerTooltip(server);
    const contextValue = server.status === 'running' ? CONTEXT_VALUES.SERVER_RUNNING : CONTEXT_VALUES.SERVER_STOPPED;
    
    let label = `Port ${server.port}`;
    let description = server.status;
    let iconPath: vscode.ThemeIcon;
    
    switch (server.status) {
      case 'running':
        iconPath = new vscode.ThemeIcon(ICONS.SERVER_RUNNING);
        description = 'running';
        break;
      case 'starting':
        iconPath = new vscode.ThemeIcon(ICONS.SERVER_RUNNING);
        description = 'starting';
        break;
      case 'stopping':
        iconPath = new vscode.ThemeIcon(ICONS.SERVER_STOPPED);
        description = 'stopping';
        break;
      case 'error':
        iconPath = new vscode.ThemeIcon(ICONS.ERROR);
        description = 'error';
        break;
      default:
        iconPath = new vscode.ThemeIcon(ICONS.SERVER_STOPPED);
        description = 'stopped';
    }
    
    return {
      id: `server-${server.port}`,
      label,
      description,
      tooltip,
      contextValue,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      iconPath,
      children: []
    };
  }

  /**
   * Create a tree item for a preset
   */
  private createPresetItem(preset: CommandPreset): BBDevTreeItem {
    const tooltip = this.createPresetTooltip(preset);
    
    return {
      id: `preset-${preset.id}`,
      label: preset.name,
      description: `${preset.command} ${preset.operation}`,
      tooltip,
      contextValue: CONTEXT_VALUES.PRESET,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      iconPath: new vscode.ThemeIcon(ICONS.PRESET),
      command: {
        command: 'bbdev.executePreset',
        title: 'Execute Preset',
        arguments: [preset.id]
      }
    };
  }

  /**
   * Create a tree item for a bbdev command
   */
  private createCommandItem(command: CommandDefinition): BBDevTreeItem {
    const tooltip = this.createCommandTooltip(command);
    
    return {
      id: command.name,
      label: command.name,
      description: command.description,
      tooltip,
      contextValue: 'bbdev-command',
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      iconPath: new vscode.ThemeIcon('folder'),
      children: []
    };
  }

  /**
   * Get tree items for operations of a specific command
   */
  private getOperationItems(commandName: string): BBDevTreeItem[] {
    const command = BBDEV_COMMANDS.find(cmd => cmd.name === commandName);
    if (!command) {
      return [];
    }

    return command.operations.map(operation => this.createOperationItem(commandName, operation));
  }

  /**
   * Create a tree item for a bbdev operation
   */
  private createOperationItem(commandName: string, operation: OperationDefinition): BBDevTreeItem {
    const tooltip = this.createOperationTooltip(commandName, operation);
    const operationId = `${commandName}.${operation.name}`;
    
    return {
      id: operationId,
      label: operation.name,
      description: operation.description,
      tooltip,
      contextValue: 'bbdev-operation',
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      iconPath: this.getOperationIcon(operation),
      command: {
        command: 'bbdev.executeOperation',
        title: 'Execute Operation',
        arguments: [commandName, operation.name]
      }
    };
  }

  /**
   * Create tooltip for presets section
   */
  private createPresetsTooltip(presets: CommandPreset[]): string {
    if (presets.length === 0) {
      return 'No presets saved yet.\n\nExecute a command and save it as a preset for quick access.\nPresets allow you to save frequently used command configurations.';
    }
    
    let tooltip = `**Saved Presets (${presets.length})**\n\n`;
    
    presets.slice(0, 5).forEach(preset => {
      tooltip += `• **${preset.name}**: ${preset.command} ${preset.operation}\n`;
      if (preset.description) {
        tooltip += `  ${preset.description}\n`;
      }
    });
    
    if (presets.length > 5) {
      tooltip += `\n...and ${presets.length - 5} more presets`;
    }
    
    tooltip += '\n\n**Actions:**\n';
    tooltip += '• Click on a preset to execute it\n';
    tooltip += '• Right-click for more options (edit, delete, export)';
    
    return tooltip;
  }

  /**
   * Create tooltip for servers section
   */
  private createServersTooltip(servers: ServerInstance[]): string {
    if (servers.length === 0) {
      return 'No BBDev servers are currently running.\nUse the "Start Server" command to start a new server.';
    }
    
    let tooltip = `**BBDev Servers (${servers.length})**\n\n`;
    
    servers.forEach(server => {
      const status = server.status === 'running' ? '🟢' : 
                    server.status === 'starting' ? '🟡' : 
                    server.status === 'stopping' ? '🟡' : 
                    server.status === 'error' ? '🔴' : '⚫';
      
      tooltip += `${status} Port ${server.port}: ${server.status}`;
      if (server.status === 'running' && server.startTime) {
        const uptime = Math.floor((Date.now() - server.startTime.getTime()) / 1000);
        tooltip += ` (${this.formatUptime(uptime)})`;
      }
      tooltip += '\n';
    });
    
    return tooltip;
  }

  /**
   * Create tooltip for a server instance
   */
  private createServerTooltip(server: ServerInstance): string {
    let tooltip = `**BBDev Server - Port ${server.port}**\n\n`;
    tooltip += `Status: ${server.status}\n`;
    tooltip += `URL: ${server.url}\n`;
    
    if (server.workspaceRoot) {
      tooltip += `Workspace: ${server.workspaceRoot}\n`;
    }
    
    if (server.pid) {
      tooltip += `PID: ${server.pid}\n`;
    }
    
    if (server.startTime) {
      tooltip += `Started: ${server.startTime.toLocaleString()}\n`;
      
      if (server.status === 'running') {
        const uptime = Math.floor((Date.now() - server.startTime.getTime()) / 1000);
        tooltip += `Uptime: ${this.formatUptime(uptime)}\n`;
      }
    }
    
    if (server.status === 'running') {
      tooltip += '\n**Actions:**\n';
      tooltip += '• Right-click for more options\n';
      tooltip += '• Click "Open in Browser" to view web interface\n';
      tooltip += '• Click "Stop Server" to stop this server';
    } else if (server.status === 'stopped') {
      tooltip += '\n**Actions:**\n';
      tooltip += '• Right-click to start server\n';
      tooltip += '• Click "Start Server" to restart this server';
    }
    
    return tooltip;
  }

  /**
   * Create tooltip for a command showing available operations
   */
  private createCommandTooltip(command: CommandDefinition): string {
    const operationsList = command.operations.map(op => `• ${op.name}: ${op.description}`).join('\n');
    
    return `**${command.name}**\n\n${command.description || 'BBDev command'}\n\n**Operations:**\n${operationsList}`;
  }

  /**
   * Create tooltip for an operation showing description and arguments
   */
  private createOperationTooltip(commandName: string, operation: OperationDefinition): string {
    let tooltip = `**${commandName} ${operation.name}**\n\n${operation.description}`;
    
    if (operation.arguments.length > 0) {
      tooltip += '\n\n**Arguments:**\n';
      operation.arguments.forEach(arg => {
        const required = arg.required ? '(required)' : '(optional)';
        const defaultValue = arg.default !== undefined ? ` [default: ${arg.default}]` : '';
        tooltip += `• **${arg.name}** ${required}: ${arg.description}${defaultValue}\n`;
      });
    } else {
      tooltip += '\n\n*No arguments required*';
    }

    if (operation.examples && operation.examples.length > 0) {
      tooltip += '\n**Examples:**\n';
      operation.examples.forEach(example => {
        tooltip += `• ${example}\n`;
      });
    }

    return tooltip;
  }

  /**
   * Create tooltip for a preset showing its configuration
   */
  private createPresetTooltip(preset: CommandPreset): string {
    let tooltip = `**${preset.name}**\n\n`;
    
    if (preset.description) {
      tooltip += `${preset.description}\n\n`;
    }
    
    tooltip += `**Command:** ${preset.command} ${preset.operation}\n`;
    
    if (Object.keys(preset.arguments).length > 0) {
      tooltip += '\n**Arguments:**\n';
      Object.entries(preset.arguments).forEach(([key, value]) => {
        tooltip += `• **${key}**: ${value}\n`;
      });
    } else {
      tooltip += '\n*No arguments configured*';
    }
    
    if (preset.tags && preset.tags.length > 0) {
      tooltip += `\n**Tags:** ${preset.tags.join(', ')}`;
    }
    
    tooltip += `\n\n**Created:** ${preset.createdAt.toLocaleDateString()}`;
    
    if (preset.lastUsed) {
      tooltip += `\n**Last Used:** ${preset.lastUsed.toLocaleDateString()}`;
    }
    
    tooltip += '\n\n**Actions:**\n';
    tooltip += '• Click to execute this preset\n';
    tooltip += '• Right-click for more options (edit, delete, duplicate)';
    
    return tooltip;
  }

  /**
   * Get appropriate icon for an operation based on its type
   */
  private getOperationIcon(operation: OperationDefinition): vscode.ThemeIcon {
    const name = operation.name.toLowerCase();
    
    if (name.includes('clean')) {
      return new vscode.ThemeIcon('trash');
    } else if (name.includes('build')) {
      return new vscode.ThemeIcon('tools');
    } else if (name.includes('run') || name.includes('sim')) {
      return new vscode.ThemeIcon('play');
    } else if (name.includes('start')) {
      return new vscode.ThemeIcon('play-circle');
    } else if (name.includes('stop')) {
      return new vscode.ThemeIcon('stop-circle');
    } else if (name.includes('status')) {
      return new vscode.ThemeIcon('info');
    } else if (name.includes('list')) {
      return new vscode.ThemeIcon('list-unordered');
    } else if (name.includes('serve')) {
      return new vscode.ThemeIcon('server');
    } else if (name.includes('test')) {
      return new vscode.ThemeIcon('beaker');
    } else if (name.includes('pack') || name.includes('unpack')) {
      return new vscode.ThemeIcon('package');
    } else {
      return new vscode.ThemeIcon('gear');
    }
  }

  /**
   * Find a tree item by its ID
   */
  findTreeItem(id: string): BBDevTreeItem | undefined {
    // Check if it's a command
    const command = BBDEV_COMMANDS.find(cmd => cmd.name === id);
    if (command) {
      return this.createCommandItem(command);
    }

    // Check if it's an operation (format: command.operation)
    const parts = id.split('.');
    if (parts.length === 2) {
      const [commandName, operationName] = parts;
      const cmd = BBDEV_COMMANDS.find(c => c.name === commandName);
      const operation = cmd?.operations.find(op => op.name === operationName);
      
      if (cmd && operation) {
        return this.createOperationItem(commandName, operation);
      }
    }

    return undefined;
  }

  /**
   * Get parent of a tree item
   */
  getParent(element: BBDevTreeItem): vscode.ProviderResult<BBDevTreeItem> {
    if (element.contextValue === 'bbdev-operation') {
      // Operation's parent is its command
      const parts = element.id.split('.');
      if (parts.length === 2) {
        const commandName = parts[0];
        const command = BBDEV_COMMANDS.find(cmd => cmd.name === commandName);
        if (command) {
          return this.createCommandItem(command);
        }
      }
    } else if (element.contextValue === 'bbdev-command') {
      // Command's parent is the commands section
      return {
        id: 'commands',
        label: 'Commands',
        description: `${BBDEV_COMMANDS.length} available`,
        tooltip: 'BBDev commands and operations',
        contextValue: 'commands-section',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        iconPath: new vscode.ThemeIcon(ICONS.COMMAND),
        children: []
      };
    } else if (element.contextValue === CONTEXT_VALUES.PRESET) {
      // Preset's parent is the presets section
      const presets = this.configurationManager?.getPresets() || [];
      const presetCount = presets.length;
      
      return {
        id: 'presets',
        label: 'Presets',
        description: presetCount === 0 ? 'No presets' : `${presetCount} saved`,
        tooltip: this.createPresetsTooltip(presets),
        contextValue: 'presets-section',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        iconPath: new vscode.ThemeIcon(ICONS.PRESET_FOLDER),
        children: []
      };
    } else if (element.contextValue === CONTEXT_VALUES.SERVER_RUNNING || element.contextValue === CONTEXT_VALUES.SERVER_STOPPED) {
      // Server's parent is the servers section
      const allServers = this.serverManager.getAllServers();
      const runningServers = this.serverManager.getRunningServers();
      const serverCount = allServers.length;
      const runningCount = runningServers.length;
      
      let serverDescription = '';
      if (serverCount === 0) {
        serverDescription = 'No servers';
      } else if (runningCount === 0) {
        serverDescription = `${serverCount} stopped`;
      } else if (runningCount === serverCount) {
        serverDescription = `${runningCount} running`;
      } else {
        serverDescription = `${runningCount}/${serverCount} running`;
      }
      
      return {
        id: 'servers',
        label: 'Servers',
        description: serverDescription,
        tooltip: this.createServersTooltip(allServers),
        contextValue: 'servers-section',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        iconPath: new vscode.ThemeIcon(ICONS.SERVER_RUNNING),
        children: []
      };
    }
    
    // Root level items have no parent
    return null;
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Get server instance by tree item ID
   */
  getServerByTreeItemId(id: string): ServerInstance | undefined {
    if (id.startsWith('server-')) {
      const port = parseInt(id.replace('server-', ''), 10);
      if (!isNaN(port)) {
        return this.serverManager.getServer(port);
      }
    }
    return undefined;
  }
}