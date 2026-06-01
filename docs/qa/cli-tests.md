# Watchtower CLI Test Plan

## Test Cases

### 1. parseArgs - Command Parsing
* Should parse deploy command from ['deploy']
* Should parse create command from ['create']
* Should return null command from []
* Should return null command from ['unknown']

### 2. parseArgs - Flag Parsing
* Should parse --version and -v as flags.version = true
* Should parse --help and -h as flags.help = true
* Should parse --set-version and -V with string value
* Should parse --environment and -e with string value
* Should parse --env-file and -E with file path string
* Should parse mixed multiple flags onto flags object
* Should map flag objects via deepStrictEqual match
* Should handle version flag placed before command positionals

### 3. dispatch - Output Messages
* Should catch 'Deploying' when running deploy
* Should catch 'Creating' when running create
* Should include target version string when passed setVersion flag
* Should include target environment string when passed environment flag
* Should print 'Watchtower CLI' when version flag is true
* Should print 'Usage' layout and command list when command is null

### 4. integration - Workflows
* Should parse and align deploy with options simultaneously
* Should verify create runs with empty flags object
* Should verify standalone version flag leaves command null

## Success Criteria
* All tests pass using node --test
* Assertions match the data shapes in the test file
* Console outputs match exact sub-strings verified in tests