#!/usr/bin/env node

import { parseArgs } from "node:util";
import create from "../commands/create.js";
import deploy from "../commands/deploy.js";

const commandsDirectory = "../commands/";

const { values, positionals } = parseArgs({ 
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
});

const [command, ...args] = positionals;

console.log("Watchtower CLI running!");

switch (command) {
  case "create": create(args); break;
  case "deploy": deploy(args); break;
  default:
    console.log("Usage: npx watchtower <command> [options]");
    console.log("Commands: create, deploy");
}
