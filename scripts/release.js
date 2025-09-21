#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const releaseType = args[0] || 'patch'; // patch, minor, major

if (!['patch', 'minor', 'major'].includes(releaseType)) {
  console.error('❌ Invalid release type. Use: patch, minor, or major');
  process.exit(1);
}

console.log(`🚀 Creating ${releaseType} release...\n`);

// Read current version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;
console.log(`📋 Current version: ${currentVersion}`);

// Update version
console.log(`📈 Bumping ${releaseType} version...`);
try {
  execSync(`npm version ${releaseType} --no-git-tag-version`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Version bump failed!');
  process.exit(1);
}

// Read new version
const updatedPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const newVersion = updatedPackageJson.version;
console.log(`✅ New version: ${newVersion}`);

// Run full build
console.log('\n🔨 Running full build...');
try {
  execSync('node scripts/build.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed!');
  process.exit(1);
}

// Create git tag
console.log('\n🏷️  Creating git tag...');
try {
  execSync(`git add package.json`, { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Git operations failed (this is okay if not in a git repo)');
}

console.log(`\n✅ Release ${newVersion} created successfully!`);
console.log(`\n📦 Next steps:`);
console.log(`   1. Push changes: git push && git push --tags`);
console.log(`   2. Create GitHub release from tag v${newVersion}`);
console.log(`   3. Upload the generated .vsix file to the release`);

// Find the generated VSIX file
const vsixFiles = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));
if (vsixFiles.length > 0) {
  console.log(`\n📁 Generated VSIX: ${vsixFiles[0]}`);
}