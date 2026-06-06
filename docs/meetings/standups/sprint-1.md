# Sprint 1 Standups (2026-05-04 → 2026-05-11)

Cadence: Mon / Wed / Fri on Slack `#watchtower-standups`, mirrored here.

---

## 2026-05-04 (Mon) — Kickoff standup

**Attendees:** Kareem (tech lead), Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav, Jack, Cindy
**Format:** In-person after class, ~20 min.

**Updates:**
- **Kareem** — Repo scaffolded yesterday, branch protection rules drafted, will open the `docs/ARCHITECTURE.md` PR Wednesday.
- **Theo (BE)** — Will scaffold `docs/backend/` and Sprint 1 BE backlog by Wednesday.
- **Michael (BE)** — Domain research started; will read PostHog / Sentry / Datadog docs and summarize in `backend-research.md`.
- **Gabrielle (BE)** — Will own the storage-selection ADR (#19).
- **Bishal (BE)** — Will research observability SDK shapes (#44).
- **Thy (FE)** — Starting wireframes + brief in a Google Doc; will mirror to `docs/design/`.
- **Nhan (DevOps)** — Setting up branch protection rules (#28).
- **Ethan (DevOps)** — Confirmed his club's site can be the test app; no custom test app needed.
- **Johnny / Benny / Aarnav / Jack / Cindy** — Reading project brief and doing domain research (#03).

**Blockers:** None.

**Decisions:**
- No custom test app; Ethan's club website hosts the SDK.
- WatchTower watches client side + deploy events only — not the test app's backend.

---

## 2026-05-06 (Wed) — Architecture standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny
**Format:** Zoom, ~25 min.

**Updates:**
- **Kareem** — `ARCHITECTURE.md` PR open today; UML diagram drafted in Mermaid. Three placeholder ADRs created: 0001 (Cloudflare), 0003 (vanilla JS), 0004 (single events table). Will fill in detail as decisions stabilize.
- **Theo** — Sprint 1 BE backlog scaffolded (PR #7); starting event-schema draft (#16).
- **Michael** — `backend-research.md` first pass landed (PR #9, then #14); will keep adding as research continues.
- **Gabrielle** — ADR-0002 (D1 vs KV vs Postgres) draft in progress; ~70% done. Plan: land Friday.
- **Bishal** — SDK research summarized; surfacing tradeoffs of `sendBeacon` vs `fetch` vs `XHR`.
- **Thy** — Wireframes drafted for login, project select, overview, error log; will export to `docs/design/wireframes/` once feedback in.
- **Nhan** — Branch protection landed; PRs now require review + green CI before merge.
- **Ethan** — Sketched the test-app integration shape; SDK needs a project API key.
- **Johnny / Benny** — Domain research wrapping up; both moving to FE/QA tasks for the rest of the sprint.

**Blockers:**
- Gabrielle blocked briefly waiting on Cloudflare free-tier numbers — confirmed today from Cloudflare pricing page.

**Decisions:**
- Architecture finalized at five-layer pipeline (SDK → ingest Worker → D1 → reporting Worker → dashboard).

---

## 2026-05-08 (Fri) — Pre-weekend standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan
**Format:** Slack async + 15-min Zoom check-in.

**Updates:**
- **Kareem** — Architecture doc merged; ADR-0002 reviewed; gating Sprint 2 on Theo's schema draft.
- **Theo** — Event-schema draft (`event-schema-draft.md`) merged; will iterate when ingest validation lands.
- **Michael** — Schema PR open (#43) — `events` table with `event_type` discriminator and JSON payload column.
- **Gabrielle** — Added Cloudflare Worker dev environment (#21).
- **Bishal** — Observability SDK research wrapped.
- **Thy** — Wireframes uploaded to Miro; team to leave feedback over the weekend.
- **Nhan** — D1 database binding wired for ingest Worker (PR #32).

**Blockers:** None heading into the weekend.

**Decisions:**
- Sprint 2 planning meeting set for Sunday afternoon.
- Schema decision (single `events` table) confirmed.
