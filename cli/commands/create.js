/**
 * Create command for the CLI
 */

import * as readline from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const WATCHTOWER_API_URL = "https://watchtower-api.cse110piedpiper7.workers.dev";

/**
 * Creates a new Watchtower project and outputs a unique `PROJECT_ID` to be
 * included in environment variables.
 */
export default async function create() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const name = await rl.question('Project name: ');
  rl.close();

  if (!name.trim()) {
    console.error("Project name cannot be empty");
    return;
  }

  const projectId = await sendCreationRequest(name.trim());
  if (projectId === null) return;

  console.log(`Created a watchtower app with "WT_PROJECT_ID": ${projectId}`);
}

/**
 * Sends a project creation request to the Watchtower API.
 *
 * @param {string} name The display name for the project
 * @returns {Promise<string|null>} The unique `WT_PROJECT_ID`, or null on failure
 */
async function sendCreationRequest(name) {
  let cookieValue;
  try {
    cookieValue = readFileSync(join(homedir(), '.config', 'watchtower', 'session'), 'utf8').trim();
  } catch {
    console.error("Not logged in. Run `npx watchtower login` first.");
    return null;
  }

  const project_id = 'wt_' + randomUUID().replace(/-/g, '').slice(0, 8);

  try {
    const response = await fetch(WATCHTOWER_API_URL + "/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Watchtower-Auth": "true",
        "Cookie": `wt_session=${cookieValue}`,
      },
      body: JSON.stringify({ project_id, name }),
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.project.project_id;
  } catch (error) {
    console.error("Request failed: ", error);
    return null;
  }
}
