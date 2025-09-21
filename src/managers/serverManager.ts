import * as vscode from 'vscode';
import { ServerInstance, BBDevError, ExecutionResult } from '../models/types';
import { DEFAULTS, ERROR_MESSAGES, SUCCESS_MESSAGES, CONFIG_KEYS } from '../models/constants';
import { ProcessUtils } from '../utils/processUtils';
import { getLogger } from '../utils/logger';
import { getErrorHandler } from '../utils/errorHandler';

/**
 * Manages bbdev server instances - starting, stopping, and monitoring servers
 */
export class ServerManager {
  private static instance: ServerManager;
  private servers: Map<number, ServerInstance> = new Map();
  private logger = getLogger();
  private errorHandler = getErrorHandler();
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('BBDev Server');
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'bbdev.showServerStatus';
    this.updateStatusBar();
  }

  /**
   * Get singleton instance of ServerManager
   */
  public static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  /**
   * Get all running server instances
   */
  public getRunningServers(): ServerInstance[] {
    return Array.from(this.servers.values()).filter(server => 
      server.status === 'running' || server.status === 'starting'
    );
  }

  /**
   * Get all server instances (including stopped ones)
   */
  public getAllServers(): ServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server instance by port
   */
  public getServer(port: number): ServerInstance | undefined {
    return this.servers.get(port);
  }

  /**
   * Start a bbdev server on the specified port
   */
  public async startServer(port?: number, workspaceRoot?: string): Promise<ServerInstance> {
    try {
      // Get workspace root if not provided
      if (!workspaceRoot) {
        workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
          throw new BBDevError(
            'No workspace folder found. Please open a workspace to start bbdev server.',
            'filesystem'
          );
        }
      }

      // Find available port if not specified
      if (!port) {
        const defaultPort = vscode.workspace.getConfiguration().get<number>(
          CONFIG_KEYS.DEFAULT_PORT,
          DEFAULTS.PORT
        );
        port = await ProcessUtils.findAvailablePort(defaultPort);
      } else {
        // Check if port is already in use
        const isInUse = await ProcessUtils.isPortInUse(port);
        if (isInUse) {
          throw new BBDevError(
            `Port ${port} is already in use`,
            'network',
            { port }
          );
        }
      }

      // Check if we already have a server on this port
      const existingServer = this.servers.get(port);
      if (existingServer && (existingServer.status === 'running' || existingServer.status === 'starting')) {
        throw new BBDevError(
          `Server already running on port ${port}`,
          'server',
          { port, existingServer }
        );
      }

      // Create server instance
      const serverInstance: ServerInstance = {
        port,
        status: 'starting',
        startTime: new Date(),
        url: `http://localhost:${port}`,
        workspaceRoot
      };

      this.servers.set(port, serverInstance);
      this.updateStatusBar();

      this.logger.info(`Starting bbdev server on port ${port}`, 'ServerManager');
      this.outputChannel.appendLine(`Starting bbdev server on port ${port}...`);

      // Get bbdev path from configuration
      const bbdevPath = vscode.workspace.getConfiguration().get<string>(
        CONFIG_KEYS.BBDEV_PATH,
        DEFAULTS.BBDEV_PATH
      );

      // Validate bbdev command
      await ProcessUtils.validateBBDevCommand(bbdevPath);

      // Start server process
      const result = await this.executeServerCommand(
        bbdevPath,
        ['agent', 'start', '--port', port.toString()],
        workspaceRoot,
        serverInstance
      );

      if (result.success) {
        serverInstance.status = 'running';
        serverInstance.pid = await this.findServerPid(port);
        
        this.logger.info(`BBDev server started successfully on port ${port}`, 'ServerManager');
        this.outputChannel.appendLine(`Server started successfully on port ${port}`);
        this.outputChannel.appendLine(`Server URL: ${serverInstance.url}`);
        
        vscode.window.showInformationMessage(
          `${SUCCESS_MESSAGES.SERVER_STARTED} on port ${port}`,
          'Open in Browser'
        ).then(selection => {
          if (selection === 'Open in Browser') {
            this.openInBrowser(port!);
          }
        });

      } else {
        serverInstance.status = 'error';
        this.logger.error(`Failed to start server on port ${port}: ${result.stderr}`, 'ServerManager');
        this.outputChannel.appendLine(`Failed to start server: ${result.stderr}`);
        
        throw new BBDevError(
          `${ERROR_MESSAGES.SERVER_START_FAILED}: ${result.stderr}`,
          'server',
          { port, result }
        );
      }

      this.updateStatusBar();
      return serverInstance;

    } catch (error) {
      // Update server status to error if it exists
      if (port && this.servers.has(port)) {
        const server = this.servers.get(port)!;
        server.status = 'error';
        this.updateStatusBar();
      }

      if (error instanceof BBDevError) {
        throw error;
      }
      
      throw new BBDevError(
        `Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'server',
        { port, workspaceRoot },
        error as Error
      );
    }
  }

  /**
   * Stop a bbdev server running on the specified port
   */
  public async stopServer(port: number): Promise<void> {
    try {
      const serverInstance = this.servers.get(port);
      if (!serverInstance) {
        throw new BBDevError(
          `No server found on port ${port}`,
          'server',
          { port }
        );
      }

      if (serverInstance.status === 'stopped' || serverInstance.status === 'stopping') {
        this.logger.info(`Server on port ${port} is already stopped or stopping`, 'ServerManager');
        return;
      }

      serverInstance.status = 'stopping';
      this.updateStatusBar();

      this.logger.info(`Stopping bbdev server on port ${port}`, 'ServerManager');
      this.outputChannel.appendLine(`Stopping bbdev server on port ${port}...`);

      // Try to stop gracefully first
      let stopped = false;

      // Get bbdev path from configuration
      const bbdevPath = vscode.workspace.getConfiguration().get<string>(
        CONFIG_KEYS.BBDEV_PATH,
        DEFAULTS.BBDEV_PATH
      );

      try {
        const result = await ProcessUtils.executeCommand(
          bbdevPath,
          ['agent', 'stop', '--port', port.toString()],
          {
            cwd: serverInstance.workspaceRoot,
            timeout: 10000
          }
        );

        if (result.success) {
          stopped = true;
          this.logger.info(`Server on port ${port} stopped gracefully`, 'ServerManager');
          this.outputChannel.appendLine(`Server stopped gracefully`);
        }
      } catch (error) {
        this.logger.warn(`Failed to stop server gracefully: ${error}`, 'ServerManager');
      }

      // If graceful stop failed, try to kill the process
      if (!stopped && serverInstance.pid) {
        try {
          await ProcessUtils.killProcess(serverInstance.pid, 'SIGTERM');
          
          // Wait a bit and try SIGKILL if still running
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            process.kill(serverInstance.pid, 0); // Check if process still exists
            await ProcessUtils.killProcess(serverInstance.pid, 'SIGKILL');
          } catch {
            // Process is already dead
          }
          
          stopped = true;
          this.logger.info(`Server process ${serverInstance.pid} killed`, 'ServerManager');
          this.outputChannel.appendLine(`Server process killed`);
        } catch (error) {
          this.logger.error(`Failed to kill server process: ${error}`, 'ServerManager');
        }
      }

      // Update server status
      serverInstance.status = 'stopped';
      serverInstance.pid = undefined;
      this.updateStatusBar();

      if (stopped) {
        this.logger.info(`BBDev server on port ${port} stopped successfully`, 'ServerManager');
        vscode.window.showInformationMessage(`${SUCCESS_MESSAGES.SERVER_STOPPED} on port ${port}`);
      } else {
        throw new BBDevError(
          `${ERROR_MESSAGES.SERVER_STOP_FAILED} on port ${port}`,
          'server',
          { port, serverInstance }
        );
      }

    } catch (error) {
      if (error instanceof BBDevError) {
        throw error;
      }
      
      throw new BBDevError(
        `Failed to stop server on port ${port}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'server',
        { port },
        error as Error
      );
    }
  }

  /**
   * Stop all running servers
   */
  public async stopAllServers(): Promise<void> {
    const runningServers = this.getRunningServers();
    
    if (runningServers.length === 0) {
      this.logger.info('No running servers to stop', 'ServerManager');
      return;
    }

    this.logger.info(`Stopping ${runningServers.length} running servers`, 'ServerManager');
    this.outputChannel.appendLine(`Stopping ${runningServers.length} running servers...`);

    const stopPromises = runningServers.map(server => 
      this.stopServer(server.port).catch(error => {
        this.logger.error(`Failed to stop server on port ${server.port}: ${error}`, 'ServerManager');
      })
    );

    await Promise.all(stopPromises);
    this.logger.info('All servers stopped', 'ServerManager');
  }

  /**
   * Get server status
   */
  public async getServerStatus(port: number): Promise<'running' | 'stopped'> {
    const serverInstance = this.servers.get(port);
    
    if (!serverInstance) {
      return 'stopped';
    }

    // If we think it's running, verify by checking the port
    if (serverInstance.status === 'running') {
      const isPortInUse = await ProcessUtils.isPortInUse(port);
      if (!isPortInUse) {
        // Port is not in use, server must have stopped
        serverInstance.status = 'stopped';
        serverInstance.pid = undefined;
        this.updateStatusBar();
        return 'stopped';
      }
    }

    return serverInstance.status === 'running' ? 'running' : 'stopped';
  }

  /**
   * Refresh server status for all servers
   */
  public async refreshServerStatus(): Promise<void> {
    const servers = Array.from(this.servers.values());
    
    for (const server of servers) {
      if (server.status === 'running') {
        await this.getServerStatus(server.port);
      }
    }
    
    this.updateStatusBar();
  }

  /**
   * Open server in browser
   */
  public async openInBrowser(port: number): Promise<void> {
    const serverInstance = this.servers.get(port);
    
    if (!serverInstance) {
      throw new BBDevError(
        `No server found on port ${port}`,
        'server',
        { port }
      );
    }

    if (serverInstance.status !== 'running') {
      throw new BBDevError(
        `Server on port ${port} is not running`,
        'server',
        { port, status: serverInstance.status }
      );
    }

    try {
      await vscode.env.openExternal(vscode.Uri.parse(serverInstance.url));
      this.logger.info(`Opened server ${serverInstance.url} in browser`, 'ServerManager');
    } catch (error) {
      throw new BBDevError(
        `Failed to open server in browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'network',
        { port, url: serverInstance.url },
        error as Error
      );
    }
  }

  /**
   * Execute a server command with proper output handling
   */
  private async executeServerCommand(
    command: string,
    args: string[],
    cwd: string,
    serverInstance: ServerInstance
  ): Promise<ExecutionResult> {
    return ProcessUtils.executeCommand(command, args, {
      cwd,
      timeout: DEFAULTS.SERVER_START_TIMEOUT,
      onOutput: (data: string) => {
        this.outputChannel.appendLine(`[${serverInstance.port}] ${data.trim()}`);
      },
      onError: (data: string) => {
        this.outputChannel.appendLine(`[${serverInstance.port}] ERROR: ${data.trim()}`);
      }
    });
  }

  /**
   * Find the PID of a server running on a specific port
   */
  private async findServerPid(port: number): Promise<number | undefined> {
    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        const result = await ProcessUtils.executeCommand('netstat', ['-ano'], { timeout: 5000 });
        if (result.success) {
          const lines = result.stdout.split('\n');
          for (const line of lines) {
            if (line.includes(`:${port} `) && line.includes('LISTENING')) {
              const parts = line.trim().split(/\s+/);
              const pid = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(pid)) {
                return pid;
              }
            }
          }
        }
      } else {
        const result = await ProcessUtils.executeCommand('lsof', ['-ti', `:${port}`], { timeout: 5000 });
        if (result.success && result.stdout.trim()) {
          const pid = parseInt(result.stdout.trim(), 10);
          if (!isNaN(pid)) {
            return pid;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to find PID for server on port ${port}: ${error}`, 'ServerManager');
    }
    
    return undefined;
  }

  /**
   * Update status bar with server information
   */
  private updateStatusBar(): void {
    const runningServers = this.getRunningServers();
    
    if (runningServers.length === 0) {
      this.statusBarItem.text = '$(server) BBDev: No servers';
      this.statusBarItem.tooltip = 'No BBDev servers running';
      this.statusBarItem.backgroundColor = undefined;
    } else if (runningServers.length === 1) {
      const server = runningServers[0];
      this.statusBarItem.text = `$(server-process) BBDev: :${server.port}`;
      this.statusBarItem.tooltip = `BBDev server running on port ${server.port}\nClick to view server status`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else {
      this.statusBarItem.text = `$(server-process) BBDev: ${runningServers.length} servers`;
      this.statusBarItem.tooltip = `${runningServers.length} BBDev servers running\nPorts: ${runningServers.map(s => s.port).join(', ')}\nClick to view server status`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    }
    
    this.statusBarItem.show();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
    
    // Stop all servers on dispose
    this.stopAllServers().catch(error => {
      this.logger.error(`Error stopping servers during dispose: ${error}`, 'ServerManager');
    });
  }
}