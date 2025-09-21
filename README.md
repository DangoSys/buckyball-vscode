# BBDev VSCode Extension

[![CI/CD Pipeline](https://github.com/buckyball/bbdev-vscode-extension/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/buckyball/bbdev-vscode-extension/actions)
[![Version](https://img.shields.io/visual-studio-marketplace/v/buckyball.bbdev-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=buckyball.bbdev-vscode-extension)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/buckyball.bbdev-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=buckyball.bbdev-vscode-extension)

A comprehensive Visual Studio Code extension that provides a powerful graphical interface for the bbdev development tool, streamlining hardware development workflows and making complex operations accessible through an intuitive UI.

## 🚀 Features

### Core Functionality
- **📋 Command Tree View**: Browse all available bbdev commands and operations in a hierarchical, searchable tree view
- **⚡ Interactive Execution**: Execute bbdev commands through intelligent forms and dialogs without touching the command line
- **🖥️ Server Management**: Start, stop, and monitor bbdev server instances with real-time status updates
- **💾 Preset Management**: Save, organize, and reuse common command configurations with tags and descriptions
- **📊 Real-time Output**: View command output and logs in dedicated, filterable output channels with syntax highlighting
- **🔗 File Integration**: Smart context menu integration for relevant file types with automatic argument population
- **📈 Progress Tracking**: Monitor long-running operations with detailed progress indicators and cancellation support

### Advanced Features
- **🔍 Smart Validation**: Automatic validation of bbdev installation and workspace configuration
- **🛠️ Setup Wizard**: Guided setup process for new users with dependency checking
- **📚 Command Palette Integration**: Quick access to all bbdev operations through VSCode's command palette
- **🎯 Favorites System**: Mark frequently used commands as favorites for quick access
- **📝 Operation History**: Track and replay previous operations with timing information
- **🔔 Smart Notifications**: Configurable notifications for operation completion and errors
- **🎨 Customizable UI**: Configurable output formatting, log levels, and display preferences

## 📋 Requirements

### System Requirements
- **Visual Studio Code**: 1.74.0 or higher
- **bbdev tool**: Must be installed and available in PATH
- **Operating System**: Windows, macOS, or Linux
- **Node.js**: 16.x or higher (for development only)

### Recommended Setup
- **Python**: 3.8+ (required by bbdev)
- **Git**: For version control integration
- **Terminal**: Bash, PowerShell, or equivalent

## 📦 Installation

### Method 1: VS Code Marketplace (Recommended)
1. Open Visual Studio Code
2. Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "BBDev"
4. Click "Install" on the BBDev extension by Buckyball

### Method 2: From VSIX File
1. Download the latest `.vsix` file from [releases](https://github.com/buckyball/bbdev-vscode-extension/releases)
2. Open VSCode
3. Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

### Method 3: From Source (Development)
```bash
# Clone the repository
git clone https://github.com/buckyball/bbdev-vscode-extension.git
cd bbdev-vscode-extension/bbdev

# Set up development environment
npm run setup:dev

# Build and install locally
make install-local
```

## 🎯 Quick Start

### First Time Setup
1. **Install the extension** using one of the methods above
2. **Open a workspace** containing bbdev-compatible projects
3. **Run the setup wizard**: Open Command Palette (`Ctrl+Shift+P`) and run "BBDev: Run Setup Wizard"
4. **Validate installation**: The extension will automatically check your bbdev installation

### Basic Usage
1. **Open the BBDev panel**: Look for "BBDev Commands" in the Explorer sidebar
2. **Browse commands**: Expand categories like "Verilator", "VCS", "Sardine", etc.
3. **Execute a command**: Click on any operation to open the execution form
4. **View results**: Check the "BBDev" output channel for command results

## 📖 Detailed Usage Guide

### Command Execution

#### Using the Tree View
```
1. Navigate to Explorer → BBDev Commands
2. Expand a command category (e.g., "Verilator")
3. Click on an operation (e.g., "Build")
4. Fill in the required parameters in the form
5. Click "Execute" to run the command
```

#### Using the Command Palette
```
1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
2. Type "BBDev: Quick Command"
3. Select the desired command from the dropdown
4. Fill in parameters and execute
```

#### Using Context Menus
```
1. Right-click on a file in the Explorer
2. Look for BBDev options in the context menu
3. Select the appropriate operation
4. Parameters will be pre-filled based on the selected file
```

### Server Management

#### Starting a Server
```
1. In the BBDev Commands tree, find the "Servers" section
2. Right-click and select "Start Server"
3. Choose a port (or use the default)
4. Monitor status in the tree view
```

#### Managing Running Servers
```
- View status: Check the server icons in the tree
- Open web interface: Right-click → "Open in Browser"
- Stop server: Right-click → "Stop Server"
- View logs: Check the BBDev output channel
```

### Preset Management

#### Creating Presets
```
1. Execute any command with your desired parameters
2. After execution, click "Save as Preset" when prompted
3. Provide a name and optional description
4. Add tags for better organization
```

#### Using Presets
```
1. Navigate to the "Presets" section in the tree
2. Click on any preset to execute it immediately
3. Right-click for options: Edit, Duplicate, Delete, Export
```

#### Organizing Presets
```
- Use tags to categorize presets
- Export/import presets for sharing
- Create workspace-specific and global presets
```

## ⚙️ Configuration

### Extension Settings

Access these settings via `File → Preferences → Settings` and search for "BBDev":

#### Basic Settings
```json
{
  "bbdev.defaultPort": 8080,
  "bbdev.autoStartServer": false,
  "bbdev.showOutputOnExecution": true,
  "bbdev.bbdevPath": "bbdev"
}
```

#### Advanced Settings
```json
{
  "bbdev.performInitialValidation": true,
  "bbdev.showValidationNotifications": true,
  "bbdev.autoFixValidationIssues": false,
  "bbdev.validationLevel": "normal"
}
```

### Workspace Configuration

Create a `.vscode/settings.json` file in your workspace:

```json
{
  "bbdev.defaultPort": 8081,
  "bbdev.autoStartServer": true,
  "bbdev.bbdevPath": "/custom/path/to/bbdev",
  "bbdev.validationLevel": "strict"
}
```

## 🔧 Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/buckyball/bbdev-vscode-extension.git
cd bbdev-vscode-extension/bbdev

# Run setup script
npm run setup:dev

# Start development
make dev
```

### Building and Testing

```bash
# Install dependencies
make install

# Run linter
make lint

# Build for production
make build

# Run tests
make test

# Create package
make package
```

### Project Structure

```
bbdev/
├── src/                    # Source code
│   ├── extension.ts        # Main extension entry point
│   ├── commands/           # Command implementations
│   ├── managers/           # Core managers (server, config, etc.)
│   ├── models/             # Data models and types
│   ├── providers/          # VSCode providers (tree, webview)
│   ├── utils/              # Utility functions
│   └── test/               # Test files
├── resources/              # Extension resources (icons, etc.)
├── scripts/                # Build and utility scripts
├── .github/workflows/      # CI/CD configuration
├── package.json            # Extension manifest
├── webpack.config.js       # Build configuration
└── README.md              # This file
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development with watch mode |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run lint` | Run linter with auto-fix |
| `npm run package:vsix` | Create VSIX package |
| `npm run release:patch` | Create patch release |
| `make setup` | Set up development environment |
| `make ci` | Run full CI pipeline |

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete workflows in VSCode

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes and add tests
4. **Run** the test suite: `make test`
5. **Commit** your changes: `git commit -m 'Add amazing feature'`
6. **Push** to the branch: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation for user-facing changes
- Use conventional commit messages
- Ensure CI passes before submitting PR

## 📚 Examples

### Example 1: Running a Verilator Simulation

```typescript
// This shows what happens when you click "Verilator → Run"
const command = {
  command: 'verilator',
  operation: 'run',
  arguments: {
    binary: '/path/to/test.elf',
    batch: true,
    job: 8
  }
};
```

### Example 2: Creating a Custom Preset

```json
{
  "name": "Quick Verilator Test",
  "description": "Run verilator with common test settings",
  "command": "verilator",
  "operation": "run",
  "arguments": {
    "binary": "${workspaceFolder}/tests/basic.elf",
    "batch": true,
    "job": 16
  },
  "tags": ["testing", "verilator", "quick"]
}
```

### Example 3: Workspace Configuration

```json
{
  "bbdev.defaultPort": 8080,
  "bbdev.autoStartServer": true,
  "bbdev.presets": [
    {
      "name": "Build All",
      "command": "verilator",
      "operation": "build",
      "arguments": { "job": 8 }
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
- Check VSCode version (must be 1.74.0+)
- Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
- Check extension logs in Output panel

#### BBDev Command Not Found
- Ensure bbdev is installed: `bbdev --version`
- Check PATH configuration
- Set custom path in settings: `bbdev.bbdevPath`

#### Server Won't Start
- Check if port is already in use
- Try a different port in settings
- Check firewall settings
- Review BBDev output channel for errors

#### Performance Issues
- Reduce validation level: `bbdev.validationLevel: "minimal"`
- Disable auto-start server: `bbdev.autoStartServer: false`
- Clear operation history periodically

### Getting Help

1. **Check the logs**: Open Output panel → Select "BBDev"
2. **Run diagnostics**: Command Palette → "BBDev: Validate Installation"
3. **Reset settings**: Remove `.vscode/settings.json` bbdev entries
4. **File an issue**: [GitHub Issues](https://github.com/buckyball/bbdev-vscode-extension/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- The bbdev development team for creating the underlying tool
- The VSCode extension development community
- All contributors and users who provide feedback

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/buckyball/bbdev-vscode-extension/wiki)
- **Issues**: [GitHub Issues](https://github.com/buckyball/bbdev-vscode-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/buckyball/bbdev-vscode-extension/discussions)
- **Email**: support@buckyball.dev

---

**Happy coding with BBDev! 🚀**