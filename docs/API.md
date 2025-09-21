# BBDev VSCode Extension API Documentation

This document provides comprehensive API documentation for developers who want to extend or integrate with the BBDev VSCode Extension.

## 📋 Table of Contents

- [Core Interfaces](#core-interfaces)
- [Managers](#managers)
- [Providers](#providers)
- [Commands](#commands)
- [Events](#events)
- [Configuration](#configuration)
- [Extension Points](#extension-points)

## 🔧 Core Interfaces

### CommandDefinition

Defines the structure of a bbdev command.

```typescript
interface CommandDefinition {
  /** Unique command name (e.g., 'verilator', 'vcs') */
  name: string;
  
  /** Human-readable display name */
  displayName?: string;
  
  /** Command description */
  description?: string;
  
  /** Available operations for this command */
  operations: OperationDefinition[];
  
  /** Command category for grouping */
  category?: string;
  
  /** Icon identifier for tree view */
  icon?: string;
}
```

### OperationDefinition

Defines an operation within a command.

```typescript
interface OperationDefinition {
  /** Operation name (e.g., 'build', 'run', 'clean') */
  name: string;
  
  /** Human-readable display name */
  displayName?: string;
  
  /** Operation description */
  description: string;
  
  /** Required and optional arguments */
  arguments: ArgumentDefinition[];
  
  /** Usage examples */
  examples?: string[];
  
  /** Estimated execution time in seconds */
  estimatedDuration?: number;
  
  /** Whether this operation requires server */
  requiresServer?: boolean;
}
```

### ArgumentDefinition

Defines command arguments and their validation.

```typescript
interface ArgumentDefinition {
  /** Argument name */
  name: string;
  
  /** Argument type */
  type: 'string' | 'number' | 'boolean' | 'file' | 'directory' | 'choice';
  
  /** Whether argument is required */
  required: boolean;
  
  /** Argument description */
  description: string;
  
  /** Default value */
  default?: any;
  
  /** Valid choices (for 'choice' type) */
  choices?: string[];
  
  /** Validation pattern (for 'string' type) */
  pattern?: string;
  
  /** Minimum value (for 'number' type) */
  min?: number;
  
  /** Maximum value (for 'number' type) */
  max?: number;
  
  /** File extensions filter (for 'file' type) */
  extensions?: string[];
}
```

### ExecutionContext

Context information for command execution.

```typescript
interface ExecutionContext {
  /** Command name */
  command: string;
  
  /** Operation name */
  operation: string;
  
  /** Parsed arguments */
  arguments: Record<string, any>;
  
  /** Workspace root directory */
  workspaceRoot: string;
  
  /** Output channel for logging */
  outputChannel: vscode.OutputChannel;
  
  /** Cancellation token */
  cancellationToken?: vscode.CancellationToken;
  
  /** Progress reporter */
  progress?: vscode.Progress<{ message?: string; increment?: number }>;
}
```

### ExecutionResult

Result of command execution.

```typescript
interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Process exit code */
  returnCode: number;
  
  /** Standard output */
  stdout: string;
  
  /** Standard error */
  stderr: string;
  
  /** Execution duration in milliseconds */
  duration: number;
  
  /** Start time */
  startTime: Date;
  
  /** End time */
  endTime: Date;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}
```

## 🎛️ Managers

### CommandManager

Handles command execution and management.

```typescript
class CommandManager {
  /**
   * Execute a bbdev command
   * @param context Execution context
   * @returns Promise resolving to execution result
   */
  async executeCommand(context: ExecutionContext): Promise<ExecutionResult>;
  
  /**
   * Validate command arguments
   * @param command Command name
   * @param operation Operation name
   * @param args Arguments to validate
   * @returns Validation result
   */
  validateArguments(
    command: string, 
    operation: string, 
    args: Record<string, any>
  ): ValidationResult;
  
  /**
   * Get command definition
   * @param command Command name
   * @returns Command definition or undefined
   */
  getCommandDefinition(command: string): CommandDefinition | undefined;
  
  /**
   * Get all available commands
   * @returns Array of command definitions
   */
  getAllCommands(): CommandDefinition[];
  
  /**
   * Cancel running command
   * @param executionId Execution identifier
   */
  cancelExecution(executionId: string): void;
  
  /**
   * Get execution history
   * @param limit Maximum number of entries
   * @returns Array of execution results
   */
  getExecutionHistory(limit?: number): ExecutionResult[];
}
```

### ServerManager

Manages bbdev server instances.

```typescript
class ServerManager {
  /**
   * Start a new server instance
   * @param port Port number (optional)
   * @returns Promise resolving to server instance
   */
  async startServer(port?: number): Promise<ServerInstance>;
  
  /**
   * Stop a server instance
   * @param port Port number
   * @returns Promise resolving when server is stopped
   */
  async stopServer(port: number): Promise<void>;
  
  /**
   * Stop all running servers
   * @returns Promise resolving when all servers are stopped
   */
  async stopAllServers(): Promise<void>;
  
  /**
   * Get running server instances
   * @returns Array of server instances
   */
  getRunningServers(): ServerInstance[];
  
  /**
   * Get server status
   * @param port Port number
   * @returns Server status
   */
  async getServerStatus(port: number): Promise<ServerStatus>;
  
  /**
   * Check if port is available
   * @param port Port number
   * @returns Whether port is available
   */
  async isPortAvailable(port: number): Promise<boolean>;
}
```

### ConfigurationManager

Handles extension configuration and presets.

```typescript
class ConfigurationManager {
  /**
   * Save a command preset
   * @param preset Preset to save
   * @param scope Configuration scope
   */
  async savePreset(preset: CommandPreset, scope: ConfigurationScope): Promise<void>;
  
  /**
   * Load presets
   * @param scope Configuration scope
   * @returns Array of presets
   */
  async loadPresets(scope: ConfigurationScope): Promise<CommandPreset[]>;
  
  /**
   * Delete a preset
   * @param presetId Preset identifier
   * @param scope Configuration scope
   */
  async deletePreset(presetId: string, scope: ConfigurationScope): Promise<void>;
  
  /**
   * Get configuration value
   * @param key Configuration key
   * @returns Configuration value
   */
  getConfiguration<T>(key: string): T | undefined;
  
  /**
   * Update configuration value
   * @param key Configuration key
   * @param value New value
   * @param scope Configuration scope
   */
  async updateConfiguration<T>(
    key: string, 
    value: T, 
    scope: ConfigurationScope
  ): Promise<void>;
  
  /**
   * Export presets to file
   * @param filePath Export file path
   * @param presets Presets to export
   */
  async exportPresets(filePath: string, presets: CommandPreset[]): Promise<void>;
  
  /**
   * Import presets from file
   * @param filePath Import file path
   * @returns Imported presets
   */
  async importPresets(filePath: string): Promise<CommandPreset[]>;
}
```

## 🌳 Providers

### BBDevTreeDataProvider

Provides data for the command tree view.

```typescript
class BBDevTreeDataProvider implements vscode.TreeDataProvider<BBDevTreeItem> {
  /**
   * Get tree item representation
   * @param element Tree element
   * @returns Tree item
   */
  getTreeItem(element: BBDevTreeItem): vscode.TreeItem;
  
  /**
   * Get children of tree element
   * @param element Parent element
   * @returns Children elements
   */
  getChildren(element?: BBDevTreeItem): Thenable<BBDevTreeItem[]>;
  
  /**
   * Refresh tree view
   */
  refresh(): void;
  
  /**
   * Reveal tree item
   * @param item Item to reveal
   */
  reveal(item: BBDevTreeItem): void;
}
```

### WebviewProvider

Provides webview panels for command forms.

```typescript
class WebviewProvider {
  /**
   * Create command execution form
   * @param command Command name
   * @param operation Operation name
   * @returns Webview panel
   */
  createCommandForm(command: string, operation: string): vscode.WebviewPanel;
  
  /**
   * Create server status view
   * @returns Webview panel
   */
  createServerStatusView(): vscode.WebviewPanel;
  
  /**
   * Create preset management view
   * @returns Webview panel
   */
  createPresetManagementView(): vscode.WebviewPanel;
}
```

## 📡 Commands

### Registered Commands

All commands registered by the extension:

#### Core Commands
- `bbdev.refreshCommands` - Refresh command tree
- `bbdev.executeCommand` - Execute selected command
- `bbdev.executeOperation` - Execute specific operation
- `bbdev.quickCommand` - Quick command execution

#### Server Commands
- `bbdev.startServer` - Start bbdev server
- `bbdev.stopServer` - Stop bbdev server
- `bbdev.stopAllServers` - Stop all servers
- `bbdev.refreshServerStatus` - Refresh server status
- `bbdev.openInBrowser` - Open server in browser

#### Preset Commands
- `bbdev.savePreset` - Save command as preset
- `bbdev.executePreset` - Execute saved preset
- `bbdev.editPreset` - Edit existing preset
- `bbdev.deletePreset` - Delete preset
- `bbdev.duplicatePreset` - Duplicate preset
- `bbdev.exportPresets` - Export presets to file
- `bbdev.importPresets` - Import presets from file

#### Utility Commands
- `bbdev.validateInstallation` - Validate bbdev installation
- `bbdev.validateWorkspace` - Validate workspace configuration
- `bbdev.runSetupWizard` - Run setup wizard
- `bbdev.showSetupGuide` - Show setup guide
- `bbdev.showOutput` - Show output channel
- `bbdev.clearOutput` - Clear output channel

### Command Registration

```typescript
// Register a new command
vscode.commands.registerCommand('bbdev.customCommand', async (...args) => {
  // Command implementation
});

// Register command with context
context.subscriptions.push(
  vscode.commands.registerCommand('bbdev.customCommand', handler)
);
```

## 📢 Events

### Event Emitters

The extension provides several event emitters for integration:

```typescript
// Command execution events
export const onCommandStarted: vscode.Event<ExecutionContext>;
export const onCommandCompleted: vscode.Event<ExecutionResult>;
export const onCommandFailed: vscode.Event<ExecutionError>;

// Server events
export const onServerStarted: vscode.Event<ServerInstance>;
export const onServerStopped: vscode.Event<ServerInstance>;
export const onServerStatusChanged: vscode.Event<ServerStatusChange>;

// Configuration events
export const onPresetSaved: vscode.Event<CommandPreset>;
export const onPresetDeleted: vscode.Event<string>;
export const onConfigurationChanged: vscode.Event<ConfigurationChange>;
```

### Event Subscription

```typescript
// Subscribe to command completion events
const disposable = onCommandCompleted((result: ExecutionResult) => {
  console.log(`Command completed: ${result.success ? 'success' : 'failure'}`);
});

// Don't forget to dispose
context.subscriptions.push(disposable);
```

## ⚙️ Configuration

### Configuration Schema

```typescript
interface BBDevConfiguration {
  /** Default port for bbdev server */
  defaultPort: number;
  
  /** Automatically start server on activation */
  autoStartServer: boolean;
  
  /** Show output panel when executing commands */
  showOutputOnExecution: boolean;
  
  /** Path to bbdev executable */
  bbdevPath: string;
  
  /** Perform initial validation */
  performInitialValidation: boolean;
  
  /** Show validation notifications */
  showValidationNotifications: boolean;
  
  /** Automatically fix validation issues */
  autoFixValidationIssues: boolean;
  
  /** Validation level */
  validationLevel: 'strict' | 'normal' | 'minimal';
}
```

### Configuration Access

```typescript
// Get configuration value
const config = vscode.workspace.getConfiguration('bbdev');
const defaultPort = config.get<number>('defaultPort', 8080);

// Update configuration
await config.update('defaultPort', 8081, vscode.ConfigurationTarget.Workspace);

// Listen for configuration changes
vscode.workspace.onDidChangeConfiguration((event) => {
  if (event.affectsConfiguration('bbdev')) {
    // Handle configuration change
  }
});
```

## 🔌 Extension Points

### Custom Command Providers

Extend the extension with custom command providers:

```typescript
interface CustomCommandProvider {
  /** Provider identifier */
  id: string;
  
  /** Get available commands */
  getCommands(): Promise<CommandDefinition[]>;
  
  /** Execute command */
  executeCommand(context: ExecutionContext): Promise<ExecutionResult>;
  
  /** Validate arguments */
  validateArguments(
    command: string, 
    operation: string, 
    args: Record<string, any>
  ): ValidationResult;
}

// Register custom provider
export function registerCommandProvider(provider: CustomCommandProvider): void;
```

### Custom Tree Items

Add custom items to the tree view:

```typescript
interface CustomTreeItemProvider {
  /** Provider identifier */
  id: string;
  
  /** Get tree items */
  getTreeItems(): Promise<BBDevTreeItem[]>;
  
  /** Handle tree item selection */
  onTreeItemSelected(item: BBDevTreeItem): Promise<void>;
}

// Register custom tree item provider
export function registerTreeItemProvider(provider: CustomTreeItemProvider): void;
```

### Middleware

Add middleware for command execution:

```typescript
interface ExecutionMiddleware {
  /** Middleware name */
  name: string;
  
  /** Execute before command */
  beforeExecution?(context: ExecutionContext): Promise<ExecutionContext>;
  
  /** Execute after command */
  afterExecution?(
    context: ExecutionContext, 
    result: ExecutionResult
  ): Promise<ExecutionResult>;
  
  /** Handle execution error */
  onError?(
    context: ExecutionContext, 
    error: Error
  ): Promise<void>;
}

// Register middleware
export function registerExecutionMiddleware(middleware: ExecutionMiddleware): void;
```

## 🔍 Utilities

### Logging

```typescript
import { Logger } from './utils/logger';

const logger = Logger.getLogger('MyComponent');

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message', error);
logger.debug('Debug message');
```

### File Operations

```typescript
import { FileUtils } from './utils/fileUtils';

// Check if file exists
const exists = await FileUtils.exists('/path/to/file');

// Read file content
const content = await FileUtils.readFile('/path/to/file');

// Write file content
await FileUtils.writeFile('/path/to/file', content);

// Get workspace relative path
const relativePath = FileUtils.getWorkspaceRelativePath('/absolute/path');
```

### Process Execution

```typescript
import { ProcessUtils } from './utils/processUtils';

// Execute command
const result = await ProcessUtils.execute('bbdev', ['--version'], {
  cwd: '/workspace/path',
  timeout: 30000
});

// Execute with progress
const result = await ProcessUtils.executeWithProgress(
  'bbdev', 
  ['build'], 
  progress,
  cancellationToken
);
```

## 📝 Examples

### Custom Command Integration

```typescript
import * as vscode from 'vscode';
import { CommandManager, ExecutionContext } from 'bbdev-extension';

export class CustomCommandIntegration {
  private commandManager: CommandManager;
  
  constructor(commandManager: CommandManager) {
    this.commandManager = commandManager;
  }
  
  async executeCustomWorkflow(): Promise<void> {
    const context: ExecutionContext = {
      command: 'verilator',
      operation: 'build',
      arguments: { job: 8 },
      workspaceRoot: vscode.workspace.rootPath || '',
      outputChannel: vscode.window.createOutputChannel('Custom Workflow')
    };
    
    try {
      const result = await this.commandManager.executeCommand(context);
      if (result.success) {
        vscode.window.showInformationMessage('Build completed successfully!');
      } else {
        vscode.window.showErrorMessage('Build failed!');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  }
}
```

### Custom Tree Item Provider

```typescript
import { BBDevTreeItem, CustomTreeItemProvider } from 'bbdev-extension';

export class MyCustomProvider implements CustomTreeItemProvider {
  id = 'my-custom-provider';
  
  async getTreeItems(): Promise<BBDevTreeItem[]> {
    return [
      {
        id: 'custom-item-1',
        label: 'Custom Item 1',
        description: 'My custom tree item',
        contextValue: 'custom-item',
        command: {
          command: 'my.custom.command',
          title: 'Execute Custom Command'
        }
      }
    ];
  }
  
  async onTreeItemSelected(item: BBDevTreeItem): Promise<void> {
    vscode.window.showInformationMessage(`Selected: ${item.label}`);
  }
}
```

---

This API documentation provides a comprehensive overview of the BBDev VSCode Extension's programmatic interface. For more examples and detailed usage, please refer to the source code and additional documentation files.