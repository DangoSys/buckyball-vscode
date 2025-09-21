import * as vscode from 'vscode';
import * as path from 'path';
import { CommandForm, FormField, ArgumentDefinition } from '../models/types';
import { getOperationDefinition } from '../models/commands';
import { getLogger } from '../utils/logger';
import { getErrorHandler } from '../utils/errorHandler';

/**
 * Provides webview-based forms for command argument input
 */
export class WebviewProvider {
  private static instance: WebviewProvider;
  private logger = getLogger();
  private errorHandler = getErrorHandler();
  private activeWebviews: Map<string, vscode.WebviewPanel> = new Map();

  private constructor(private context: vscode.ExtensionContext) { }

  public static getInstance(context?: vscode.ExtensionContext): WebviewProvider {
    if (!WebviewProvider.instance && context) {
      WebviewProvider.instance = new WebviewProvider(context);
    }
    return WebviewProvider.instance;
  }

  /**
   * Show command input form
   */
  public async showCommandForm(
    commandName: string,
    operationName: string,
    initialValues?: Record<string, any>
  ): Promise<Record<string, any> | undefined> {
    try {
      const operationDef = getOperationDefinition(commandName, operationName);
      if (!operationDef) {
        throw new Error(`Unknown command or operation: ${commandName} ${operationName}`);
      }

      const form = this.createCommandForm(commandName, operationName, operationDef.arguments);
      return await this.showForm(form, initialValues);
    } catch (error) {
      await this.errorHandler.handleError(error as Error, { operation: 'show-command-form' });
      return undefined;
    }
  }

