# Watchtower

## Description
Watchtower is a centralized dashboard to track the performance of your applications with data visualization and analytics.
***

## Project Status
**Prototyping**
***

## Prerequisites
- Wrangler CLI — `npm install -g wrangler`
For backend-specific setup, see `/backend/README.md`
***

## Installation & Setup
**WIP**
***

## Usage & Common Scripts
**WIP**
***

## Architecture Overview
**WIP**
***

## Environment Variables
**WIP**
***

## Tech Stack
**Frontend:** JavaScript, HTML, CSS
**Backend:** Cloudflare Workers
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
