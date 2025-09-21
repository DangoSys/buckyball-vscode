/**
 * Constants used throughout the BBDev extension
 */

// Extension identifiers
export const EXTENSION_ID = 'bbdev-vscode-extension';
export const EXTENSION_NAME = 'BBDev';

// Tree view identifiers
export const TREE_VIEW_ID = 'bbdevCommands';

// Context values for tree items
export const CONTEXT_VALUES = {
  COMMAND: 'command',
  OPERATION: 'operation',
  SERVER_RUNNING: 'server-running',
  SERVER_STOPPED: 'server-stopped',
  PRESET: 'preset',
  PRESET_FOLDER: 'preset-folder'
} as const;

// Command identifiers
export const COMMANDS = {
  REFRESH_COMMANDS: 'bbdev.refreshCommands',
  EXECUTE_COMMAND: 'bbdev.executeCommand',
  START_SERVER: 'bbdev.startServer',
  STOP_SERVER: 'bbdev.stopServer',
  OPEN_IN_BROWSER: 'bbdev.openInBrowser',
  SAVE_PRESET: 'bbdev.savePreset',
  DELETE_PRESET: 'bbdev.deletePreset',
  EDIT_PRESET: 'bbdev.editPreset',
  EXECUTE_PRESET: 'bbdev.executePreset',
  DUPLICATE_PRESET: 'bbdev.duplicatePreset',
  EXPORT_PRESETS: 'bbdev.exportPresets',
  IMPORT_PRESETS: 'bbdev.importPresets',
  CREATE_PRESET: 'bbdev.createPreset',
  SHOW_OUTPUT: 'bbdev.showOutput',
  EXECUTE_WITH_FILE: 'bbdev.executeWithFile',
  EXECUTE_WITH_DIRECTORY: 'bbdev.executeWithDirectory',
  QUICK_COMMAND: 'bbdev.quickCommand',
  MANAGE_FAVORITES: 'bbdev.manageFavorites',
  CLEAR_RECENT_COMMANDS: 'bbdev.clearRecentCommands',
  SEARCH_OUTPUT: 'bbdev.searchOutput',
  FILTER_OUTPUT: 'bbdev.filterOutput',
  CLEAR_OUTPUT: 'bbdev.clearOutput',
  EXPORT_OUTPUT: 'bbdev.exportOutput',
  CONFIGURE_OUTPUT: 'bbdev.configureOutput',
  VIEW_OPERATION_HISTORY: 'bbdev.viewOperationHistory',
  CLEAR_OPERATION_HISTORY: 'bbdev.clearOperationHistory',
  EXPORT_OPERATION_HISTORY: 'bbdev.exportOperationHistory',
  CONFIGURE_NOTIFICATIONS: 'bbdev.configureNotifications',
  VIEW_ACTIVE_OPERATIONS: 'bbdev.viewActiveOperations',
  VALIDATE_INSTALLATION: 'bbdev.validateInstallation',
  VALIDATE_WORKSPACE: 'bbdev.validateWorkspace',
  SHOW_COMMAND_HELP: 'bbdev.showCommandHelp',
  STOP_ALL_SERVERS: 'bbdev.stopAllServers',
  START_SERVER_WITH_PORT_SELECTION: 'bbdev.startServerWithPortSelection',
  REFRESH_SERVER_STATUS: 'bbdev.refreshServerStatus',
  RUN_SETUP_WIZARD: 'bbdev.runSetupWizard',
  SHOW_SETUP_GUIDE: 'bbdev.showSetupGuide'
} as const;

// Configuration keys
export const CONFIG_KEYS = {
  DEFAULT_PORT: 'bbdev.defaultPort',
  AUTO_START_SERVER: 'bbdev.autoStartServer',
  SHOW_OUTPUT_ON_EXECUTION: 'bbdev.showOutputOnExecution',
  BBDEV_PATH: 'bbdev.bbdevPath'
} as const;

// State keys for extension state management
export const STATE_KEYS = {
  PRESETS: 'bbdev.presets',
  RECENT_COMMANDS: 'bbdev.recentCommands',
  SERVER_INSTANCES: 'bbdev.serverInstances'
} as const;

// Default values
export const DEFAULTS = {
  PORT: 8080,
  MAX_RECENT_COMMANDS: 10,
  COMMAND_TIMEOUT: 300000, // 5 minutes
  SERVER_START_TIMEOUT: 30000, // 30 seconds
  BBDEV_PATH: 'bbdev'
} as const;

// Output channel names
export const OUTPUT_CHANNELS = {
  MAIN: 'BBDev',
  SERVER: 'BBDev Server',
  COMMANDS: 'BBDev Commands',
  ERRORS: 'BBDev Errors'
} as const;

// File extensions for context menu integration
export const SUPPORTED_FILE_EXTENSIONS = [
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.s',
  '.S',
  '.asm',
  '.h',
  '.hpp',
  '.hh',
  '.hxx'
] as const;

// Icon names (using VSCode's built-in icons)
export const ICONS = {
  COMMAND: 'symbol-method',
  OPERATION: 'play',
  SERVER_RUNNING: 'server-process',
  SERVER_STOPPED: 'server',
  PRESET: 'bookmark',
  PRESET_FOLDER: 'folder',
  REFRESH: 'refresh',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  BBDEV_NOT_FOUND: 'bbdev command not found. Please ensure bbdev is installed and in your PATH.',
  COMMAND_FAILED: 'Command execution failed',
  SERVER_START_FAILED: 'Failed to start bbdev server',
  SERVER_STOP_FAILED: 'Failed to stop bbdev server',
  INVALID_ARGUMENTS: 'Invalid command arguments',
  WORKSPACE_NOT_FOUND: 'No workspace folder found',
  FILE_NOT_FOUND: 'File not found',
  PERMISSION_DENIED: 'Permission denied'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  COMMAND_COMPLETED: 'Command completed successfully',
  SERVER_STARTED: 'BBDev server started',
  SERVER_STOPPED: 'BBDev server stopped',
  PRESET_SAVED: 'Preset saved successfully',
  PRESET_DELETED: 'Preset deleted successfully'
} as const;

// Regular expressions for parsing
export const REGEX_PATTERNS = {
  PORT_NUMBER: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
  VALID_FILENAME: /^[a-zA-Z0-9._-]+$/,
  BBDEV_OUTPUT_ERROR: /^ERROR:/,
  BBDEV_OUTPUT_WARNING: /^WARNING:/
} as const;