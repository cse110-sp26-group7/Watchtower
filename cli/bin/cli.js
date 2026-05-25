#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import { parseArgs } from "node:util";
import create from "../commands/create.js";
import deploy from "../commands/deploy.js";

/**
 * Main function for the Watchtower cli. Parses the arguments and dispatches to the corresponding command if provided.
 */
async function cli() {
  const { values, positionals } = parseArgs({ 
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.version) {
    const { version } = await JSON.parse(await readFile("./package.json", "utf8"));
    console.log(version);
    process.exit(0);
  }

  const [command] = positionals;

  if (values.help) {
    switch (command) {
      case "create": 
        console.log('Creates a new Watchtower project and outputs a unique "WT_PROJECT_ID" to be included in environment variables.');
        console.log("Usage: npx watchtower create");
        break;
      case "deploy": 
        console.log('Tells the Watchtower backend that your project was deployed. Requires "WT_PROJECT_ID" to be set in a .env file.');
        console.log('Usage: npx watchtower deploy --version <version> --environment ["prod", "staging", "dev"] --gitSha <git_sha>');
        console.log('REQUIRED: --projectId <projectId> (short: -p) Unique Watchtower project id (e.g. "wt_abcdabcd") for the project you are deploying');
        console.log('REQUIRED: --environment <environment> (short: -e) Specifies the deployment environment (e.g. "prod")');
        console.log('REQUIRED: --gitSha <git_sha> (short: -s) Release identifier (git SHA). In GitHub actions, this can be obtained from $GITHUB_SHA');
        console.log('OPTIONAL: --version <version> (short: -V): Specifies the version with a SemVer tag (e.g., "v0.1.0")');
        break;
      default:
        console.log("Usage: npx watchtower <command> [options]");
        console.log("Commands: create, deploy");
    }
    process.exit(0);
  }

  console.log("Watchtower CLI running!");

  switch (command) {
    case "create": await create(); break;
    case "deploy": await deploy(); break;
    default:
      console.error(`Unknown command: "${command}"`);
      console.error("Run with --help for usage.");
      process.exit(1);
  }
}

cli();
