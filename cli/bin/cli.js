#!/usr/bin/env node

import fs from "node:fs"
import { parseArgs } from "node:util";
import create from "../commands/create.js";
import deploy from "../commands/deploy.js";

const { values, positionals } = parseArgs({ 
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
});

if (values.version) {
  const { version } = JSON.parse(fs.readfiles("./package.json", "utf8"));
  console.log(version);
  process.exit(0);
}

const [command] = positionals;

if (values.help || command) {
  console.log("Usage: npx watchtower <command> [options]");
  console.log("Commands: create, deploy");
  process.exit(0);
}

console.log("Watchtower CLI running!");

switch (command) {
  case "create": create(); break;
  case "deploy": deploy(); break;
  default:
    console.error(`Unknown command: "${command}"`);
    console.error("Run with --help for usage.");
    process.exit(1);
}
