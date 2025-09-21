import * as vscode from 'vscode';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { BBDevError, ExecutionResult, ProgressInfo } from '../models/types';
import { DEFAULTS, ERROR_MESSAGES } from '../models/constants';
import { getLogger } from './logger';

/**
 * Process execution utilities for the BBDev extension
 */
export class ProcessUtils {
  
  /**
   * Execute a command and return the result
   */
  public static async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      timeout?: number;
      cancellationToken?: vscode.CancellationToken;
      onProgress?: (info: ProgressInfo) => void;
      onOutput?: (data: string) => void;
      onError?: (data: string) => void;
    } = {}
  ): Promise<ExecutionResult> {
    const logger = getLogger();
    const startTime = new Date();
    
    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: true
      };

      logger.debug(`Executing command: ${command} ${args.join(' ')}`, 'ProcessUtils');
      
      const childProcess = spawn(command, args, spawnOptions);
      let stdout = '';
      let stderr = '';
      let isResolved = false;

      // Set up timeout
      const timeout = options.timeout || DEFAULTS.COMMAND_TIMEOUT;
      const timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          childProcess.kill('SIGTERM');
          const error = new BBDevError(
            `Command timed out after ${timeout}ms`,
            'command',
            { command, args, timeout }
          );
          reject(error);
          isResolved = true;
        }
      }, timeout);

      // Handle cancellation
      if (options.cancellationToken) {
        options.cancellationToken.onCancellationRequested(() => {
          if (!isResolved) {
            childProcess.kill('SIGTERM');
            const error = new BBDevError(
              'Command was cancelled',
              'command',
              { command, args }
            );
            reject(error);
            isResolved = true;
          }
        });
      }

      // Handle stdout
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          stdout += output;
          
          if (options.onOutput) {
            options.onOutput(output);
          }
          
          logger.debug(`stdout: ${output.trim()}`, 'ProcessUtils');
        });
      }

      // Handle stderr
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          stderr += output;
          
          if (options.onError) {
            options.onError(output);
          }
          
          logger.debug(`stderr: ${output.trim()}`, 'ProcessUtils');
        });
      }

      // Handle process exit
      childProcess.on('close', (code: number | null) => {
        if (!isResolved) {
          clearTimeout(timeoutHandle);
          const endTime = new Date();
          const duration = endTime.getTime() - startTime.getTime();
          
          const result: ExecutionResult = {
            success: code === 0,
            returnCode: code || -1,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            duration,
            startTime,
            endTime
          };

          logger.debug(`Command completed with code ${code} in ${duration}ms`, 'ProcessUtils');
          resolve(result);
          isResolved = true;
        }
      });

      // Handle process error
      childProcess.on('error', (error: Error) => {
        if (!isResolved) {
          clearTimeout(timeoutHandle);
          const bbdevError = new BBDevError(
            `Failed to execute command: ${error.message}`,
            'command',
            { command, args },
            error
          );
          reject(bbdevError);
          isResolved = true;
        }
      });
    });
  }

  /**
   * Execute a command with progress reporting
   */
  public static async executeCommandWithProgress(
    command: string,
    args: string[] = [],
    title: string,
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      timeout?: number;
      cancellable?: boolean;
    } = {}
  ): Promise<ExecutionResult> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: options.cancellable || false
      },
      async (progress, token) => {
        return this.executeCommand(command, args, {
          ...options,
          cancellationToken: token,
          onProgress: (info: ProgressInfo) => {
            progress.report({
              message: info.message,
              increment: info.increment
            });
          }
        });
      }
    );
  }

  /**
   * Check if a command is available in PATH
   */
  public static async isCommandAvailable(command: string): Promise<boolean> {
    try {
      const result = await this.executeCommand('which', [command], { timeout: 5000 });
      return result.success;
    } catch {
      // Try with 'where' on Windows
      try {
        const result = await this.executeCommand('where', [command], { timeout: 5000 });
        return result.success;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get command version
   */
  public static async getCommandVersion(command: string, versionArg: string = '--version'): Promise<string> {
    try {
      const result = await this.executeCommand(command, [versionArg], { timeout: 10000 });
      if (result.success) {
        return result.stdout || result.stderr;
      }
      throw new BBDevError(
        `Failed to get version for ${command}`,
        'command',
        { command, versionArg, result }
      );
    } catch (error) {
      throw new BBDevError(
        `Command ${command} not found or failed to get version`,
        'command',
        { command, versionArg },
        error as Error
      );
    }
  }

  /**
   * Kill a process by PID
   */
  public static async killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    try {
      process.kill(pid, signal);
    } catch (error) {
      throw new BBDevError(
        `Failed to kill process ${pid}`,
        'command',
        { pid, signal },
        error as Error
      );
    }
  }

  /**
   * Find processes by name
   */
  public static async findProcessesByName(processName: string): Promise<number[]> {
    try {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'tasklist' : 'pgrep';
      const args = isWindows ? ['/FI', `IMAGENAME eq ${processName}`] : [processName];
      
      const result = await this.executeCommand(command, args, { timeout: 10000 });
      
      if (!result.success) {
        return [];
      }

      const pids: number[] = [];
      
      if (isWindows) {
        // Parse tasklist output
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/\s+(\d+)\s+/);
          if (match) {
            pids.push(parseInt(match[1], 10));
          }
        }
      } else {
        // Parse pgrep output
        const lines = result.stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (!isNaN(pid)) {
            pids.push(pid);
          }
        }
      }

      return pids;
    } catch (error) {
      throw new BBDevError(
        `Failed to find processes by name ${processName}`,
        'command',
        { processName },
        error as Error
      );
    }
  }

  /**
   * Check if a port is in use
   */
  public static async isPortInUse(port: number): Promise<boolean> {
    try {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'netstat' : 'lsof';
      const args = isWindows ? ['-an'] : ['-i', `:${port}`];
      
      const result = await this.executeCommand(command, args, { timeout: 5000 });
      
      if (!result.success) {
        return false;
      }

      if (isWindows) {
        return result.stdout.includes(`:${port} `);
      } else {
        return result.stdout.trim().length > 0;
      }
    } catch {
      return false;
    }
  }

  /**
   * Find an available port starting from a given port
   */
  public static async findAvailablePort(startPort: number = 8080, maxAttempts: number = 100): Promise<number> {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) {
        return port;
      }
    }
    
    throw new BBDevError(
      `No available port found in range ${startPort}-${startPort + maxAttempts}`,
      'network',
      { startPort, maxAttempts }
    );
  }

  /**
   * Validate bbdev command availability
   */
  public static async validateBBDevCommand(bbdevPath: string = 'bbdev'): Promise<void> {
    const logger = getLogger();
    
    try {
      const isAvailable = await this.isCommandAvailable(bbdevPath);
      if (!isAvailable) {
        throw new BBDevError(ERROR_MESSAGES.BBDEV_NOT_FOUND, 'command', { bbdevPath });
      }
      
      const version = await this.getCommandVersion(bbdevPath, '--help');
      logger.info(`BBDev command found: ${bbdevPath}`, 'ProcessUtils');
      logger.debug(`BBDev help output: ${version}`, 'ProcessUtils');
      
    } catch (error) {
      if (error instanceof BBDevError) {
        throw error;
      }
      throw new BBDevError(
        ERROR_MESSAGES.BBDEV_NOT_FOUND,
        'command',
        { bbdevPath },
        error as Error
      );
    }
  }
}