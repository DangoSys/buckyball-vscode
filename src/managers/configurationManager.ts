import * as vscode from 'vscode';
import { CommandPreset, ExecutionContext, ExtensionSettings } from '../models/types';
import { STATE_KEYS, DEFAULTS, CONFIG_KEYS } from '../models/constants';
import { Logger } from '../utils/logger';

/**
 * Manages configuration, presets, and settings for the BBDev extension
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private context: vscode.ExtensionContext;
    private logger: Logger;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logger = Logger.getInstance();
    }

    /**
     * Get the singleton instance of ConfigurationManager
     */
    public static getInstance(context?: vscode.ExtensionContext): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            if (!context) {
                throw new Error('ConfigurationManager requires context for initialization');
            }
            ConfigurationManager.instance = new ConfigurationManager(context);
        }
        return ConfigurationManager.instance;
    }

    /**
     * Get all saved presets (both workspace and global)
     */
    public getPresets(): CommandPreset[] {
        const workspacePresets = this.getWorkspacePresets();
        const globalPresets = this.getGlobalPresets();
        
        // Combine presets, with workspace presets taking precedence
        const allPresets = [...workspacePresets];
        
        // Add global presets that don't conflict with workspace presets
        for (const globalPreset of globalPresets) {
            if (!workspacePresets.some(wp => wp.id === globalPreset.id)) {
                allPresets.push(globalPreset);
            }
        }
        
        return allPresets.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get workspace-specific presets
     */
    public getWorkspacePresets(): CommandPreset[] {
        return this.context.workspaceState.get<CommandPreset[]>(STATE_KEYS.PRESETS, []);
    }

    /**
     * Get global presets
     */
    public getGlobalPresets(): CommandPreset[] {
        return this.context.globalState.get<CommandPreset[]>(STATE_KEYS.PRESETS, []);
    }

    /**
     * Save a preset
     */
    public async savePreset(preset: CommandPreset, scope: 'workspace' | 'global' = 'workspace'): Promise<void> {
        try {
            const existingPresets = scope === 'workspace' ? this.getWorkspacePresets() : this.getGlobalPresets();
            
            // Check if preset with same ID already exists
            const existingIndex = existingPresets.findIndex(p => p.id === preset.id);
            
            if (existingIndex >= 0) {
                // Update existing preset
                existingPresets[existingIndex] = preset;
                this.logger.info(`Updated existing preset: ${preset.name}`);
            } else {
                // Add new preset
                existingPresets.push(preset);
                this.logger.info(`Saved new preset: ${preset.name}`);
            }
            
            // Save to appropriate state
            if (scope === 'workspace') {
                await this.context.workspaceState.update(STATE_KEYS.PRESETS, existingPresets);
            } else {
                await this.context.globalState.update(STATE_KEYS.PRESETS, existingPresets);
            }
            
        } catch (error) {
            this.logger.error(`Failed to save preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to save preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a preset
     */
    public async deletePreset(presetId: string): Promise<boolean> {
        try {
            // Try to delete from workspace presets first
            const workspacePresets = this.getWorkspacePresets();
            const workspaceIndex = workspacePresets.findIndex(p => p.id === presetId);
            
            if (workspaceIndex >= 0) {
                const deletedPreset = workspacePresets.splice(workspaceIndex, 1)[0];
                await this.context.workspaceState.update(STATE_KEYS.PRESETS, workspacePresets);
                this.logger.info(`Deleted workspace preset: ${deletedPreset.name}`);
                return true;
            }
            
            // Try to delete from global presets
            const globalPresets = this.getGlobalPresets();
            const globalIndex = globalPresets.findIndex(p => p.id === presetId);
            
            if (globalIndex >= 0) {
                const deletedPreset = globalPresets.splice(globalIndex, 1)[0];
                await this.context.globalState.update(STATE_KEYS.PRESETS, globalPresets);
                this.logger.info(`Deleted global preset: ${deletedPreset.name}`);
                return true;
            }
            
            this.logger.warn(`Preset not found for deletion: ${presetId}`);
            return false;
            
        } catch (error) {
            this.logger.error(`Failed to delete preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to delete preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a specific preset by ID
     */
    public getPreset(presetId: string): CommandPreset | undefined {
        const allPresets = this.getPresets();
        return allPresets.find(p => p.id === presetId);
    }

    /**
     * Create a preset from an execution context
     */
    public createPresetFromExecution(
        executionContext: ExecutionContext,
        name: string,
        description?: string,
        tags?: string[]
    ): CommandPreset {
        const preset: CommandPreset = {
            id: this.generatePresetId(),
            name,
            command: executionContext.command,
            operation: executionContext.operation,
            arguments: { ...executionContext.arguments },
            description,
            tags: tags || [],
            createdAt: new Date(),
            lastUsed: new Date()
        };
        
        return preset;
    }

    /**
     * Update the last used timestamp for a preset
     */
    public async updatePresetLastUsed(presetId: string): Promise<void> {
        try {
            // Check workspace presets first
            const workspacePresets = this.getWorkspacePresets();
            const workspaceIndex = workspacePresets.findIndex(p => p.id === presetId);
            
            if (workspaceIndex >= 0) {
                workspacePresets[workspaceIndex].lastUsed = new Date();
                await this.context.workspaceState.update(STATE_KEYS.PRESETS, workspacePresets);
                return;
            }
            
            // Check global presets
            const globalPresets = this.getGlobalPresets();
            const globalIndex = globalPresets.findIndex(p => p.id === presetId);
            
            if (globalIndex >= 0) {
                globalPresets[globalIndex].lastUsed = new Date();
                await this.context.globalState.update(STATE_KEYS.PRESETS, globalPresets);
                return;
            }
            
            this.logger.warn(`Preset not found for last used update: ${presetId}`);
            
        } catch (error) {
            this.logger.error(`Failed to update preset last used: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get recent commands
     */
    public getRecentCommands(): ExecutionContext[] {
        return this.context.workspaceState.get<ExecutionContext[]>(STATE_KEYS.RECENT_COMMANDS, []);
    }

    /**
     * Add a command to recent commands
     */
    public async addRecentCommand(executionContext: ExecutionContext): Promise<void> {
        try {
            const recentCommands = this.getRecentCommands();
            const maxRecentCommands = this.getExtensionSettings().maxRecentCommands;
            
            // Remove if already exists (to move to front)
            const existingIndex = recentCommands.findIndex(cmd => 
                cmd.command === executionContext.command && 
                cmd.operation === executionContext.operation &&
                JSON.stringify(cmd.arguments) === JSON.stringify(executionContext.arguments)
            );
            
            if (existingIndex >= 0) {
                recentCommands.splice(existingIndex, 1);
            }
            
            // Add to front
            recentCommands.unshift(executionContext);
            
            // Trim to max length
            if (recentCommands.length > maxRecentCommands) {
                recentCommands.splice(maxRecentCommands);
            }
            
            await this.context.workspaceState.update(STATE_KEYS.RECENT_COMMANDS, recentCommands);
            
        } catch (error) {
            this.logger.error(`Failed to add recent command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Clear recent commands
     */
    public async clearRecentCommands(): Promise<void> {
        try {
            await this.context.workspaceState.update(STATE_KEYS.RECENT_COMMANDS, []);
            this.logger.info('Cleared recent commands');
        } catch (error) {
            this.logger.error(`Failed to clear recent commands: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to clear recent commands: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get extension settings
     */
    public getExtensionSettings(): ExtensionSettings {
        const config = vscode.workspace.getConfiguration();
        
        return {
            defaultPort: config.get<number>(CONFIG_KEYS.DEFAULT_PORT, DEFAULTS.PORT),
            autoStartServer: config.get<boolean>(CONFIG_KEYS.AUTO_START_SERVER, false),
            showOutputOnExecution: config.get<boolean>(CONFIG_KEYS.SHOW_OUTPUT_ON_EXECUTION, true),
            bbdevPath: config.get<string>(CONFIG_KEYS.BBDEV_PATH, DEFAULTS.BBDEV_PATH),
            presets: this.getPresets(),
            recentCommands: this.getRecentCommands(),
            maxRecentCommands: DEFAULTS.MAX_RECENT_COMMANDS
        };
    }

    /**
     * Export presets to JSON
     */
    public exportPresets(scope: 'workspace' | 'global' | 'all' = 'all'): string {
        let presets: CommandPreset[];
        
        switch (scope) {
            case 'workspace':
                presets = this.getWorkspacePresets();
                break;
            case 'global':
                presets = this.getGlobalPresets();
                break;
            case 'all':
            default:
                presets = this.getPresets();
                break;
        }
        
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            scope,
            presets
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import presets from JSON
     */
    public async importPresets(jsonData: string, scope: 'workspace' | 'global' = 'workspace'): Promise<number> {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.presets || !Array.isArray(importData.presets)) {
                throw new Error('Invalid preset data format');
            }
            
            const presets = importData.presets as CommandPreset[];
            let importedCount = 0;
            
            for (const preset of presets) {
                // Validate preset structure
                if (!this.isValidPreset(preset)) {
                    this.logger.warn(`Skipping invalid preset: ${(preset as any).name || 'unnamed'}`);
                    continue;
                }
                
                // Generate new ID to avoid conflicts
                preset.id = this.generatePresetId();
                preset.createdAt = new Date();
                
                await this.savePreset(preset, scope);
                importedCount++;
            }
            
            this.logger.info(`Imported ${importedCount} presets`);
            return importedCount;
            
        } catch (error) {
            this.logger.error(`Failed to import presets: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to import presets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate preset structure
     */
    private isValidPreset(preset: any): preset is CommandPreset {
        return (
            preset &&
            typeof preset.name === 'string' &&
            typeof preset.command === 'string' &&
            typeof preset.operation === 'string' &&
            typeof preset.arguments === 'object' &&
            preset.arguments !== null
        );
    }

    /**
     * Generate a unique preset ID
     */
    private generatePresetId(): string {
        return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up any resources if needed
        this.logger.info('ConfigurationManager disposed');
    }
}