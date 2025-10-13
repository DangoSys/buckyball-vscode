# BBDEV VS Code Extension

## Prerequisites

- npm

## Build

```bash
# at repository root directory
npm install
npm run compile
```

## Test

1. open extension.ts 
2. Press F5 to start debugging
3. In the new VS Code window, `Ctrl+Shift+P` to open the command palette, and then type `bbdev:xx` to run the command.

## Publish

```bash
# at repository root directory
npm install -g @vscode/vsce
vsce package
```
