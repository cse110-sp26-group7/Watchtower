# Sprint 5 Backend Backlog (week of June 1 - June 7, 2026)

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

Final sprint, due June 7. The backend slice is small but on the critical path: the session gate went live in prod ahead of the FE auth cutover, so the dashboard is broken until Task 1 lands, and deploy correlation is in the demo script.

Priorities per `docs/sprints/sprint-5.md`: auth and deploy correlation are high priority; alerts and multi-project are low priority, so the cut order is Task 4, then Task 3.

One shared prod, tag-triggered deploys: announce every `v*` tag in `#backend` before pushing it, and tag a demo-ready `v0.x.y` before the recording.

---

## Inputs from Sprint 4

Carryover from Sprint 4:
- Task 8: `GET/POST /api/projects`
- Task 9, FE half: `api-client.js` sends neither `credentials: 'include'` nor `X-Watchtower-Auth`

Deployment state (read this first):
- The session gate is LIVE in prod: `v0.0.6-updateAuth` (June 4) deployed PR #152. The FE cutover has not landed, so the prod dashboard's API calls currently fail with 403.

---

## Task summary

| #   | Task                                                     | Owner             | Depends | Priority |
| --- | -------------------------------------------------------- | ----------------- | ------- | -------- |
| 1   | FE auth cutover (unbreak the gated dashboard)             | Gabrielle (w/ FE) |         | High     |
| 2   | `GET /api/events/:event_id` + deploy correlation         | open              |         | High     |
| 3   | `GET/POST /api/projects` + test-app project provisioning | Michael           |         | Low      |
| 4   | Alert on new errors (channel decision + ship)            | open              | #1      | Low      |
| 5   | Backend docs + ADR + test wrap-up                        | Theo              | #1-4    | High     |

---

## Tasks

### 1. FE auth cutover (Sprint 4 Task 9 carryover)

Owner: Gabrielle (cross-team with FE)
Issue: new

Deliverables:
- FE `api-client.js`: send `credentials: 'include'` and the `X-Watchtower-Auth` header on every fetch; on 401, redirect to the login page.
- Login page wired to `POST /api/login` (demo user) and logout to `POST /api/logout`.
- Confirm the `ALLOWED_ORIGINS` var on the API worker is set to the dashboard origin (GitHub Pages URL) and `SESSION_SECRET` is set via `wrangler secret` in prod.
- Verify the dashboard end to end against gated prod: login → dashboard loads → logout → redirected.

This closes the "authentication shipped end-to-end" sprint goal and unblocks QA's full E2E pass (the BE → FE → QA dependency called out in `docs/sprints/sprint-5.md`).

### 2. `GET /api/events/:event_id` + deploy correlation

Owner: open
Issue: new

Deliverables:
- New route in `workers/api/src/`: return the full shaped event (envelope + payload fields, same shaping as the list endpoint). 404 on unknown `event_id`; ownership-gated via `checkProjectAccess`.
- Deploy correlation: include the nearest `deploy` event at-or-before the event's timestamp in the same project (plus the event's own `deploy_id` when the SDK supplied one), so the FE can answer "which deploy introduced this error". Deploy events are already flowing: the CI hook posts them on every tag (PR #141, #144) and `deploy` is a valid `event_type` end to end.
- Local + smoke tests.

The FE already calls this route from `api-client.js`, so the contract's consumer exists today and currently gets a 404.

Note on `GET /api/deploys`: the dashboard timeline can overlay deploys via the existing `GET /api/events?type=deploy` — no separate endpoint looks necessary. Confirm with FE and record the drop in the ADR pass (Task 5) if it sticks.

### 3. `GET/POST /api/projects` + test-app project provisioning (Sprint 4 Task 8 carryover)

Owner: Michael
Issue: new

Deliverables:
- `GET /api/projects`: list projects where `owner_id` is the session user (per `endpoints-draft.md`).
- `POST /api/projects`: create a project, generate a `wt_` id, set `owner_id` to the session user, return the created row (201).
- Both sit behind the session middleware already applied to `/api/*`; no new gating work.
- Local + smoke tests.
- Provision the two test-app project ids under the demo account (via `POST /api/projects`, or a migration seed if the endpoint slips) and hand them to the app owners. App-side SDK integration is not backend work; backend's slice ends at confirming events show under the right project.

Unblocks the FE project-selection page (PR #112) and the multi-project Definition of Done row (one account, two isolated projects). Isolation itself is already enforced: `checkProjectAccess` returns 404 on unknown and 403 on unowned `project_id` (PR #152).

### 4. Alert on new errors

Owner: open
Depends on: Task 1 (alerts surface in the gated dashboard)
Issue: new

The Definition of Done row: a tester triggers a new error and an alert is delivered (in-dashboard or external) without manual refresh.

Grounded default given the one-week window: in-dashboard polling. The FE polls `GET /api/summary` (which already returns `site_status` and error totals) or `GET /api/events?since=<last-seen>` on an interval and raises a toast/banner when new errors appear. This needs no new backend endpoint unless the FE finds a gap — in which case the gap is the deliverable.

Alternative if the team prefers an external channel: a Slack/Discord webhook fired from the ingest worker on error events (needs a `wrangler secret` for the webhook URL and a debounce rule so an error burst is one alert, not fifty). More moving parts; pick only if polling is rejected.

Deliverables:
- Bring the two options to `#backend`, pick one, record it as an ADR (the "ADRs current" sprint goal).
- Ship the chosen mechanism with a smoke test matching the DoD verification: trigger an error, see the alert without refreshing.

### 5. Backend docs + ADR + test wrap-up

Owner: Theo
Depends on: Tasks 1-4 merged
Issue: new

Deliverables:
- README + `docs/ARCHITECTURE.md` backend sections match shipped behavior: auth enforced, summary, event detail, multi-project, deploy correlation. The README intro updates started in PR #128; finish the pass.
- ADR review: ADR-0005 against the implementation as merged; capture the alert-channel decision (Task 4) and the no-`/api/deploys` decision (Task 2) if made.
- Tests: `auth.spec.js` exists; add handler tests for `/api/projects` and `/api/events/:event_id`, and support QA's E2E pass against gated prod.
- Contribute the backend section of the project retrospective.

---

## Out of scope

Unchanged from the Sprint 4 list — dropped for the course timeline, not deferred:
- Source-map upload and stack-trace symbolication
- Rate-limiting hardening on ingest (the TODO marker in `workers/ingest/src/index.js` stays)
- Custom domain (per ADR-0005)
- User registration endpoint (users are seeded; no self-serve signup)
