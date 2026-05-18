import { parseArgs } from "node:util";

/**
 * Tells the Watchtower backend that your project was deployed. 
 * Requires `WT_PROJECT_ID` to be in your .env file
 */
export default function deploy() {
  const { values } = parseArgs({ 
    options: {
      version: { type: "string", short: "V" },
      environment: { type: "string", short: "e" },
      envFile: { type: "string", short: "E" },
    },
  });

  if (values.envFile) process.loadEnvFile(envFile);
  else process.loadEnvFile(); 

  console.log(`Deploying watchtower app: ${process.env.PROJECT_ID}`);
}
