# Event Schema Draft

Status: rough draft, pending Frontend/UX sync.

## Scope

Four event types. Three are emitted from the end-user's browser via the snippet (error, performance, feedback). One is emitted server-side from CI/CD or a manual API call (deploy).

```
[browser-emitted]   error / performance / feedback
[server-emitted]    deploy
```

## Common envelope

Every event carries these fields.

| field       | type            | notes                                           |
| ----------- | --------------- | ----------------------------------------------- |
| event_id    | UUID v4         | client-generated, used for dedup                |
| project_id  | string          | wt_ + 8-12 random chars (e.g., wt_a1b2c3d4)     |
| event_type  | enum            | error \| performance \| feedback \| deploy      |
| timestamp   | ISO 8601 string | UTC, ms precision                               |
| environment | enum            | dev \| staging \| prod                          |
| deploy_id   | string          | references deploy event identifier (format TBD) |

## Browser context

Added to error / performance / feedback events.

| field      | type    | source | notes                                                   |
| ---------- | ------- | ------ | ------------------------------------------------------- |
| url        | string  | client | page URL where event occurred                           |
| user_agent | string  | server | derived from User-Agent request header on receipt       |
| session_id | UUID v4 | client | stored in sessionStorage, refreshes when the tab closes |

## Error event

| field    | type           | notes                                                              |
| -------- | -------------- | ------------------------------------------------------------------ |
| message  | string         | error message                                                      |
| name     | string         | TypeError, ReferenceError, etc.                                    |
| stack    | string         | full stack trace                                                   |
| handled  | boolean        | true if reported via manual captureError(); false if auto-captured |
| filename | string \| null | source file URL (auto-populated by window.onerror)                 |
| lineno   | number \| null | line number (auto-populated by window.onerror)                     |
| colno    | number \| null | column number (auto-populated by window.onerror)                   |

Capture sources:

- window.onerror: auto, populates filename/lineno/colno
- window.unhandledrejection: auto, no parsed location
- watchtower.captureError(err): manual, no parsed location

Example:

```json
{
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "wt_a1b2c3d4",
    "event_type": "error",
    "timestamp": "2026-05-07T14:32:11.234Z",
    "environment": "prod",
    "deploy_id": "v1.2.3",
    "url": "https://example.com/checkout",
    "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
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

| field       | type   | notes                                                          |
| ----------- | ------ | -------------------------------------------------------------- |
| metric_name | enum   | LCP \| FCP \| TTFB \| CLS \| INP                               |
| value       | number | metric value (ms for time metrics, unitless for CLS)           |
| rating      | enum   | good \| needs-improvement \| poor (Google standard thresholds) |

Capture: PerformanceObserver API in the snippet.

Example:

```json
{
    "event_id": "660e8400-e29b-41d4-a716-446655440001",
    "project_id": "wt_a1b2c3d4",
    "event_type": "performance",
    "timestamp": "2026-05-07T14:32:11.234Z",
    "environment": "prod",
    "deploy_id": "v1.2.3",
    "url": "https://example.com/checkout",
    "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "metric_name": "LCP",
    "value": 2456,
    "rating": "needs-improvement"
}
```

## Feedback event

TBD.

## Deploy event

TBD.
