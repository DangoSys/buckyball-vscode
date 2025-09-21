import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getLogger } from './logger';
import { getErrorHandler, EnhancedBBDevError } from './errorHandler';

const execAsync = promisify(exec);

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fixAction?: () => Promise<void>;
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  name: string;
  command: string;
  versionCommand?: string;
  requiredVersion?: string;
  installInstructions: string;
  description: string;
  optional?: boolean;
}

/**
 * Workspace validation result
 */
export interface WorkspaceValidationResult {
  isValid: boolean;
  results: ValidationResult[];
  dependencies: DependencyValidationResult[];
}

/**
 * Dependency validation result
 */
export interface DependencyValidationResult extends ValidationResult {
  dependency: DependencyInfo;
  installedVersion?: string;
  isInstalled: boolean;
}

/**
 * Validator class for BBDev extension
 */
export class Validator {
  private static instance: Validator;
  private logger = getLogger();
  private errorHandler = getErrorHandler();

  // Required dependencies for BBDev
  private readonly dependencies: DependencyInfo[] = [
    {
      name: 'Python',
      command: 'python3',
      versionCommand: 'python3 --version',
      requiredVersion: '3.8.0',
      installInstructions: `
Install Python 3.8 or later:
- Ubuntu/Debian: sudo apt install python3 python3-pip
- macOS: brew install python3
- Windows: Download from https://python.org/downloads/
      `.trim(),
      description: 'Required for running bbdev scripts'
    },
    {
      name: 'BBDev Tool',
      command: 'bbdev',
      versionCommand: 'bbdev --version',
      installInstructions: `
Install bbdev tool:
1. Clone the repository
2. Navigate to the workflow directory
3. Run: pip install -e .
      `.trim(),
      description: 'The main bbdev command-line tool'
    },
    {
      name: 'Git',
      command: 'git',
      versionCommand: 'git --version',
      installInstructions: `
Install Git:
- Ubuntu/Debian: sudo apt install git
- macOS: brew install git or use Xcode Command Line Tools
- Windows: Download from https://git-scm.com/downloads
      `.trim(),
      description: 'Required for version control operations',
      optional: true
    },
    {
      name: 'Make',
      command: 'make',
      versionCommand: 'make --version',
      installInstructions: `
Install Make:
- Ubuntu/Debian: sudo apt install build-essential
- macOS: brew install make or use Xcode Command Line Tools
- Windows: Install through MSYS2 or WSL
      `.trim(),
      description: 'Required for building projects',
      optional: true
    }
  ];

  private constructor() {}

