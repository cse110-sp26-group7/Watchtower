# Sprint 5 Standups (2026-06-01 → 2026-06-08)

Cadence: Mon / Wed / Fri on Slack `#watchtower-standups`, mirrored here.

---

## 2026-06-01 (Mon) — Sprint 5 kickoff standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav
**Format:** Zoom, ~30 min.

**Updates:**
- **Kareem** — Final sprint. Goal: ship the production MVP, every Sprint 4 carryover lands, demo is real, docs reflect what we built.
- **Theo (BE)** — Auth login + signed cookie PR (#147) goes in today; session-cookie middleware to gate `/api/*` next.
- **Michael (BE)** — Will write ADRs for decisions made in Sprints 4–5 if any haven't been captured.
- **Gabrielle (BE)** — Reviewing Theo's auth PRs; will help with the `/api/summary` auth routing.
- **Bishal (BE)** — Demo-project consolidation (`wt_demo`) shipping today (#145).
- **Thy (FE)** — Dashboard polish; tooltip and metric-improvement work in progress (#153).
- **Johnny (FE)** — Helping QA on regression pass; available for any FE follow-ups.
- **Ethan (DevOps)** — Deploy-event hook now points at `wt_demo` project.
- **Nhan (DevOps)** — `docs/devops/` write-up complete: deploy flow, rollback, secrets rotation, onboarding.
- **Benny / Aarnav (QA)** — Will run full regression against auth-gated dashboard once login lands.

**Blockers:**
- Finals season; team availability is variable.

**Decisions:**
- Push multi-test-app integration and notifications to "won't-fix-for-MVP" (already pushed back per the sprint notes).
- Cut a demo-ready tag once auth lands and regression passes.

---

## 2026-06-03 (Wed) — Mid-sprint standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny
**Format:** Zoom, ~25 min.

**Updates:**
- **Theo** — Session-cookie middleware merged today (#152). `/api/*` now requires the signed cookie; credentialed CORS pinned to dashboard origin. Tagged `v0.0.6-updateAuth` after merge.
- **Michael** — Reviewing the three placeholder ADRs (0001, 0003, 0004) to backfill before final review. Will also add ADRs for retention, rate limiting, and the no-staging decision.
- **Bishal** — Fixed `users` migration hash issue with `0005_fix_demo_hash.sql`; auth tests added.
- **Thy** — Dashboard metric-improvements PR going through review (#153); tooltip refinements.
- **Johnny** — Helped with summary card styling; available for any last polish.
- **Ethan** — Smoke-tested deploy event correlation on the dashboard with `wt_demo` — visible.
- **Nhan** — Considering whether to fold a "deploy correlation" doc into `docs/devops/` or `docs/ARCHITECTURE.md`.
- **Benny** — Regression pass underway; one false alarm on the summary view, resolved.

**Blockers:**
- None blocking. Demo-video recording window is Friday afternoon.

**Decisions:**
- Feature freeze Friday 12:00 PT — only doc / ADR / minor-bug PRs after that.
- Project retrospective scheduled for Saturday morning.

---

## 2026-06-05 (Fri) — Feature-freeze standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav
**Format:** Zoom, ~20 min.

**Updates:**
- **Kareem** — Repo audit complete. Empty ADRs being backfilled today; CHANGELOG seeded from tags; standups + TA notes captured in `docs/meetings/`. Final retro write-up Saturday.
- **Theo** — `/api/summary` documentation tweaks (#128) merged.
- **Bishal** — Last auth polish (JSDoc, edge cases on logout) done.
- **Thy** — Dashboard polish PR (#153) merged.
- **Nhan** — Final pass on `docs/devops/` for onboarding clarity.
- **Ethan** — Demo dry-run tonight; deploy event will be triggered live in the demo.
- **Benny / Aarnav** — Regression pass green on `main`; CI history clean for the week.

**Blockers:** None.

**Decisions:**
- Feature freeze in effect: only docs, ADRs, and small fixes for the rest of the sprint.
- Demo video recording: Saturday morning.
- Sprint 5 retrospective: Saturday afternoon, all-team.
