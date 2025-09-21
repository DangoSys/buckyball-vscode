# BBDev VSCode Extension Makefile

.PHONY: help install dev build test lint clean package release setup

# Default target
help:
	@echo "BBDev VSCode Extension Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  setup     - Set up development environment"
	@echo "  install   - Install dependencies"
	@echo "  dev       - Start development mode with watch"
	@echo "  build     - Build for production"
	@echo "  test      - Run all tests"
	@echo "  lint      - Run linter with auto-fix"
	@echo "  clean     - Clean build artifacts"
	@echo "  package   - Create VSIX package"
	@echo "  release   - Create a release (patch version)"
	@echo "  install-local - Install extension locally"

# Development setup
setup:
	@echo "Setting up development environment..."
	npm run setup:dev

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Development mode
dev:
	@echo "Starting development mode..."
	npm run dev

# Build for production
build:
	@echo "Building for production..."
	npm run build:script

# Run tests
test:
	@echo "Running tests..."
	npm run test

# Run linter
lint:
	@echo "Running linter..."
	npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	npm run clean

# Create VSIX package
package:
	@echo "Creating VSIX package..."
	npm run package:vsix

# Create release
release:
	@echo "Creating patch release..."
	npm run release:patch

# Install extension locally
install-local:
	@echo "Installing extension locally..."
	npm run install:local

# Quick development cycle
quick: clean build test
	@echo "Quick build cycle completed!"

# Full CI cycle
ci: install lint build test package
	@echo "CI cycle completed!"