  public static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }
    return Validator.instance;
  }

  /**
   * Validate the entire workspace and dependencies
   */
  public async validateWorkspace(): Promise<WorkspaceValidationResult> {
    this.logger.info('Starting workspace validation', 'Validator');

    const results: ValidationResult[] = [];
    const dependencyResults: DependencyValidationResult[] = [];

    try {
      // Validate workspace structure
      const workspaceResults = await this.validateWorkspaceStructure();
      results.push(...workspaceResults);

      // Validate dependencies
      const depResults = await this.validateDependencies();
      dependencyResults.push(...depResults);

      // Validate configuration
      const configResults = await this.validateConfiguration();
      results.push(...configResults);

      // Validate bbdev tool specifically
      const bbdevResults = await this.validateBBDevTool();
      results.push(...bbdevResults);

      const allResults = [...results, ...dependencyResults];
      const isValid = allResults.every(result => result.severity !== 'error');

      this.logger.info(`Workspace validation completed. Valid: ${isValid}`, 'Validator');

      return {
        isValid,
        results,
        dependencies: dependencyResults
      };

    } catch (error) {
      this.logger.error(`Workspace validation failed: ${error}`, 'Validator');
      
      const errorResult: ValidationResult = {
        isValid: false,
        message: `Validation failed: ${error}`,
        severity: 'error'
      };

      return {
        isValid: false,
        results: [errorResult],
        dependencies: dependencyResults
      };
    }
  }

  /**
   * Validate workspace structure
   */
  private async validateWorkspaceStructure(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      results.push({
        isValid: false,
        message: 'No workspace folder is open',
        severity: 'error',
        fixAction: async () => {
          await vscode.commands.executeCommand('vscode.openFolder');
        }
      });
      return results;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Check for common project files
    const expectedFiles = [
      { path: 'package.json', optional: true, description: 'Node.js project file' },
      { path: 'pyproject.toml', optional: true, description: 'Python project file' },
      { path: 'Makefile', optional: true, description: 'Build configuration' },
      { path: 'README.md', optional: true, description: 'Project documentation' }
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(workspaceRoot, file.path);
      const exists = fs.existsSync(filePath);

      if (!exists && !file.optional) {
        results.push({
          isValid: false,
          message: `Missing required file: ${file.path}`,
          severity: 'error'
        });
      } else if (!exists && file.optional) {
        results.push({
          isValid: true,
          message: `Optional file not found: ${file.path} (${file.description})`,
          severity: 'info'
        });
      } else {
        results.push({
          isValid: true,
          message: `Found ${file.path}`,
          severity: 'info'
        });
      }
    }

    // Check workspace permissions
    try {
      const testFile = path.join(workspaceRoot, '.bbdev-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      results.push({
        isValid: true,
        message: 'Workspace has write permissions',
        severity: 'info'
      });
    } catch (error) {
      results.push({
        isValid: false,
        message: 'Workspace does not have write permissions',
        severity: 'error',
        fixAction: async () => {
          vscode.window.showErrorMessage(
            'Please ensure the workspace directory has write permissions'
          );
        }
      });
    }

    return results;
  }

  /**
   * Validate all dependencies
   */
  private async validateDependencies(): Promise<DependencyValidationResult[]> {
    const results: DependencyValidationResult[] = [];

    for (const dependency of this.dependencies) {
      const result = await this.validateDependency(dependency);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a single dependency
   */
  private async validateDependency(dependency: DependencyInfo): Promise<DependencyValidationResult> {
    try {
      // Check if command exists
      const { stdout } = await execAsync(`which ${dependency.command}`, { timeout: 5000 });
      
      if (!stdout.trim()) {
        return this.createDependencyResult(dependency, false, 'Command not found in PATH');
      }

      // Check version if specified
      let installedVersion: string | undefined;
      if (dependency.versionCommand) {
        try {
          const { stdout: versionOutput } = await execAsync(dependency.versionCommand, { timeout: 5000 });
          installedVersion = this.extractVersion(versionOutput);
          
          if (dependency.requiredVersion && installedVersion) {
            const isVersionValid = this.compareVersions(installedVersion, dependency.requiredVersion) >= 0;
            if (!isVersionValid) {
              return this.createDependencyResult(
                dependency,
                false,
                `Version ${installedVersion} is older than required ${dependency.requiredVersion}`,
                installedVersion
              );
            }
          }
        } catch (versionError) {
          // Version check failed, but command exists
          this.logger.warn(`Could not check version for ${dependency.name}: ${versionError}`, 'Validator');
        }
      }

      return this.createDependencyResult(
        dependency,
        true,
        `${dependency.name} is installed and available`,
        installedVersion
      );

    } catch (error) {
      return this.createDependencyResult(
        dependency,
        false,
        `${dependency.name} is not installed or not available in PATH`
      );
    }
  }

  /**
   * Create a dependency validation result
   */
  private createDependencyResult(
    dependency: DependencyInfo,
    isInstalled: boolean,
    message: string,
    installedVersion?: string
  ): DependencyValidationResult {
    const severity: 'error' | 'warning' | 'info' = 
      !isInstalled && !dependency.optional ? 'error' :
      !isInstalled && dependency.optional ? 'warning' : 'info';

    return {
      dependency,
      isInstalled,
      installedVersion,
      isValid: isInstalled || dependency.optional || false,
      message,
      severity,
      fixAction: !isInstalled ? async () => {
        await this.errorHandler.handleMissingDependency(
          dependency.name,
          dependency.description,
          dependency.installInstructions
        );
      } : undefined
    };
  }

  /**
   * Validate extension configuration
   */
  private async validateConfiguration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const config = vscode.workspace.getConfiguration('bbdev');

    // Check bbdev path configuration
    const bbdevPath = config.get<string>('bbdevPath', 'bbdev');
    if (bbdevPath !== 'bbdev') {
      // Custom path specified, validate it
      if (!fs.existsSync(bbdevPath)) {
        results.push({
          isValid: false,
          message: `Custom bbdev path does not exist: ${bbdevPath}`,
          severity: 'error',
          fixAction: async () => {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'bbdev.bbdevPath');
          }
        });
      } else {
        results.push({
          isValid: true,
          message: `Using custom bbdev path: ${bbdevPath}`,
          severity: 'info'
        });
      }
    }

    // Check port configuration
    const defaultPort = config.get<number>('defaultPort', 8000);
    if (defaultPort < 1024 || defaultPort > 65535) {
      results.push({
        isValid: false,
        message: `Invalid default port: ${defaultPort}. Must be between 1024 and 65535`,
        severity: 'error',
        fixAction: async () => {
          await vscode.commands.executeCommand('workbench.action.openSettings', 'bbdev.defaultPort');
        }
      });
    }

    return results;
  }

  /**
   * Validate bbdev tool specifically
   */
  private async validateBBDevTool(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    try {
      // Try to get bbdev help
      const config = vscode.workspace.getConfiguration('bbdev');
      const bbdevPath = config.get<string>('bbdevPath', 'bbdev');
      
      const { stdout, stderr } = await execAsync(`${bbdevPath} --help`, { timeout: 10000 });
      
      if (stdout.includes('usage:') || stdout.includes('bbdev')) {
        results.push({
          isValid: true,
          message: 'BBDev tool is working correctly',
          severity: 'info'
        });

        // Check for available commands
        const availableCommands = this.extractAvailableCommands(stdout);
        if (availableCommands.length > 0) {
          results.push({
            isValid: true,
            message: `Found ${availableCommands.length} available commands: ${availableCommands.join(', ')}`,
            severity: 'info'
          });
        }
      } else {
        results.push({
          isValid: false,
          message: 'BBDev tool is not responding correctly',
          severity: 'error'
        });
      }

    } catch (error) {
      results.push({
        isValid: false,
        message: `Cannot execute bbdev tool: ${error}`,
        severity: 'error',
        fixAction: async () => {
          const dependency = this.dependencies.find(dep => dep.name === 'BBDev Tool');
          if (dependency) {
            await this.errorHandler.handleMissingDependency(
              dependency.name,
              dependency.description,
              dependency.installInstructions
            );
          }
        }
      });
    }

    return results;
  }

  /**
   * Extract version from command output
   */
  private extractVersion(output: string): string | undefined {
    const versionRegex = /(\d+\.\d+\.\d+)/;
    const match = output.match(versionRegex);
    return match ? match[1] : undefined;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Extract available commands from bbdev help output
   */
  private extractAvailableCommands(helpOutput: string): string[] {
    const commands: string[] = [];
    const lines = helpOutput.split('\n');
    
    let inCommandsSection = false;
    for (const line of lines) {
      if (line.includes('positional arguments:') || line.includes('commands:')) {
        inCommandsSection = true;
        continue;
      }
      
      if (inCommandsSection && line.trim().startsWith('{')) {
        // Extract commands from {command1,command2,command3} format
        const match = line.match(/\{([^}]+)\}/);
        if (match) {
          const commandList = match[1].split(',').map(cmd => cmd.trim());
          commands.push(...commandList);
        }
        break;
      }
    }
    
    return commands;
  }

  /**
   * Show validation results to user
   */
  public async showValidationResults(results: WorkspaceValidationResult): Promise<void> {
    const errorCount = results.results.filter(r => r.severity === 'error').length +
                      results.dependencies.filter(r => r.severity === 'error').length;
    const warningCount = results.results.filter(r => r.severity === 'warning').length +
                        results.dependencies.filter(r => r.severity === 'warning').length;

    let message: string;
    if (errorCount > 0) {
      message = `Validation failed with ${errorCount} error(s) and ${warningCount} warning(s)`;
    } else if (warningCount > 0) {
      message = `Validation completed with ${warningCount} warning(s)`;
    } else {
      message = 'Validation completed successfully';
    }

    const actions = ['View Details'];
    if (errorCount > 0) {
      actions.push('Fix Issues');
    }

    const selection = await vscode.window.showInformationMessage(message, ...actions);

    if (selection === 'View Details') {
      await this.showDetailedValidationResults(results);
    } else if (selection === 'Fix Issues') {
      await this.fixValidationIssues(results);
    }
  }

  /**
   * Show detailed validation results in a webview
   */
  private async showDetailedValidationResults(results: WorkspaceValidationResult): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'bbdev-validation-results',
      'BBDev Validation Results',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.generateValidationResultsHtml(results);
  }

  /**
   * Generate HTML for validation results
   */
  private generateValidationResultsHtml(results: WorkspaceValidationResult): string {
    const allResults = [...results.results, ...results.dependencies];
    
    const resultRows = allResults.map(result => {
      const icon = result.severity === 'error' ? '❌' : 
                   result.severity === 'warning' ? '⚠️' : '✅';
      return `
        <tr class="${result.severity}">
          <td>${icon}</td>
          <td>${result.message}</td>
          <td>${result.severity}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .error { background-color: #ffebee; }
          .warning { background-color: #fff3e0; }
          .info { background-color: #e8f5e8; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>BBDev Validation Results</h1>
        <p>Overall Status: ${results.isValid ? '✅ Valid' : '❌ Invalid'}</p>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Message</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            ${resultRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Attempt to fix validation issues automatically
   */
  private async fixValidationIssues(results: WorkspaceValidationResult): Promise<void> {
    const allResults = [...results.results, ...results.dependencies];
    const fixableResults = allResults.filter(result => result.fixAction && result.severity === 'error');

    if (fixableResults.length === 0) {
      vscode.window.showInformationMessage('No automatically fixable issues found');
      return;
    }

    const selection = await vscode.window.showQuickPick(
      fixableResults.map(result => ({
        label: result.message,
        result
      })),
      {
        placeHolder: 'Select an issue to fix',
        canPickMany: false
      }
    );

    if (selection && selection.result.fixAction) {
      try {
        await selection.result.fixAction();
        vscode.window.showInformationMessage('Fix applied successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to apply fix: ${error}`);
      }
    }
  }
}

/**
 * Convenience function to get validator instance
 */
export function getValidator(): Validator {
  return Validator.getInstance();
}