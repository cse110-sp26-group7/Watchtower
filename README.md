# WatchTower

Lightweight observability dashboard. Errors, performance, and user
feedback in one place.

## Project Status
**CSE 110 Sp 26 team project. Pre-release.**
***

## Prerequisites
- Wrangler CLI — `npm install -g wrangler`
For backend-specific setup, see `/backend/README.md`
***

## Installation & Setup
### Installation
**WIP**
### Setup
#### Step 1 — Register project
```bash
npx @watchtower/cli create
```
CLI prompts for project name, registers with WatchTower API, drops `watchtower.js` into their folder, writes `project_id` to `.env`.

#### Step 2 — Initialize WatchTower in their app

The CLI prints the following after `create` completes:

```
✅ Project created! project_id: wt_a1b2c3d4

Add this to your app's JS entry point (e.g. main.js, app.js, index.js):

  function init() {
    const wt = new WatchTower({ projectId: "wt_a1b2c3d4" })
    wt.init()
  }

Note: project_id is a public identifier, safe to commit to your repo.
```

`project_id` is intentionally hardcoded in app JS — not read from `.env` — because plain HTML projects have no build step to inject environment variables, and `project_id` is not a secret. This matches the standard pattern used by Sentry and PostHog.

#### Step 3 — Set up deploy tracking
```bash
npx @watchtower/cli deploy
```
CLI generates `.github/workflows/watchtower.yml` in their repo. Customer adds `WATCHTOWER_PROJECT_ID` to their GitHub repository secrets.

From this point:
- Errors and performance vitals are reported automatically
- Every push to their `main` branch sends a deploy event to WatchTower
- The dashboard correlates errors to deploys by timestamp and `deploy_id`
***

## Usage & Common Scripts
**WIP**
***

## Architecture Overview
[ARCHITECTURE.md](docs/ARCHITECTURE.md)
***

## Environment Variables
**WIP**
***

## Tech Stack
**Frontend:** JavaScript, HTML, CSS\
**Backend:** Cloudflare Workers, JavaScript
***

## Features
- Data Collection — User feedback, performance degradations, crashes
- Log Viewer — Browse and filter application logs including errors, warnings, and crashes
- Data Visualization — Visual dashboards for monitoring app performance and user activity
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
