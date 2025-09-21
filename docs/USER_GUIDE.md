# BBDev VSCode Extension User Guide

This comprehensive guide will help you get the most out of the BBDev VSCode Extension, from basic usage to advanced workflows.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Basic Operations](#basic-operations)
- [Advanced Features](#advanced-features)
- [Workflows](#workflows)
- [Troubleshooting](#troubleshooting)
- [Tips and Tricks](#tips-and-tricks)

## 🚀 Getting Started

### First Launch

When you first install and activate the BBDev extension:

1. **Automatic Setup Check**: The extension will automatically validate your bbdev installation
2. **Setup Wizard**: If issues are detected, you'll be prompted to run the setup wizard
3. **Tree View**: The BBDev Commands panel will appear in the Explorer sidebar
4. **Welcome Message**: You'll see a welcome notification with quick start tips

### Initial Configuration

Open VSCode settings (`Ctrl+,` / `Cmd+,`) and search for "BBDev" to configure:

```json
{
  "bbdev.defaultPort": 8080,
  "bbdev.autoStartServer": false,
  "bbdev.showOutputOnExecution": true,
  "bbdev.bbdevPath": "bbdev"
}
```

## 🎯 Basic Operations

### Viewing Available Commands

1. **Open Explorer Panel**: Click the Explorer icon in the Activity Bar
2. **Find BBDev Commands**: Scroll down to see the "BBDev Commands" section
3. **Expand Categories**: Click the arrow next to command categories like "Verilator", "VCS", etc.
4. **View Operations**: Each category contains specific operations you can execute

```
📁 BBDev Commands
├── 📁 Verilator
│   ├── 🧹 Clean
│   ├── ⚙️ Verilog
│   ├── 🔨 Build
│   ├── ▶️ Sim
│   └── 🚀 Run
├── 📁 VCS
│   ├── 🧹 Clean
│   ├── 🔨 Build
│   └── ▶️ Run
└── 📁 Servers
    └── ➕ Start Server
```

### Executing Your First Command

Let's execute a simple Verilator clean operation:

1. **Navigate**: Go to BBDev Commands → Verilator → Clean
2. **Click**: Click on "Clean" to open the execution form
3. **Review**: The form will show any required parameters (Clean typically has none)
4. **Execute**: Click the "Execute" button
5. **Monitor**: Watch the progress in the BBDev output channel

### Understanding the Output

After executing a command, check the output:

1. **Output Panel**: The output panel will automatically open (if configured)
2. **BBDev Channel**: Select "BBDev" from the dropdown in the output panel
3. **Real-time Updates**: You'll see command output in real-time
4. **Completion Status**: Success/failure will be clearly indicated

Example output:
```
[2024-01-15 10:30:15] Starting command: verilator clean
[2024-01-15 10:30:15] Working directory: /workspace/project
[2024-01-15 10:30:16] Cleaning build directory...
[2024-01-15 10:30:16] ✅ Command completed successfully (1.2s)
```

## 🔧 Advanced Features

### Server Management

#### Starting a Server

1. **Method 1 - Tree View**:
   - Navigate to BBDev Commands → Servers
   - Right-click and select "Start Server"
   - Choose a port or use the default

2. **Method 2 - Command Palette**:
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "BBDev: Start Server"
   - Select the command and choose options

#### Managing Running Servers

Once servers are running, you can:

- **View Status**: Server status appears in the tree with indicators
- **Open Web Interface**: Right-click → "Open in Browser"
- **Stop Server**: Right-click → "Stop Server"
- **View Logs**: Check the BBDev output channel for server logs

Server status indicators:
- 🟢 **Running**: Server is active and responding
- 🟡 **Starting**: Server is initializing
- 🔴 **Stopped**: Server is not running
- ⚠️ **Error**: Server encountered an issue

### Preset Management

#### Creating Presets

After executing any command:

1. **Save Prompt**: You'll be asked "Save this command as a preset?"
2. **Provide Details**:
   - **Name**: Give your preset a descriptive name
   - **Description**: Optional description of what it does
   - **Tags**: Add tags for organization (e.g., "testing", "build")
3. **Choose Scope**: Save as workspace-specific or global preset

#### Using Presets

1. **Navigate**: Go to BBDev Commands → Presets
2. **Browse**: See all your saved presets organized by tags
3. **Execute**: Click any preset to run it immediately
4. **Manage**: Right-click for options (Edit, Duplicate, Delete, Export)

#### Organizing Presets

```
📁 Presets
├── 🏷️ build
│   ├── 💾 Quick Verilator Build
│   └── 💾 Full VCS Build
├── 🏷️ testing
│   ├── 💾 Unit Test Suite
│   └── 💾 Integration Tests
└── 🏷️ simulation
    └── 💾 Long Simulation Run
```

### File Integration

#### Context Menu Operations

Right-click on files in the Explorer to see relevant BBDev operations:

- **C/C++ Files**: Show compilation and simulation options
- **Assembly Files**: Show assembly-related operations
- **Configuration Files**: Show validation and processing options
- **Directories**: Show directory-based operations

#### Smart Argument Population

When using context menu operations:
- File paths are automatically filled in
- Related files are suggested
- Workspace-relative paths are used
- File types are validated

### Command Palette Integration

Access BBDev features through the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **BBDev: Quick Command** - Fast command execution
- **BBDev: Manage Favorites** - Organize favorite commands
- **BBDev: Search Output** - Search through command output
- **BBDev: View Operation History** - See previous operations
- **BBDev: Validate Installation** - Check bbdev setup

## 🔄 Workflows

### Typical Development Workflow

#### 1. Project Setup
```bash
# Initial workspace validation
Command Palette → "BBDev: Validate Workspace"

# Start development server
BBDev Commands → Servers → Start Server
```

#### 2. Build and Test Cycle
```bash
# Clean previous builds
BBDev Commands → Verilator → Clean

# Generate Verilog
BBDev Commands → Verilator → Verilog

# Build simulation
BBDev Commands → Verilator → Build
  └── Parameters: job=8 (for parallel build)

# Run simulation
BBDev Commands → Verilator → Sim
  └── Parameters: binary=/path/to/test.elf, batch=true
```

#### 3. Save Common Operations as Presets
After successful operations, save them as presets:
- "Quick Clean Build" (Clean → Verilog → Build)
- "Test Suite Run" (Build → Sim with test parameters)
- "Debug Simulation" (Sim with debug flags)

### Advanced Simulation Workflow

#### Multi-Configuration Testing
1. **Create Presets** for different configurations:
   - "Debug Build" (with debug flags)
   - "Release Build" (optimized)
   - "Coverage Build" (with coverage analysis)

2. **Batch Execution**:
   - Use presets to run multiple configurations
   - Monitor results in separate output channels
   - Compare performance metrics

#### Continuous Integration Simulation
1. **Setup Automation**:
   - Create presets for CI operations
   - Use batch mode for non-interactive execution
   - Configure output logging for CI systems

2. **Result Analysis**:
   - Export operation history
   - Generate reports from output logs
   - Track performance trends

### Server-Based Workflows

#### Remote Development
1. **Start Server**: Use BBDev server for remote access
2. **Web Interface**: Access bbdev through browser
3. **Local Control**: Use VSCode extension for local operations
4. **Hybrid Workflow**: Combine local and remote operations

#### Team Collaboration
1. **Shared Presets**: Export/import presets between team members
2. **Standardized Workflows**: Create team-wide preset libraries
3. **Server Sharing**: Use shared bbdev servers for consistency

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Extension Not Loading
**Symptoms**: BBDev Commands panel doesn't appear
**Solutions**:
1. Check VSCode version (must be 1.74.0+)
2. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check extension is enabled in Extensions panel
4. Review VSCode logs: Help → Toggle Developer Tools → Console

#### BBDev Command Not Found
**Symptoms**: "bbdev: command not found" errors
**Solutions**:
1. Verify bbdev installation: Open terminal and run `bbdev --version`
2. Check PATH configuration
3. Set custom path: Settings → BBDev → Bbdev Path
4. Run setup wizard: Command Palette → "BBDev: Run Setup Wizard"

#### Server Won't Start
**Symptoms**: Server fails to start or shows error status
**Solutions**:
1. Check port availability: Try different port in settings
2. Check firewall settings
3. Review server logs in BBDev output channel
4. Restart VSCode and try again
5. Check bbdev server dependencies

#### Commands Fail to Execute
**Symptoms**: Commands start but fail with errors
**Solutions**:
1. Validate workspace: Command Palette → "BBDev: Validate Workspace"
2. Check file permissions
3. Verify required tools are installed
4. Review command arguments for correctness
5. Check working directory is correct

#### Performance Issues
**Symptoms**: Slow command execution or UI responsiveness
**Solutions**:
1. Reduce validation level: Settings → BBDev → Validation Level → "minimal"
2. Disable auto-start server if not needed
3. Clear operation history periodically
4. Close unused output channels
5. Restart VSCode to clear memory

### Diagnostic Commands

Use these commands to diagnose issues:

```bash
# Validate bbdev installation
Command Palette → "BBDev: Validate Installation"

# Check workspace configuration
Command Palette → "BBDev: Validate Workspace"

# View extension logs
Output Panel → Select "BBDev"

# Reset extension state
Command Palette → "Developer: Reload Window"
```

### Getting Help

1. **Check Logs**: Always check the BBDev output channel first
2. **Run Diagnostics**: Use validation commands to identify issues
3. **Search Issues**: Check GitHub issues for similar problems
4. **Create Issue**: If problem persists, create a detailed issue report

## 💡 Tips and Tricks

### Productivity Tips

#### Keyboard Shortcuts
- `Ctrl+Shift+P` → "BBDev: Quick Command" for fast access
- `F1` → Search for BBDev commands
- `Ctrl+`` ` → Toggle terminal for command line access

#### Workspace Organization
- Use workspace-specific presets for project configurations
- Organize presets with meaningful tags
- Export presets for backup and sharing
- Keep global presets for common operations

#### Output Management
- Use multiple output channels for different operations
- Configure log levels to reduce noise
- Use search functionality to find specific output
- Export logs for analysis or bug reports

### Advanced Configuration

#### Custom Validation Rules
```json
{
  "bbdev.validationLevel": "strict",
  "bbdev.autoFixValidationIssues": true,
  "bbdev.showValidationNotifications": false
}
```

#### Performance Optimization
```json
{
  "bbdev.performInitialValidation": false,
  "bbdev.showOutputOnExecution": false,
  "bbdev.autoStartServer": false
}
```

#### Development Settings
```json
{
  "bbdev.defaultPort": 8080,
  "bbdev.bbdevPath": "/usr/local/bin/bbdev",
  "bbdev.validationLevel": "normal"
}
```

### Integration with Other Tools

#### Git Integration
- Use presets for build verification before commits
- Create hooks for automated testing
- Track configuration changes in version control

#### Terminal Integration
- Combine VSCode extension with command line usage
- Use extension for complex operations, terminal for quick tasks
- Share output between extension and terminal

#### CI/CD Integration
- Export presets for CI/CD pipeline configuration
- Use batch mode for automated builds
- Generate reports from operation history

### Best Practices

#### Preset Management
- Use descriptive names and descriptions
- Organize with consistent tagging
- Regular cleanup of unused presets
- Document complex preset configurations

#### Workflow Organization
- Create standard workflows for common tasks
- Use presets to ensure consistency
- Document team workflows
- Regular review and optimization

#### Error Handling
- Always check command output
- Save error logs for debugging
- Use validation commands proactively
- Keep backups of working configurations

---

This user guide covers the essential aspects of using the BBDev VSCode Extension effectively. For more detailed information, refer to the API documentation and source code examples.