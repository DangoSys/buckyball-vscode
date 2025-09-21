import * as vscode from 'vscode';
import { LogEntry } from '../models/types';
import { OUTPUT_CHANNELS } from '../models/constants';

/**
 * Logger utility for the BBDev extension
 */
export class Logger {
  private static instance: Logger;
  private outputChannels: Map<string, vscode.OutputChannel> = new Map();
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Get or create an output channel
   */
  private getOutputChannel(channelName: string): vscode.OutputChannel {
    if (!this.outputChannels.has(channelName)) {
      const channel = vscode.window.createOutputChannel(channelName);
      this.outputChannels.set(channelName, channel);
    }
    return this.outputChannels.get(channelName)!;
  }

  /**
   * Log an info message
   */
  public info(message: string, context?: string, channelName: string = OUTPUT_CHANNELS.MAIN): void {
    this.log('info', message, context, channelName);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, context?: string, channelName: string = OUTPUT_CHANNELS.MAIN): void {
    this.log('warn', message, context, channelName);
  }

  /**
   * Log an error message
   */
  public error(message: string, context?: string, channelName: string = OUTPUT_CHANNELS.MAIN): void {
    this.log('error', message, context, channelName);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, context?: string, channelName: string = OUTPUT_CHANNELS.MAIN): void {
    this.log('debug', message, context, channelName);
  }

  /**
   * Log a message with specified level
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: string, channelName: string = OUTPUT_CHANNELS.MAIN): void {
    const timestamp = new Date();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context
    };

    // Add to history
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Format message for output
    const formattedMessage = this.formatLogMessage(logEntry);
    
    // Write to output channel
    const channel = this.getOutputChannel(channelName);
    channel.appendLine(formattedMessage);

    // Show error messages as notifications
    if (level === 'error') {
      vscode.window.showErrorMessage(message);
    } else if (level === 'warn') {
      vscode.window.showWarningMessage(message);
    }
  }

  /**
   * Format a log message for display
   */
  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? `[${entry.context}] ` : '';
    return `${timestamp} ${level} ${context}${entry.message}`;
  }

  /**
   * Show an output channel
   */
  public showChannel(channelName: string = OUTPUT_CHANNELS.MAIN): void {
    const channel = this.getOutputChannel(channelName);
    channel.show();
  }

  /**
   * Clear an output channel
   */
  public clearChannel(channelName: string = OUTPUT_CHANNELS.MAIN): void {
    const channel = this.getOutputChannel(channelName);
    channel.clear();
  }

  /**
   * Get log history
   */
  public getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Get log history filtered by level
   */
  public getHistoryByLevel(level: 'info' | 'warn' | 'error' | 'debug'): LogEntry[] {
    return this.logHistory.filter(entry => entry.level === level);
  }

  /**
   * Get log history filtered by context
   */
  public getHistoryByContext(context: string): LogEntry[] {
    return this.logHistory.filter(entry => entry.context === context);
  }

  /**
   * Clear log history
   */
  public clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Dispose all output channels
   */
  public dispose(): void {
    this.outputChannels.forEach(channel => channel.dispose());
    this.outputChannels.clear();
    this.logHistory = [];
  }
}

/**
 * Convenience function to get logger instance
 */
export function getLogger(): Logger {
  return Logger.getInstance();
}