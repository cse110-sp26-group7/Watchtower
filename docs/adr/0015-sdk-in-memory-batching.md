# ADR-0015: In-Memory Event Batching in the SDK

## Status
Accepted

## Date
2026-05-26

## Context

A busy page can produce a burst of events in quick succession — an error storm, multiple Web Vitals landing within the same paint frame, or a sequence of feedback submissions. Sending one HTTP request per event has obvious downsides:

- Wastes the customer's connection (more handshakes, more headers).
- Wastes our Worker invocations (each one is billable and counted against rate limits).
- Increases the chance that a page-unload event misses its flush window.

The alternative is to **batch**: queue events in memory and ship them as a single request.

Sizing the batch:

- **Too small (e.g. 10)** — defeats the purpose.
- **Too large** — risks exceeding `sendBeacon`'s ~64KB cap, which forces a fallback to `fetch keepalive` (ADR-0014) and loses the page-unload guarantee.
- **100 events** — empirically fits well under 64KB for our event envelope shape, and is well above typical burst sizes.

## Decision

`Watchtower` maintains `this.queue` as an in-memory array. `track()` appends and immediately calls `_flush()`. `_flush()`:

1. Returns early if already flushing or if the queue is empty (re-entrancy guard via `this.isFlushing`).
2. Splices up to **100 events** off the front of the queue into one batch.
3. Wraps them in `{ project_id, events: [...] }` and ships as a single payload via the transport in ADR-0014.

```js
const batch = {
  project_id: this.projectId,
  events: this.queue.splice(0, 100),
}
```

Notably, we do **not** debounce or use timers. Every `track()` call triggers an immediate flush. The re-entrancy guard (`isFlushing`) means concurrent `track()` calls don't fire overlapping requests — the second one is a no-op while the first is in flight. Batching emerges naturally when multiple events land within the same JS turn, because all of them are pushed to the queue before the first `_flush()` call can complete.

## Consequences

### Positive
- **Bursts coalesce automatically** — N events fired synchronously in one tick result in one HTTP request, not N.
- **No timers means no leaks** — nothing to clean up on page unload or SDK teardown.
- **The 100-event cap keeps payloads under `sendBeacon`'s limit** — preserves page-unload reliability.
- **Re-entrancy guard prevents request stampedes** — `_flush()` calling `_flush()` indirectly (via an event listener) can't fork.

### Negative
- **Events fired across separate JS turns each trigger their own request** — we miss batching opportunities that a timer-based approach would catch. A future debounce (e.g. 50ms) could improve this but adds teardown complexity.
- **The queue is unbounded above 100 per flush** — events 101+ wait for the next `track()` call. A pathological burst of 10,000 events would take 100 calls to drain. In practice, errors and vitals don't fire at that rate.
- **No persistence** — if the page crashes mid-flush, anything in the queue (but not yet handed to `sendBeacon`) is lost. Tradeoff accepted for SDK simplicity.

### Out of Scope
- Time-based flush triggers / debouncing.
- `localStorage`-backed queue persistence across page loads.
- Explicit `flush()` API for customers to call before `window.close()`.
