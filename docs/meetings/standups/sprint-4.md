# Sprint 4 Standups (2026-05-25 → 2026-06-01)

Cadence: Mon / Wed / Fri on Slack `#watchtower-standups`, mirrored here.

---

## 2026-05-25 (Mon) — Sprint 4 kickoff standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav
**Format:** Zoom, ~30 min.

**Updates:**
- **Kareem** — Sprint 4 focus: connect FE↔BE on real data, deploy correlation, auth foundations, ADR backfill, and Team 9 peer review.
- **Theo (BE)** — Will own `GET /api/summary` and start the auth path (login + signed cookie).
- **Michael (BE)** — Will batch out ADR backfill: 0006–0018 to cover decisions made in Sprints 2–3.
- **Gabrielle (BE)** — Reviewing Theo's auth design; pairing on PBKDF2 + Web Crypto.
- **Bishal (BE)** — Will land `users` + `sessions` migration and seed a demo user.
- **Thy (FE)** — Wiring dashboard against `/api/events` real data; project selection page in flight.
- **Johnny (FE)** — Real-data swap for error log; search-by-type.
- **Ethan (DevOps)** — Will land the CLI `deploy` command and wire a GitHub Actions deploy-event hook.
- **Nhan (DevOps)** — Will add deploy workflow (tag-triggered) and document secrets in `docs/devops/`.
- **Aarnav / Benny (QA)** — Test-plan execution against the now-connected system; CLI tests merging early in the sprint.

**Blockers:** None.

**Decisions:**
- We will move Auth and Summary to be primary Sprint 4 goals; alerts/notifications and multi-project pushed to Sprint 5.
- Peer review for Team 9 split across sub-teams.

---

## 2026-05-27 (Wed) — Mid-sprint standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny
**Format:** Zoom, ~25 min.

**Updates:**
- **Theo** — `/api/summary` first cut landed (#64); auth login skeleton in design review.
- **Michael** — ADRs 0006–0018 merged in a single PR (#118); coverage is comprehensive on the decisions actually made so far. Three earlier placeholders (0001, 0003, 0004) still need backfill.
- **Bishal** — `users` and `sessions` schema in PR #143; PBKDF2 password hashing tested.
- **Thy** — Project selection page merged (#112); user can pick a project before viewing the dashboard.
- **Johnny** — Error log fully wired against real `/api/events`; type filter works.
- **Ethan** — CLI `deploy` command working in dev; integration with the GitHub Actions hook in progress.
- **Nhan** — Deploy workflow committed; fixed `CLOUDFLARE_API_TOKEN` secret naming bug (`TOKEN_CICD_V1`, #121).
- **Benny** — CLI tests merged (#82); SDK tests 3 and 4 merged.

**Blockers:**
- Auth needs CORS conversation — dashboard origin (`*.pages.dev`) and API origin (`*.workers.dev`) are cross-site; need to confirm `SameSite=None` + credentialed CORS approach.

**Decisions:**
- ADR-0005 (signed-cookie auth) needs to be written before the auth PR lands.

---

## 2026-05-29 (Fri) — Peer-review standup

**Attendees:** Kareem, Theo, Michael, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav
**Format:** Zoom, ~30 min.

**Updates:**
- **Kareem** — Team 9 review feedback received: flagged ADRs 0001, 0003, 0004, 0005 as blank/thin. We need to backfill before peer review next sprint.
- **Theo** — Refactored `/api/summary` to drop undocumented warnings/timezone fields. Auth login PR opening early next week.
- **Bishal** — Sessions migration in last review round.
- **Thy** — Dashboard real-data integration in PR #137; wiring frontend pages to real API.
- **Johnny** — Error log polish + small CSS fixes; will help QA on the regression pass.
- **Ethan** — Deploy-event hook PR open (`devops/deploy-event-hook`); GH Actions POSTs a deploy event to `/ingest` after deploy.
- **Nhan** — Documented secrets management procedure in `docs/devops/`.
- **Benny / Aarnav** — Session-ID tracking removed from SDK after QA flagged it was unused (#130).

**Blockers:**
- Auth is the long pole — both for login itself and for everything downstream (multi-project, regression pass).

**Decisions:**
- Authentication and Summary carry over to Sprint 5.
- Tag a release after auth lands to gate it through the deploy pipeline.

---

## 2026-05-31 (Sat) — Async update

**Format:** Slack only (weekend push).

- **Bishal** — Auth schema migration merged (#143). Demo user seeded.
- **Thy** — Real-API integration merged.
- **Ethan** — Deploy-event hook merged.
- **Theo** — Auth login PR (#147) being polished for Sunday.
