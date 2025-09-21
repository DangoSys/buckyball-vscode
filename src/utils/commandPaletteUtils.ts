import * as vscode from 'vscode';
import { BBDEV_COMMANDS } from '../models/commands';
import { CommandDefinition, OperationDefinition } from '../models/types';

/**
 * Command palette command definition
 */
export interface CommandPaletteCommand {
    id: string;
    title: string;
    category: string;
    command: string;
    operation: string;
    commandDef: CommandDefinition;
    operationDef: OperationDefinition;
}

/**
 * Generate all command palette commands from bbdev command definitions
 */
export function generateCommandPaletteCommands(): CommandPaletteCommand[] {
    const commands: CommandPaletteCommand[] = [];

    for (const commandDef of BBDEV_COMMANDS) {
        for (const operationDef of commandDef.operations) {
            commands.push({
                id: `bbdev.palette.${commandDef.name}.${operationDef.name}`,
                title: `${commandDef.name}: ${operationDef.name}`,
                category: 'BBDev',
                command: commandDef.name,
                operation: operationDef.name,
                commandDef,
                operationDef
            });
        }
    }

    return commands;
}

/**
 * Get command palette command by ID
 */
export function getCommandPaletteCommand(commandId: string): CommandPaletteCommand | undefined {
    const commands = generateCommandPaletteCommands();
    return commands.find(cmd => cmd.id === commandId);
}

/**
 * Get all command palette command IDs
 */
export function getAllCommandPaletteCommandIds(): string[] {
    return generateCommandPaletteCommands().map(cmd => cmd.id);
}

/**
 * Create VSCode command contributions for package.json
 */
export function generatePackageJsonCommands(): Array<{
    command: string;
    title: string;
    category: string;
}> {
    return generateCommandPaletteCommands().map(cmd => ({
        command: cmd.id,
        title: cmd.title,
        category: cmd.category
    }));
}

/**
 * Recent commands manager for command palette
 */
export class RecentCommandsManager {
    private static readonly MAX_RECENT_COMMANDS = 10;
    private static readonly STORAGE_KEY = 'bbdev.recentPaletteCommands';

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Add a command to recent commands
     */
    public addRecentCommand(commandId: string): void {
        const recentCommands = this.getRecentCommands();
        
        // Remove if already exists
        const existingIndex = recentCommands.indexOf(commandId);
        if (existingIndex !== -1) {
            recentCommands.splice(existingIndex, 1);
        }
        
        // Add to beginning
        recentCommands.unshift(commandId);
        
        // Limit to max size
        if (recentCommands.length > RecentCommandsManager.MAX_RECENT_COMMANDS) {
            recentCommands.splice(RecentCommandsManager.MAX_RECENT_COMMANDS);
        }
        
        // Save to storage
        this.context.globalState.update(RecentCommandsManager.STORAGE_KEY, recentCommands);
    }

    /**
     * Get recent commands
     */
    public getRecentCommands(): string[] {
        return this.context.globalState.get<string[]>(RecentCommandsManager.STORAGE_KEY, []);
    }

    /**
     * Get recent command palette commands
     */
    public getRecentCommandPaletteCommands(): CommandPaletteCommand[] {
        const recentCommandIds = this.getRecentCommands();
        const allCommands = generateCommandPaletteCommands();
        
        return recentCommandIds
            .map(id => allCommands.find(cmd => cmd.id === id))
            .filter((cmd): cmd is CommandPaletteCommand => cmd !== undefined);
    }

    /**
     * Clear recent commands
     */
    public clearRecentCommands(): void {
        this.context.globalState.update(RecentCommandsManager.STORAGE_KEY, []);
    }
}

/**
 * Favorites manager for command palette
 */
export class FavoritesManager {
    private static readonly STORAGE_KEY = 'bbdev.favoritePaletteCommands';

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Add a command to favorites
     */
    public addFavorite(commandId: string): void {
        const favorites = this.getFavorites();
        if (!favorites.includes(commandId)) {
            favorites.push(commandId);
            this.context.globalState.update(FavoritesManager.STORAGE_KEY, favorites);
        }
    }

