# Design Artifacts

## Miro Board

[Link to Miro board](https://miro.com/app/board/uXjVHaLeQms=/)

### The Miro board contains:

- Competitor research (PostHog, Sentry, Datadog, Grafana)
- Low fidelity wireframes

## User Stories

See our full user stories in the GitHub Issues:

- [data-collection stories](/docs/stories/data-collection.md)
- [data-visualizer stories](/docs/stories/data-visualizer.md)
- [log-viewer stories](/docs/stories/log-viewer.md)

## Design Decisions

### Why these pages?

We focused on 4 core pages based on our user stories:

- Login — required for authentication
- Project Selection — developers can monitor multiple apps
- Dashboard — quick overview of app status (chart, stats, error logs)
- Error Log — detailed error investigation

### Why this layout?

- Orange navbar — warm and friendly
- Sidebar navigation — common pattern in developer tools (Sentry, Datadog)
- Card-based layout — easy to scan helps developers quickly find issues
- Dark mode — standard in developer tools

### Key UX decisions

- Simple over complex — based on user story in data-visualizer and log-viewer docs
- Progressive disclosure — summary on dashboard, details on error log
- Color coding — red/amber/green for instant error severity recognition
