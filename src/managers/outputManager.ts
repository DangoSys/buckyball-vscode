import * as vscode from 'vscode';
import { LogEntry } from '../models/types';
import { OUTPUT_CHANNELS, REGEX_PATTERNS } from '../models/constants';
import { getLogger } from '../utils/logger';

/**
 * Log level enumeration for filtering
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Log filter configuration
 */
export interface LogFilter {
  level: LogLevel;
  searchTerm?: string;
  showTimestamps: boolean;
  showContext: boolean;
  highlightErrors: boolean;
  highlightWarnings: boolean;
}

/**
 * Channel configuration for advanced output management
 */
export interface ChannelConfig {
  name: string;
  filter: LogFilter;
  maxLines: number;
  autoScroll: boolean;
  preserveHistory: boolean;
}

/**
 * Enhanced output channel wrapper with filtering and search capabilities
 */
class EnhancedOutputChannel {
  private channel: vscode.OutputChannel;
  private logHistory: LogEntry[] = [];
  private config: ChannelConfig;
  private searchResults: LogEntry[] = [];

  constructor(name: string, config: Partial<ChannelConfig> = {}) {
    this.channel = vscode.window.createOutputChannel(name);
    this.config = {
      name,
      filter: {
        level: LogLevel.INFO,
        showTimestamps: true,
        showContext: true,
        highlightErrors: true,
        highlightWarnings: true
      },
      maxLines: 10000,
      autoScroll: true,
      preserveHistory: true,
      ...config
    };
  }

  /**
   * Append a log entry with filtering and formatting
   */
  appendLogEntry(entry: LogEntry): void {
    // Add to history if preserving
    if (this.config.preserveHistory) {
      this.logHistory.push(entry);
      
      // Trim history if it exceeds max lines
      if (this.logHistory.length > this.config.maxLines) {
        this.logHistory = this.logHistory.slice(-this.config.maxLines);
      }
    }

    // Check if entry passes filter
    if (!this.passesFilter(entry)) {
      return;
    }

    // Format and append to channel
    const formattedLine = this.formatLogEntry(entry);
    this.channel.appendLine(formattedLine);
  }

