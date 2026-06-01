import { parseArgs } from "node:util";
import { createHash } from "node:crypto";

/**
 * Tells the Watchtower backend that your project was deployed. 
 * Requires `WT_PROJECT_ID` to be in your .env file
 */
export default async function deploy() {
  const { values } = parseArgs({ 
    options: {
      version: { type: "string", short: "V" },
      environment: { type: "string", short: "e" },
      projectId: { type: "string", short: "p" },
      gitSha: { type: "string", short: "s" },
    },
  });

  if (!values.projectId) {
    console.error("Project ID not provided");
    console.log('Provide a project ID with --projectId <projectId> (ex: wt_a1b2c3d4)');
    return;
  }

  console.log(`Deploying watchtower app: ${values.projectId}`);

  if (!values.environment) {
    console.error("Environment not provided");
    console.log('Provide an environment with --environment ["prod", "staging", "dev"]');
    return;
  }

  const validEnvironments = ["prod", "staging", "dev"];
  const environment = values.environment.toLowerCase();
  if (!validEnvironments.includes(environment)) {
    console.error(`"${environment}" is not a valid environment`);
    console.log('Provide an environment with --environment ["prod", "staging", "dev"]');
    return;
  }

  if (!values.gitSha) {
    console.error("Git SHA not provided");
    console.log('Provide a git SHA with --gitSha <git_sha>');
    return;
  }

  const version = validateVersion(values.version);

  const responseStatus = await sendDeployEventRequest(values.projectId, values.gitSha, environment, version);

  switch (responseStatus) {
    case 204:
      console.log("Successfully deployed Watchtower app");
      break;
    case 400:
      console.error("Failed to deploy Watchtower app. Bad Request. See `npx watchtower --help deploy`");
      break;
    case 401:
      console.error("Failed to deploy Watchtower app. Unknown or missing projectId.");
      break;
    case 413:
      console.error("Failed to deploy Watchtower app. Payload was too large.");
      break;
    case 429:
      console.error("Failed to deploy Watchtower app. Exceeded the rate limit.");
      break;
    default:
      console.error("Failed to deploy Watchtower app");
      break;
  }
}

/**
 * Sends a deploy event request to the Watchtower API
 *
 * @param {string} projectId The unique Watchtower project id
 * @param {string} gitSha The git SHA hash of the most recent commit
 * @param {"prod" | "staging" | "dev"} environment The environment being deployed to
 * @param {string?} version SemVer tag (e.g., "v0.1.0") if this commit is tagged
 * 
 * @returns {Promise<number>} A promise containing the HTTP status code if the request went through, or -1 if it didn't
 */
async function sendDeployEventRequest(projectId, gitSha, environment, version) {
  const WATCHTOWER_INGEST_URL = "https://watchtower-ingest.cse110piedpiper7.workers.dev/ingest";
  try {
    // Create a sha256 hash of the parameters to serve as a primary key for events that allows for idempotency
    const hash = createHash('sha256').update(`${projectId}:${gitSha}:${environment}`).digest('hex');
    const eventId = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;

    const response = await fetch(WATCHTOWER_INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "project_id": projectId,
        "events": [{
          "event_id": eventId,
          "event_type": "deploy",
          "timestamp": new Date().toISOString(),
          "environment": environment,
          "version": version,
          "deploy_id": gitSha,
        }]
      })
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.statusText}`);
      return -1;
    }

    return response.status;
  } catch (error) {
    console.error("Request failed: ", error);
  }
  return -1;
}

/**
 * Validates a SemVer tag
 *
 * @param {string} version A SemVer version string
 *
 * @returns {string?} The version string if it's valid, or null otherwise
 */
function validateVersion(version) {
  if (version) {
    const semVerRegex = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    const matches = version.match(semVerRegex);
    if (matches === null) {
      console.error(`${version} is not a valid SemVer version tag`);
      return null;
    }
    return matches[0];
  }
  return null;
}
