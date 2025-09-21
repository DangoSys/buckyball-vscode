# Contributing to BBDev VSCode Extension

Thank you for your interest in contributing to the BBDev VSCode Extension! This document provides guidelines and information for contributors.

## 🎯 Ways to Contribute

### Code Contributions
- Bug fixes
- New features
- Performance improvements
- Code refactoring
- Test improvements

### Documentation
- README improvements
- Code comments
- API documentation
- Usage examples
- Troubleshooting guides

### Testing
- Bug reports
- Feature testing
- Performance testing
- Compatibility testing
- User experience feedback

### Community
- Answering questions in discussions
- Helping other users
- Sharing usage examples
- Writing blog posts or tutorials

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 16.x or higher
- **npm**: 7.x or higher
- **Visual Studio Code**: 1.74.0 or higher
- **Git**: Latest version
- **bbdev tool**: For testing functionality

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/bbdev-vscode-extension.git
   cd bbdev-vscode-extension/bbdev
   ```

2. **Set Up Development Environment**
   ```bash
   npm run setup:dev
   ```

3. **Start Development**
   ```bash
   make dev
   ```

4. **Open in VSCode**
   ```bash
   code .
   ```

5. **Launch Extension**
   - Press `F5` to open Extension Development Host
   - Test your changes in the new window

## 📝 Development Guidelines

### Code Style

#### TypeScript Guidelines
- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow existing naming conventions

#### Example Code Style
```typescript
/**
 * Executes a bbdev command with the specified parameters
 * @param command The command to execute
 * @param operation The operation within the command
 * @param args Command arguments
 * @returns Promise resolving to execution result
 */
export async function executeCommand(
  command: string,
  operation: string,
  args: Record<string, any>
): Promise<ExecutionResult> {
  // Implementation here
}
```

#### File Organization
- Group related functionality in modules
- Use barrel exports (`index.ts`) for clean imports
- Keep files focused on single responsibility
- Place tests adjacent to source files

### Git Workflow

#### Branch Naming
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

#### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(commands): add support for custom command arguments
fix(server): resolve port conflict detection issue
docs(readme): update installation instructions
test(managers): add unit tests for ConfigurationManager
```

### Testing Requirements

#### Test Coverage
- All new features must include tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Test both happy path and error cases

#### Test Types
1. **Unit Tests** (`src/test/unit/`)
   ```typescript
   import { expect } from 'chai';
   import { CommandManager } from '../managers/commandManager';

   describe('CommandManager', () => {
     it('should parse command arguments correctly', () => {
       const manager = new CommandManager();
       const result = manager.parseArguments(['--arg1', 'value1']);
       expect(result).to.deep.equal({ arg1: 'value1' });
     });
   });
   ```

2. **Integration Tests** (`src/test/suite/`)
   ```typescript
   import * as vscode from 'vscode';
   import { expect } from 'chai';

   describe('Extension Integration', () => {
     it('should activate successfully', async () => {
       const extension = vscode.extensions.getExtension('buckyball.bbdev-vscode-extension');
       await extension?.activate();
       expect(extension?.isActive).to.be.true;
     });
   });
   ```

#### Running Tests
```bash
# Run all tests
make test

# Run specific test type
npm run test:unit
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues for duplicates
2. Test with the latest version
3. Reproduce the issue consistently
4. Gather relevant information

### Bug Report Template
```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., Windows 10, macOS 12.0, Ubuntu 20.04]
- VSCode Version: [e.g., 1.74.0]
- Extension Version: [e.g., 0.1.0]
- bbdev Version: [e.g., 1.0.0]

**Additional Context**
- Screenshots
- Log output
- Configuration files
- Any other relevant information
```

## 💡 Feature Requests

### Before Submitting
1. Check existing feature requests
2. Consider if it fits the extension's scope
3. Think about implementation complexity
4. Consider alternative solutions

### Feature Request Template
```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
How you envision this feature working.

**Alternatives Considered**
Other ways to solve this problem.

**Additional Context**
- Mockups or diagrams
- Related features
- Implementation ideas
```

## 🔄 Pull Request Process

### Before Submitting
1. **Create an issue** first (unless it's a trivial fix)
2. **Fork the repository** and create a feature branch
3. **Make your changes** following the guidelines
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Run the full test suite**
7. **Ensure CI passes**

### Pull Request Template
```markdown
**Description**
Brief description of changes.

**Related Issue**
Fixes #123

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

**Checklist**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new warnings introduced
```

### Review Process
1. **Automated checks** must pass (CI, linting, tests)
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** and merge by maintainers

## 📚 Development Resources

### Useful Links
- [VSCode Extension API](https://code.visualstudio.com/api)
- [VSCode Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Mocha Testing Framework](https://mochajs.org/)
- [Webpack Documentation](https://webpack.js.org/)

### Project Architecture
```
src/
├── extension.ts           # Main extension entry point
├── commands/             # Command implementations
│   ├── serverCommands.ts
│   └── validationCommands.ts
├── managers/             # Core business logic
│   ├── commandManager.ts
│   ├── serverManager.ts
│   └── configurationManager.ts
├── models/               # Data models and types
│   ├── types.ts
│   └── constants.ts
├── providers/            # VSCode providers
│   ├── treeDataProvider.ts
│   └── webviewProvider.ts
├── utils/                # Utility functions
│   ├── logger.ts
│   └── fileUtils.ts
└── test/                 # Test files
    ├── unit/
    └── suite/
```

### Key Concepts

#### Extension Lifecycle
1. **Activation**: Extension loads when workspace opens
2. **Registration**: Commands, providers, and views are registered
3. **Event Handling**: Respond to user interactions
4. **Deactivation**: Clean up resources when extension unloads

#### Core Components
- **TreeDataProvider**: Manages the command tree view
- **CommandManager**: Handles command execution
- **ServerManager**: Manages bbdev server instances
- **ConfigurationManager**: Handles settings and presets

## 🏆 Recognition

### Contributors
All contributors are recognized in:
- GitHub contributors list
- Release notes
- Documentation credits

### Contribution Types
We recognize various types of contributions:
- 💻 Code
- 📖 Documentation
- 🐛 Bug reports
- 💡 Ideas
- 🤔 Answering questions
- ⚠️ Tests
- 🎨 Design

## 📞 Getting Help

### Development Questions
- **GitHub Discussions**: For general questions
- **GitHub Issues**: For specific problems
- **Code Review**: Ask questions in PR comments

### Communication Guidelines
- Be respectful and constructive
- Provide context and details
- Search existing discussions first
- Use clear, descriptive titles

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the Appache License.

---

Thank you for contributing to BBDev VSCode Extension! 🎉