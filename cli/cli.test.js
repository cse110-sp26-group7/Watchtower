const test = require('node:test');
const assert = require('node:assert');
const { parseArgs, printVersion, dispatch } = require('./cli');

test('parseArgs - basic command parsing', () => {
  const result = parseArgs(['deploy']);
  assert.strictEqual(result.command, 'deploy', 'Should parse deploy command');
});

test('parseArgs - create command', () => {
  const result = parseArgs(['create']);
  assert.strictEqual(result.command, 'create', 'Should parse create command');
});

test('parseArgs - no command provided', () => {
  const result = parseArgs([]);
  assert.strictEqual(result.command, null, 'Should have null command when none provided');
});

test('parseArgs - version flag', () => {
  const result = parseArgs(['--version']);
  assert.strictEqual(result.flags.version, true, 'Should parse --version flag');
});

test('parseArgs - version flag short form', () => {
  const result = parseArgs(['-v']);
  assert.strictEqual(result.flags.version, true, 'Should parse -v flag');
});

test('parseArgs - help flag', () => {
  const result = parseArgs(['--help']);
  assert.strictEqual(result.flags.help, true, 'Should parse --help flag');
});

test('parseArgs - help flag short form', () => {
  const result = parseArgs(['-h']);
  assert.strictEqual(result.flags.help, true, 'Should parse -h flag');
});

test('parseArgs - set-version flag with value', () => {
  const result = parseArgs(['deploy', '--set-version', 'v1.0.0']);
  assert.strictEqual(result.command, 'deploy', 'Should parse deploy command');
  assert.strictEqual(result.flags.setVersion, 'v1.0.0', 'Should parse --set-version value');
});

test('parseArgs - set-version flag short form', () => {
  const result = parseArgs(['deploy', '-V', 'v2.1.0']);
  assert.strictEqual(result.flags.setVersion, 'v2.1.0', 'Should parse -V value');
});

test('parseArgs - environment flag', () => {
  const result = parseArgs(['deploy', '--environment', 'prod']);
  assert.strictEqual(result.flags.environment, 'prod', 'Should parse --environment value');
});

test('parseArgs - environment flag short form', () => {
  const result = parseArgs(['deploy', '-e', 'staging']);
  assert.strictEqual(result.flags.environment, 'staging', 'Should parse -e value');
});

test('parseArgs - env-file flag', () => {
  const result = parseArgs(['deploy', '--env-file', '.env.production']);
  assert.strictEqual(result.flags.envFile, '.env.production', 'Should parse --env-file value');
});

test('parseArgs - env-file flag short form', () => {
  const result = parseArgs(['deploy', '-E', '.env.local']);
  assert.strictEqual(result.flags.envFile, '.env.local', 'Should parse -E value');
});

test('parseArgs - multiple flags', () => {
  const result = parseArgs(['deploy', '-V', 'v1.5.0', '-e', 'prod', '-E', '.env']);
  assert.strictEqual(result.command, 'deploy', 'Should parse command');
  assert.strictEqual(result.flags.setVersion, 'v1.5.0', 'Should parse setVersion');
  assert.strictEqual(result.flags.environment, 'prod', 'Should parse environment');
  assert.strictEqual(result.flags.envFile, '.env', 'Should parse envFile');
});

test('parseArgs - command with multiple flags', () => {
  const result = parseArgs(['deploy', '--set-version', 'v3.0.0', '--environment', 'staging']);
  assert.strictEqual(result.command, 'deploy');
  assert.deepStrictEqual(result.flags, {
    setVersion: 'v3.0.0',
    environment: 'staging',
  });
});

test('parseArgs - version flag before command', () => {
  const result = parseArgs(['--version']);
  assert.strictEqual(result.flags.version, true);
  assert.strictEqual(result.command, null);
});

test('parseArgs - unrecognized command treated as flag', () => {
  const result = parseArgs(['unknown']);
  assert.strictEqual(result.command, null, 'Unknown command should not be set');
});

test('dispatch - deploy command output', (t, done) => {
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => output.push(args.join(' '));

  dispatch('deploy', {});

  console.log = originalLog;
  assert.ok(output.some(line => line.includes('Deploying')), 'Should output deploy message');
});

test('dispatch - create command output', (t, done) => {
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => output.push(args.join(' '));

  dispatch('create', {});

  console.log = originalLog;
  assert.ok(output.some(line => line.includes('Creating')), 'Should output create message');
});

test('dispatch - deploy with version flag', (t, done) => {
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => output.push(args.join(' '));

  dispatch('deploy', { setVersion: 'v1.2.3' });

  console.log = originalLog;
  assert.ok(output.some(line => line.includes('v1.2.3')), 'Should output version');
});

test('dispatch - deploy with environment flag', (t, done) => {
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => output.push(args.join(' '));

  dispatch('deploy', { environment: 'production' });

  console.log = originalLog;
  assert.ok(output.some(line => line.includes('production')), 'Should output environment');
});

test('dispatch - version flag shows version', (t, done) => {
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => output.push(args.join(' '));

  dispatch(null, { version: true });

  console.log = originalLog;
  assert.ok(output.some(line => line.includes('Watchtower CLI')), 'Should output version info');
});

test('dispatch - null command shows help', (t, done) => {
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => output.push(args.join(' '));

  dispatch(null, {});

  console.log = originalLog;
  assert.ok(output.some(line => line.includes('Usage')), 'Should show usage info');
  assert.ok(output.some(line => line.includes('deploy')), 'Should list deploy command');
  assert.ok(output.some(line => line.includes('create')), 'Should list create command');
});

test('integration - full workflow: deploy with version and environment', () => {
  const result = parseArgs(['deploy', '-V', 'v2.0.0', '-e', 'prod']);

  assert.strictEqual(result.command, 'deploy');
  assert.strictEqual(result.flags.setVersion, 'v2.0.0');
  assert.strictEqual(result.flags.environment, 'prod');
});

test('integration - full workflow: create command', () => {
  const result = parseArgs(['create']);

  assert.strictEqual(result.command, 'create');
  assert.deepStrictEqual(result.flags, {});
});

test('integration - full workflow: version flag standalone', () => {
  const result = parseArgs(['--version']);

  assert.strictEqual(result.flags.version, true);
  assert.strictEqual(result.command, null);
});
