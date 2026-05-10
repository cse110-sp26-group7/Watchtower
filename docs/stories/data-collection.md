# Data Collection Stories

---

## User Persona

**Name:** Richard Hendricks
**Age:** 25
**Vibe:** Black hoodie, energy drink, three monitors.

**Background:**
Richard is the person his team texts at 2am when the app goes down. He didn't sign up to be on call, but he always responds because he wants to keep his job. He loves building cool things but doesn't like spending hours hunting issues through logs. He needs to spot and fix issues fast so he can go back to sleep.

**Goals:**
- Quickly identify what broke, when, and how often
- Understand error patterns over time
- Fix issues before they affect more users
- Keep their app running smoothly without constant manual checking

**Frustrated when:**
- Jumping between multiple tools just to understand one issue
- Dashboards that are too cluttered or complex to read quickly
- No easy way to filter logs by time range or error type
- Finding out about a crash from a user instead of an alert

---

## Story 1 — Error Dashboard

**As a developer, I want to:**

- See a dashboard of recent errors with details like:
  - Timestamp of when it occurred
  - Error type (e.g. JavaScript runtime error, failed API request)
  - How many times it occurred (frequency)
  - Which page or endpoint it came from
- See key metrics like app traffic, crash and performance alerts, user feedback, and charts of when those alerts occur
- Have a simple and easy to read dashboard
- Select a time range like "yesterday" and have every panel on the dashboard update accordingly
- See a dedicated error panel separate from the main log viewer

**So that:**

- I can quickly identify and fix issues before they affect more users
- I can debug and sanitize my app efficiently
- I can quickly understand the issues without seeing unnecessary complexity
- I can identify patterns by time and date
- I can investigate historical data across all metrics at once
- I can focus on errors without digging through all the logs

### Acceptance Criteria

| Acceptance Criteria | Verification Method | Status |
|---|---|---|
| Dashboard loads data within 1-2s | Tester manually times the load or uses browser dev tools | Not Ready |
| Errors are visually distinct from non-error events | Tester visually confirms styling in review | Not Ready |
| Dashboard displays the last 50 errors | Tester triggers 50+ errors and confirms only the last 50 show | Not Ready |
| Each error shows timestamp, type, frequency, and source location | Tester confirms all 4 details are visible per error entry | Not Ready |
| Time range selector updates all dashboard panels when changed | Tester selects "yesterday" and confirms all panels reflect that range | Not Ready |
| When no errors exist, a friendly message is displayed | Tester confirms empty state displays before any errors are triggered | Not Ready |

---

## Story 2 — User Feedback & Ratings

**As a developer, I want to:**

- See feedback and ratings submitted by users of my application in one place
- Know which page or action the feedback came from

**So that:**

- I can understand how users feel about my app and identify pain points they are experiencing

### Acceptance Criteria

| Acceptance Criteria | Verification Method | Status |
|---|---|---|
| Feedback submissions are displayed with rating score and message | Tester submits a rating from Test App and confirms it appears in the dashboard | Not Ready |
| Each feedback entry shows which page it was submitted from | Tester submits feedback from different pages and confirms source page is recorded | Not Ready |
| When no feedback exists, a friendly empty state is shown | Tester confirms empty state displays before any feedback is submitted | Not Ready |