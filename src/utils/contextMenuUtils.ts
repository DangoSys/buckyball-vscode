import * as vscode from 'vscode';
import * as path from 'path';
import { BBDEV_COMMANDS } from '../models/commands';
import { CommandDefinition, OperationDefinition } from '../models/types';

/**
 * File type mappings for context menu filtering
 */
export interface FileTypeMapping {
    extensions: string[];
    relevantCommands: Array<{
        command: string;
        operations: string[];
        reason: string;
    }>;
}

/**
 * File type mappings that determine which bbdev operations are relevant for different file types
 */
export const FILE_TYPE_MAPPINGS: FileTypeMapping[] = [
    {
        extensions: ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh', '.hxx'],
        relevantCommands: [
            {
                command: 'verilator',
                operations: ['sim', 'run'],
                reason: 'C/C++ files can be used as test binaries for simulation'
            },
            {
                command: 'vcs',
                operations: ['sim', 'run'],
                reason: 'C/C++ files can be used as test binaries for simulation'
            },
            {
                command: 'funcsim',
                operations: ['run'],
                reason: 'C/C++ files can be compiled and run in functional simulator'
            },
            {
                command: 'workload',
                operations: ['build', 'run'],
                reason: 'C/C++ files are part of workload builds'
            }
        ]
    },
    {
        extensions: ['.s', '.S', '.asm'],
        relevantCommands: [
            {
                command: 'verilator',
                operations: ['sim', 'run'],
                reason: 'Assembly files can be assembled and used as test binaries'
            },
            {
                command: 'vcs',
                operations: ['sim', 'run'],
                reason: 'Assembly files can be assembled and used as test binaries'
            },
            {
                command: 'funcsim',
                operations: ['run'],
                reason: 'Assembly files can be assembled and run in functional simulator'
            },
            {
                command: 'workload',
                operations: ['build', 'run'],
                reason: 'Assembly files are part of workload builds'
            }
        ]
    },
    {
        extensions: ['.json', '.yaml', '.yml'],
        relevantCommands: [
            {
                command: 'firesim',
                operations: ['run'],
                reason: 'Configuration files for FireSim'
            },
            {
                command: 'marshal',
                operations: ['pack', 'unpack'],
                reason: 'Configuration files for data marshaling'
            }
        ]
    },
    {
        extensions: ['.md', '.rst', '.txt'],
        relevantCommands: [
            {
                command: 'doc',
                operations: ['build', 'serve'],
                reason: 'Documentation files'
            }
        ]
    },
    {
        extensions: ['.py'],
        relevantCommands: [
            {
                command: 'sardine',
                operations: ['run'],
                reason: 'Python test files for sardine framework'
            }
        ]
    }
];

/**
 * Directory type mappings for context menu filtering
 */
export interface DirectoryTypeMapping {
    patterns: string[];
    relevantCommands: Array<{
        command: string;
        operations: string[];
        reason: string;
    }>;
}

/**
 * Directory patterns that determine which bbdev operations are relevant for different directory types
 */
export const DIRECTORY_TYPE_MAPPINGS: DirectoryTypeMapping[] = [
    {
        patterns: ['workloads', 'tests', 'test'],
        relevantCommands: [
            {
                command: 'workload',
                operations: ['build', 'run'],
                reason: 'Test/workload directories'
            },
            {
                command: 'sardine',
                operations: ['build', 'run'],
                reason: 'Test directories for sardine framework'
            }
        ]
    },
    {
        patterns: ['docs', 'doc', 'documentation'],
        relevantCommands: [
            {
                command: 'doc',
                operations: ['build', 'serve', 'clean'],
                reason: 'Documentation directories'
            }
        ]
    },
    {
        patterns: ['src', 'source'],
        relevantCommands: [
            {
                command: 'compiler',
                operations: ['build', 'test'],
                reason: 'Source code directories'
            },
            {
                command: 'workload',
                operations: ['build'],
                reason: 'Source directories for workloads'
            }
        ]
    },
    {
        patterns: ['data', 'datasets'],
        relevantCommands: [
            {
                command: 'marshal',
                operations: ['pack', 'unpack'],
                reason: 'Data directories for marshaling'
            }
        ]
    }
];

/**
 * Get relevant bbdev operations for a file
 */
export function getRelevantOperationsForFile(filePath: string): Array<{
    command: string;
    operation: string;
    reason: string;
    commandDef: CommandDefinition;
    operationDef: OperationDefinition;
}> {
    const extension = path.extname(filePath).toLowerCase();
    const relevantOps: Array<{
        command: string;
        operation: string;
        reason: string;
        commandDef: CommandDefinition;
        operationDef: OperationDefinition;
    }> = [];

    // Find matching file type mappings
    for (const mapping of FILE_TYPE_MAPPINGS) {
        if (mapping.extensions.includes(extension)) {
            for (const cmdMapping of mapping.relevantCommands) {
                const commandDef = BBDEV_COMMANDS.find(cmd => cmd.name === cmdMapping.command);
                if (commandDef) {
                    for (const opName of cmdMapping.operations) {
                        const operationDef = commandDef.operations.find(op => op.name === opName);
                        if (operationDef) {
                            relevantOps.push({
                                command: cmdMapping.command,
                                operation: opName,
                                reason: cmdMapping.reason,
                                commandDef,
                                operationDef
                            });
                        }
                    }
                }
            }
        }
    }

    return relevantOps;
}

