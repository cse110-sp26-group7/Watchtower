# Log Viewer Stories

---

## User Persona

> Same persona as Data Collection Stories — Richard Hendricks.
> See [data-collection-stories.md](data-collection-stories.md) for full profile.

---

## Story 1 — Log Viewer

**As a developer, I want to:**

- View a detailed log of each event including:
  - Error message and type
  - Time of occurrence
  - Affected page or endpoint
- Search logs by event type (error, performance, feedback)
- View logs in JSON format
- Have error logs visually highlighted in the list

**So that:**

- I can investigate a specific issue without digging through noise
- I can easily read and understand each log message
- I can quickly spot errors in the list

### Acceptance Criteria

| Acceptance Criteria | Verification Method | Status |
|---|---|---|
| Each log entry displays error message, type, timestamp, and affected page | Tester confirms all 4 details are visible per log entry | Not Ready |
| Logs can be searched by event type (error, performance, feedback) | Tester searches each type and confirms only matching logs appear | Not Ready |
| Logs are displayed in JSON format | Tester confirms raw log data is readable as JSON | Not Ready |
| Error logs are visually distinct from other event types | Tester visually confirms error entries are highlighted differently | Not Ready |
| When search returns no results, a friendly empty state is shown | Tester searches for a term that doesn't exist and confirms empty state appears | Not Ready |

---

## Story 2 — Deploy Signal Tracking

**As a developer, I want to:**

- See a history of deployments alongside my error timeline
- Know which deployment happened before a spike in errors began
- See which errors appeared after a specific deployment

**So that:**

- I can immediately identify which release introduced a problem without guessing

### Acceptance Criteria

| Acceptance Criteria | Verification Method | Status |
|---|---|---|
| A list of deployments is visible with timestamp and version label | Tester triggers a deploy event and confirms it appears in the dashboard | Not Ready |
| Deployments are shown alongside the error timeline | Tester confirms deploy markers are visible relative to when errors occurred | Not Ready |
| Clicking a deployment shows which errors appeared after it | Tester deploys then triggers errors and confirms the correlation is visible | Not Ready |