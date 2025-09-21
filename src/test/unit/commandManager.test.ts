import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandManager } from '../../managers/commandManager';
import { ExecutionContext } from '../../models/types';

suite('CommandManager Tests', () => {
  let commandManager: CommandManager;

  setup(() => {
    commandManager = CommandManager.getInstance();
  });

  test('should create singleton instance', () => {
    const instance1 = CommandManager.getInstance();
    const instance2 = CommandManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  test('should parse argument string correctly', () => {
    const argString = '--binary test.bin --job 8 --batch';
    const parsed = commandManager.parseArgumentString(argString);

    assert.strictEqual(parsed.binary, 'test.bin');
    assert.strictEqual(parsed.job, 8);
    assert.strictEqual(parsed.batch, true);
  });

  test('should get output channel for command', () => {
    const channel = commandManager.getOutputChannel('verilator');
    assert.ok(channel);
    assert.ok(channel.name.includes('verilator'));
  });

  test('should validate execution context', async () => {
    const mockChannel = vscode.window.createOutputChannel('test');

    const context: ExecutionContext = {
      command: 'verilator',
      operation: 'build',
      arguments: {},
      workspaceRoot: '/nonexistent',
      outputChannel: mockChannel
    };

    try {
      // This should throw an error due to nonexistent workspace
      await commandManager.executeCommand(context);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error);
    }

    mockChannel.dispose();
  });
});