    /**
     * Remove a command from favorites
     */
    public removeFavorite(commandId: string): void {
        const favorites = this.getFavorites();
        const index = favorites.indexOf(commandId);
        if (index !== -1) {
            favorites.splice(index, 1);
            this.context.globalState.update(FavoritesManager.STORAGE_KEY, favorites);
        }
    }

    /**
     * Check if a command is in favorites
     */
    public isFavorite(commandId: string): boolean {
        return this.getFavorites().includes(commandId);
    }

    /**
     * Get favorite commands
     */
    public getFavorites(): string[] {
        return this.context.globalState.get<string[]>(FavoritesManager.STORAGE_KEY, []);
    }

    /**
     * Get favorite command palette commands
     */
    public getFavoriteCommandPaletteCommands(): CommandPaletteCommand[] {
        const favoriteCommandIds = this.getFavorites();
        const allCommands = generateCommandPaletteCommands();
        
        return favoriteCommandIds
            .map(id => allCommands.find(cmd => cmd.id === id))
            .filter((cmd): cmd is CommandPaletteCommand => cmd !== undefined);
    }

    /**
     * Clear favorites
     */
    public clearFavorites(): void {
        this.context.globalState.update(FavoritesManager.STORAGE_KEY, []);
    }
}

/**
 * Quick pick item for command palette commands
 */
export interface CommandPaletteQuickPickItem extends vscode.QuickPickItem {
    commandId: string;
    command: string;
    operation: string;
    isRecent?: boolean;
    isFavorite?: boolean;
}

/**
 * Create quick pick items for command palette
 */
export function createCommandPaletteQuickPickItems(
    recentManager: RecentCommandsManager,
    favoritesManager: FavoritesManager,
    includeRecent: boolean = true,
    includeFavorites: boolean = true
): CommandPaletteQuickPickItem[] {
    const items: CommandPaletteQuickPickItem[] = [];
    const allCommands = generateCommandPaletteCommands();

    // Add recent commands section
    if (includeRecent) {
        const recentCommands = recentManager.getRecentCommandPaletteCommands();
        if (recentCommands.length > 0) {
            items.push({
                label: '$(history) Recent Commands',
                kind: vscode.QuickPickItemKind.Separator,
                commandId: '',
                command: '',
                operation: ''
            });

            for (const cmd of recentCommands) {
                items.push({
                    label: `$(clock) ${cmd.title}`,
                    description: cmd.operationDef.description,
                    detail: 'Recent',
                    commandId: cmd.id,
                    command: cmd.command,
                    operation: cmd.operation,
                    isRecent: true,
                    isFavorite: favoritesManager.isFavorite(cmd.id)
                });
            }
        }
    }

    // Add favorites section
    if (includeFavorites) {
        const favoriteCommands = favoritesManager.getFavoriteCommandPaletteCommands();
        if (favoriteCommands.length > 0) {
            items.push({
                label: '$(star-full) Favorite Commands',
                kind: vscode.QuickPickItemKind.Separator,
                commandId: '',
                command: '',
                operation: ''
            });

            for (const cmd of favoriteCommands) {
                items.push({
                    label: `$(star-full) ${cmd.title}`,
                    description: cmd.operationDef.description,
                    detail: 'Favorite',
                    commandId: cmd.id,
                    command: cmd.command,
                    operation: cmd.operation,
                    isRecent: recentManager.getRecentCommands().includes(cmd.id),
                    isFavorite: true
                });
            }
        }
    }

    // Add all commands section
    items.push({
        label: '$(symbol-method) All Commands',
        kind: vscode.QuickPickItemKind.Separator,
        commandId: '',
        command: '',
        operation: ''
    });

    for (const cmd of allCommands) {
        const isRecent = recentManager.getRecentCommands().includes(cmd.id);
        const isFavorite = favoritesManager.isFavorite(cmd.id);
        
        let label = cmd.title;
        if (isFavorite) {
            label = `$(star-full) ${label}`;
        } else if (isRecent) {
            label = `$(clock) ${label}`;
        }

        items.push({
            label,
            description: cmd.operationDef.description,
            detail: cmd.commandDef.description,
            commandId: cmd.id,
            command: cmd.command,
            operation: cmd.operation,
            isRecent,
            isFavorite
        });
    }

    return items;
}