/**
 * Get relevant bbdev operations for a directory
 */
export function getRelevantOperationsForDirectory(dirPath: string): Array<{
    command: string;
    operation: string;
    reason: string;
    commandDef: CommandDefinition;
    operationDef: OperationDefinition;
}> {
    const dirName = path.basename(dirPath).toLowerCase();
    const relevantOps: Array<{
        command: string;
        operation: string;
        reason: string;
        commandDef: CommandDefinition;
        operationDef: OperationDefinition;
    }> = [];

    // Find matching directory type mappings
    for (const mapping of DIRECTORY_TYPE_MAPPINGS) {
        for (const pattern of mapping.patterns) {
            if (dirName.includes(pattern) || dirPath.toLowerCase().includes(pattern)) {
                for (const cmdMapping of mapping.relevantCommands) {
                    const commandDef = BBDEV_COMMANDS.find(cmd => cmd.name === cmdMapping.command);
                    if (commandDef) {
                        for (const opName of cmdMapping.operations) {
                            const operationDef = commandDef.operations.find(op => op.name === opName);
                            if (operationDef) {
                                relevantOps.push({
                                    command: cmdMapping.command,
                                    operation: opName,
                                    reason: cmdMapping.reason,
                                    commandDef,
                                    operationDef
                                });
                            }
                        }
                    }
                }
                break; // Only match first pattern to avoid duplicates
            }
        }
    }

    return relevantOps;
}

/**
 * Get relevant bbdev operations for a resource (file or directory)
 */
export async function getRelevantOperationsForResource(resourceUri: vscode.Uri): Promise<Array<{
    command: string;
    operation: string;
    reason: string;
    commandDef: CommandDefinition;
    operationDef: OperationDefinition;
}>> {
    const resourcePath = resourceUri.fsPath;
    
    // Check if it's a file or directory
    try {
        const fileStat = await vscode.workspace.fs.stat(resourceUri);
        if (fileStat.type === vscode.FileType.Directory) {
            return getRelevantOperationsForDirectory(resourcePath);
        } else {
            return getRelevantOperationsForFile(resourcePath);
        }
    } catch {
        // Fallback: assume it's a file if we can't stat it
        return getRelevantOperationsForFile(resourcePath);
    }
}

/**
 * Check if a file extension is supported for context menu integration
 */
export function isSupportedFileExtension(extension: string): boolean {
    return FILE_TYPE_MAPPINGS.some(mapping => 
        mapping.extensions.includes(extension.toLowerCase())
    );
}

/**
 * Check if a directory name/path is supported for context menu integration
 */
export function isSupportedDirectory(dirPath: string): boolean {
    const dirName = path.basename(dirPath).toLowerCase();
    return DIRECTORY_TYPE_MAPPINGS.some(mapping =>
        mapping.patterns.some(pattern => 
            dirName.includes(pattern) || dirPath.toLowerCase().includes(pattern)
        )
    );
}

/**
 * Pre-populate arguments for an operation based on the selected resource
 */
export async function prepopulateArgumentsForResource(
    resourceUri: vscode.Uri,
    operationDef: OperationDefinition
): Promise<Record<string, any>> {
    const resourcePath = resourceUri.fsPath;
    const args: Record<string, any> = {};

    // Determine if the resource is a file or directory
    let isDirectory = false;
    try {
        const fileStat = await vscode.workspace.fs.stat(resourceUri);
        isDirectory = fileStat.type === vscode.FileType.Directory;
    } catch {
        // Fallback: assume it's a file if we can't stat it
        isDirectory = false;
    }

    // Pre-populate file/directory arguments based on the operation's argument definitions
    for (const argDef of operationDef.arguments) {
        if (argDef.type === 'file' && argDef.name === 'binary') {
            // For binary arguments, use the selected file if it's a binary-like file
            const extension = path.extname(resourcePath).toLowerCase();
            if (['.c', '.cpp', '.cc', '.cxx', '.s', '.S', '.asm'].includes(extension)) {
                // For source files, we'd typically want the compiled binary, but we can suggest the source
                args[argDef.name] = resourcePath;
            }
        } else if (argDef.type === 'file' && (argDef.name === 'input' || argDef.name === 'config')) {
            // For input/config file arguments, use the selected file if it's a file
            if (!isDirectory) {
                args[argDef.name] = resourcePath;
            }
        } else if (argDef.type === 'directory' && (argDef.name === 'input' || argDef.name === 'output')) {
            // For directory arguments, use the selected directory or parent directory
            if (isDirectory) {
                args[argDef.name] = resourcePath;
            } else {
                args[argDef.name] = path.dirname(resourcePath);
            }
        }
    }

    return args;
}