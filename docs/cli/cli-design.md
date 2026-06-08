# Watchtower CLI
This is the command line interface for Watchtower. It's used in a user's CI/CD pipeline, and it doubles as a CLI for power users. It can be installed via `npm install @watchtower7/cli`.

## Command Structure

`npx watchtower <command> [flags]`

## Commands

| Command | Description | 
|---|---|
| `deploy` | Call on deployment |
| `create` | Creates a Watchtower project |
| `login`  | Prompts for credentials and starts a session |
| `logout` | Logs the user out if they are logged in |

## Global Flags
| Flag | Short | Required | Description |
|---|---|---|---|
| `--help <subcommand>` | `-h` | false  | Prints help for the given `subcommand`, or general help if no `subcommand` is specified |
| `--version`           | `-v` | false  | Prints the version of the Watchtower CLI |

## Command Reference

### `npx watchtower deploy [flags]`
Tells the Watchtower backend that your project was deployed. Requires `WT_PROJECT_ID`

#### Flags
| Flag | Short | Required | Description |
|---|---|---|---|
| `--projectId <projectId>`     | `-p` | true   | Unique Watchtower project id (e.g. "wt_abcdabcd") for the project you are deploying |
| `--environment <environment>` | `-e` | true   | Specifies the deployment environment ("prod", "staging", "dev") |
| `--gitSha <gitSha>`           | `-s` | true   | Release identifier (git SHA). In GitHub actions, this can be obtained from $GITHUB_SHA |
| `--version <version>`         | `-V` | false  | Specifies the version with a SemVer tag (e.g., "v0.1.0") |

### `npx watchtower create`
Creates a new Watchtower project and outputs a unique `WT_PROJECT_ID` to be included in environment variables. Prompts for a project name. The user must first login with `npx watchtower login`.

### `npx watchtower login`
Prompts for an email and password in the terminal. If successful, saves a session to `~/.config/watchtower/session` that allows the user to create projects.

### `npx watchtower logout`
Logs the user out. Calls the logout API and deletes the local session file if there was one.
