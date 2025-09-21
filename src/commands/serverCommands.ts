import * as vscode from 'vscode';
import { ServerManager } from '../managers/serverManager';
import { getErrorHandler } from '../utils/errorHandler';
import { getLogger } from '../utils/logger';
import { COMMANDS } from '../models/constants';

/**
 * Register server management commands for error recovery
 */
export function registerServerCommands(context: vscode.ExtensionContext): void {
  const serverManager = ServerManager.getInstance();
  const errorHandler = getErrorHandler();
  const logger = getLogger();

  // Stop all servers command
  const stopAllServersCommand = vscode.commands.registerCommand(
    COMMANDS.STOP_ALL_SERVERS,
    async () => {
      try {
        logger.info('Stopping all servers', 'ServerCommands');
        
        const runningServers = serverManager.getRunningServers();
        
        if (runningServers.length === 0) {
          vscode.window.showInformationMessage('No running servers found');
          return;
        }

        const confirmation = await vscode.window.showWarningMessage(
          `This will stop ${runningServers.length} running server(s). Continue?`,
          'Stop All',
          'Cancel'
        );

        if (confirmation !== 'Stop All') {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Stopping servers...',
            cancellable: false
          },
          async (progress) => {
            let stopped = 0;
            for (const server of runningServers) {
              progress.report({
                increment: (stopped / runningServers.length) * 100,
                message: `Stopping server on port ${server.port}...`
              });
              
              try {
                await serverManager.stopServer(server.port);
                stopped++;
              } catch (error) {
                logger.error(`Failed to stop server on port ${server.port}: ${error}`, 'ServerCommands');
              }
            }
            
            progress.report({ increment: 100, message: 'Complete' });
          }
        );

        vscode.window.showInformationMessage(`Stopped ${runningServers.length} server(s)`);
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'stop-all-servers'
        });
      }
    }
  );

  // Start server with port selection command
  const startServerWithPortSelectionCommand = vscode.commands.registerCommand(
    COMMANDS.START_SERVER_WITH_PORT_SELECTION,
    async () => {
      try {
        logger.info('Starting server with port selection', 'ServerCommands');
        
        const portInput = await vscode.window.showInputBox({
          prompt: 'Enter port number for the new server',
          placeHolder: '8080',
          validateInput: (value) => {
            const port = parseInt(value);
            if (isNaN(port) || port < 1024 || port > 65535) {
              return 'Port must be a number between 1024 and 65535';
            }
            
            // Check if port is already in use
            const runningServers = serverManager.getRunningServers();
            if (runningServers.some(server => server.port === port)) {
              return `Port ${port} is already in use by another server`;
            }
            
            return null;
          }
        });

        if (!portInput) {
          return;
        }

        const port = parseInt(portInput);
        
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Starting server on port ${port}...`,
            cancellable: true
          },
          async (progress, token) => {
            const server = await serverManager.startServer(port);
            
            if (server.status === 'running') {
              const openBrowser = await vscode.window.showInformationMessage(
                `Server started successfully on port ${port}`,
                'Open in Browser',
                'Dismiss'
              );
              
              if (openBrowser === 'Open in Browser') {
                await vscode.commands.executeCommand('bbdev.openInBrowser', server.port);
              }
            }
          }
        );
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'start-server-with-port-selection'
        });
      }
    }
  );

  // Refresh server status command
  const refreshServerStatusCommand = vscode.commands.registerCommand(
    COMMANDS.REFRESH_SERVER_STATUS,
    async () => {
      try {
        logger.info('Refreshing server status', 'ServerCommands');
        
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Refreshing server status...',
            cancellable: false
          },
          async (progress) => {
            await serverManager.refreshServerStatus();
            progress.report({ increment: 100, message: 'Complete' });
          }
        );

        const runningServers = serverManager.getRunningServers();
        const allServers = serverManager.getAllServers();
        
        vscode.window.showInformationMessage(
          `Server status refreshed. ${runningServers.length} running, ${allServers.length - runningServers.length} stopped.`
        );

        // Refresh the tree view
        await vscode.commands.executeCommand('bbdev.refreshCommands');
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'refresh-server-status'
        });
      }
    }
  );

  // Show server status command
  const showServerStatusCommand = vscode.commands.registerCommand(
    'bbdev.showServerStatus',
    async () => {
      try {
        const allServers = serverManager.getAllServers();
        
        if (allServers.length === 0) {
          vscode.window.showInformationMessage('No servers found');
          return;
        }

        const panel = vscode.window.createWebviewPanel(
          'bbdev-server-status',
          'BBDev Server Status',
          vscode.ViewColumn.One,
          { enableScripts: true }
        );

        panel.webview.html = generateServerStatusHtml(allServers);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
          async (message) => {
            switch (message.command) {
              case 'stopServer':
                try {
                  await serverManager.stopServer(message.port);
                  panel.webview.html = generateServerStatusHtml(serverManager.getAllServers());
                } catch (error) {
                  vscode.window.showErrorMessage(`Failed to stop server: ${error}`);
                }
                break;
              case 'startServer':
                try {
                  await serverManager.startServer(message.port);
                  panel.webview.html = generateServerStatusHtml(serverManager.getAllServers());
                } catch (error) {
                  vscode.window.showErrorMessage(`Failed to start server: ${error}`);
                }
                break;
              case 'openBrowser':
                await vscode.commands.executeCommand('bbdev.openInBrowser', message.port);
                break;
            }
          }
        );
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'show-server-status'
        });
      }
    }
  );

  // Register all commands
  context.subscriptions.push(
    stopAllServersCommand,
    startServerWithPortSelectionCommand,
    refreshServerStatusCommand,
    showServerStatusCommand
  );
}

/**
 * Generate HTML for server status display
 */
function generateServerStatusHtml(servers: any[]): string {
  const serverRows = servers.map(server => {
    const statusIcon = server.status === 'running' ? '🟢' : 
                      server.status === 'starting' ? '🟡' : 
                      server.status === 'stopping' ? '🟠' : '🔴';
    
    const actions = server.status === 'running' ? 
      `<button onclick="stopServer(${server.port})">Stop</button>
       <button onclick="openBrowser(${server.port})">Open</button>` :
      `<button onclick="startServer(${server.port})">Start</button>`;

    const uptime = server.startTime ? 
      `${Math.floor((Date.now() - new Date(server.startTime).getTime()) / 1000 / 60)} min` : 
      'N/A';

    return `
      <tr>
        <td>${statusIcon}</td>
        <td>${server.port}</td>
        <td>${server.status}</td>
        <td>${server.pid || 'N/A'}</td>
        <td>${uptime}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
        }
        th, td { 
          padding: 10px; 
          text-align: left; 
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        th {
          background-color: var(--vscode-editor-selectionBackground);
          font-weight: bold;
        }
        button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 5px 10px;
          margin: 2px;
          border-radius: 3px;
          cursor: pointer;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .refresh-btn {
          margin-bottom: 20px;
          padding: 10px 20px;
        }
        h1 { color: var(--vscode-textLink-foreground); }
      </style>
    </head>
    <body>
      <h1>BBDev Server Status</h1>
      <button class="refresh-btn" onclick="refreshStatus()">Refresh Status</button>
      
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Port</th>
            <th>State</th>
            <th>PID</th>
            <th>Uptime</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${serverRows}
        </tbody>
      </table>

      <script>
        const vscode = acquireVsCodeApi();
        
        function stopServer(port) {
          vscode.postMessage({ command: 'stopServer', port: port });
        }
        
        function startServer(port) {
          vscode.postMessage({ command: 'startServer', port: port });
        }
        
        function openBrowser(port) {
          vscode.postMessage({ command: 'openBrowser', port: port });
        }
        
        function refreshStatus() {
          location.reload();
        }
      </script>
    </body>
    </html>
  `;
}