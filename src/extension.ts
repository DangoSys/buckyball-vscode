import * as vscode from 'vscode';
import { COMMANDS, TREE_VIEW_ID, OUTPUT_CHANNELS, CONFIG_KEYS } from './models/constants';
import { BBDevTreeDataProvider } from './providers/treeDataProvider';
import { WebviewProvider } from './providers/webviewProvider';
import { CommandManager, ConfigurationManager, OutputManager, ServerManager, ProgressManager } from './managers';
import { ExecutionContext } from './models/types';
import { getRelevantOperationsForResource, prepopulateArgumentsForResource } from './utils/contextMenuUtils';
import { 
    RecentCommandsManager, 
    FavoritesManager, 
    createCommandPaletteQuickPickItems,
    getCommandPaletteCommand,
    generateCommandPaletteCommands
} from './utils/commandPaletteUtils';
import { registerValidationCommands } from './commands/validationCommands';
import { registerServerCommands } from './commands/serverCommands';
import { getValidator } from './utils/validator';
import { getErrorHandler } from './utils/errorHandler';
import { getSetupGuide } from './utils/setupGuide';

/**
 * Extension activation function
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('BBDev extension is now active');

    // Create output channels
    const mainOutputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNELS.MAIN);
    const serverOutputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNELS.SERVER);
    const commandsOutputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNELS.COMMANDS);

    // Log activation
    mainOutputChannel.appendLine('BBDev extension activated');

    // Initialize tree data provider
    const treeDataProvider = new BBDevTreeDataProvider();
    
    // Register tree view
    const treeView = vscode.window.createTreeView(TREE_VIEW_ID, {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    // Initialize managers
    const commandManager = CommandManager.getInstance();
    const configurationManager = ConfigurationManager.getInstance(context);
    const outputManager = OutputManager.getInstance();
    const serverManager = ServerManager.getInstance();
    const progressManager = ProgressManager.getInstance();
    
    // Set configuration manager on tree data provider
    treeDataProvider.setConfigurationManager(configurationManager);

    // Initialize error handling and validation
    const validator = getValidator();
    const errorHandler = getErrorHandler();
    const setupGuide = getSetupGuide();

    // Register validation and server commands
    registerValidationCommands(context);
    registerServerCommands(context);

    // Perform initial validation if configured
    const performInitialValidation = vscode.workspace.getConfiguration('bbdev').get<boolean>('performInitialValidation', true);
    if (performInitialValidation) {
        // Run validation in background
        validator.validateWorkspace().then(async results => {
            const errorCount = results.results.filter(r => r.severity === 'error').length +
                              results.dependencies.filter(r => r.severity === 'error').length;
            
            if (errorCount > 0) {
                mainOutputChannel.appendLine(`Initial validation found ${errorCount} issues`);
                
                // Show setup notification after a delay to avoid overwhelming the user on startup
                setTimeout(async () => {
                    await setupGuide.showSetupNotificationIfNeeded();
                }, 3000);
            } else {
                mainOutputChannel.appendLine('Initial validation completed successfully');
            }
        }).catch(error => {
            mainOutputChannel.appendLine(`Initial validation failed: ${error}`);
        });
    }
    
    // Initialize webview provider
    const webviewProvider = WebviewProvider.getInstance(context);

    // Register tree view commands
    const refreshCommand = vscode.commands.registerCommand(COMMANDS.REFRESH_COMMANDS, () => {
        mainOutputChannel.appendLine('Refresh commands triggered');
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('BBDev commands refreshed');
    });

    const executeCommand = vscode.commands.registerCommand(COMMANDS.EXECUTE_COMMAND, (item?: any) => {
        mainOutputChannel.appendLine(`Execute command triggered: ${item?.label || 'unknown'}`);
        vscode.window.showInformationMessage(`Executing: ${item?.label || 'unknown command'}`);
    });

    // Register operation execution command
    const executeOperationCommand = vscode.commands.registerCommand('bbdev.executeOperation', async (commandName: string, operationName: string) => {
        try {
            mainOutputChannel.appendLine(`Starting execution: ${commandName} ${operationName}`);
            
            // Show command form to get arguments
            const commandArgs = await webviewProvider.showCommandForm(commandName, operationName);
            
            if (!commandArgs) {
                mainOutputChannel.appendLine('Command execution cancelled by user');
                return;
            }

            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to execute bbdev commands.');
                return;
            }

            // Get output channel for this command
            const outputChannel = commandManager.getOutputChannel(commandName);
            
            // Create execution context
            const executionContext: ExecutionContext = {
                command: commandName,
                operation: operationName,
                arguments: commandArgs,
                workspaceRoot,
                outputChannel
            };

            // Show output channel
            if (vscode.workspace.getConfiguration().get('bbdev.showOutputOnExecution', true)) {
                outputChannel.show();
            }

            // Execute command with progress
            const result = await commandManager.executeCommandWithProgress(
                executionContext,
                `Executing ${commandName} ${operationName}`
            );

            // Save to recent commands
            await configurationManager.addRecentCommand(executionContext);

            if (result.success) {
                vscode.window.showInformationMessage(`${commandName} ${operationName} completed successfully`);
                mainOutputChannel.appendLine(`Command completed successfully in ${result.duration}ms`);
            } else {
                vscode.window.showErrorMessage(`${commandName} ${operationName} failed with code ${result.returnCode}`);
                mainOutputChannel.appendLine(`Command failed with code ${result.returnCode}`);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to execute ${commandName} ${operationName}: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    const startServerCommand = vscode.commands.registerCommand(COMMANDS.START_SERVER, async (item?: any) => {
        try {
            serverOutputChannel.appendLine('Start server command triggered');
            
            let port: number | undefined;
            
            // If called from tree item, try to extract port
            if (item && item.id && item.id.startsWith('server-')) {
                const portStr = item.id.replace('server-', '');
                const parsedPort = parseInt(portStr, 10);
                if (!isNaN(parsedPort)) {
                    port = parsedPort;
                }
            }
            
            const server = await serverManager.startServer(port);
            treeDataProvider.refresh();
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to start server: ${errorMessage}`);
            serverOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    const stopServerCommand = vscode.commands.registerCommand(COMMANDS.STOP_SERVER, async (item?: any) => {
        try {
            serverOutputChannel.appendLine('Stop server command triggered');
            
            let port: number | undefined;
            
            // If called from tree item, extract port
            if (item && item.id && item.id.startsWith('server-')) {
                const portStr = item.id.replace('server-', '');
                const parsedPort = parseInt(portStr, 10);
                if (!isNaN(parsedPort)) {
                    port = parsedPort;
                }
            }
            
            if (!port) {
                // Show quick pick for server selection
                const runningServers = serverManager.getRunningServers();
                if (runningServers.length === 0) {
                    vscode.window.showInformationMessage('No running servers to stop');
                    return;
                }
                
                const items = runningServers.map(server => ({
                    label: `Port ${server.port}`,
                    description: server.status,
                    detail: server.url,
                    port: server.port
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select server to stop'
                });
                
                if (!selected) {
                    return;
                }
                
                port = selected.port;
            }
            
            await serverManager.stopServer(port!);
            treeDataProvider.refresh();
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to stop server: ${errorMessage}`);
            serverOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    const openInBrowserCommand = vscode.commands.registerCommand(COMMANDS.OPEN_IN_BROWSER, async (item?: any) => {
        try {
            mainOutputChannel.appendLine('Open in browser command triggered');
            
            let port: number | undefined;
            
            // If called from tree item, extract port
            if (item && item.id && item.id.startsWith('server-')) {
                const portStr = item.id.replace('server-', '');
                const parsedPort = parseInt(portStr, 10);
                if (!isNaN(parsedPort)) {
                    port = parsedPort;
                }
            }
            
            if (!port) {
                // Show quick pick for server selection
                const runningServers = serverManager.getRunningServers();
                if (runningServers.length === 0) {
                    vscode.window.showInformationMessage('No running servers to open');
                    return;
                }
                
                const items = runningServers.map(server => ({
                    label: `Port ${server.port}`,
                    description: server.status,
                    detail: server.url,
                    port: server.port
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select server to open in browser'
                });
                
                if (!selected) {
                    return;
                }
                
                port = selected.port;
            }
            
            await serverManager.openInBrowser(port!);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to open server in browser: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    const savePresetCommand = vscode.commands.registerCommand(COMMANDS.SAVE_PRESET, async (executionContext?: ExecutionContext) => {
        try {
            mainOutputChannel.appendLine('Save preset command triggered');
            
            if (!executionContext) {
                // If no execution context provided, get the most recent command
                const recentCommands = configurationManager.getRecentCommands();
                if (recentCommands.length === 0) {
                    vscode.window.showWarningMessage('No recent commands to save as preset');
                    return;
                }
                executionContext = recentCommands[0];
            }
            
            // Get preset name from user
            const presetName = await vscode.window.showInputBox({
                prompt: 'Enter a name for this preset',
                placeHolder: `${executionContext.command} ${executionContext.operation}`,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Preset name cannot be empty';
                    }
                    if (value.length > 50) {
                        return 'Preset name must be 50 characters or less';
                    }
                    return null;
                }
            });
            
            if (!presetName) {
                return;
            }
            
            // Get optional description
            const description = await vscode.window.showInputBox({
                prompt: 'Enter a description for this preset (optional)',
                placeHolder: 'Description...'
            });
            
            // Ask for scope
            const scope = await vscode.window.showQuickPick([
                { label: 'Workspace', description: 'Save to current workspace only', value: 'workspace' },
                { label: 'Global', description: 'Save globally for all workspaces', value: 'global' }
            ], {
                placeHolder: 'Choose where to save this preset'
            });
            
            if (!scope) {
                return;
            }
            
            // Create and save preset
            const preset = configurationManager.createPresetFromExecution(
                executionContext,
                presetName.trim(),
                description?.trim() || undefined
            );
            
            await configurationManager.savePreset(preset, scope.value as 'workspace' | 'global');
            
            // Refresh tree view to show new preset
            treeDataProvider.refresh();
            
            vscode.window.showInformationMessage(`Preset "${presetName}" saved successfully`);
            mainOutputChannel.appendLine(`Saved preset: ${presetName}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to save preset: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error saving preset: ${errorMessage}`);
        }
    });

    const executePresetCommand = vscode.commands.registerCommand(COMMANDS.EXECUTE_PRESET, async (presetId?: string) => {
        try {
            mainOutputChannel.appendLine(`Execute preset command triggered: ${presetId || 'unknown'}`);
            
            if (!presetId) {
                // Show quick pick for preset selection
                const presets = configurationManager.getPresets();
                if (presets.length === 0) {
                    vscode.window.showInformationMessage('No presets available to execute');
                    return;
                }
                
                const items = presets.map(preset => ({
                    label: preset.name,
                    description: `${preset.command} ${preset.operation}`,
                    detail: preset.description,
                    presetId: preset.id
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select preset to execute'
                });
                
                if (!selected) {
                    return;
                }
                
                presetId = selected.presetId;
            }
            
            // Get preset
            const preset = configurationManager.getPreset(presetId);
            if (!preset) {
                vscode.window.showErrorMessage('Preset not found');
                return;
            }
            
            // Update last used timestamp
            await configurationManager.updatePresetLastUsed(presetId);
            
            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to execute bbdev commands.');
                return;
            }
            
            // Get output channel for this command
            const outputChannel = commandManager.getOutputChannel(preset.command);
            
            // Create execution context from preset
            const executionContext: ExecutionContext = {
                command: preset.command,
                operation: preset.operation,
                arguments: { ...preset.arguments },
                workspaceRoot,
                outputChannel
            };
            
            // Show output channel
            if (vscode.workspace.getConfiguration().get('bbdev.showOutputOnExecution', true)) {
                outputChannel.show();
            }
            
            mainOutputChannel.appendLine(`Executing preset: ${preset.name} (${preset.command} ${preset.operation})`);
            
            // Execute command with progress
            const result = await commandManager.executeCommandWithProgress(
                executionContext,
                `Executing preset: ${preset.name}`
            );
            
            // Save to recent commands
            await configurationManager.addRecentCommand(executionContext);
            
            if (result.success) {
                vscode.window.showInformationMessage(`Preset "${preset.name}" executed successfully`);
                mainOutputChannel.appendLine(`Preset executed successfully in ${result.duration}ms`);
            } else {
                vscode.window.showErrorMessage(`Preset "${preset.name}" failed with code ${result.returnCode}`);
                mainOutputChannel.appendLine(`Preset execution failed with code ${result.returnCode}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to execute preset: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error executing preset: ${errorMessage}`);
        }
    });

    const deletePresetCommand = vscode.commands.registerCommand(COMMANDS.DELETE_PRESET, async (item?: any) => {
        try {
            mainOutputChannel.appendLine('Delete preset command triggered');
            
            let presetId: string | undefined;
            
            // If called from tree item, extract preset ID
            if (item && item.id && item.id.startsWith('preset-')) {
                presetId = item.id.replace('preset-', '');
            }
            
            if (!presetId) {
                // Show quick pick for preset selection
                const presets = configurationManager.getPresets();
                if (presets.length === 0) {
                    vscode.window.showInformationMessage('No presets to delete');
                    return;
                }
                
                const items = presets.map(preset => ({
                    label: preset.name,
                    description: `${preset.command} ${preset.operation}`,
                    detail: preset.description,
                    presetId: preset.id
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select preset to delete'
                });
                
                if (!selected) {
                    return;
                }
                
                presetId = selected.presetId;
            }
            
            // Get preset details for confirmation
            const preset = configurationManager.getPreset(presetId);
            if (!preset) {
                vscode.window.showErrorMessage('Preset not found');
                return;
            }
            
            // Confirm deletion
            const confirm = await vscode.window.showWarningMessage(
                `Delete preset "${preset.name}"?`,
                'Delete',
                'Cancel'
            );
            
            if (confirm === 'Delete') {
                const deleted = await configurationManager.deletePreset(presetId);
                
                if (deleted) {
                    // Refresh tree view
                    treeDataProvider.refresh();
                    
                    vscode.window.showInformationMessage(`Preset "${preset.name}" deleted successfully`);
                    mainOutputChannel.appendLine(`Deleted preset: ${preset.name}`);
                } else {
                    vscode.window.showErrorMessage('Failed to delete preset');
                }
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to delete preset: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error deleting preset: ${errorMessage}`);
        }
    });

    const editPresetCommand = vscode.commands.registerCommand(COMMANDS.EDIT_PRESET, async (item?: any) => {
        try {
            mainOutputChannel.appendLine('Edit preset command triggered');
            
            let presetId: string | undefined;
            
            // If called from tree item, extract preset ID
            if (item && item.id && item.id.startsWith('preset-')) {
                presetId = item.id.replace('preset-', '');
            }
            
            if (!presetId) {
                // Show quick pick for preset selection
                const presets = configurationManager.getPresets();
                if (presets.length === 0) {
                    vscode.window.showInformationMessage('No presets to edit');
                    return;
                }
                
                const items = presets.map(preset => ({
                    label: preset.name,
                    description: `${preset.command} ${preset.operation}`,
                    detail: preset.description,
                    presetId: preset.id
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select preset to edit'
                });
                
                if (!selected) {
                    return;
                }
                
                presetId = selected.presetId;
            }
            
            // Get preset
            const preset = configurationManager.getPreset(presetId);
            if (!preset) {
                vscode.window.showErrorMessage('Preset not found');
                return;
            }
            
            // Show preset editor
            const updatedPreset = await webviewProvider.showPresetEditor(preset, false);
            
            if (!updatedPreset) {
                return;
            }
            
            // Determine scope (check if it's in workspace or global)
            const workspacePresets = configurationManager.getWorkspacePresets();
            const isWorkspacePreset = workspacePresets.some(p => p.id === presetId);
            const scope = isWorkspacePreset ? 'workspace' : 'global';
            
            await configurationManager.savePreset(updatedPreset, scope);
            
            // Refresh tree view
            treeDataProvider.refresh();
            
            vscode.window.showInformationMessage(`Preset "${updatedPreset.name}" updated successfully`);
            mainOutputChannel.appendLine(`Updated preset: ${updatedPreset.name}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to edit preset: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error editing preset: ${errorMessage}`);
        }
    });

    const duplicatePresetCommand = vscode.commands.registerCommand(COMMANDS.DUPLICATE_PRESET, async (item?: any) => {
        try {
            mainOutputChannel.appendLine('Duplicate preset command triggered');
            
            let presetId: string | undefined;
            
            // If called from tree item, extract preset ID
            if (item && item.id && item.id.startsWith('preset-')) {
                presetId = item.id.replace('preset-', '');
            }
            
            if (!presetId) {
                // Show quick pick for preset selection
                const presets = configurationManager.getPresets();
                if (presets.length === 0) {
                    vscode.window.showInformationMessage('No presets to duplicate');
                    return;
                }
                
                const items = presets.map(preset => ({
                    label: preset.name,
                    description: `${preset.command} ${preset.operation}`,
                    detail: preset.description,
                    presetId: preset.id
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select preset to duplicate'
                });
                
                if (!selected) {
                    return;
                }
                
                presetId = selected.presetId;
            }
            
            // Get preset
            const preset = configurationManager.getPreset(presetId);
            if (!preset) {
                vscode.window.showErrorMessage('Preset not found');
                return;
            }
            
            // Get new name
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter name for the duplicated preset',
                value: `${preset.name} (Copy)`,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Preset name cannot be empty';
                    }
                    if (value.length > 50) {
                        return 'Preset name must be 50 characters or less';
                    }
                    return null;
                }
            });
            
            if (!newName) {
                return;
            }
            
            // Ask for scope
            const scope = await vscode.window.showQuickPick([
                { label: 'Workspace', description: 'Save to current workspace only', value: 'workspace' },
                { label: 'Global', description: 'Save globally for all workspaces', value: 'global' }
            ], {
                placeHolder: 'Choose where to save the duplicated preset'
            });
            
            if (!scope) {
                return;
            }
            
            // Create duplicate preset
            const duplicatePreset = configurationManager.createPresetFromExecution(
                {
                    command: preset.command,
                    operation: preset.operation,
                    arguments: preset.arguments,
                    workspaceRoot: '',
                    outputChannel: mainOutputChannel
                },
                newName.trim(),
                preset.description
            );
            
            await configurationManager.savePreset(duplicatePreset, scope.value as 'workspace' | 'global');
            
            // Refresh tree view
            treeDataProvider.refresh();
            
            vscode.window.showInformationMessage(`Preset "${newName}" created successfully`);
            mainOutputChannel.appendLine(`Duplicated preset: ${newName}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to duplicate preset: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error duplicating preset: ${errorMessage}`);
        }
    });

    const exportPresetsCommand = vscode.commands.registerCommand(COMMANDS.EXPORT_PRESETS, async () => {
        try {
            mainOutputChannel.appendLine('Export presets command triggered');
            
            // Ask for scope
            const scope = await vscode.window.showQuickPick([
                { label: 'All Presets', description: 'Export both workspace and global presets', value: 'all' },
                { label: 'Workspace Only', description: 'Export only workspace presets', value: 'workspace' },
                { label: 'Global Only', description: 'Export only global presets', value: 'global' }
            ], {
                placeHolder: 'Choose which presets to export'
            });
            
            if (!scope) {
                return;
            }
            
            // Get export data
            const exportData = configurationManager.exportPresets(scope.value as 'workspace' | 'global' | 'all');
            
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('bbdev-presets.json'),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (!saveUri) {
                return;
            }
            
            // Write file
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
            
            vscode.window.showInformationMessage(`Presets exported to ${saveUri.fsPath}`);
            mainOutputChannel.appendLine(`Exported presets to: ${saveUri.fsPath}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to export presets: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error exporting presets: ${errorMessage}`);
        }
    });

    const importPresetsCommand = vscode.commands.registerCommand(COMMANDS.IMPORT_PRESETS, async () => {
        try {
            mainOutputChannel.appendLine('Import presets command triggered');
            
            // Show open dialog
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (!openUri || openUri.length === 0) {
                return;
            }
            
            // Read file
            const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
            const importData = Buffer.from(fileContent).toString('utf8');
            
            // Ask for scope
            const scope = await vscode.window.showQuickPick([
                { label: 'Workspace', description: 'Import to current workspace only', value: 'workspace' },
                { label: 'Global', description: 'Import globally for all workspaces', value: 'global' }
            ], {
                placeHolder: 'Choose where to import presets'
            });
            
            if (!scope) {
                return;
            }
            
            // Import presets
            const importedCount = await configurationManager.importPresets(importData, scope.value as 'workspace' | 'global');
            
            // Refresh tree view
            treeDataProvider.refresh();
            
            vscode.window.showInformationMessage(`Imported ${importedCount} presets successfully`);
            mainOutputChannel.appendLine(`Imported ${importedCount} presets from: ${openUri[0].fsPath}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to import presets: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error importing presets: ${errorMessage}`);
        }
    });

    // Advanced Output Management Commands
    const searchOutputCommand = vscode.commands.registerCommand(COMMANDS.SEARCH_OUTPUT, async () => {
        try {
            mainOutputChannel.appendLine('Search output command triggered');
            
            // Get active output channels
            const activeChannels = outputManager.getActiveChannels();
            if (activeChannels.length === 0) {
                vscode.window.showInformationMessage('No output channels available to search');
                return;
            }
            
            // Select channel to search
            let channelName: string;
            if (activeChannels.length === 1) {
                channelName = activeChannels[0];
            } else {
                const selected = await vscode.window.showQuickPick(
                    activeChannels.map(name => ({ label: name, value: name })),
                    { placeHolder: 'Select output channel to search' }
                );
                
                if (!selected) {
                    return;
                }
                channelName = selected.value;
            }
            
            // Get search term
            const searchTerm = await vscode.window.showInputBox({
                prompt: 'Enter search term',
                placeHolder: 'Search in output...'
            });
            
            if (!searchTerm) {
                return;
            }
            
            // Get search options
            const caseSensitive = await vscode.window.showQuickPick([
                { label: 'Case Insensitive', value: false },
                { label: 'Case Sensitive', value: true }
            ], {
                placeHolder: 'Search options'
            });
            
            if (caseSensitive === undefined) {
                return;
            }
            
            // Perform search
            const enhancedChannel = outputManager.getEnhancedChannel(channelName);
            const results = enhancedChannel.search(searchTerm, caseSensitive.value);
            
            if (results.length === 0) {
                vscode.window.showInformationMessage(`No results found for "${searchTerm}"`);
                return;
            }
            
            // Show results in a new output channel
            const resultsChannelName = `${channelName} - Search Results`;
            const resultsChannel = outputManager.getEnhancedChannel(resultsChannelName);
            
            resultsChannel.clear();
            resultsChannel.appendLine(`Search results for "${searchTerm}" in ${channelName}:`);
            resultsChannel.appendLine(`Found ${results.length} matches`);
            resultsChannel.appendLine('='.repeat(80));
            
            results.forEach((entry, index) => {
                resultsChannel.appendLine(`[${index + 1}] [${entry.timestamp.toLocaleString()}] ${entry.level.toUpperCase()}: ${entry.message}`);
                if (entry.context) {
                    resultsChannel.appendLine(`    Context: ${entry.context}`);
                }
                resultsChannel.appendLine('');
            });
            
            resultsChannel.show();
            
            vscode.window.showInformationMessage(`Found ${results.length} matches for "${searchTerm}"`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to search output: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error searching output: ${errorMessage}`);
        }
    });

    const filterOutputCommand = vscode.commands.registerCommand(COMMANDS.FILTER_OUTPUT, async () => {
        try {
            mainOutputChannel.appendLine('Filter output command triggered');
            
            // Get active output channels
            const activeChannels = outputManager.getActiveChannels();
            if (activeChannels.length === 0) {
                vscode.window.showInformationMessage('No output channels available to filter');
                return;
            }
            
            // Select channel to filter
            let channelName: string;
            if (activeChannels.length === 1) {
                channelName = activeChannels[0];
            } else {
                const selected = await vscode.window.showQuickPick(
                    activeChannels.map(name => ({ label: name, value: name })),
                    { placeHolder: 'Select output channel to filter' }
                );
                
                if (!selected) {
                    return;
                }
                channelName = selected.value;
            }
            
            // Get filter level
            const filterLevel = await vscode.window.showQuickPick([
                { label: 'Debug and above', description: 'Show all messages', value: 0 },
                { label: 'Info and above', description: 'Hide debug messages', value: 1 },
                { label: 'Warning and above', description: 'Show only warnings and errors', value: 2 },
                { label: 'Error only', description: 'Show only error messages', value: 3 }
            ], {
                placeHolder: 'Select minimum log level to display'
            });
            
            if (filterLevel === undefined) {
                return;
            }
            
            // Get additional filter options
            const showTimestamps = await vscode.window.showQuickPick([
                { label: 'Show Timestamps', value: true },
                { label: 'Hide Timestamps', value: false }
            ], {
                placeHolder: 'Timestamp display'
            });
            
            if (showTimestamps === undefined) {
                return;
            }
            
            const highlightErrors = await vscode.window.showQuickPick([
                { label: 'Highlight Errors', value: true },
                { label: 'Plain Text', value: false }
            ], {
                placeHolder: 'Error highlighting'
            });
            
            if (highlightErrors === undefined) {
                return;
            }
            
            // Apply filter
            const enhancedChannel = outputManager.getEnhancedChannel(channelName);
            enhancedChannel.updateConfig({
                filter: {
                    level: filterLevel.value,
                    showTimestamps: showTimestamps.value,
                    showContext: true,
                    highlightErrors: highlightErrors.value,
                    highlightWarnings: highlightErrors.value
                }
            });
            
            vscode.window.showInformationMessage(`Filter applied to ${channelName}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to filter output: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error filtering output: ${errorMessage}`);
        }
    });

    const clearOutputCommand = vscode.commands.registerCommand(COMMANDS.CLEAR_OUTPUT, async () => {
        try {
            mainOutputChannel.appendLine('Clear output command triggered');
            
            // Get active output channels
            const activeChannels = outputManager.getActiveChannels();
            if (activeChannels.length === 0) {
                vscode.window.showInformationMessage('No output channels available to clear');
                return;
            }
            
            // Select channels to clear
            const selected = await vscode.window.showQuickPick([
                { label: 'All Channels', description: 'Clear all output channels', value: 'all' },
                ...activeChannels.map(name => ({ label: name, description: 'Clear this channel', value: name }))
            ], {
                placeHolder: 'Select channels to clear'
            });
            
            if (!selected) {
                return;
            }
            
            // Ask about preserving history
            const preserveHistory = await vscode.window.showQuickPick([
                { label: 'Clear Display Only', description: 'Keep history for search and export', value: true },
                { label: 'Clear Everything', description: 'Clear display and history', value: false }
            ], {
                placeHolder: 'Clear options'
            });
            
            if (preserveHistory === undefined) {
                return;
            }
            
            // Clear channels
            if (selected.value === 'all') {
                activeChannels.forEach(channelName => {
                    const enhancedChannel = outputManager.getEnhancedChannel(channelName);
                    enhancedChannel.clear(preserveHistory.value);
                });
                vscode.window.showInformationMessage('All output channels cleared');
            } else {
                const enhancedChannel = outputManager.getEnhancedChannel(selected.value);
                enhancedChannel.clear(preserveHistory.value);
                vscode.window.showInformationMessage(`${selected.value} cleared`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to clear output: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error clearing output: ${errorMessage}`);
        }
    });

    const exportOutputCommand = vscode.commands.registerCommand(COMMANDS.EXPORT_OUTPUT, async () => {
        try {
            mainOutputChannel.appendLine('Export output command triggered');
            
            // Get active output channels
            const activeChannels = outputManager.getActiveChannels();
            if (activeChannels.length === 0) {
                vscode.window.showInformationMessage('No output channels available to export');
                return;
            }
            
            // Select channel to export
            let channelName: string;
            if (activeChannels.length === 1) {
                channelName = activeChannels[0];
            } else {
                const selected = await vscode.window.showQuickPick(
                    activeChannels.map(name => ({ label: name, value: name })),
                    { placeHolder: 'Select output channel to export' }
                );
                
                if (!selected) {
                    return;
                }
                channelName = selected.value;
            }
            
            // Get export options
            const includeTimestamps = await vscode.window.showQuickPick([
                { label: 'Include Timestamps', value: true },
                { label: 'Exclude Timestamps', value: false }
            ], {
                placeHolder: 'Timestamp options'
            });
            
            if (includeTimestamps === undefined) {
                return;
            }
            
            const includeContext = await vscode.window.showQuickPick([
                { label: 'Include Context', value: true },
                { label: 'Exclude Context', value: false }
            ], {
                placeHolder: 'Context options'
            });
            
            if (includeContext === undefined) {
                return;
            }
            
            // Export logs
            const enhancedChannel = outputManager.getEnhancedChannel(channelName);
            const exportData = enhancedChannel.exportLogs(includeTimestamps.value, includeContext.value);
            
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`${channelName.replace(/[^a-zA-Z0-9]/g, '_')}_output.log`),
                filters: {
                    'Log Files': ['log', 'txt'],
                    'All Files': ['*']
                }
            });
            
            if (!saveUri) {
                return;
            }
            
            // Write file
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
            
            vscode.window.showInformationMessage(`Output exported to ${saveUri.fsPath}`);
            mainOutputChannel.appendLine(`Exported output to: ${saveUri.fsPath}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to export output: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error exporting output: ${errorMessage}`);
        }
    });

    const configureOutputCommand = vscode.commands.registerCommand(COMMANDS.CONFIGURE_OUTPUT, async () => {
        try {
            mainOutputChannel.appendLine('Configure output command triggered');
            
            // Get active output channels
            const activeChannels = outputManager.getActiveChannels();
            if (activeChannels.length === 0) {
                vscode.window.showInformationMessage('No output channels available to configure');
                return;
            }
            
            // Select channel to configure
            let channelName: string;
            if (activeChannels.length === 1) {
                channelName = activeChannels[0];
            } else {
                const selected = await vscode.window.showQuickPick(
                    activeChannels.map(name => ({ label: name, value: name })),
                    { placeHolder: 'Select output channel to configure' }
                );
                
                if (!selected) {
                    return;
                }
                channelName = selected.value;
            }
            
            const enhancedChannel = outputManager.getEnhancedChannel(channelName);
            const currentConfig = enhancedChannel.getConfig();
            const stats = enhancedChannel.getStats();
            
            // Show configuration options
            const configOption = await vscode.window.showQuickPick([
                { 
                    label: 'View Statistics', 
                    description: `${stats.totalEntries} total, ${stats.errorCount} errors, ${stats.warningCount} warnings`,
                    value: 'stats' 
                },
                { 
                    label: 'Set Max History Lines', 
                    description: `Current: ${currentConfig.maxLines}`,
                    value: 'maxLines' 
                },
                { 
                    label: 'Toggle Auto Scroll', 
                    description: `Current: ${currentConfig.autoScroll ? 'On' : 'Off'}`,
                    value: 'autoScroll' 
                },
                { 
                    label: 'Toggle History Preservation', 
                    description: `Current: ${currentConfig.preserveHistory ? 'On' : 'Off'}`,
                    value: 'preserveHistory' 
                }
            ], {
                placeHolder: 'Select configuration option'
            });
            
            if (!configOption) {
                return;
            }
            
            switch (configOption.value) {
                case 'stats':
                    const statsMessage = [
                        `Channel: ${channelName}`,
                        `Total Entries: ${stats.totalEntries}`,
                        `Errors: ${stats.errorCount}`,
                        `Warnings: ${stats.warningCount}`,
                        `Info: ${stats.infoCount}`,
                        `Debug: ${stats.debugCount}`,
                        `Search Results: ${stats.searchResults}`
                    ].join('\n');
                    
                    vscode.window.showInformationMessage(statsMessage, { modal: true });
                    break;
                    
                case 'maxLines':
                    const maxLinesInput = await vscode.window.showInputBox({
                        prompt: 'Enter maximum number of lines to keep in history',
                        value: currentConfig.maxLines.toString(),
                        validateInput: (value) => {
                            const num = parseInt(value, 10);
                            if (isNaN(num) || num < 100 || num > 100000) {
                                return 'Please enter a number between 100 and 100000';
                            }
                            return null;
                        }
                    });
                    
                    if (maxLinesInput) {
                        enhancedChannel.updateConfig({ maxLines: parseInt(maxLinesInput, 10) });
                        vscode.window.showInformationMessage(`Max lines set to ${maxLinesInput}`);
                    }
                    break;
                    
                case 'autoScroll':
                    enhancedChannel.updateConfig({ autoScroll: !currentConfig.autoScroll });
                    vscode.window.showInformationMessage(`Auto scroll ${!currentConfig.autoScroll ? 'enabled' : 'disabled'}`);
                    break;
                    
                case 'preserveHistory':
                    enhancedChannel.updateConfig({ preserveHistory: !currentConfig.preserveHistory });
                    vscode.window.showInformationMessage(`History preservation ${!currentConfig.preserveHistory ? 'enabled' : 'disabled'}`);
                    break;
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to configure output: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error configuring output: ${errorMessage}`);
        }
    });

    // Progress and Notification Management Commands
    const viewOperationHistoryCommand = vscode.commands.registerCommand(COMMANDS.VIEW_OPERATION_HISTORY, async () => {
        try {
            mainOutputChannel.appendLine('View operation history command triggered');
            
            const progressManager = ProgressManager.getInstance();
            const history = progressManager.getOperationHistory(50);
            
            if (history.length === 0) {
                vscode.window.showInformationMessage('No operation history available');
                return;
            }
            
            const items = history.map(entry => ({
                label: entry.title,
                description: `${entry.status} • ${formatDuration(entry.duration)}`,
                detail: `${entry.startTime.toLocaleString()} • ${entry.command} ${entry.operation}`,
                entry
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select operation to view details'
            });
            
            if (selected) {
                const details = [
                    `Operation: ${selected.entry.title}`,
                    `Command: ${selected.entry.command} ${selected.entry.operation}`,
                    `Status: ${selected.entry.status}`,
                    `Success: ${selected.entry.success ? 'Yes' : 'No'}`,
                    `Duration: ${formatDuration(selected.entry.duration)}`,
                    `Started: ${selected.entry.startTime.toLocaleString()}`,
                    `Ended: ${selected.entry.endTime.toLocaleString()}`
                ];
                
                if (selected.entry.returnCode !== undefined) {
                    details.push(`Return Code: ${selected.entry.returnCode}`);
                }
                
                if (selected.entry.errorMessage) {
                    details.push(`Error: ${selected.entry.errorMessage}`);
                }
                
                vscode.window.showInformationMessage(
                    details.join('\n'),
                    { modal: true }
                );
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to view operation history: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error viewing operation history: ${errorMessage}`);
        }
    });

    const clearOperationHistoryCommand = vscode.commands.registerCommand(COMMANDS.CLEAR_OPERATION_HISTORY, async () => {
        try {
            mainOutputChannel.appendLine('Clear operation history command triggered');
            
            const confirm = await vscode.window.showWarningMessage(
                'Clear all operation history?',
                'Clear',
                'Cancel'
            );
            
            if (confirm === 'Clear') {
                const progressManager = ProgressManager.getInstance();
                progressManager.clearHistory();
                vscode.window.showInformationMessage('Operation history cleared');
                mainOutputChannel.appendLine('Operation history cleared');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to clear operation history: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error clearing operation history: ${errorMessage}`);
        }
    });

    const exportOperationHistoryCommand = vscode.commands.registerCommand(COMMANDS.EXPORT_OPERATION_HISTORY, async () => {
        try {
            mainOutputChannel.appendLine('Export operation history command triggered');
            
            const progressManager = ProgressManager.getInstance();
            const exportData = progressManager.exportHistory();
            
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('bbdev-operation-history.json'),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (!saveUri) {
                return;
            }
            
            // Write file
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
            
            vscode.window.showInformationMessage(`Operation history exported to ${saveUri.fsPath}`);
            mainOutputChannel.appendLine(`Exported operation history to: ${saveUri.fsPath}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to export operation history: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error exporting operation history: ${errorMessage}`);
        }
    });

    const configureNotificationsCommand = vscode.commands.registerCommand(COMMANDS.CONFIGURE_NOTIFICATIONS, async () => {
        try {
            mainOutputChannel.appendLine('Configure notifications command triggered');
            
            const progressManager = ProgressManager.getInstance();
            const currentConfig = progressManager.getNotificationConfig();
            
            const configOption = await vscode.window.showQuickPick([
                {
                    label: 'Completion Notifications',
                    description: `Currently: ${currentConfig.showCompletionNotifications ? 'On' : 'Off'}`,
                    value: 'completion'
                },
                {
                    label: 'Error Notifications',
                    description: `Currently: ${currentConfig.showErrorNotifications ? 'On' : 'Off'}`,
                    value: 'error'
                },
                {
                    label: 'Progress Notifications',
                    description: `Currently: ${currentConfig.showProgressNotifications ? 'On' : 'Off'}`,
                    value: 'progress'
                },
                {
                    label: 'Notification Timeout',
                    description: `Currently: ${currentConfig.notificationTimeout}ms`,
                    value: 'timeout'
                }
            ], {
                placeHolder: 'Select notification setting to configure'
            });
            
            if (!configOption) {
                return;
            }
            
            switch (configOption.value) {
                case 'completion':
                    progressManager.updateNotificationConfig({
                        showCompletionNotifications: !currentConfig.showCompletionNotifications
                    });
                    vscode.window.showInformationMessage(
                        `Completion notifications ${!currentConfig.showCompletionNotifications ? 'enabled' : 'disabled'}`
                    );
                    break;
                    
                case 'error':
                    progressManager.updateNotificationConfig({
                        showErrorNotifications: !currentConfig.showErrorNotifications
                    });
                    vscode.window.showInformationMessage(
                        `Error notifications ${!currentConfig.showErrorNotifications ? 'enabled' : 'disabled'}`
                    );
                    break;
                    
                case 'progress':
                    progressManager.updateNotificationConfig({
                        showProgressNotifications: !currentConfig.showProgressNotifications
                    });
                    vscode.window.showInformationMessage(
                        `Progress notifications ${!currentConfig.showProgressNotifications ? 'enabled' : 'disabled'}`
                    );
                    break;
                    
                case 'timeout':
                    const timeoutInput = await vscode.window.showInputBox({
                        prompt: 'Enter notification timeout in milliseconds',
                        value: currentConfig.notificationTimeout.toString(),
                        validateInput: (value) => {
                            const num = parseInt(value, 10);
                            if (isNaN(num) || num < 1000 || num > 30000) {
                                return 'Please enter a number between 1000 and 30000';
                            }
                            return null;
                        }
                    });
                    
                    if (timeoutInput) {
                        progressManager.updateNotificationConfig({
                            notificationTimeout: parseInt(timeoutInput, 10)
                        });
                        vscode.window.showInformationMessage(`Notification timeout set to ${timeoutInput}ms`);
                    }
                    break;
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to configure notifications: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error configuring notifications: ${errorMessage}`);
        }
    });

    const viewActiveOperationsCommand = vscode.commands.registerCommand(COMMANDS.VIEW_ACTIVE_OPERATIONS, async () => {
        try {
            mainOutputChannel.appendLine('View active operations command triggered');
            
            const progressManager = ProgressManager.getInstance();
            const activeOps = progressManager.getActiveOperations();
            
            if (activeOps.length === 0) {
                vscode.window.showInformationMessage('No active operations');
                return;
            }
            
            const items = activeOps.map(op => ({
                label: op.title,
                description: `${op.progress.current}/${op.progress.total} • ${op.progress.message}`,
                detail: `Started: ${op.startTime.toLocaleString()} • ${op.context.command} ${op.context.operation}`,
                operation: op
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select operation to view details or cancel'
            });
            
            if (selected) {
                const action = await vscode.window.showQuickPick([
                    { label: 'View Details', value: 'details' },
                    { label: 'Cancel Operation', value: 'cancel' },
                    { label: 'Show Output', value: 'output' }
                ], {
                    placeHolder: 'Select action'
                });
                
                if (!action) {
                    return;
                }
                
                switch (action.value) {
                    case 'details':
                        const details = [
                            `Operation: ${selected.operation.title}`,
                            `Command: ${selected.operation.context.command} ${selected.operation.context.operation}`,
                            `Status: ${selected.operation.status}`,
                            `Progress: ${selected.operation.progress.current}/${selected.operation.progress.total}`,
                            `Message: ${selected.operation.progress.message}`,
                            `Started: ${selected.operation.startTime.toLocaleString()}`,
                            `Duration: ${formatDuration(Date.now() - selected.operation.startTime.getTime())}`
                        ];
                        
                        vscode.window.showInformationMessage(
                            details.join('\n'),
                            { modal: true }
                        );
                        break;
                        
                    case 'cancel':
                        const confirm = await vscode.window.showWarningMessage(
                            `Cancel operation "${selected.operation.title}"?`,
                            'Cancel Operation',
                            'Keep Running'
                        );
                        
                        if (confirm === 'Cancel Operation') {
                            progressManager.cancelOperation(selected.operation.id);
                            vscode.window.showInformationMessage(`Operation "${selected.operation.title}" cancelled`);
                        }
                        break;
                        
                    case 'output':
                        if (selected.operation.context.outputChannel) {
                            selected.operation.context.outputChannel.show();
                        }
                        break;
                }
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to view active operations: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error viewing active operations: ${errorMessage}`);
        }
    });

    // Helper function to format duration
    function formatDuration(milliseconds: number): string {
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

    const createPresetCommand = vscode.commands.registerCommand(COMMANDS.CREATE_PRESET, async () => {
        try {
            mainOutputChannel.appendLine('Create preset command triggered');
            
            // Show preset editor for new preset
            const newPreset = await webviewProvider.showPresetEditor({}, true);
            
            if (!newPreset) {
                return;
            }
            
            // Ask for scope
            const scope = await vscode.window.showQuickPick([
                { label: 'Workspace', description: 'Save to current workspace only', value: 'workspace' },
                { label: 'Global', description: 'Save globally for all workspaces', value: 'global' }
            ], {
                placeHolder: 'Choose where to save this preset'
            });
            
            if (!scope) {
                return;
            }
            
            // Create preset with proper structure
            const preset = configurationManager.createPresetFromExecution(
                {
                    command: newPreset.command,
                    operation: newPreset.operation,
                    arguments: newPreset.arguments || {},
                    workspaceRoot: '',
                    outputChannel: mainOutputChannel
                },
                newPreset.name,
                newPreset.description,
                newPreset.tags
            );
            
            await configurationManager.savePreset(preset, scope.value as 'workspace' | 'global');
            
            // Refresh tree view
            treeDataProvider.refresh();
            
            vscode.window.showInformationMessage(`Preset "${newPreset.name}" created successfully`);
            mainOutputChannel.appendLine(`Created new preset: ${newPreset.name}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to create preset: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error creating preset: ${errorMessage}`);
        }
    });

    const showOutputCommand = vscode.commands.registerCommand('bbdev.showOutput', (commandName?: string) => {
        if (commandName) {
            commandManager.showOutputChannel(commandName);
        } else {
            mainOutputChannel.show();
        }
    });



    const showServerStatusCommand = vscode.commands.registerCommand('bbdev.showServerStatus', async () => {
        const servers = serverManager.getAllServers();
        
        if (servers.length === 0) {
            vscode.window.showInformationMessage('No BBDev servers configured');
            return;
        }
        
        const items = servers.map(server => {
            const status = server.status === 'running' ? '🟢' : 
                          server.status === 'starting' ? '🟡' : 
                          server.status === 'stopping' ? '🟡' : 
                          server.status === 'error' ? '🔴' : '⚫';
            
            return {
                label: `${status} Port ${server.port}`,
                description: server.status,
                detail: server.url,
                server
            };
        });
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Server Status - Select a server for more options'
        });
        
        if (selected) {
            const server = selected.server;
            const actions: string[] = [];
            
            if (server.status === 'running') {
                actions.push('Open in Browser', 'Stop Server', 'Show Logs');
            } else if (server.status === 'stopped') {
                actions.push('Start Server', 'Show Logs');
            }
            
            const action = await vscode.window.showQuickPick(actions, {
                placeHolder: `Actions for server on port ${server.port}`
            });
            
            switch (action) {
                case 'Open in Browser':
                    await vscode.commands.executeCommand(COMMANDS.OPEN_IN_BROWSER, { id: `server-${server.port}` });
                    break;
                case 'Start Server':
                    await vscode.commands.executeCommand(COMMANDS.START_SERVER, { id: `server-${server.port}` });
                    break;
                case 'Stop Server':
                    await vscode.commands.executeCommand(COMMANDS.STOP_SERVER, { id: `server-${server.port}` });
                    break;
                case 'Show Logs':
                    serverOutputChannel.show();
                    break;
            }
        }
    });

    const stopAllServersCommand = vscode.commands.registerCommand('bbdev.stopAllServers', async () => {
        try {
            const runningServers = serverManager.getRunningServers();
            
            if (runningServers.length === 0) {
                vscode.window.showInformationMessage('No running servers to stop');
                return;
            }
            
            const confirm = await vscode.window.showWarningMessage(
                `Stop all ${runningServers.length} running servers?`,
                'Yes',
                'No'
            );
            
            if (confirm === 'Yes') {
                await serverManager.stopAllServers();
                treeDataProvider.refresh();
                vscode.window.showInformationMessage('All servers stopped');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to stop all servers: ${errorMessage}`);
        }
    });

    const refreshServersCommand = vscode.commands.registerCommand('bbdev.refreshServers', async () => {
        try {
            await serverManager.refreshServerStatus();
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('Server status refreshed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to refresh server status: ${errorMessage}`);
        }
    });

    // Context menu command handlers
    const executeWithFileCommand = vscode.commands.registerCommand(COMMANDS.EXECUTE_WITH_FILE, async (resourceUri: vscode.Uri) => {
        try {
            mainOutputChannel.appendLine(`Execute with file command triggered: ${resourceUri.fsPath}`);
            
            // Get relevant operations for this file
            const relevantOps = await getRelevantOperationsForResource(resourceUri);
            
            if (relevantOps.length === 0) {
                vscode.window.showInformationMessage('No relevant BBDev operations found for this file type');
                return;
            }
            
            // Show quick pick for operation selection
            const items = relevantOps.map(op => ({
                label: `${op.command} ${op.operation}`,
                description: op.operationDef.description,
                detail: op.reason,
                command: op.command,
                operation: op.operation,
                operationDef: op.operationDef
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select BBDev operation to execute with this file'
            });
            
            if (!selected) {
                return;
            }
            
            // Pre-populate arguments based on the selected file
            const prepopulatedArgs = await prepopulateArgumentsForResource(resourceUri, selected.operationDef);
            
            // Show command form with pre-populated arguments
            const commandArgs = await webviewProvider.showCommandForm(
                selected.command, 
                selected.operation, 
                prepopulatedArgs
            );
            
            if (!commandArgs) {
                mainOutputChannel.appendLine('Command execution cancelled by user');
                return;
            }
            
            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to execute bbdev commands.');
                return;
            }
            
            // Get output channel for this command
            const outputChannel = commandManager.getOutputChannel(selected.command);
            
            // Create execution context
            const executionContext: ExecutionContext = {
                command: selected.command,
                operation: selected.operation,
                arguments: commandArgs,
                workspaceRoot,
                outputChannel
            };
            
            // Show output channel
            if (vscode.workspace.getConfiguration().get('bbdev.showOutputOnExecution', true)) {
                outputChannel.show();
            }
            
            // Execute command with progress
            const result = await commandManager.executeCommandWithProgress(
                executionContext,
                `Executing ${selected.command} ${selected.operation} with ${resourceUri.fsPath}`
            );
            
            // Save to recent commands
            await configurationManager.addRecentCommand(executionContext);
            
            if (result.success) {
                vscode.window.showInformationMessage(`${selected.command} ${selected.operation} completed successfully`);
                mainOutputChannel.appendLine(`Command completed successfully in ${result.duration}ms`);
            } else {
                vscode.window.showErrorMessage(`${selected.command} ${selected.operation} failed with code ${result.returnCode}`);
                mainOutputChannel.appendLine(`Command failed with code ${result.returnCode}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to execute BBDev operation: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    const executeWithDirectoryCommand = vscode.commands.registerCommand(COMMANDS.EXECUTE_WITH_DIRECTORY, async (resourceUri: vscode.Uri) => {
        try {
            mainOutputChannel.appendLine(`Execute with directory command triggered: ${resourceUri.fsPath}`);
            
            // Get relevant operations for this directory
            const relevantOps = await getRelevantOperationsForResource(resourceUri);
            
            if (relevantOps.length === 0) {
                vscode.window.showInformationMessage('No relevant BBDev operations found for this directory');
                return;
            }
            
            // Show quick pick for operation selection
            const items = relevantOps.map(op => ({
                label: `${op.command} ${op.operation}`,
                description: op.operationDef.description,
                detail: op.reason,
                command: op.command,
                operation: op.operation,
                operationDef: op.operationDef
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select BBDev operation to execute with this directory'
            });
            
            if (!selected) {
                return;
            }
            
            // Pre-populate arguments based on the selected directory
            const prepopulatedArgs = await prepopulateArgumentsForResource(resourceUri, selected.operationDef);
            
            // Show command form with pre-populated arguments
            const commandArgs = await webviewProvider.showCommandForm(
                selected.command, 
                selected.operation, 
                prepopulatedArgs
            );
            
            if (!commandArgs) {
                mainOutputChannel.appendLine('Command execution cancelled by user');
                return;
            }
            
            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to execute bbdev commands.');
                return;
            }
            
            // Get output channel for this command
            const outputChannel = commandManager.getOutputChannel(selected.command);
            
            // Create execution context
            const executionContext: ExecutionContext = {
                command: selected.command,
                operation: selected.operation,
                arguments: commandArgs,
                workspaceRoot,
                outputChannel
            };
            
            // Show output channel
            if (vscode.workspace.getConfiguration().get('bbdev.showOutputOnExecution', true)) {
                outputChannel.show();
            }
            
            // Execute command with progress
            const result = await commandManager.executeCommandWithProgress(
                executionContext,
                `Executing ${selected.command} ${selected.operation} with ${resourceUri.fsPath}`
            );
            
            // Save to recent commands
            await configurationManager.addRecentCommand(executionContext);
            
            if (result.success) {
                vscode.window.showInformationMessage(`${selected.command} ${selected.operation} completed successfully`);
                mainOutputChannel.appendLine(`Command completed successfully in ${result.duration}ms`);
            } else {
                vscode.window.showErrorMessage(`${selected.command} ${selected.operation} failed with code ${result.returnCode}`);
                mainOutputChannel.appendLine(`Command failed with code ${result.returnCode}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to execute BBDev operation: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    // Initialize command palette managers
    const recentCommandsManager = new RecentCommandsManager(context);
    const favoritesManager = new FavoritesManager(context);

    // Command palette handlers
    const quickCommandCommand = vscode.commands.registerCommand(COMMANDS.QUICK_COMMAND, async () => {
        try {
            mainOutputChannel.appendLine('Quick command triggered');
            
            // Create quick pick items
            const items = createCommandPaletteQuickPickItems(recentCommandsManager, favoritesManager);
            
            // Show quick pick
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a BBDev command to execute',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (!selected || !selected.commandId) {
                return;
            }
            
            // Get command definition
            const commandDef = getCommandPaletteCommand(selected.commandId);
            if (!commandDef) {
                vscode.window.showErrorMessage('Command not found');
                return;
            }
            
            // Add to recent commands
            recentCommandsManager.addRecentCommand(selected.commandId);
            
            // Show command form
            const commandArgs = await webviewProvider.showCommandForm(
                commandDef.command,
                commandDef.operation
            );
            
            if (!commandArgs) {
                mainOutputChannel.appendLine('Command execution cancelled by user');
                return;
            }
            
            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to execute bbdev commands.');
                return;
            }
            
            // Get output channel for this command
            const outputChannel = commandManager.getOutputChannel(commandDef.command);
            
            // Create execution context
            const executionContext: ExecutionContext = {
                command: commandDef.command,
                operation: commandDef.operation,
                arguments: commandArgs,
                workspaceRoot,
                outputChannel
            };
            
            // Show output channel
            if (vscode.workspace.getConfiguration().get('bbdev.showOutputOnExecution', true)) {
                outputChannel.show();
            }
            
            // Execute command with progress
            const result = await commandManager.executeCommandWithProgress(
                executionContext,
                `Executing ${commandDef.command} ${commandDef.operation}`
            );
            
            // Save to recent commands (configuration manager)
            await configurationManager.addRecentCommand(executionContext);
            
            if (result.success) {
                vscode.window.showInformationMessage(`${commandDef.command} ${commandDef.operation} completed successfully`);
                mainOutputChannel.appendLine(`Command completed successfully in ${result.duration}ms`);
            } else {
                vscode.window.showErrorMessage(`${commandDef.command} ${commandDef.operation} failed with code ${result.returnCode}`);
                mainOutputChannel.appendLine(`Command failed with code ${result.returnCode}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to execute quick command: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    const manageFavoritesCommand = vscode.commands.registerCommand(COMMANDS.MANAGE_FAVORITES, async () => {
        try {
            mainOutputChannel.appendLine('Manage favorites triggered');
            
            // Show action selection
            const action = await vscode.window.showQuickPick([
                {
                    label: '$(star-full) Add to Favorites',
                    description: 'Add a command to favorites',
                    action: 'add'
                },
                {
                    label: '$(star-empty) Remove from Favorites',
                    description: 'Remove a command from favorites',
                    action: 'remove'
                },
                {
                    label: '$(list-unordered) View Favorites',
                    description: 'View all favorite commands',
                    action: 'view'
                },
                {
                    label: '$(trash) Clear All Favorites',
                    description: 'Remove all favorite commands',
                    action: 'clear'
                }
            ], {
                placeHolder: 'Select an action for managing favorites'
            });
            
            if (!action) {
                return;
            }
            
            switch (action.action) {
                case 'add':
                    await addToFavorites();
                    break;
                case 'remove':
                    await removeFromFavorites();
                    break;
                case 'view':
                    await viewFavorites();
                    break;
                case 'clear':
                    await clearFavorites();
                    break;
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to manage favorites: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }

        async function addToFavorites() {
            const allCommands = generateCommandPaletteCommands();
            const nonFavorites = allCommands.filter(cmd => !favoritesManager.isFavorite(cmd.id));
            
            if (nonFavorites.length === 0) {
                vscode.window.showInformationMessage('All commands are already in favorites');
                return;
            }
            
            const items = nonFavorites.map(cmd => ({
                label: cmd.title,
                description: cmd.operationDef.description,
                detail: cmd.commandDef.description,
                commandId: cmd.id
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select command to add to favorites'
            });
            
            if (selected) {
                favoritesManager.addFavorite(selected.commandId);
                vscode.window.showInformationMessage(`Added "${selected.label}" to favorites`);
            }
        }

        async function removeFromFavorites() {
            const favoriteCommands = favoritesManager.getFavoriteCommandPaletteCommands();
            
            if (favoriteCommands.length === 0) {
                vscode.window.showInformationMessage('No favorite commands to remove');
                return;
            }
            
            const items = favoriteCommands.map(cmd => ({
                label: cmd.title,
                description: cmd.operationDef.description,
                detail: cmd.commandDef.description,
                commandId: cmd.id
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select command to remove from favorites'
            });
            
            if (selected) {
                favoritesManager.removeFavorite(selected.commandId);
                vscode.window.showInformationMessage(`Removed "${selected.label}" from favorites`);
            }
        }

        async function viewFavorites() {
            const favoriteCommands = favoritesManager.getFavoriteCommandPaletteCommands();
            
            if (favoriteCommands.length === 0) {
                vscode.window.showInformationMessage('No favorite commands');
                return;
            }
            
            const items = favoriteCommands.map(cmd => ({
                label: `$(star-full) ${cmd.title}`,
                description: cmd.operationDef.description,
                detail: cmd.commandDef.description,
                commandId: cmd.id
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Favorite commands (select to execute)'
            });
            
            if (selected) {
                // Execute the selected favorite command
                vscode.commands.executeCommand('bbdev.quickCommand');
            }
        }

        async function clearFavorites() {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all favorite commands?',
                'Clear',
                'Cancel'
            );
            
            if (confirm === 'Clear') {
                favoritesManager.clearFavorites();
                vscode.window.showInformationMessage('All favorite commands cleared');
            }
        }
    });

    const clearRecentCommandsCommand = vscode.commands.registerCommand(COMMANDS.CLEAR_RECENT_COMMANDS, async () => {
        try {
            mainOutputChannel.appendLine('Clear recent commands triggered');
            
            const confirm = await vscode.window.showWarningMessage(
                'Clear all recent commands?',
                'Clear',
                'Cancel'
            );
            
            if (confirm === 'Clear') {
                recentCommandsManager.clearRecentCommands();
                vscode.window.showInformationMessage('Recent commands cleared');
                mainOutputChannel.appendLine('Recent commands cleared');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to clear recent commands: ${errorMessage}`);
            mainOutputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    // Add commands and providers to context subscriptions
    context.subscriptions.push(
        treeView,
        refreshCommand,
        executeCommand,
        executeOperationCommand,
        executePresetCommand,
        startServerCommand,
        stopServerCommand,
        openInBrowserCommand,
        savePresetCommand,
        deletePresetCommand,
        editPresetCommand,
        duplicatePresetCommand,
        exportPresetsCommand,
        importPresetsCommand,
        searchOutputCommand,
        filterOutputCommand,
        clearOutputCommand,
        exportOutputCommand,
        configureOutputCommand,
        viewOperationHistoryCommand,
        clearOperationHistoryCommand,
        exportOperationHistoryCommand,
        configureNotificationsCommand,
        viewActiveOperationsCommand,
        createPresetCommand,
        showOutputCommand,
        showServerStatusCommand,
        stopAllServersCommand,
        refreshServersCommand,
        executeWithFileCommand,
        executeWithDirectoryCommand,
        quickCommandCommand,
        manageFavoritesCommand,
        clearRecentCommandsCommand,
        mainOutputChannel,
        serverOutputChannel,
        commandsOutputChannel,
        { dispose: () => commandManager.dispose() },
        { dispose: () => configurationManager.dispose() },
        { dispose: () => outputManager.dispose() },
        { dispose: () => serverManager.dispose() },
        { dispose: () => progressManager.dispose() },
        { dispose: () => webviewProvider.dispose() }
    );

    // Auto-start server if configured
    const autoStartServer = vscode.workspace.getConfiguration().get<boolean>(
        CONFIG_KEYS.AUTO_START_SERVER,
        false
    );
    
    if (autoStartServer) {
        serverManager.startServer().then(() => {
            mainOutputChannel.appendLine('Auto-started BBDev server');
            treeDataProvider.refresh();
        }).catch(error => {
            mainOutputChannel.appendLine(`Failed to auto-start server: ${error.message}`);
        });
    }
    
    // Load saved presets and initialize configuration
    const presets = configurationManager.getPresets();
    mainOutputChannel.appendLine(`Loaded ${presets.length} saved presets`);

    mainOutputChannel.appendLine('BBDev extension setup complete');
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate() {
    console.log('BBDev extension is being deactivated');
    
    // Stop running servers
    const serverManager = ServerManager.getInstance();
    serverManager.stopAllServers().catch(error => {
        console.error('Error stopping servers during deactivation:', error);
    });
    
    // TODO: Save state
}