#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building BBDev VSCode Extension...\n');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  execSync('npm run clean', { stdio: 'inherit' });
} catch (error) {
  console.warn('Warning: Clean command failed, continuing...');
}

// Install dependencies
console.log('📦 Installing dependencies...');
execSync('npm ci', { stdio: 'inherit' });

// Run linting
console.log('🔍 Running linting...');
try {
  execSync('npm run lint:check', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Linting failed!');
  process.exit(1);
}

// Compile TypeScript
console.log('🔨 Compiling TypeScript...');
try {
  execSync('npm run compile:prod', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Compilation failed!');
  process.exit(1);
}

// Run tests
console.log('🧪 Running tests...');
try {
  execSync('npm run test:unit', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Tests failed!');
  process.exit(1);
}

// Package VSIX
console.log('📦 Creating VSIX package...');
try {
  execSync('npm run package:vsix', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ VSIX packaging failed!');
  process.exit(1);
}

// Find the generated VSIX file
const vsixFiles = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));
if (vsixFiles.length > 0) {
  console.log(`\n✅ Build completed successfully!`);
  console.log(`📦 Generated: ${vsixFiles[0]}`);
  console.log(`\n🚀 To install locally, run:`);
  console.log(`   code --install-extension ${vsixFiles[0]}`);
} else {
  console.error('❌ No VSIX file found after packaging!');
  process.exit(1);
}