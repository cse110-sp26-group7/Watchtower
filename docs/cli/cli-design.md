# Watchtower CLI
This is the command line interface for Watchtower. It's used in a user's CI/CD pipeline, and it doubles as a CLI for power users. It can be installed via `npm install @watchtower7/cli`

## Command Structure

`npx watchtower <command> [subcommand] [flags]`

## Commands

| Command | Description | 
|---|---|
| `deploy` | Call on deployment |
| `create` | Creates a Watchtower project |

## Command Reference

### `npx watchtower deploy [flags]`
Tells the Watchtower backend that your project was deployed. Requires `WT_PROJECT_ID`

**Flags**
| Flag | Short | Description |
| --- | --- | --- |
| `--set-version <version>` | `-V` | Specifies the version with a SemVer tag (e.g., "v0.1.0") |
| `--environment <environment>` | `-e` | Specifies the deployment environment (e.g. "prod") |
| `--env-file <path>` | `-E` | Override env file (default: `.env`) |


### `npx watchtower create`
Creates a new Watchtower project and outputs a unique `PROJECT_ID` to be included in environment variables.
