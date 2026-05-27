
***

## Deployed Endpoints

| Worker | URL |
|--------|-----|
| Ingest | https://watchtower-ingest.cse110piedpiper7.workers.dev/ingest |
| API    | https://watchtower-api.cse110piedpiper7.workers.dev/api/events |

***

## Verified End to End

Date: 2026-05-25
Verified by: Bishal (Issue #108)
Test event_id: `90d30827-fb25-4d7d-8601-f36ffc51b7ae`

Full pipeline confirmed: SDK → `/ingest` → D1 → `/api/events` → response.
Query used: `GET /api/events?project_id=wt_demo&type=error`
