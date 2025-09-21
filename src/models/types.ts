import * as vscode from 'vscode';

/**
 * Represents a bbdev command definition with its operations
 */
export interface CommandDefinition {
  name: string;
  description?: string;
  operations: OperationDefinition[];
}

/**
 * Represents an operation within a bbdev command
 */
export interface OperationDefinition {
  name: string;
  description: string;
  arguments: ArgumentDefinition[];
  examples?: string[];
}

/**
 * Represents an argument for a bbdev operation
 */
export interface ArgumentDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'directory' | 'choice';
  required: boolean;
  description: string;
  default?: any;
  choices?: string[];
}

/**
 * Represents a tree item in the bbdev commands view
 */
export interface BBDevTreeItem {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  contextValue: string;
  children?: BBDevTreeItem[];
  command?: vscode.Command;
  iconPath?: vscode.ThemeIcon;
  collapsibleState?: vscode.TreeItemCollapsibleState;
}

/**
 * Execution context for running bbdev commands
 */
export interface ExecutionContext {
  command: string;
  operation: string;
  arguments: Record<string, any>;
  workspaceRoot: string;
  outputChannel: vscode.OutputChannel;
  cancellationToken?: vscode.CancellationToken;
}

/**
 * Result of executing a bbdev command
 */
export interface ExecutionResult {
  success: boolean;
  returnCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Represents a running bbdev server instance
 */
export interface ServerInstance {
  port: number;
  pid?: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime?: Date;
  url: string;
  workspaceRoot?: string;
}

/**
 * Saved command preset for quick execution
 */
export interface CommandPreset {
  id: string;
  name: string;
  command: string;
  operation: string;
  arguments: Record<string, any>;
  description?: string;
  tags?: string[];
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Extension configuration settings
 */
export interface ExtensionSettings {
  defaultPort: number;
  autoStartServer: boolean;
  showOutputOnExecution: boolean;
  bbdevPath: string;
  presets: CommandPreset[];
  recentCommands: ExecutionContext[];
  maxRecentCommands: number;
}

/**
 * Error types for bbdev operations
 */
export type BBDevErrorCategory = 'command' | 'server' | 'filesystem' | 'network' | 'validation';

/**
 * Custom error class for bbdev operations
 */
export class BBDevError extends Error {
  constructor(
    message: string,
    public category: BBDevErrorCategory,
    public details?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BBDevError';
  }
}

/**
 * Progress information for long-running operations
 */
export interface ProgressInfo {
  message: string;
  increment?: number;
  total?: number;
  current?: number;
}

/**
 * File picker options for command arguments
 */
export interface FilePickerOptions {
  canSelectFiles: boolean;
  canSelectFolders: boolean;
  canSelectMany: boolean;
  filters?: { [name: string]: string[] };
  defaultUri?: vscode.Uri;
  openLabel?: string;
}

/**
 * Form field definition for command input
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'file' | 'directory' | 'select';
  required: boolean;
  description?: string;
  placeholder?: string;
  default?: any;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

/**
 * Command form definition
 */
export interface CommandForm {
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
}

/**
 * Log entry for operation history
 */
export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  details?: any;
}