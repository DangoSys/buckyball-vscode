#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛠️  Setting up BBDev VSCode Extension development environment...\n');

// Check Node.js version
console.log('🔍 Checking Node.js version...');
const nodeVersion = process.version;
console.log(`   Node.js version: ${nodeVersion}`);

const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 16) {
  console.error('❌ Node.js 16 or higher is required!');
  process.exit(1);
}
console.log('✅ Node.js version is compatible');

// Check if npm is available
console.log('\n📦 Checking npm...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`   npm version: ${npmVersion}`);
} catch (error) {
  console.error('❌ npm is not available!');
  process.exit(1);
}

// Install dependencies
console.log('\n📥 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies!');
  process.exit(1);
}

// Check if VS Code is available
console.log('\n🔍 Checking VS Code CLI...');
try {
  execSync('code --version', { stdio: 'pipe' });
  console.log('✅ VS Code CLI is available');
} catch (error) {
  console.warn('⚠️  VS Code CLI not found. You may need to install it or add it to PATH');
  console.warn('   See: https://code.visualstudio.com/docs/editor/command-line');
}

// Create launch configuration if it doesn't exist
console.log('\n⚙️  Setting up VS Code configuration...');
const vscodeDir = '.vscode';
const launchFile = path.join(vscodeDir, 'launch.json');

if (!fs.existsSync(vscodeDir)) {
  fs.mkdirSync(vscodeDir);
}

if (!fs.existsSync(launchFile)) {
  const launchConfig = {
    version: "0.2.0",
    configurations: [
      {
        name: "Run Extension",
        type: "extensionHost",
        request: "launch",
        args: [
          "--extensionDevelopmentPath=${workspaceFolder}"
        ],
        outFiles: [
          "${workspaceFolder}/out/**/*.js"
        ],
        preLaunchTask: "${workspaceFolder}/npm: compile"
      },
      {
        name: "Extension Tests",
        type: "extensionHost",
        request: "launch",
        args: [
          "--extensionDevelopmentPath=${workspaceFolder}",
          "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
        ],
        outFiles: [
          "${workspaceFolder}/out/test/**/*.js"
        ],
        preLaunchTask: "${workspaceFolder}/npm: compile-tests"
      }
    ]
  };
  
  fs.writeFileSync(launchFile, JSON.stringify(launchConfig, null, 2));
  console.log('✅ Created .vscode/launch.json');
} else {
  console.log('✅ .vscode/launch.json already exists');
}

// Create tasks configuration
const tasksFile = path.join(vscodeDir, 'tasks.json');
if (!fs.existsSync(tasksFile)) {
  const tasksConfig = {
    version: "2.0.0",
    tasks: [
      {
        type: "npm",
        script: "compile",
        group: "build",
        presentation: {
          panel: "dedicated",
          reveal: "never"
        },
        problemMatcher: ["$tsc"]
      },
      {
        type: "npm",
        script: "compile-tests",
        group: "build",
        presentation: {
          panel: "dedicated",
          reveal: "never"
        },
        problemMatcher: ["$tsc"]
      },
      {
        type: "npm",
        script: "watch",
        group: "build",
        presentation: {
          panel: "dedicated",
          reveal: "never"
        },
        isBackground: true,
        problemMatcher: ["$tsc-watch"]
      }
    ]
  };
  
  fs.writeFileSync(tasksFile, JSON.stringify(tasksConfig, null, 2));
  console.log('✅ Created .vscode/tasks.json');
} else {
  console.log('✅ .vscode/tasks.json already exists');
}

// Run initial compilation
console.log('\n🔨 Running initial compilation...');
try {
  execSync('npm run compile', { stdio: 'inherit' });
  console.log('✅ Initial compilation successful');
} catch (error) {
  console.error('❌ Initial compilation failed!');
  process.exit(1);
}

console.log('\n🎉 Development environment setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Open this folder in VS Code');
console.log('   2. Press F5 to launch the extension in a new Extension Development Host window');
console.log('   3. Use "npm run watch" to automatically recompile on changes');
console.log('   4. Use "npm run test" to run tests');
console.log('\n💡 Useful commands:');
console.log('   npm run dev        - Start development mode with watch');
console.log('   npm run build      - Build for production');
console.log('   npm run package    - Create VSIX package');
console.log('   npm run lint       - Run linter with auto-fix');
console.log('   npm run test       - Run all tests');