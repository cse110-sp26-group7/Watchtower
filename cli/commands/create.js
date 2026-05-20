/**
 * Creates a new Watchtower project and outputs a unique `PROJECT_ID` to be 
 * included in environment variables.
 */
export default async function create() {
  const projectId = await sendCreationRequest();
  if (projectId === null) {
    console.log("Failed to create a watchtower app");
    return;
  }

  console.log(`Created a watchtower app with "WT_PROJECT_ID": ${projectId}`);
}

/**
 * Sends a project creation request to the Watchtower API.
 *
 * @returns {Promise<string?>} A promise containing the unique `WT_PROJECT_ID` associated with the created project
 */
async function sendCreationRequest() {
  const WATCHTOWER_BASE_URL = "https://cse110piedpiper7.workers.dev"
  let projectId = null;
  try {
    const response = await fetch(WATCHTOWER_BASE_URL + "/api/projects/", {
      method: "POST",
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.error}`);
    }
    const data = await response.json();
    projectId = data.project_id;
  } catch (error) {
    console.error("Request failed: ", error);
  }
  return projectId;
}
