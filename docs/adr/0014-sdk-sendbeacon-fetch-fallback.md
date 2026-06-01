# ADR-0014: SDK Transport — `sendBeacon` Preferred, `fetch keepalive` Fallback

## Status
Accepted

## Date
2026-05-26

## Context

The browser SDK has to ship analytics events from arbitrary customer pages to our ingest Worker. The transport must satisfy several constraints simultaneously:

1. **Survive page unload** — many events (errors thrown during navigation, final `pageview` heartbeats, Web Vitals captured at `visibilitychange`) happen *as* the page is leaving. A normal `fetch()` is killed when the document unloads.
2. **Never block the host page** — analytics that adds latency to a customer's UI is unacceptable. Fire-and-forget required.
3. **Never throw into the host app** — a network failure inside our SDK must not surface as an uncaught error in the customer's code.
4. **Respect browser limits** — `sendBeacon` has a ~64KB payload cap (browser-dependent) and returns `false` when overflowed.

Browser primitives that fit:

- **`navigator.sendBeacon(url, payload)`** — purpose-built for this. Returns `true` if the browser queued the request, `false` otherwise. Page-unload safe. Cannot read the response (fine for us).
- **`fetch(url, { keepalive: true })`** — modern alternative that also survives unload (subject to the same ~64KB cap). Lets you set headers and read responses, but we don't need either.
- **Plain `fetch()`** — unsafe on unload; only useful as a last resort.

## Decision

`Watchtower._flush()` in `client/watchtower.js` uses this transport strategy:

```js
const beaconQueued = navigator.sendBeacon
  ? navigator.sendBeacon(endpoint, new Blob([payload], { type: "text/plain;charset=UTF-8" }))
  : false
if (!beaconQueued) {
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(err => { if (this.debug) console.error("...") })
}
```

The entire block is wrapped in `try/catch` so the SDK can never throw into the host app. Errors are only surfaced when `debug: true` is set on construction.

The payload is wrapped in a `Blob` with `text/plain` MIME type — this avoids triggering a CORS preflight, which would defeat `sendBeacon`'s page-unload guarantee.

## Consequences

### Positive
- **Page-unload events arrive reliably** — `sendBeacon` is the only API the browser guarantees will be flushed after unload.
- **No CORS preflight** — `text/plain` is a CORS-safelisted content type. Ingest cold paths stay simple.
- **Graceful degradation** — if `sendBeacon` is missing (very old browsers) or returns `false` (payload too large), `fetch keepalive` takes over.
- **Never throws** — the outer `try/catch` and the `.catch()` on the fetch promise guarantee the host app sees nothing.
- **Fire-and-forget by design** — we deliberately cannot read the response. That's correct: analytics has no business retrying or surfacing server errors to the customer.

### Negative
- **Lost events are silent** — we have no client-side retry. An ingest 5xx during page unload is just gone. Acceptable for analytics; would not be for billing.
- **No client-side observability of dropped events** beyond the debug-mode console log. A future improvement could use `localStorage` to spool failed flushes.
- **`text/plain` MIME requires the ingest Worker to parse JSON from a `text/plain` body** — slightly non-idiomatic on the server side.

### Out of Scope
- Client-side retry/spooling.
- Compression (`CompressionStream`) — payloads are small enough that gzip would add complexity without measurable benefit.