  /**
   * Show file picker dialog
   */
  public async showFilePicker(
    title: string,
    filters?: { [name: string]: string[] },
    canSelectMany: boolean = false
  ): Promise<string | string[] | undefined> {
    try {
      const options: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany,
        openLabel: 'Select',
        title
      };

      if (filters) {
        options.filters = filters;
      }

      const result = await vscode.window.showOpenDialog(options);
      if (!result || result.length === 0) {
        return undefined;
      }

      if (canSelectMany) {
        return result.map(uri => uri.fsPath);
      } else {
        return result[0].fsPath;
      }
    } catch (error) {
      await this.errorHandler.handleError(error as Error, { operation: 'webview-operation' });
      return undefined;
    }
  }

  /**
   * Show directory picker dialog
   */
  public async showDirectoryPicker(
    title: string,
    canSelectMany: boolean = false
  ): Promise<string | string[] | undefined> {
    try {
      const options: vscode.OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany,
        openLabel: 'Select',
        title
      };

      const result = await vscode.window.showOpenDialog(options);
      if (!result || result.length === 0) {
        return undefined;
      }

      if (canSelectMany) {
        return result.map(uri => uri.fsPath);
      } else {
        return result[0].fsPath;
      }
    } catch (error) {
      await this.errorHandler.handleError(error as Error, { operation: 'webview-operation' });
      return undefined;
    }
  }

  /**
   * Show quick pick for choices
   */
  public async showQuickPick(
    title: string,
    choices: string[],
    placeholder?: string
  ): Promise<string | undefined> {
    try {
      const items = choices.map(choice => ({ label: choice, value: choice }));

      const result = await vscode.window.showQuickPick(items, {
        title,
        placeHolder: placeholder,
        canPickMany: false
      });

      return result?.value;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, { operation: 'webview-operation' });
      return undefined;
    }
  }

  /**
   * Show input box for simple text input
   */
  public async showInputBox(
    title: string,
    placeholder?: string,
    defaultValue?: string,
    validateInput?: (value: string) => string | undefined
  ): Promise<string | undefined> {
    try {
      return await vscode.window.showInputBox({
        title,
        placeHolder: placeholder,
        value: defaultValue,
        validateInput
      });
    } catch (error) {
      await this.errorHandler.handleError(error as Error, { operation: 'webview-operation' });
      return undefined;
    }
  }

  /**
   * Show preset editor form
   */
  public async showPresetEditor(
    preset: any,
    isNew: boolean = false
  ): Promise<any | undefined> {
    try {
      const form: CommandForm = {
        title: isNew ? 'Create New Preset' : `Edit Preset: ${preset.name}`,
        description: isNew ? 'Create a new command preset' : 'Edit the preset configuration',
        fields: [
          {
            name: 'name',
            label: 'Preset Name',
            type: 'text',
            required: true,
            description: 'A unique name for this preset',
            placeholder: 'Enter preset name...',
            default: preset.name || '',
            validation: {
              pattern: '^[a-zA-Z0-9\\s\\-_]+$',
              message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores'
            }
          },
          {
            name: 'description',
            label: 'Description',
            type: 'text',
            required: false,
            description: 'Optional description for this preset',
            placeholder: 'Enter description...',
            default: preset.description || ''
          },
          {
            name: 'command',
            label: 'Command',
            type: 'text',
            required: true,
            description: 'The bbdev command to execute',
            placeholder: 'e.g., verilator, vcs, sardine...',
            default: preset.command || ''
          },
          {
            name: 'operation',
            label: 'Operation',
            type: 'text',
            required: true,
            description: 'The operation to perform',
            placeholder: 'e.g., build, run, clean...',
            default: preset.operation || ''
          },
          {
            name: 'tags',
            label: 'Tags',
            type: 'text',
            required: false,
            description: 'Comma-separated tags for organizing presets',
            placeholder: 'e.g., simulation, build, test...',
            default: preset.tags ? preset.tags.join(', ') : ''
          }
        ],
        submitLabel: isNew ? 'Create Preset' : 'Save Changes',
        cancelLabel: 'Cancel'
      };

      const result = await this.showForm(form);
      
      if (result) {
        // Process tags
        if (result.tags) {
          result.tags = result.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
        } else {
          result.tags = [];
        }

        // Preserve existing arguments if editing
        if (!isNew && preset.arguments) {
          result.arguments = preset.arguments;
        } else {
          result.arguments = {};
        }

        // Preserve other fields
        if (!isNew) {
          result.id = preset.id;
          result.createdAt = preset.createdAt;
        }
        result.lastUsed = new Date();
      }

      return result;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, { operation: 'webview-operation' });
      return undefined;
    }
  }

  /**
   * Create command form definition
   */
  private createCommandForm(
    commandName: string,
    operationName: string,
    argumentDefs: ArgumentDefinition[]
  ): CommandForm {
    const fields: FormField[] = argumentDefs.map(argDef => ({
      name: argDef.name,
      label: this.formatFieldLabel(argDef.name),
      type: this.mapArgumentTypeToFieldType(argDef.type),
      required: argDef.required,
      description: argDef.description,
      placeholder: this.createPlaceholder(argDef),
      default: argDef.default,
      options: argDef.choices,
      validation: this.createValidation(argDef)
    }));

    return {
      title: `${commandName} ${operationName}`,
      description: `Configure arguments for ${commandName} ${operationName}`,
      fields,
      submitLabel: 'Execute',
      cancelLabel: 'Cancel'
    };
  }

  /**
   * Show form using webview or native dialogs
   */
  private async showForm(
    form: CommandForm,
    initialValues?: Record<string, any>
  ): Promise<Record<string, any> | undefined> {
    // For now, use native VSCode dialogs for simplicity
    // This could be enhanced with a full webview form later
    const values: Record<string, any> = { ...initialValues };

    for (const field of form.fields) {
      const currentValue = values[field.name] || field.default;
      let value: any;

      switch (field.type) {
        case 'text':
          value = await this.showInputBox(
            `${form.title} - ${field.label}`,
            field.placeholder || field.description,
            currentValue ? String(currentValue) : undefined,
            field.validation ? (input) => this.validateField(field, input) : undefined
          );
          break;

        case 'number':
          const numberInput = await this.showInputBox(
            `${form.title} - ${field.label}`,
            field.placeholder || field.description,
            currentValue ? String(currentValue) : undefined,
            (input) => {
              const fieldError = this.validateField(field, input);
              if (fieldError) return fieldError;

              if (input && isNaN(Number(input))) {
                return 'Please enter a valid number';
              }
              return undefined;
            }
          );
          value = numberInput ? Number(numberInput) : undefined;
          break;

        case 'boolean':
          const booleanChoice = await vscode.window.showQuickPick(
            [
              { label: 'Yes', value: true },
              { label: 'No', value: false }
            ],
            {
              title: `${form.title} - ${field.label}`,
              placeHolder: field.description
            }
          );
          value = booleanChoice?.value;
          break;

        case 'file':
          value = await this.showFilePicker(
            `${form.title} - ${field.label}`,
            undefined,
            false
          );
          break;

        case 'directory':
          value = await this.showDirectoryPicker(
            `${form.title} - ${field.label}`,
            false
          );
          break;

        case 'select':
          if (field.options) {
            value = await this.showQuickPick(
              `${form.title} - ${field.label}`,
              field.options,
              field.description
            );
          }
          break;
      }

      // Handle cancellation
      if (value === undefined && field.required) {
        // User cancelled or didn't provide required value
        return undefined;
      }

      if (value !== undefined) {
        values[field.name] = value;
      }
    }

    return values;
  }

  /**
   * Map argument type to form field type
   */
  private mapArgumentTypeToFieldType(argType: string): FormField['type'] {
    switch (argType) {
      case 'string': return 'text';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'file': return 'file';
      case 'directory': return 'directory';
      case 'choice': return 'select';
      default: return 'text';
    }
  }

  /**
   * Format field label from argument name
   */
  private formatFieldLabel(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Create placeholder text for field
   */
  private createPlaceholder(argDef: ArgumentDefinition): string {
    if (argDef.default !== undefined) {
      return `Default: ${argDef.default}`;
    }

    switch (argDef.type) {
      case 'file':
        return 'Select a file...';
      case 'directory':
        return 'Select a directory...';
      case 'number':
        return 'Enter a number...';
      case 'boolean':
        return 'Choose yes or no...';
      case 'choice':
        return argDef.choices ? `Choose from: ${argDef.choices.join(', ')}` : 'Select an option...';
      default:
        return `Enter ${argDef.name}...`;
    }
  }

  /**
   * Create validation rules for field
   */
  private createValidation(argDef: ArgumentDefinition): FormField['validation'] | undefined {
    const validation: FormField['validation'] = {};

    switch (argDef.type) {
      case 'number':
        validation.pattern = '^-?\\d*\\.?\\d+$';
        validation.message = 'Please enter a valid number';
        break;
      case 'file':
      case 'directory':
        validation.message = 'Please select a valid path';
        break;
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  /**
   * Validate field value
   */
  private validateField(field: FormField, value: string): string | undefined {
    if (field.required && (!value || value.trim() === '')) {
      return `${field.label} is required`;
    }

    if (!value) {
      return undefined;
    }

    if (field.validation) {
      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return field.validation.message || `Invalid format for ${field.label}`;
        }
      }

      if (field.validation.min !== undefined && Number(value) < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`;
      }

      if (field.validation.max !== undefined && Number(value) > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`;
      }
    }

    return undefined;
  }

  /**
   * Create webview form (for future enhancement)
   */
  private async createWebviewForm(
    form: CommandForm,
    initialValues?: Record<string, any>
  ): Promise<Record<string, any> | undefined> {
    const panel = vscode.window.createWebviewPanel(
      'bbdevCommandForm',
      form.title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const webviewId = `form-${Date.now()}`;
    this.activeWebviews.set(webviewId, panel);

    return new Promise((resolve) => {
      panel.webview.html = this.getWebviewContent(form, initialValues);

      panel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case 'submit':
              resolve(message.values);
              panel.dispose();
              break;
            case 'cancel':
              resolve(undefined);
              panel.dispose();
              break;
            case 'pickFile':
              this.handleFilePickerMessage(panel, message);
              break;
            case 'pickDirectory':
              this.handleDirectoryPickerMessage(panel, message);
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );

      panel.onDidDispose(() => {
        this.activeWebviews.delete(webviewId);
        resolve(undefined);
      });
    });
  }

  /**
   * Handle file picker message from webview
   */
  private async handleFilePickerMessage(panel: vscode.WebviewPanel, message: any): Promise<void> {
    const filePath = await this.showFilePicker(message.title);
    if (filePath) {
      panel.webview.postMessage({
        command: 'fileSelected',
        fieldName: message.fieldName,
        filePath
      });
    }
  }

  /**
   * Handle directory picker message from webview
   */
  private async handleDirectoryPickerMessage(panel: vscode.WebviewPanel, message: any): Promise<void> {
    const dirPath = await this.showDirectoryPicker(message.title);
    if (dirPath) {
      panel.webview.postMessage({
        command: 'directorySelected',
        fieldName: message.fieldName,
        dirPath
      });
    }
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(form: CommandForm, initialValues?: Record<string, any>): string {
    // This is a basic HTML form - could be enhanced with better styling and functionality
    const fields = form.fields.map(field => {
      const value = initialValues?.[field.name] || field.default || '';

      switch (field.type) {
        case 'text':
        case 'number':
          return `
            <div class="field">
              <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
              <input type="${field.type}" id="${field.name}" name="${field.name}" 
                     value="${value}" placeholder="${field.placeholder || ''}"
                     ${field.required ? 'required' : ''}>
              ${field.description ? `<small>${field.description}</small>` : ''}
            </div>
          `;
        case 'boolean':
          return `
            <div class="field">
              <label>
                <input type="checkbox" id="${field.name}" name="${field.name}" 
                       ${value ? 'checked' : ''}>
                ${field.label}${field.required ? ' *' : ''}
              </label>
              ${field.description ? `<small>${field.description}</small>` : ''}
            </div>
          `;
        case 'select':
          const options = field.options?.map(option =>
            `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`
          ).join('') || '';
          return `
            <div class="field">
              <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
              <select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                <option value="">Select...</option>
                ${options}
              </select>
              ${field.description ? `<small>${field.description}</small>` : ''}
            </div>
          `;
        case 'file':
          return `
            <div class="field">
              <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
              <div class="file-input">
                <input type="text" id="${field.name}" name="${field.name}" 
                       value="${value}" placeholder="${field.placeholder || ''}" readonly>
                <button type="button" onclick="pickFile('${field.name}', '${field.label}')">Browse</button>
              </div>
              ${field.description ? `<small>${field.description}</small>` : ''}
            </div>
          `;
        case 'directory':
          return `
            <div class="field">
              <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
              <div class="file-input">
                <input type="text" id="${field.name}" name="${field.name}" 
                       value="${value}" placeholder="${field.placeholder || ''}" readonly>
                <button type="button" onclick="pickDirectory('${field.name}', '${field.label}')">Browse</button>
              </div>
              ${field.description ? `<small>${field.description}</small>` : ''}
            </div>
          `;
        default:
          return '';
      }
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${form.title}</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          .field { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, select { width: 100%; padding: 8px; margin-bottom: 5px; }
          .file-input { display: flex; gap: 10px; }
          .file-input input { flex: 1; }
          .file-input button { padding: 8px 16px; }
          small { color: var(--vscode-descriptionForeground); }
          .buttons { margin-top: 20px; display: flex; gap: 10px; }
          button { padding: 10px 20px; cursor: pointer; }
          .primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
          .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        </style>
      </head>
      <body>
        <h2>${form.title}</h2>
        ${form.description ? `<p>${form.description}</p>` : ''}
        
        <form id="commandForm">
          ${fields}
          
          <div class="buttons">
            <button type="submit" class="primary">${form.submitLabel || 'Submit'}</button>
            <button type="button" class="secondary" onclick="cancel()">${form.cancelLabel || 'Cancel'}</button>
          </div>
        </form>

        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('commandForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const values = {};
            
            for (const [key, value] of formData.entries()) {
              const field = document.getElementById(key);
              if (field.type === 'checkbox') {
                values[key] = field.checked;
              } else if (field.type === 'number') {
                values[key] = value ? Number(value) : undefined;
              } else {
                values[key] = value || undefined;
              }
            }
            
            vscode.postMessage({ command: 'submit', values });
          });
          
          function cancel() {
            vscode.postMessage({ command: 'cancel' });
          }
          
          function pickFile(fieldName, title) {
            vscode.postMessage({ command: 'pickFile', fieldName, title });
          }
          
          function pickDirectory(fieldName, title) {
            vscode.postMessage({ command: 'pickDirectory', fieldName, title });
          }
          
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'fileSelected':
                document.getElementById(message.fieldName).value = message.filePath;
                break;
              case 'directorySelected':
                document.getElementById(message.fieldName).value = message.dirPath;
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Dispose all active webviews
   */
  public dispose(): void {
    this.activeWebviews.forEach(panel => panel.dispose());
    this.activeWebviews.clear();
  }
}