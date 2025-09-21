import * as assert from 'assert';
import { 
  BBDEV_COMMANDS, 
  getCommandDefinition, 
  getOperationDefinition, 
  getAllCommandNames, 
  getOperationNames 
} from '../../models/commands';
import { CommandDefinition, OperationDefinition, ArgumentDefinition } from '../../models/types';

suite('Command Definition Tests', () => {
  
  test('BBDEV_COMMANDS should contain all expected commands', () => {
    const expectedCommands = [
      'verilator', 'vcs', 'sardine', 'agent', 'workload', 
      'doc', 'marshal', 'firesim', 'compiler', 'funcsim', 'uvm'
    ];
    
    const actualCommands = BBDEV_COMMANDS.map(cmd => cmd.name);
    
    expectedCommands.forEach(expectedCmd => {
      assert.ok(
        actualCommands.includes(expectedCmd), 
        `Command '${expectedCmd}' should be present in BBDEV_COMMANDS`
      );
    });
  });

  test('Each command should have valid structure', () => {
    BBDEV_COMMANDS.forEach(command => {
      // Check command has required properties
      assert.ok(command.name, 'Command should have a name');
      assert.ok(Array.isArray(command.operations), 'Command should have operations array');
      assert.ok(command.operations.length > 0, 'Command should have at least one operation');
      
      // Check each operation has valid structure
      command.operations.forEach(operation => {
        assert.ok(operation.name, 'Operation should have a name');
        assert.ok(operation.description, 'Operation should have a description');
        assert.ok(Array.isArray(operation.arguments), 'Operation should have arguments array');
        
        // Check each argument has valid structure
        operation.arguments.forEach(arg => {
          assert.ok(arg.name, 'Argument should have a name');
          assert.ok(arg.type, 'Argument should have a type');
          assert.ok(['string', 'number', 'boolean', 'file', 'directory', 'choice'].includes(arg.type), 
            `Argument type '${arg.type}' should be valid`);
          assert.ok(typeof arg.required === 'boolean', 'Argument required should be boolean');
          assert.ok(arg.description, 'Argument should have a description');
          
          // If type is choice, should have choices array
          if (arg.type === 'choice') {
            assert.ok(Array.isArray(arg.choices), 'Choice argument should have choices array');
            assert.ok(arg.choices!.length > 0, 'Choice argument should have at least one choice');
          }
        });
      });
    });
  });

  test('getCommandDefinition should return correct command', () => {
    const verilatorCmd = getCommandDefinition('verilator');
    assert.ok(verilatorCmd, 'Should find verilator command');
    assert.strictEqual(verilatorCmd!.name, 'verilator');
    
    const nonExistentCmd = getCommandDefinition('nonexistent');
    assert.strictEqual(nonExistentCmd, undefined, 'Should return undefined for non-existent command');
  });

  test('getOperationDefinition should return correct operation', () => {
    const buildOp = getOperationDefinition('verilator', 'build');
    assert.ok(buildOp, 'Should find verilator build operation');
    assert.strictEqual(buildOp.name, 'build');
    
    const nonExistentOp = getOperationDefinition('verilator', 'nonexistent');
    assert.strictEqual(nonExistentOp, undefined, 'Should return undefined for non-existent operation');
    
    const nonExistentCmd = getOperationDefinition('nonexistent', 'build');
    assert.strictEqual(nonExistentCmd, undefined, 'Should return undefined for non-existent command');
  });

  test('getAllCommandNames should return all command names', () => {
    const commandNames = getAllCommandNames();
    assert.ok(Array.isArray(commandNames), 'Should return an array');
    assert.ok(commandNames.length > 0, 'Should return at least one command name');
    assert.ok(commandNames.includes('verilator'), 'Should include verilator');
    assert.ok(commandNames.includes('vcs'), 'Should include vcs');
  });

  test('getOperationNames should return operation names for command', () => {
    const verilatorOps = getOperationNames('verilator');
    assert.ok(Array.isArray(verilatorOps), 'Should return an array');
    assert.ok(verilatorOps.length > 0, 'Should return at least one operation');
    assert.ok(verilatorOps.includes('build'), 'Should include build operation');
    assert.ok(verilatorOps.includes('sim'), 'Should include sim operation');
    
    const nonExistentOps = getOperationNames('nonexistent');
    assert.ok(Array.isArray(nonExistentOps), 'Should return an array for non-existent command');
    assert.strictEqual(nonExistentOps.length, 0, 'Should return empty array for non-existent command');
  });

  test('Verilator command should have expected operations', () => {
    const verilatorCmd = getCommandDefinition('verilator');
    assert.ok(verilatorCmd, 'Verilator command should exist');
    
    const expectedOps = ['clean', 'verilog', 'build', 'sim', 'run'];
    const actualOps = verilatorCmd!.operations.map(op => op.name);
    
    expectedOps.forEach(expectedOp => {
      assert.ok(
        actualOps.includes(expectedOp), 
        `Verilator should have '${expectedOp}' operation`
      );
    });
  });

  test('Build operations should have job argument', () => {
    const verilatorBuild = getOperationDefinition('verilator', 'build');
    const vcsBuild = getOperationDefinition('vcs', 'build');
    
    [verilatorBuild, vcsBuild].forEach((buildOp, index) => {
      const cmdName = index === 0 ? 'verilator' : 'vcs';
      assert.ok(buildOp, `${cmdName} build operation should exist`);
      
      const jobArg = buildOp.arguments.find((arg: ArgumentDefinition) => arg.name === 'job');
      assert.ok(jobArg, `${cmdName} build should have job argument`);
      assert.strictEqual(jobArg.type, 'number', 'Job argument should be number type');
      assert.strictEqual(jobArg.required, false, 'Job argument should be optional');
      assert.strictEqual(jobArg.default, 16, 'Job argument should default to 16');
    });
  });

  test('Sim operations should have binary and batch arguments', () => {
    const verilatorSim = getOperationDefinition('verilator', 'sim');
    const vcsSim = getOperationDefinition('vcs', 'sim');
    
    [verilatorSim, vcsSim].forEach((simOp, index) => {
      const cmdName = index === 0 ? 'verilator' : 'vcs';
      assert.ok(simOp, `${cmdName} sim operation should exist`);
      
      const binaryArg = simOp.arguments.find((arg: ArgumentDefinition) => arg.name === 'binary');
      assert.ok(binaryArg, `${cmdName} sim should have binary argument`);
      assert.strictEqual(binaryArg.type, 'file', 'Binary argument should be file type');
      assert.strictEqual(binaryArg.required, true, 'Binary argument should be required');
      
      const batchArg = simOp.arguments.find((arg: ArgumentDefinition) => arg.name === 'batch');
      assert.ok(batchArg, `${cmdName} sim should have batch argument`);
      assert.strictEqual(batchArg.type, 'boolean', 'Batch argument should be boolean type');
      assert.strictEqual(batchArg.required, false, 'Batch argument should be optional');
      assert.strictEqual(batchArg.default, false, 'Batch argument should default to false');
    });
  });

  test('Choice arguments should have valid choices', () => {
    const workloadRun = getOperationDefinition('workload', 'run');
    assert.ok(workloadRun, 'Workload run operation should exist');
    
    const simulatorArg = workloadRun.arguments.find((arg: ArgumentDefinition) => arg.name === 'simulator');
    assert.ok(simulatorArg, 'Workload run should have simulator argument');
    assert.strictEqual(simulatorArg.type, 'choice', 'Simulator argument should be choice type');
    assert.ok(Array.isArray(simulatorArg.choices), 'Simulator argument should have choices');
    assert.ok(simulatorArg.choices!.includes('verilator'), 'Should include verilator choice');
    assert.ok(simulatorArg.choices!.includes('vcs'), 'Should include vcs choice');
    assert.strictEqual(simulatorArg.default, 'verilator', 'Should default to verilator');
  });

  test('Agent command should have server operations', () => {
    const agentCmd = getCommandDefinition('agent');
    assert.ok(agentCmd, 'Agent command should exist');
    
    const expectedOps = ['start', 'stop', 'status'];
    const actualOps = agentCmd!.operations.map(op => op.name);
    
    expectedOps.forEach(expectedOp => {
      assert.ok(
        actualOps.includes(expectedOp), 
        `Agent should have '${expectedOp}' operation`
      );
    });
    
    // Check start operation has port argument
    const startOp = getOperationDefinition('agent', 'start');
    assert.ok(startOp, 'Agent start operation should exist');
    
    const portArg = startOp.arguments.find((arg: ArgumentDefinition) => arg.name === 'port');
    assert.ok(portArg, 'Agent start should have port argument');
    assert.strictEqual(portArg.type, 'number', 'Port argument should be number type');
    assert.strictEqual(portArg.required, false, 'Port argument should be optional');
    assert.strictEqual(portArg.default, 8080, 'Port argument should default to 8080');
  });

  test('File and directory arguments should be properly typed', () => {
    // Check marshal pack operation
    const marshalPack = getOperationDefinition('marshal', 'pack');
    assert.ok(marshalPack, 'Marshal pack operation should exist');
    
    const inputArg = marshalPack.arguments.find((arg: ArgumentDefinition) => arg.name === 'input');
    const outputArg = marshalPack.arguments.find((arg: ArgumentDefinition) => arg.name === 'output');
    
    assert.ok(inputArg, 'Marshal pack should have input argument');
    assert.strictEqual(inputArg.type, 'directory', 'Input should be directory type');
    assert.strictEqual(inputArg.required, true, 'Input should be required');
    
    assert.ok(outputArg, 'Marshal pack should have output argument');
    assert.strictEqual(outputArg.type, 'file', 'Output should be file type');
    assert.strictEqual(outputArg.required, true, 'Output should be required');
  });
});