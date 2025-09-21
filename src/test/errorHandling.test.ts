import * as assert from 'assert';
import * as vscode from 'vscode';
import { EnhancedBBDevError, getErrorHandler } from '../utils/errorHandler';
import { getValidator } from '../utils/validator';

suite('Error Handling Tests', () => {
  let errorHandler: ReturnType<typeof getErrorHandler>;
  let validator: ReturnType<typeof getValidator>;

  setup(() => {
    errorHandler = getErrorHandler();
    validator = getValidator();
  });

  test('EnhancedBBDevError creation', () => {
    const error = new EnhancedBBDevError(
      'Test error message',
      'command',
      { testDetail: 'test' },
      undefined,
      { operation: 'test-operation' }
    );

    assert.strictEqual(error.message, 'Test error message');
    assert.strictEqual(error.category, 'command');
    assert.strictEqual(error.context?.operation, 'test-operation');
    assert.strictEqual(error.details.testDetail, 'test');
  });

  test('Error handler creates command error', () => {
    const error = errorHandler.createCommandError(
      'Command failed',
      'verilator',
      'build',
      { returnCode: 1 }
    );

    assert.strictEqual(error.category, 'command');
    assert.strictEqual(error.context?.command, 'verilator');
    assert.strictEqual(error.context?.operation, 'test-operation');
    assert.strictEqual(error.details.returnCode, 1);
  });

  test('Error handler creates server error', () => {
    const error = errorHandler.createServerError(
      'Port in use',
      8080,
      { pid: 1234 }
    );

    assert.strictEqual(error.category, 'server');
    assert.strictEqual(error.details.port, 8080);
    assert.strictEqual(error.details.pid, 1234);
  });

  test('Error handler creates filesystem error', () => {
    const error = errorHandler.createFilesystemError(
      'File not found',
      '/path/to/file',
      { permissions: 'read-only' }
    );

    assert.strictEqual(error.category, 'filesystem');
    assert.strictEqual(error.details.path, '/path/to/file');
    assert.strictEqual(error.details.permissions, 'read-only');
  });

  test('Error handler creates validation error', () => {
    const error = errorHandler.createValidationError(
      'Invalid port number',
      'port',
      'invalid',
      { min: 1024, max: 65535 }
    );

    assert.strictEqual(error.category, 'validation');
    assert.strictEqual(error.details.field, 'port');
    assert.strictEqual(error.details.value, 'invalid');
    assert.strictEqual(error.details.min, 1024);
  });

  test('Recovery actions can be added', () => {
    const error = new EnhancedBBDevError('Test error', 'command');
    
    error.addRecoveryAction({
      title: 'Test Action',
      action: async () => { /* test action */ }
    });

    assert.strictEqual(error.recoveryActions.length, 1);
    assert.strictEqual(error.recoveryActions[0].title, 'Test Action');
  });

  test('User friendly message can be set', () => {
    const error = new EnhancedBBDevError('Technical error', 'command');
    error.setUserFriendlyMessage('User friendly message');

    assert.strictEqual(error.userFriendlyMessage, 'User friendly message');
  });

  test('Help URL can be set', () => {
    const error = new EnhancedBBDevError('Test error', 'command');
    error.setHelpUrl('https://example.com/help');

    assert.strictEqual(error.helpUrl, 'https://example.com/help');
  });

  test('Validator instance is singleton', () => {
    const validator1 = getValidator();
    const validator2 = getValidator();
    
    assert.strictEqual(validator1, validator2);
  });

  test('Error handler instance is singleton', () => {
    const handler1 = getErrorHandler();
    const handler2 = getErrorHandler();
    
    assert.strictEqual(handler1, handler2);
  });
});