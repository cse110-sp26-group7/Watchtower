import { unlinkSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const WATCHTOWER_API_URL = "https://watchtower-api.cse110piedpiper7.workers.dev";

/**
 * Logs the user out if they had an active session.
 */
export default async function logout() {
  const sessionPath = join(homedir(), '.config', 'watchtower', 'session');

  let cookieValue;
  try {
    cookieValue = readFileSync(sessionPath, 'utf8').trim();
  } catch {
    console.error("Not logged in");
    return;
  }

  try {
    await fetch(WATCHTOWER_API_URL + "/api/logout", {
      method: "POST",
      headers: {
        "X-Watchtower-Auth": "true",
        "Cookie": `wt_session=${cookieValue}`,
      },
    });
  } catch (error) {
    console.error("Request failed: ", error);
  }

  unlinkSync(sessionPath);
  console.log("Successfully logged out!");
}
