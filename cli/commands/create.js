import { parseArgs } from "node:util";

export default function create(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      projectId: { type: "string", short: "p" },
    },
  });

  console.log(`Creating watchtower app for ${positionals[0]}`);
}
