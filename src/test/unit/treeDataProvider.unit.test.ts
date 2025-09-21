import * as assert from 'assert';
import { BBDevTreeDataProvider } from '../../providers/treeDataProvider';
import { BBDEV_COMMANDS } from '../../models/commands';

suite('BBDevTreeDataProvider Test Suite', () => {
    let provider: BBDevTreeDataProvider;

    setup(() => {
        provider = new BBDevTreeDataProvider();
    });

    test('should return all commands at root level', async () => {
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, BBDEV_COMMANDS.length);
        
        // Check that all command names are present
        const commandNames = children.map(item => item.id);
        const expectedNames = BBDEV_COMMANDS.map(cmd => cmd.name);
        
        expectedNames.forEach(name => {
            assert.ok(commandNames.includes(name), `Command ${name} should be present`);
        });
    });

    test('should return operations for a command', async () => {
        // Get the first command
        const commands = await provider.getChildren();
        const firstCommand = commands[0];
        
        // Get operations for the first command
        const operations = await provider.getChildren(firstCommand);
        
        // Find the corresponding command definition
        const commandDef = BBDEV_COMMANDS.find(cmd => cmd.name === firstCommand.id);
        assert.ok(commandDef, 'Command definition should exist');
        
        assert.strictEqual(operations.length, commandDef.operations.length);
        
        // Check that all operation names are present
        const operationNames = operations.map(item => item.label);
        const expectedNames = commandDef.operations.map(op => op.name);
        
        expectedNames.forEach(name => {
            assert.ok(operationNames.includes(name), `Operation ${name} should be present`);
        });
    });

    test('should create correct tree items for commands', async () => {
        const children = await provider.getChildren();
        const firstCommand = children[0];
        
        assert.strictEqual(firstCommand.contextValue, 'bbdev-command');
        assert.strictEqual(firstCommand.collapsibleState, 1); // TreeItemCollapsibleState.Collapsed
        assert.ok(firstCommand.iconPath);
    });

    test('should create correct tree items for operations', async () => {
        const commands = await provider.getChildren();
        const firstCommand = commands[0];
        const operations = await provider.getChildren(firstCommand);
        const firstOperation = operations[0];
        
        assert.strictEqual(firstOperation.contextValue, 'bbdev-operation');
        assert.strictEqual(firstOperation.collapsibleState, 0); // TreeItemCollapsibleState.None
        assert.ok(firstOperation.iconPath);
        assert.ok(firstOperation.command, 'Operation should have a command');
        assert.strictEqual(firstOperation.command?.command, 'bbdev.executeOperation');
    });

    test('should create proper tooltips for commands', async () => {
        const children = await provider.getChildren();
        const firstCommand = children[0];
        
        assert.ok(firstCommand.tooltip, 'Command should have a tooltip');
        assert.ok(typeof firstCommand.tooltip === 'string');
        assert.ok(firstCommand.tooltip.includes(firstCommand.label), 'Tooltip should include command name');
        assert.ok(firstCommand.tooltip.includes('Operations:'), 'Tooltip should list operations');
    });

    test('should create proper tooltips for operations', async () => {
        const commands = await provider.getChildren();
        const firstCommand = commands[0];
        const operations = await provider.getChildren(firstCommand);
        const firstOperation = operations[0];
        
        assert.ok(firstOperation.tooltip, 'Operation should have a tooltip');
        assert.ok(typeof firstOperation.tooltip === 'string');
        assert.ok(firstOperation.tooltip.includes(firstCommand.label), 'Tooltip should include command name');
        assert.ok(firstOperation.tooltip.includes(firstOperation.label), 'Tooltip should include operation name');
    });

    test('should return no children for operations', async () => {
        const commands = await provider.getChildren();
        const firstCommand = commands[0];
        const operations = await provider.getChildren(firstCommand);
        const firstOperation = operations[0];
        
        const children = await provider.getChildren(firstOperation);
        assert.strictEqual(children.length, 0, 'Operations should have no children');
    });

    test('should find tree items by ID', () => {
        // Test finding a command
        const commandItem = provider.findTreeItem('verilator');
        assert.ok(commandItem, 'Should find verilator command');
        assert.strictEqual(commandItem?.id, 'verilator');
        assert.strictEqual(commandItem?.contextValue, 'bbdev-command');
        
        // Test finding an operation
        const operationItem = provider.findTreeItem('verilator.build');
        assert.ok(operationItem, 'Should find verilator.build operation');
        assert.strictEqual(operationItem?.id, 'verilator.build');
        assert.strictEqual(operationItem?.contextValue, 'bbdev-operation');
        
        // Test finding non-existent item
        const nonExistentItem = provider.findTreeItem('nonexistent');
        assert.strictEqual(nonExistentItem, undefined, 'Should not find non-existent item');
    });

    test('should get correct parent for operations', () => {
        const operationItem = provider.findTreeItem('verilator.build');
        assert.ok(operationItem, 'Operation should exist');
        
        const parent = provider.getParent(operationItem);
        assert.ok(parent, 'Operation should have a parent');
        assert.strictEqual((parent as any).id, 'verilator');
        assert.strictEqual((parent as any).contextValue, 'bbdev-command');
    });

    test('should return null parent for commands', () => {
        const commandItem = provider.findTreeItem('verilator');
        assert.ok(commandItem, 'Command should exist');
        
        const parent = provider.getParent(commandItem);
        assert.strictEqual(parent, null, 'Commands should have no parent');
    });
});