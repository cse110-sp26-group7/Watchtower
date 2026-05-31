# Watchtower CLI
This is the command line interface for Watchtower. It's used in a user's CI/CD pipeline, and it doubles as a CLI for power users. It can be installed via `npm install @watchtower7/cli`.

## Command Structure

`npx watchtower <command> [flags]`

## Commands

| Command | Description | 
|---|---|
| `deploy` | Call on deployment |
| `create` | Creates a Watchtower project |
| `login`  | Opens a login prompt on the user's browser |
| `logout` | Logs the use out if they are logged in |

## Global Flags
| Flag | Short | Required | Description |
|---|---|---|---|
| `--version`           | `-h` | false  | Prints the version of the Watchtower CLI |
| `--help <subcommand>` | `-v` | false  | Prints help for the given `subcommand`, or general help if no `subcommand` is specified |

## Command Reference

### `npx watchtower deploy [flags]`
Tells the Watchtower backend that your project was deployed. Requires `WT_PROJECT_ID`

#### Flags
| Flag | Short | Required | Description |
|---|---|---|---|
| `--set-version <version>`     | `-V` | false  | Specifies the version with a SemVer tag (e.g., "v0.1.0") |
| `--environment <environment>` | `-e` | true   | Specifies the deployment environment ("prod", "staging", "dev") |
| `--gitSha <gitSha>`           | `-s` | true   | Release identifier (git SHA). In GitHub actions, this can be obtained from $GITHUB_SHA |
| `--projectId <projectId>`     | `-p` | true   | Unique Watchtower project id (e.g. "wt_abcdabcd") for the project you are deploying |

### `npx watchtower create`
Creates a new Watchtower project and outputs a unique `PROJECT_ID` to be included in environment variables.

### `npx watchtower login`

### `npx watchtower logout`
