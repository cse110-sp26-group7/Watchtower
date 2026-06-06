# ADR-0021: Per-Project Ingest Rate Limiting at the Worker Edge

## Status
Proposed

## Date
2026-06-04

## Context

ADR-0002 flagged ingest rate limiting as a follow-up: D1's free tier permits 100 K row writes per day, and a single misconfigured client or hostile loop could exhaust that quota in well under a day. Once the daily cap is hit, *every project's* writes start failing, not just the offender's — D1 quotas are account-scoped, not project-scoped.

The shape of WatchTower's ingest also leaks information about how to defend it. Writes come from two sources:

- **Client SDK** in untrusted browsers — high volume, unauthenticated beyond a `project_id` key. The realistic worst case is a busy customer site spraying thousands of events per minute during an incident.
- **GitHub Actions deploy hooks** — low volume (a handful per day per project), trusted source, no realistic abuse path.

The threat model is therefore not adversarial DDoS (Cloudflare's edge handles that) — it's *operational protection*: stop one badly behaved instrumented app from blowing the day's write budget for everyone else.

Options:

1. **No rate limit** — accept that one runaway client can take down ingest for all projects until 00:00 UTC. Current state.
2. **Cloudflare's built-in Rate Limiting Rules** — configured in the dashboard, per-zone. Simple, but a Workers Free / non-paid configuration may not have access to all the granularity we want.
3. **In-Worker per-project counter using Workers KV** — read/write a per-project per-minute counter from KV at the start of every ingest request. Simple, but KV's free-tier write cap (1 000/day) is far too low to be the counter for an event store.
4. **In-Worker counter using a Durable Object** — per-project DO holds a sliding counter; strongly consistent, cheap per check, but adds DO billing and complexity.
5. **In-Worker counter using D1** — fold the rate-limit state into the same database we're trying to protect. Tempting because we already have D1, but recursive: a write to log "you have written too many things" is itself a write.
6. **Token-bucket cache in Worker memory, accept fuzziness across PoPs** — cheap, no extra storage, but each Cloudflare PoP has its own counter, so the global rate is the per-PoP rate times the number of PoPs that see traffic.

## Decision

**Adopt option 6 in v1: per-project token-bucket limiter held in Worker memory, plus a hard daily-row-write circuit breaker.** Revisit moving the counter into a Durable Object if real traffic shows the per-PoP fuzziness causes problems.

Specifics:

- Per `project_id`: 60 events/second sustained, burst capacity of 600. Rejected requests return `429 Too Many Requests` with `Retry-After: 1`.
- The bucket is in-memory per Worker isolate, so the *effective* global rate per project is higher than 60/sec under heavy load spread across PoPs. We accept this fuzziness because the goal is "stop a runaway loop", not "enforce an exact contract".
- A **daily circuit breaker** checks D1's projected write budget at the start of every minute. If the day's writes are on pace to exhaust 80 % of the 100 K free-tier cap, ingest sheds incoming events with `503 Service Unavailable` until 00:00 UTC. This protects the read side (dashboard queries against D1) from compounding the outage.
- Deploy events (from GitHub Actions) are exempt from per-project rate limiting — they're low volume and high-signal. They still count against the daily circuit breaker.
- Drops are counted and exposed on a `GET /api/health` endpoint (planned) so we can see them; they are not silently swallowed.

## Consequences

### Positive
- **One badly behaved client cannot blow the day's write budget for everyone.**
- **Implementation is small** — a `Map<project_id, { tokens, lastRefill }>` and a deterministic refill rule.
- **No new storage primitive** — no KV, no DO, no extra D1 table to maintain.
- **`Retry-After` is honored by the SDK's `sendBeacon`/`fetch` retry path** (ADR-0014), so well-behaved clients back off automatically.
- **The circuit breaker protects the dashboard.** If ingest is misbehaving, we'd rather the dashboard stay fast than have both sides degrade.

### Negative
- **Per-PoP fuzziness.** The 60-events-per-second per project is enforced *per Worker isolate*. Real-world effective ceilings will be higher and depend on the traffic pattern.
- **Worker isolates are short-lived**, so the in-memory bucket can be reset by Cloudflare's lifecycle decisions and reset more aggressively than the user expects. For our goal (catch obviously broken clients) this is fine.
- **The daily circuit breaker is coarse.** It protects "everyone" by failing "everyone" once the budget is at risk. A per-project cap would be fairer but needs persistent counters.
- **`429`/`503` responses count as ingest losses.** The SDK retries `sendBeacon` once and then drops, so beyond that window the event is gone. ADR-0002 already accepts this trade.
- **No admin UI for adjusting limits.** Changing the per-project cap is a code change + deploy.

### Out of Scope
- Per-customer/per-plan rate-limit tiers (free vs. paid).
- A Durable Object-backed sliding-window limiter. Upgrade path if v1 proves too leaky.
- IP-based abuse protection. Cloudflare's edge already shoulders the obvious DDoS load; we don't need a second layer.
- Cloudflare Queues to spillover-buffer rejected events. ADR-0002 explicitly chose no queue; this ADR reaffirms.

## More Information

- Related: ADR-0002 (which deferred this), ADR-0014 (SDK retry/backoff lines up with `Retry-After`), ADR-0020 (retention bounds the long-term row count, this ADR bounds the short-term row rate).
- Cloudflare Workers Rate Limiting docs: <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>
