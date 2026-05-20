#!/usr/bin/env node

const pkg = require('../package.json');

const COMMANDS = {
  deploy: 'deploy',
  create: 'create',
};

function parseArgs(args) {
  const parsed = {
    command: null,
    flags: {},
  };

  if (args.length === 0) return parsed;

  // First arg is the command
  if (args[0] in COMMANDS) {
    parsed.command = args[0];
    args = args.slice(1);
  }

  // Parse remaining args as flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--version' || arg === '-v') {
      parsed.flags.version = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.flags.help = true;
    } else if (arg === '--set-version' || arg === '-V') {
      parsed.flags.setVersion = args[++i];
    } else if (arg === '--environment' || arg === '-e') {
      parsed.flags.environment = args[++i];
    } else if (arg === '--env-file' || arg === '-E') {
      parsed.flags.envFile = args[++i];
    }
  }

  return parsed;
}

function printVersion() {
  console.log(`Watchtower CLI v${pkg.version}`);
}

function dispatch(command, flags) {
  if (flags.version) {
    printVersion();
    return;
  }

  switch (command) {
    case 'deploy':
      console.log('Deploying project...');
      if (flags.setVersion) {
        console.log(`Version: ${flags.setVersion}`);
      }
      if (flags.environment) {
        console.log(`Environment: ${flags.environment}`);
      }
      if (flags.envFile) {
        console.log(`Using env file: ${flags.envFile}`);
      }
      break;

    case 'create':
      console.log('Creating new Watchtower project...');
      break;

    default:
      console.log('Watchtower CLI');
      console.log(`v${pkg.version}`);
      console.log('\nUsage: npx watchtower <command> [flags]');
      console.log('\nCommands:');
      console.log('  deploy   - Call on deployment');
      console.log('  create   - Creates a Watchtower project');
      console.log('\nFlags:');
      console.log('  --version, -v         - Show version');
      console.log('  --set-version, -V     - Specify version (deploy only)');
      console.log('  --environment, -e     - Specify environment (deploy only)');
      console.log('  --env-file, -E        - Override env file path');
  }
}

function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  dispatch(parsed.command, parsed.flags);
}

module.exports = { parseArgs, printVersion, dispatch };

if (require.main === module) {
  main();
}
