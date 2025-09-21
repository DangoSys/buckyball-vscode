/**
 * Unit tests for utility classes - standalone tests that don't require VSCode
 */

import * as assert from 'assert';
import * as path from 'path';
import { BBDevError } from '../../models/types';

describe('Utility Classes Unit Tests', () => {
  
  describe('BBDevError', () => {
    it('should create error with all properties', () => {
      const originalError = new Error('Original error');
      const details = { key: 'value' };
      
      const bbdevError = new BBDevError(
        'Test error message',
        'command',
        details,
        originalError
      );
      
      assert.strictEqual(bbdevError.message, 'Test error message');
      assert.strictEqual(bbdevError.category, 'command');
      assert.strictEqual(bbdevError.details, details);
      assert.strictEqual(bbdevError.originalError, originalError);
      assert.strictEqual(bbdevError.name, 'BBDevError');
    });

    it('should create error with minimal properties', () => {
      const bbdevError = new BBDevError('Simple error', 'filesystem');
      
      assert.strictEqual(bbdevError.message, 'Simple error');
      assert.strictEqual(bbdevError.category, 'filesystem');
      assert.strictEqual(bbdevError.details, undefined);
      assert.strictEqual(bbdevError.originalError, undefined);
      assert.strictEqual(bbdevError.name, 'BBDevError');
    });

    it('should support all error categories', () => {
      const categories = ['command', 'server', 'filesystem', 'network', 'validation'] as const;
      
      categories.forEach(category => {
        const error = new BBDevError('Test', category);
        assert.strictEqual(error.category, category);
      });
    });
  });

  describe('Path Utilities', () => {
    it('should handle path operations correctly', () => {
      const testPath = path.join('src', 'models', 'types.ts');
      
      assert.ok(testPath.includes('types.ts'));
      assert.strictEqual(path.extname(testPath), '.ts');
      assert.strictEqual(path.basename(testPath), 'types.ts');
      assert.strictEqual(path.dirname(testPath), path.join('src', 'models'));
    });

    it('should normalize paths correctly', () => {
      const unnormalizedPath = 'src//models/../models/types.ts';
      const normalizedPath = path.normalize(unnormalizedPath);
      
      assert.strictEqual(normalizedPath, path.join('src', 'models', 'types.ts'));
    });

    it('should detect absolute paths', () => {
      const absolutePath = path.resolve('src', 'models', 'types.ts');
      const relativePath = path.join('src', 'models', 'types.ts');
      
      assert.ok(path.isAbsolute(absolutePath));
      assert.ok(!path.isAbsolute(relativePath));
    });
  });

  describe('String Utilities', () => {
    it('should handle string operations for command parsing', () => {
      const commandLine = 'bbdev verilator build --job 16';
      const parts = commandLine.split(' ');
      
      assert.strictEqual(parts[0], 'bbdev');
      assert.strictEqual(parts[1], 'verilator');
      assert.strictEqual(parts[2], 'build');
      assert.strictEqual(parts[3], '--job');
      assert.strictEqual(parts[4], '16');
    });

    it('should handle argument parsing', () => {
      const args = ['--job', '16', '--batch', 'true', '--file', 'test.bin'];
      const argMap: Record<string, string> = {};
      
      for (let i = 0; i < args.length; i += 2) {
        if (args[i].startsWith('--')) {
          const key = args[i].substring(2);
          const value = args[i + 1];
          argMap[key] = value;
        }
      }
      
      assert.strictEqual(argMap.job, '16');
      assert.strictEqual(argMap.batch, 'true');
      assert.strictEqual(argMap.file, 'test.bin');
    });
  });

  describe('Type Validation', () => {
    it('should validate argument types correctly', () => {
      const validateType = (value: any, expectedType: string): boolean => {
        switch (expectedType) {
          case 'string':
            return typeof value === 'string';
          case 'number':
            return typeof value === 'number' && !isNaN(value);
          case 'boolean':
            return typeof value === 'boolean' || value === 'true' || value === 'false';
          case 'file':
          case 'directory':
            return typeof value === 'string' && value.length > 0;
          case 'choice':
            return typeof value === 'string';
          default:
            return false;
        }
      };
      
      assert.ok(validateType('test', 'string'));
      assert.ok(validateType(42, 'number'));
      assert.ok(validateType(true, 'boolean'));
      assert.ok(validateType('true', 'boolean'));
      assert.ok(validateType('test.txt', 'file'));
      assert.ok(validateType('/path/to/dir', 'directory'));
      assert.ok(validateType('option1', 'choice'));
      
      assert.ok(!validateType(42, 'string'));
      assert.ok(!validateType('not-a-number', 'number'));
      assert.ok(!validateType('maybe', 'boolean'));
      assert.ok(!validateType('', 'file'));
    });

    it('should convert string values to appropriate types', () => {
      const convertValue = (value: string, targetType: string): any => {
        switch (targetType) {
          case 'number':
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
          case 'boolean':
            return value === 'true' || value === '1';
          default:
            return value;
        }
      };
      
      assert.strictEqual(convertValue('42', 'number'), 42);
      assert.strictEqual(convertValue('3.14', 'number'), 3.14);
      assert.strictEqual(convertValue('true', 'boolean'), true);
      assert.strictEqual(convertValue('false', 'boolean'), false);
      assert.strictEqual(convertValue('1', 'boolean'), true);
      assert.strictEqual(convertValue('0', 'boolean'), false);
      assert.strictEqual(convertValue('test', 'string'), 'test');
    });
  });

  describe('Array Utilities', () => {
    it('should handle array operations for command lists', () => {
      const commands = ['verilator', 'vcs', 'sardine', 'agent'];
      
      assert.ok(commands.includes('verilator'));
      assert.ok(!commands.includes('nonexistent'));
      assert.strictEqual(commands.length, 4);
      assert.strictEqual(commands.indexOf('vcs'), 1);
    });

    it('should filter arrays correctly', () => {
      const operations = [
        { name: 'build', type: 'compile' },
        { name: 'sim', type: 'simulate' },
        { name: 'clean', type: 'utility' },
        { name: 'run', type: 'simulate' }
      ];
      
      const simulateOps = operations.filter(op => op.type === 'simulate');
      assert.strictEqual(simulateOps.length, 2);
      assert.ok(simulateOps.some(op => op.name === 'sim'));
      assert.ok(simulateOps.some(op => op.name === 'run'));
    });
  });

  describe('Object Utilities', () => {
    it('should handle object operations for argument processing', () => {
      const args = { job: 16, batch: true, file: 'test.bin' };
      
      const keys = Object.keys(args);
      const values = Object.values(args);
      const entries = Object.entries(args);
      
      assert.ok(keys.includes('job'));
      assert.ok(values.includes(16));
      assert.ok(entries.some(([key, value]) => key === 'batch' && value === true));
    });

    it('should merge objects correctly', () => {
      const defaults = { job: 16, batch: false };
      const overrides = { batch: true, file: 'test.bin' };
      
      const merged = { ...defaults, ...overrides };
      
      assert.strictEqual(merged.job, 16);
      assert.strictEqual(merged.batch, true);
      assert.strictEqual(merged.file, 'test.bin');
    });
  });

  describe('Regular Expression Utilities', () => {
    it('should validate port numbers', () => {
      const portRegex = /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;
      
      assert.ok(portRegex.test('8080'));
      assert.ok(portRegex.test('3000'));
      assert.ok(portRegex.test('65535'));
      assert.ok(portRegex.test('1'));
      
      assert.ok(!portRegex.test('0'));
      assert.ok(!portRegex.test('65536'));
      assert.ok(!portRegex.test('abc'));
      assert.ok(!portRegex.test(''));
    });

    it('should validate file names', () => {
      const filenameRegex = /^[a-zA-Z0-9._-]+$/;
      
      assert.ok(filenameRegex.test('test.txt'));
      assert.ok(filenameRegex.test('my-file_v2.bin'));
      assert.ok(filenameRegex.test('config.json'));
      
      assert.ok(!filenameRegex.test('file with spaces.txt'));
      assert.ok(!filenameRegex.test('file/with/path.txt'));
      assert.ok(!filenameRegex.test(''));
    });

    it('should detect error patterns in output', () => {
      const errorRegex = /^ERROR:/;
      const warningRegex = /^WARNING:/;
      
      assert.ok(errorRegex.test('ERROR: Command failed'));
      assert.ok(warningRegex.test('WARNING: Deprecated option'));
      
      assert.ok(!errorRegex.test('INFO: Command completed'));
      assert.ok(!warningRegex.test('ERROR: This is an error'));
    });
  });
});