import { CommandDefinition } from './types';

/**
 * Static registry of all bbdev commands and their operations
 * Based on the bbdev tool's argument parser structure
 */
export const BBDEV_COMMANDS: CommandDefinition[] = [
  {
    name: 'verilator',
    description: 'Verilator simulation operations',
    operations: [
      {
        name: 'clean',
        description: 'Clean verilator build directory',
        arguments: []
      },
      {
        name: 'verilog',
        description: 'Generate verilog files from chisel',
        arguments: []
      },
      {
        name: 'build',
        description: 'Build verilator simulation executable',
        arguments: [
          {
            name: 'job',
            type: 'number',
            required: false,
            description: 'Number of parallel jobs',
            default: 16
          }
        ]
      },
      {
        name: 'sim',
        description: 'Run verilator simulation',
        arguments: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            description: 'Path to binary file'
          },
          {
            name: 'batch',
            type: 'boolean',
            required: false,
            description: 'Run in batch mode',
            default: false
          }
        ]
      },
      {
        name: 'run',
        description: 'Integrated build+sim+run',
        arguments: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            description: 'Path to binary file'
          },
          {
            name: 'batch',
            type: 'boolean',
            required: false,
            description: 'Run in batch mode',
            default: false
          },
          {
            name: 'job',
            type: 'number',
            required: false,
            description: 'Number of parallel jobs',
            default: 16
          }
        ]
      }
    ]
  },
  {
    name: 'vcs',
    description: 'VCS simulation operations',
    operations: [
      {
        name: 'clean',
        description: 'Clean VCS build directory',
        arguments: []
      },
      {
        name: 'verilog',
        description: 'Generate verilog files from chisel',
        arguments: []
      },
      {
        name: 'build',
        description: 'Build VCS simulation executable',
        arguments: [
          {
            name: 'job',
            type: 'number',
            required: false,
            description: 'Number of parallel jobs',
            default: 16
          }
        ]
      },
      {
        name: 'sim',
        description: 'Run VCS simulation',
        arguments: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            description: 'Path to binary file'
          },
          {
            name: 'batch',
            type: 'boolean',
            required: false,
            description: 'Run in batch mode',
            default: false
          }
        ]
      },
      {
        name: 'run',
        description: 'Integrated build+sim+run',
        arguments: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            description: 'Path to binary file'
          },
          {
            name: 'batch',
            type: 'boolean',
            required: false,
            description: 'Run in batch mode',
            default: false
          },
          {
            name: 'job',
            type: 'number',
            required: false,
            description: 'Number of parallel jobs',
            default: 16
          }
        ]
      }
    ]
  },
  {
    name: 'sardine',
    description: 'Sardine test framework operations',
    operations: [
      {
        name: 'clean',
        description: 'Clean sardine build directory',
        arguments: []
      },
      {
        name: 'build',
        description: 'Build sardine tests',
        arguments: []
      },
      {
        name: 'run',
        description: 'Run sardine tests',
        arguments: [
          {
            name: 'test',
            type: 'string',
            required: false,
            description: 'Specific test to run'
          },
          {
            name: 'verbose',
            type: 'boolean',
            required: false,
            description: 'Enable verbose output',
            default: false
          }
        ]
      }
    ]
  },
  {
    name: 'agent',
    description: 'Agent workflow operations',
    operations: [
      {
        name: 'start',
        description: 'Start agent server',
        arguments: [
          {
            name: 'port',
            type: 'number',
            required: false,
            description: 'Port number for agent server',
            default: 8080
          }
        ]
      },
      {
        name: 'stop',
        description: 'Stop agent server',
        arguments: []
      },
      {
        name: 'status',
        description: 'Check agent server status',
        arguments: []
      }
    ]
  },
  {
    name: 'workload',
    description: 'Workload management operations',
    operations: [
      {
        name: 'list',
        description: 'List available workloads',
        arguments: []
      },
      {
        name: 'build',
        description: 'Build workload',
        arguments: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Workload name'
          }
        ]
      },
      {
        name: 'run',
        description: 'Run workload',
        arguments: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Workload name'
          },
          {
            name: 'simulator',
            type: 'choice',
            required: false,
            description: 'Simulator to use',
            choices: ['verilator', 'vcs'],
            default: 'verilator'
          }
        ]
      }
    ]
  },
  {
    name: 'doc',
    description: 'Documentation operations',
    operations: [
      {
        name: 'build',
        description: 'Build documentation',
        arguments: []
      },
      {
        name: 'serve',
        description: 'Serve documentation locally',
        arguments: [
          {
            name: 'port',
            type: 'number',
            required: false,
            description: 'Port for documentation server',
            default: 3000
          }
        ]
      },
      {
        name: 'clean',
        description: 'Clean documentation build',
        arguments: []
      }
    ]
  },
  {
    name: 'marshal',
    description: 'Marshal data operations',
    operations: [
      {
        name: 'pack',
        description: 'Pack data files',
        arguments: [
          {
            name: 'input',
            type: 'directory',
            required: true,
            description: 'Input directory'
          },
          {
            name: 'output',
            type: 'file',
            required: true,
            description: 'Output file'
          }
        ]
      },
      {
        name: 'unpack',
        description: 'Unpack data files',
        arguments: [
          {
            name: 'input',
            type: 'file',
            required: true,
            description: 'Input file'
          },
          {
            name: 'output',
            type: 'directory',
            required: true,
            description: 'Output directory'
          }
        ]
      }
    ]
  },
  {
    name: 'firesim',
    description: 'FireSim operations',
    operations: [
      {
        name: 'build',
        description: 'Build FireSim configuration',
        arguments: []
      },
      {
        name: 'run',
        description: 'Run FireSim simulation',
        arguments: [
          {
            name: 'config',
            type: 'file',
            required: false,
            description: 'Configuration file'
          }
        ]
      }
    ]
  },
  {
    name: 'compiler',
    description: 'Compiler operations',
    operations: [
      {
        name: 'build',
        description: 'Build compiler',
        arguments: [
          {
            name: 'target',
            type: 'choice',
            required: false,
            description: 'Build target',
            choices: ['debug', 'release'],
            default: 'debug'
          }
        ]
      },
      {
        name: 'test',
        description: 'Run compiler tests',
        arguments: []
      },
      {
        name: 'clean',
        description: 'Clean compiler build',
        arguments: []
      }
    ]
  },
  {
    name: 'funcsim',
    description: 'Functional simulation operations',
    operations: [
      {
        name: 'build',
        description: 'Build functional simulator',
        arguments: []
      },
      {
        name: 'run',
        description: 'Run functional simulation',
        arguments: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            description: 'Binary file to simulate'
          }
        ]
      }
    ]
  },
  {
    name: 'uvm',
    description: 'UVM verification operations',
    operations: [
      {
        name: 'build',
        description: 'Build UVM testbench',
        arguments: []
      },
      {
        name: 'run',
        description: 'Run UVM tests',
        arguments: [
          {
            name: 'test',
            type: 'string',
            required: false,
            description: 'Specific test to run'
          },
          {
            name: 'seed',
            type: 'number',
            required: false,
            description: 'Random seed'
          }
        ]
      }
    ]
  }
];

/**
 * Get command definition by name
 */
export function getCommandDefinition(commandName: string): CommandDefinition | undefined {
  return BBDEV_COMMANDS.find(cmd => cmd.name === commandName);
}

/**
 * Get operation definition by command and operation name
 */
export function getOperationDefinition(commandName: string, operationName: string): any {
  const command = getCommandDefinition(commandName);
  return command?.operations.find(op => op.name === operationName);
}

/**
 * Get all command names
 */
export function getAllCommandNames(): string[] {
  return BBDEV_COMMANDS.map(cmd => cmd.name);
}

/**
 * Get all operation names for a command
 */
export function getOperationNames(commandName: string): string[] {
  const command = getCommandDefinition(commandName);
  return command?.operations.map(op => op.name) || [];
}