# WatchTower

**[→ Visit the project site](https://cse110-sp26-group7.github.io/Watchtower/landing/)**

Lightweight observability dashboard. Errors, performance, and user
feedback in one place.

## Project Status
**CSE 110 Sp 26 team project. Pre-release.**

[Status Update 1](https://youtu.be/NoIb_ukGxmw)
***

## Prerequisites
- Node.js 20+ and npm 10+ (`wrangler` is pinned in each worker's `devDependencies`; no global install needed)
For backend-specific setup, see `docs/backend/README.md` and the per-worker READMEs (`workers/api/`, `workers/ingest/`)
***

## Installation & Setup
### Installation
```sh
git clone https://github.com/cse110-sp26-group7/Watchtower.git
cd Watchtower/workers/api && npm install     # reporting API
cd ../ingest && npm install                  # ingest
```
### Setup
#### Step 1 - Register your Project
Dashboard accounts are seeded by the team (no self-serve signup). Ask in the team channel to get a `project_id` for your app.

#### Step 2 - Install SDK
Add the Watchtower SDK to your html file with the following script
```
<script src="https://cdn.jsdelivr.net/gh/cse110-sp26-group7/Watchtower@main/client/watchtower.min.js" defer></script> 
```

#### Step 3 - Initialize SDK
Create and initialize a WatchTower object in in your code. Make sure to use your project id
```
const wt = new Watchtower({
  projectId: "your_project_id",
  endpoint: "https://watchtower-ingest.cse110piedpiper7.workers.dev/ingest",
  environment: "prod"
})
wt.init()
```

#### Step 4 - Test
Add this button to your html file to test your dashboard
```
<button id="trigger-error">Trigger Test Error</button>

<script>
  document
    .getElementById("trigger-error")
    .addEventListener("click", () => {
      // Simulate a runtime error
      throw new Error("Manual test error triggered");
    });
</script>
```
***

## Usage & Common Scripts
Run from `workers/api/` or `workers/ingest/`:

| Script | What it does |
|--------|--------------|
| `npm run dev` | local worker on `http://localhost:8787` (`-- --port 8788` to run both) |
| `npm test` | Vitest suite for that worker |
| `npm run deploy` | manual `wrangler deploy` (normally done by CI on `v*` tags) |

Lint runs from the repo root: `npx eslint .`
***

## Architecture Overview
[ARCHITECTURE.md](docs/ARCHITECTURE.md)
***

## Environment Variables

| Worker | Name | Kind | Purpose |
|--------|------|------|---------|
| API | `ALLOWED_ORIGINS` | var (`wrangler.jsonc`) | comma-separated CORS allowlist; must include the dashboard origin |
| API | `SESSION_SECRET` | secret (`wrangler secret put`) | HMAC key for signing session cookies |

### Deployed Endpoints

| Surface | URL |
|---------|-----|
| Dashboard | https://watchtower-page.pages.dev |
| Ingest | https://watchtower-ingest.cse110piedpiper7.workers.dev/ingest |
| API | https://watchtower-api.cse110piedpiper7.workers.dev/api/* |
***

## Tech Stack
**Frontend:** JavaScript, HTML, CSS\
**Backend:** Cloudflare Workers, JavaScript
***

## Features
- Data Collection — User feedback, performance degradations, crashes
- Log Viewer — Browse and filter application logs including errors, warnings, and crashes
- Data Visualization — Visual dashboards for monitoring app performance and user activity
- Deploy Correlation — links each error to the deploy that likely introduced it
- Authenticated Dashboard — login-gated API with per-project ownership checks
***
  
## Planned Features
- API Endpoint Tester
***
  
## Contributing
1. Create a branch (`feat/your-feature`, `fix/your-fix`, `docs/your-doc`)
2. Make your changes
3. Ensure all new functions include JSDoc comments
5. Open a PR and fill out the checklist
6. PRs require review before merging into main
***

## JSDocumentation
Here's an example of how your JSDoc comments should look above functions

```
/**
 * Handles incoming event data from client applications.
 *
 * @async
 * @function handleIngest
 * @param {Request} request - The incoming HTTP request containing event data
 * @param {string} request.method - Must be POST
 * @param {Object} request.body - The JSON payload of the event
 * @param {string} request.body.event_id - Unique identifier for the event
 * @param {string} request.body.app_id - The application sending the event
 * @param {string} request.body.event_type - Type of event (e.g. "error", "feedback", "deploy")
 * @param {string} request.body.timestamp - ISO 8601 timestamp of when the event occurred
 * @returns {Response} 200 if the event was received successfully
 * @returns {Response} 400 if the request body is missing or malformed
 * @example
 * POST /ingest
 * {
 *   "event_id": "abc123",
 *   "app_id": "watchtower",
 *   "event_type": "error",
 *   "timestamp": "2026-05-04T12:00:00Z"
 * }
 */
async function handleIngest(request) {
  // handler logic here
}
```
***
