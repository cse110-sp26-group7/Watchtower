# Event Schema Draft

Status: rough draft, pending Frontend/UX sync (Sprint 1, Task 1).

## Scope

Four event types. Three are emitted from the end-user's browser via the snippet (error, performance, feedback). One is emitted server-side from CI/CD or a manual API call (deploy).

```
[browser-emitted]   error / performance / feedback
[server-emitted]    deploy
```

## Common fields

Every event carries these fields. deploy_id is nullable: optional on browser events (set by host via watchtower.init); required on deploy events (the deploy's own git SHA).

| field       | type            | notes                                      |
| ----------- | --------------- | ------------------------------------------ |
| event_id    | UUID v4         | client-generated, used for dedup           |
| event_type  | enum            | error \| performance \| feedback \| deploy |
| timestamp   | ISO 8601 string | UTC, ms precision                          |
| environment | enum            | dev \| staging \| prod                     |
| deploy_id   | string \| null  | release identifier (git SHA); see above    |

`project_id` is not a per-event field. It lives on the batch envelope at `POST /ingest` (`{ "project_id": "wt_…", "events": [...] }`). See `endpoints-draft.md` for envelope spec. Backend storage associates each event row with its envelope's `project_id` on insert.

## Browser context

Added to error / performance / feedback events.

| field      | type    | source | notes                                                   |
| ---------- | ------- | ------ | ------------------------------------------------------- |
| url        | string  | client | page URL where event occurred                           |
| user_agent | string  | server | derived from User-Agent request header on receipt       |
| session_id | UUID v4 | client | stored in sessionStorage, refreshes when the tab closes |

## Error event

| field      | type           | notes                                                                    |
| ---------- | -------------- | ------------------------------------------------------------------------ |
| message  | string         | error message                                                            |
| name     | string         | TypeError, ReferenceError, etc.                                      |
| stack    | string         | full stack trace                                                         |
| handled  | boolean        | true if reported via manual captureError(); false if auto-captured |
| filename | string \| null | source file URL (auto-populated by window.onerror)                     |
| lineno   | number \| null | line number (auto-populated by window.onerror)                         |
| colno    | number \| null | column number (auto-populated by window.onerror)                       |

Capture sources:
- window.onerror: auto, populates filename/lineno/colno
- window.unhandledrejection: auto, no parsed location
- watchtower.captureError(err): manual, no parsed location

Example:

```json
{
	"event_id": "550e8400-e29b-41d4-a716-446655440000",
	"event_type": "error",
	"timestamp": "2026-05-07T14:32:11.234Z",
	"environment": "prod",
	"url": "https://example.com/checkout",
	"session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
	"deploy_id": "b1f2a4d",
	"message": "Cannot read property 'total' of undefined",
	"name": "TypeError",
	"stack": "TypeError: Cannot read property 'total' of undefined\n    at calculateTotal (checkout.js:42:18)",
	"handled": false,
	"filename": "https://example.com/checkout.js",
	"lineno": 42,
	"colno": 18
}
```

## Performance event

Web Vitals only. One event per metric (up to 5 per page load).

| field         | type   | notes                                                          |
| ------------- | ------ | -------------------------------------------------------------- |
| metric_name   | enum   | LCP \| FCP \| TTFB \| CLS \| INP                               |
| metric_value  | number | metric value (ms for time metrics, unitless for CLS)           |
| metric_rating | enum   | good \| needs-improvement \| poor (Google standard thresholds) |

Capture: PerformanceObserver API in the snippet.

Example:

```json
{
	"event_id": "660e8400-e29b-41d4-a716-446655440001",
	"event_type": "performance",
	"timestamp": "2026-05-07T14:32:11.234Z",
	"environment": "prod",
	"url": "https://example.com/checkout",
	"session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
	"deploy_id": "b1f2a4d",
	"metric_name": "LCP",
	"metric_value": 2456,
	"metric_rating": "needs-improvement"
}
```

## Feedback event

End-user submits a rating and optional comment about the host app.

| field            | type           | notes                      |
| ---------------- | -------------- | -------------------------- |
| feedback_rating  | number         | 1-5 (integer)              |
| comment          | string \| null | optional free-text comment |

Capture mechanism: TBD pending Frontend/UX sync. Options on the table: snippet API only (host builds UI), default widget rendered by snippet, or a hybrid (mount helper + host-placed container). Schema is the same regardless, only the payload contract is fixed here.

Example:

```json
{
	"event_id": "880e8400-e29b-41d4-a716-446655440003",
	"event_type": "feedback",
	"timestamp": "2026-05-07T14:32:11.234Z",
	"environment": "prod",
	"url": "https://example.com/checkout",
	"session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
	"deploy_id": "b1f2a4d",
	"feedback_rating": 2,
	"comment": "Search results look broken on this page"
}
```

## Deploy event

Server-emitted (CI/CD or manual API call). No browser context.

| field   | type           | notes                                                |
| ------- | -------------- | ---------------------------------------------------- |
| version | string \| null | SemVer tag (e.g., "v0.1.0") if this commit is tagged |

Capture: GitHub Actions (or another CI runner) calls POST /ingest after a deploy completes. deploy_id comes from $GITHUB_SHA; version is set when the commit carries a vX.Y.Z tag (SemVer required by project doc), otherwise null.

Example (untagged staging deploy):

```json
{
	"event_id": "990e8400-e29b-41d4-a716-446655440004",
	"event_type": "deploy",
	"timestamp": "2026-05-07T14:00:00.000Z",
	"environment": "staging",
	"deploy_id": "cd97401",
	"version": null
}
```

Example (tagged production release):

```json
{
	"event_id": "aa0e8400-e29b-41d4-a716-446655440005",
	"event_type": "deploy",
	"timestamp": "2026-05-15T10:00:00.000Z",
	"environment": "prod",
	"deploy_id": "b1f2a4d",
	"version": "v0.1.0"
}
```

## Open questions

- feedback capture mechanism (API only / default widget / hybrid): pending Frontend/UX sync.
- additional browser context (referrer, viewport, language): deferred; can be added in a later iteration if dashboard needs surface.

## References

- Brainstorming notes: event-schema-brainstorming.md (same folder)
- Spec source: Watchtower User Stories.pdf
- Sprint 1 backlog Task 1: backend integration contract
