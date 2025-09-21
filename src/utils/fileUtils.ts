import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BBDevError, FilePickerOptions } from '../models/types';
import { ERROR_MESSAGES } from '../models/constants';

/**
 * File system utilities for the BBDev extension
 */
export class FileUtils {
  
  /**
   * Check if a file exists
   */
  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  public static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  public static async getFileStats(filePath: string): Promise<fs.Stats> {
    try {
      return await fs.promises.stat(filePath);
    } catch (error) {
      throw new BBDevError(
        `Failed to get file stats for ${filePath}`,
        'filesystem',
        { filePath },
        error as Error
      );
    }
  }

  /**
   * Read file content as string
   */
  public static async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, encoding);
    } catch (error) {
      throw new BBDevError(
        `Failed to read file ${filePath}`,
        'filesystem',
        { filePath, encoding },
        error as Error
      );
    }
  }

  /**
   * Write content to file
   */
  public static async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      await fs.promises.writeFile(filePath, content, encoding);
    } catch (error) {
      throw new BBDevError(
        `Failed to write file ${filePath}`,
        'filesystem',
        { filePath, encoding },
        error as Error
      );
    }
  }

  /**
   * Create directory recursively
   */
  public static async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new BBDevError(
        `Failed to create directory ${dirPath}`,
        'filesystem',
        { dirPath },
        error as Error
      );
    }
  }

  /**
   * Delete file
   */
  public static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new BBDevError(
        `Failed to delete file ${filePath}`,
        'filesystem',
        { filePath },
        error as Error
      );
    }
  }

  /**
   * Delete directory recursively
   */
  public static async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.rmdir(dirPath, { recursive: true });
    } catch (error) {
      throw new BBDevError(
        `Failed to delete directory ${dirPath}`,
        'filesystem',
        { dirPath },
        error as Error
      );
    }
  }

  /**
   * List directory contents
   */
  public static async listDirectory(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch (error) {
      throw new BBDevError(
        `Failed to list directory ${dirPath}`,
        'filesystem',
        { dirPath },
        error as Error
      );
    }
  }

  /**
   * Get workspace root path
   */
  public static getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new BBDevError(ERROR_MESSAGES.WORKSPACE_NOT_FOUND, 'filesystem');
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Get relative path from workspace root
   */
  public static getRelativePath(absolutePath: string): string {
    const workspaceRoot = this.getWorkspaceRoot();
    return path.relative(workspaceRoot, absolutePath);
  }

  /**
   * Get absolute path from workspace root
   */
  public static getAbsolutePath(relativePath: string): string {
    const workspaceRoot = this.getWorkspaceRoot();
    return path.resolve(workspaceRoot, relativePath);
  }

  /**
   * Show file picker dialog
   */
  public static async showFilePicker(options: FilePickerOptions): Promise<vscode.Uri[] | undefined> {
    try {
      const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: options.canSelectFiles,
        canSelectFolders: options.canSelectFolders,
        canSelectMany: options.canSelectMany,
        filters: options.filters,
        defaultUri: options.defaultUri,
        openLabel: options.openLabel
      };

      return await vscode.window.showOpenDialog(openDialogOptions);
    } catch (error) {
      throw new BBDevError(
        'Failed to show file picker',
        'filesystem',
        { options },
        error as Error
      );
    }
  }

  /**
   * Show save file dialog
   */
  public static async showSaveDialog(options?: vscode.SaveDialogOptions): Promise<vscode.Uri | undefined> {
    try {
      return await vscode.window.showSaveDialog(options);
    } catch (error) {
      throw new BBDevError(
        'Failed to show save dialog',
        'filesystem',
        { options },
        error as Error
      );
    }
  }

  /**
   * Normalize path separators for current platform
   */
  public static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Join path segments
   */
  public static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Get file extension
   */
  public static getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Get file name without extension
   */
  public static getFileNameWithoutExtension(filePath: string): string {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName);
    return fileName.slice(0, -ext.length);
  }

  /**
   * Get directory name
   */
  public static getDirectoryName(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Check if path is absolute
   */
  public static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Find files matching a pattern
   */
  public static async findFiles(pattern: string, exclude?: string): Promise<vscode.Uri[]> {
    try {
      return await vscode.workspace.findFiles(pattern, exclude);
    } catch (error) {
      throw new BBDevError(
        `Failed to find files matching pattern ${pattern}`,
        'filesystem',
        { pattern, exclude },
        error as Error
      );
    }
  }

  /**
   * Watch file changes
   */
  public static createFileWatcher(pattern: string): vscode.FileSystemWatcher {
    return vscode.workspace.createFileSystemWatcher(pattern);
  }
}