  /**
   * Append raw text with automatic log entry creation
   */
  appendLine(text: string, context?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: this.detectLogLevel(text),
      message: text,
      context
    };
    this.appendLogEntry(entry);
  }

  /**
   * Search through log history
   */
  search(term: string, caseSensitive: boolean = false): LogEntry[] {
    if (!term.trim()) {
      this.searchResults = [];
      return [];
    }

    const searchTerm = caseSensitive ? term : term.toLowerCase();
    
    this.searchResults = this.logHistory.filter(entry => {
      const message = caseSensitive ? entry.message : entry.message.toLowerCase();
      const context = entry.context ? (caseSensitive ? entry.context : entry.context.toLowerCase()) : '';
      
      return message.includes(searchTerm) || context.includes(searchTerm);
    });

    return this.searchResults;
  }

  /**
   * Filter logs by level
   */
  filterByLevel(level: LogLevel): LogEntry[] {
    return this.logHistory.filter(entry => this.getLogLevelValue(entry.level) >= level);
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
    searchResults: number;
  } {
    const stats = {
      totalEntries: this.logHistory.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      searchResults: this.searchResults.length
    };

    this.logHistory.forEach(entry => {
      switch (entry.level) {
        case 'error': stats.errorCount++; break;
        case 'warn': stats.warningCount++; break;
        case 'info': stats.infoCount++; break;
        case 'debug': stats.debugCount++; break;
      }
    });

    return stats;
  }

  /**
   * Update channel configuration
   */
  updateConfig(config: Partial<ChannelConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Refresh display if filter changed
    if (config.filter) {
      this.refreshDisplay();
    }
  }

  /**
   * Clear channel and optionally preserve history
   */
  clear(preserveHistory: boolean = false): void {
    this.channel.clear();
    
    if (!preserveHistory) {
      this.logHistory = [];
      this.searchResults = [];
    }
  }

  /**
   * Export logs to string
   */
  exportLogs(includeTimestamps: boolean = true, includeContext: boolean = true): string {
    return this.logHistory.map(entry => {
      let line = '';
      
      if (includeTimestamps) {
        line += `[${entry.timestamp.toISOString()}] `;
      }
      
      line += `${entry.level.toUpperCase()}: ${entry.message}`;
      
      if (includeContext && entry.context) {
        line += ` (${entry.context})`;
      }
      
      return line;
    }).join('\n');
  }

  /**
   * Get the underlying VSCode output channel
   */
  getChannel(): vscode.OutputChannel {
    return this.channel;
  }

  /**
   * Get channel configuration
   */
  getConfig(): ChannelConfig {
    return { ...this.config };
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Show the channel
   */
  show(preserveFocus?: boolean): void {
    this.channel.show(preserveFocus);
  }

  /**
   * Hide the channel
   */
  hide(): void {
    this.channel.hide();
  }

  /**
   * Dispose the channel
   */
  dispose(): void {
    this.channel.dispose();
  }

  /**
   * Check if log entry passes current filter
   */
  private passesFilter(entry: LogEntry): boolean {
    const filter = this.config.filter;
    
    // Check log level
    if (this.getLogLevelValue(entry.level) < filter.level) {
      return false;
    }
    
    // Check search term
    if (filter.searchTerm && filter.searchTerm.trim()) {
      const searchTerm = filter.searchTerm.toLowerCase();
      const message = entry.message.toLowerCase();
      const context = entry.context?.toLowerCase() || '';
      
      if (!message.includes(searchTerm) && !context.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Format log entry for display
   */
  private formatLogEntry(entry: LogEntry): string {
    let line = '';
    
    // Add timestamp if enabled
    if (this.config.filter.showTimestamps) {
      line += `[${entry.timestamp.toLocaleTimeString()}] `;
    }
    
    // Add level indicator with highlighting
    const levelIndicator = this.getLevelIndicator(entry.level);
    line += levelIndicator;
    
    // Add message
    line += entry.message;
    
    // Add context if enabled and available
    if (this.config.filter.showContext && entry.context) {
      line += ` (${entry.context})`;
    }
    
    return line;
  }

  /**
   * Get level indicator with highlighting
   */
  private getLevelIndicator(level: LogEntry['level']): string {
    switch (level) {
      case 'error':
        return this.config.filter.highlightErrors ? '❌ ERROR: ' : 'ERROR: ';
      case 'warn':
        return this.config.filter.highlightWarnings ? '⚠️  WARN: ' : 'WARN: ';
      case 'info':
        return 'ℹ️  INFO: ';
      case 'debug':
        return '🔍 DEBUG: ';
      default:
        return '';
    }
  }

  /**
   * Detect log level from text content
   */
  private detectLogLevel(text: string): LogEntry['level'] {
    const lowerText = text.toLowerCase();
    
    if (REGEX_PATTERNS.BBDEV_OUTPUT_ERROR.test(text) || 
        lowerText.includes('error') || 
        lowerText.includes('failed') || 
        lowerText.includes('exception')) {
      return 'error';
    }
    
    if (REGEX_PATTERNS.BBDEV_OUTPUT_WARNING.test(text) || 
        lowerText.includes('warning') || 
        lowerText.includes('warn')) {
      return 'warn';
    }
    
    if (lowerText.includes('debug') || lowerText.includes('trace')) {
      return 'debug';
    }
    
    return 'info';
  }

  /**
   * Get numeric value for log level comparison
   */
  private getLogLevelValue(level: LogEntry['level']): number {
    switch (level) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Refresh display with current filter settings
   */
  private refreshDisplay(): void {
    this.channel.clear();
    
    const filteredEntries = this.logHistory.filter(entry => this.passesFilter(entry));
    
    filteredEntries.forEach(entry => {
      const formattedLine = this.formatLogEntry(entry);
      this.channel.appendLine(formattedLine);
    });
  }
}

/**
 * Manages output channels and streaming for bbdev operations
 */
export class OutputManager {
  private static instance: OutputManager;
  private logger = getLogger();
  private outputChannels: Map<string, EnhancedOutputChannel> = new Map();
  private activeStreams: Map<string, NodeJS.Timeout[]> = new Map();

  private constructor() {}

  public static getInstance(): OutputManager {
    if (!OutputManager.instance) {
      OutputManager.instance = new OutputManager();
    }
    return OutputManager.instance;
  }

  /**
   * Get or create an enhanced output channel
   */
  public getOutputChannel(name: string): vscode.OutputChannel {
    return this.getEnhancedChannel(name).getChannel();
  }

  /**
   * Get or create an enhanced output channel with advanced features
   */
  public getEnhancedChannel(name: string, config?: Partial<ChannelConfig>): EnhancedOutputChannel {
    if (!this.outputChannels.has(name)) {
      const channel = new EnhancedOutputChannel(name, config);
      this.outputChannels.set(name, channel);
    }
    return this.outputChannels.get(name)!;
  }

  /**
   * Get command-specific output channel
   */
  public getCommandOutputChannel(commandName: string): vscode.OutputChannel {
    const channelName = `${OUTPUT_CHANNELS.COMMANDS} - ${commandName}`;
    return this.getOutputChannel(channelName);
  }

  /**
   * Get command-specific enhanced output channel
   */
  public getCommandEnhancedChannel(commandName: string, config?: Partial<ChannelConfig>): EnhancedOutputChannel {
    const channelName = `${OUTPUT_CHANNELS.COMMANDS} - ${commandName}`;
    return this.getEnhancedChannel(channelName, config);
  }

  /**
   * Stream output to channel with formatting
   */
  public streamOutput(
    channelName: string,
    data: string,
    type: 'stdout' | 'stderr' = 'stdout',
    context?: string
  ): void {
    const enhancedChannel = this.getEnhancedChannel(channelName);
    
    // Split data into lines for better formatting
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        // Create log entry with detected level
        const logEntry: LogEntry = {
          timestamp: new Date(),
          level: this.detectLogLevelFromText(line, type),
          message: line.trim(),
          context: context || (type === 'stderr' ? 'stderr' : 'stdout')
        };
        
        enhancedChannel.appendLogEntry(logEntry);
        
        // Log errors and warnings to main logger
        if (logEntry.level === 'error') {
          this.logger.error(line.trim(), 'OutputManager', channelName);
        } else if (logEntry.level === 'warn') {
          this.logger.warn(line.trim(), 'OutputManager', channelName);
        }
      }
    }
  }

  /**
   * Start a new command execution in output channel
   */
  public startCommandExecution(
    channelName: string,
    command: string,
    operation: string,
    commandArgs: Record<string, any>
  ): void {
    const enhancedChannel = this.getEnhancedChannel(channelName);
    const timestamp = new Date();
    
    // Create header log entry
    const headerEntry: LogEntry = {
      timestamp,
      level: 'info',
      message: `Starting: ${command} ${operation}`,
      context: 'command-start'
    };
    
    enhancedChannel.appendLogEntry(headerEntry);
    
    // Add separator
    enhancedChannel.appendLine('='.repeat(80), 'separator');
    
    // Log arguments if any
    if (Object.keys(commandArgs).length > 0) {
      const argsEntry: LogEntry = {
        timestamp,
        level: 'info',
        message: 'Arguments:',
        context: 'command-args'
      };
      enhancedChannel.appendLogEntry(argsEntry);
      
      for (const [key, value] of Object.entries(commandArgs)) {
        if (value !== undefined && value !== null && value !== '') {
          const argEntry: LogEntry = {
            timestamp,
            level: 'debug',
            message: `  --${key}: ${value}`,
            context: 'command-args'
          };
          enhancedChannel.appendLogEntry(argEntry);
        }
      }
    }
  }

  /**
   * End command execution in output channel
   */
  public endCommandExecution(
    channelName: string,
    success: boolean,
    duration: number,
    returnCode?: number
  ): void {
    const channel = this.getOutputChannel(channelName);
    const timestamp = new Date().toISOString();
    
    channel.appendLine('');
    channel.appendLine('-'.repeat(80));
    
    if (success) {
      channel.appendLine(`[${timestamp}] ✓ Command completed successfully in ${duration}ms`);
    } else {
      channel.appendLine(`[${timestamp}] ✗ Command failed in ${duration}ms (exit code: ${returnCode || 'unknown'})`);
    }
    
    channel.appendLine('-'.repeat(80));
    channel.appendLine('');
  }

  /**
   * Show progress in output channel
   */
  public showProgress(
    channelName: string,
    message: string,
    current?: number,
    total?: number
  ): void {
    const channel = this.getOutputChannel(channelName);
    const timestamp = new Date().toLocaleTimeString();
    
    let progressText = `[${timestamp}] ${message}`;
    
    if (current !== undefined && total !== undefined) {
      const percentage = Math.round((current / total) * 100);
      const progressBar = this.createProgressBar(current, total);
      progressText += ` ${progressBar} ${percentage}%`;
    }
    
    channel.appendLine(progressText);
  }

  /**
   * Show cancellation message
   */
  public showCancellation(channelName: string): void {
    const channel = this.getOutputChannel(channelName);
    const timestamp = new Date().toISOString();
    
    channel.appendLine('');
    channel.appendLine(`[${timestamp}] ⚠ Command execution cancelled by user`);
    channel.appendLine('');
  }

  /**
   * Clear output channel
   */
  public clearChannel(channelName: string): void {
    const channel = this.getOutputChannel(channelName);
    channel.clear();
  }

  /**
   * Show output channel
   */
  public showChannel(channelName: string, preserveFocus: boolean = false): void {
    const channel = this.getOutputChannel(channelName);
    channel.show(preserveFocus);
  }

  /**
   * Hide output channel
   */
  public hideChannel(channelName: string): void {
    const channel = this.getOutputChannel(channelName);
    channel.hide();
  }

  /**
   * Create a streaming output handler
   */
  public createStreamHandler(
    channelName: string,
    showChannel: boolean = false
  ): {
    onOutput: (data: string) => void;
    onError: (data: string) => void;
    onProgress: (message: string, current?: number, total?: number) => void;
  } {
    if (showChannel) {
      this.showChannel(channelName, true);
    }

    return {
      onOutput: (data: string) => {
        this.streamOutput(channelName, data, 'stdout');
      },
      onError: (data: string) => {
        this.streamOutput(channelName, data, 'stderr');
      },
      onProgress: (message: string, current?: number, total?: number) => {
        this.showProgress(channelName, message, current, total);
      }
    };
  }

  /**
   * Detect log level from text content and stream type
   */
  private detectLogLevelFromText(text: string, type: 'stdout' | 'stderr'): LogEntry['level'] {
    const lowerText = text.toLowerCase();
    
    // stderr is typically warnings or errors
    if (type === 'stderr') {
      if (REGEX_PATTERNS.BBDEV_OUTPUT_ERROR.test(text) || 
          lowerText.includes('error') || 
          lowerText.includes('failed') || 
          lowerText.includes('exception')) {
        return 'error';
      }
      return 'warn';
    }
    
    if (REGEX_PATTERNS.BBDEV_OUTPUT_ERROR.test(text) || 
        lowerText.includes('error') || 
        lowerText.includes('failed') || 
        lowerText.includes('exception')) {
      return 'error';
    }
    
    if (REGEX_PATTERNS.BBDEV_OUTPUT_WARNING.test(text) || 
        lowerText.includes('warning') || 
        lowerText.includes('warn')) {
      return 'warn';
    }
    
    if (lowerText.includes('debug') || lowerText.includes('trace')) {
      return 'debug';
    }
    
    return 'info';
  }

  /**
   * Check if line is an error
   */
  private isErrorLine(line: string): boolean {
    return REGEX_PATTERNS.BBDEV_OUTPUT_ERROR.test(line.trim()) ||
           line.toLowerCase().includes('error') ||
           line.toLowerCase().includes('failed') ||
           line.toLowerCase().includes('exception');
  }

  /**
   * Check if line is a warning
   */
  private isWarningLine(line: string): boolean {
    return REGEX_PATTERNS.BBDEV_OUTPUT_WARNING.test(line.trim()) ||
           line.toLowerCase().includes('warning') ||
           line.toLowerCase().includes('warn');
  }

  /**
   * Create a simple progress bar
   */
  private createProgressBar(current: number, total: number, width: number = 20): string {
    const percentage = current / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;
    
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  /**
   * Get all active output channels
   */
  public getActiveChannels(): string[] {
    return Array.from(this.outputChannels.keys());
  }

  /**
   * Get channel statistics
   */
  public getChannelStats(channelName: string): {
    exists: boolean;
    isVisible?: boolean;
  } {
    const exists = this.outputChannels.has(channelName);
    return {
      exists,
      // Note: VSCode doesn't provide a way to check if channel is visible
      isVisible: undefined
    };
  }

  /**
   * Create a log entry from output
   */
  public createLogEntry(
    line: string,
    context?: string
  ): LogEntry {
    let level: LogEntry['level'] = 'info';
    
    if (this.isErrorLine(line)) {
      level = 'error';
    } else if (this.isWarningLine(line)) {
      level = 'warn';
    }

    return {
      timestamp: new Date(),
      level,
      message: line.trim(),
      context
    };
  }

  /**
   * Batch append lines to channel
   */
  public appendLines(channelName: string, lines: string[]): void {
    const channel = this.getOutputChannel(channelName);
    
    for (const line of lines) {
      if (line.trim()) {
        channel.appendLine(line);
      }
    }
  }

  /**
   * Append separator line
   */
  public appendSeparator(channelName: string, char: string = '-', length: number = 80): void {
    const channel = this.getOutputChannel(channelName);
    channel.appendLine(char.repeat(length));
  }

  /**
   * Append header with timestamp
   */
  public appendHeader(channelName: string, title: string): void {
    const channel = this.getOutputChannel(channelName);
    const timestamp = new Date().toISOString();
    
    channel.appendLine('');
    this.appendSeparator(channelName, '=');
    channel.appendLine(`[${timestamp}] ${title}`);
    this.appendSeparator(channelName, '=');
  }

  /**
   * Append footer with summary
   */
  public appendFooter(
    channelName: string,
    success: boolean,
    duration?: number,
    additionalInfo?: string
  ): void {
    const channel = this.getOutputChannel(channelName);
    const timestamp = new Date().toISOString();
    
    channel.appendLine('');
    this.appendSeparator(channelName, '-');
    
    const status = success ? '✓ SUCCESS' : '✗ FAILED';
    const durationText = duration ? ` (${duration}ms)` : '';
    
    channel.appendLine(`[${timestamp}] ${status}${durationText}`);
    
    if (additionalInfo) {
      channel.appendLine(additionalInfo);
    }
    
    this.appendSeparator(channelName, '-');
    channel.appendLine('');
  }

  /**
   * Dispose all output channels
   */
  public dispose(): void {
    // Clear any active streams
    this.activeStreams.forEach(timers => {
      timers.forEach(timer => clearTimeout(timer));
    });
    this.activeStreams.clear();

    // Dispose all channels
    this.outputChannels.forEach(channel => channel.dispose());
    this.outputChannels.clear();
  }
}