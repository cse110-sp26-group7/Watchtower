# SDK Unit Test Plan — `client/watchtower.js`

- **Author:** QA Team (Benny Signer)
- **Sprint:** 3
- **Tool:** Vitest (Node environment with JSDOM globals mocked manually)
- **Test file location (planned):** `client/watchtower.spec.js`

---

## Context

`watchtower.js` exports two testable units:
- `getRating(metricName, value)` — pure function, no browser dependencies
- `Watchtower` — class with browser globals (`sessionStorage`, `crypto`, `window`, `navigator`, `document`)

Because the SDK is a browser script (not a Cloudflare Worker), tests run in plain Vitest with `jsdom` or manual global mocks rather than `@cloudflare/vitest-pool-workers`. Browser globals that tests do not exercise (e.g. `PerformanceObserver`, `navigator.sendBeacon`) should be stubbed with `vi.stubGlobal` or minimal fakes in `beforeEach`.

---

## Test 1 — `getRating`: metric threshold classification

**What it tests:** `getRating` correctly maps a raw metric value to one of three buckets ("good", "needs-improvement", "poor") using the `THRESHOLDS` constants, and defaults to "good" for unrecognised metric names.

**Why it matters:** Every performance event emitted by the SDK carries a `metric_rating` computed by this function. A wrong bucketing would silently misclassify data in the dashboard without triggering any network error.

**Inputs and expected outputs:**

| `metricName` | `value`  | Expected result      | Reason |
|---|---|---|---|
| `"LCP"` | `1000`  | `"good"`             | ≤ 2500 ms threshold |
| `"LCP"` | `2500`  | `"good"`             | exactly at good boundary |
| `"LCP"` | `3000`  | `"needs-improvement"`| between 2500 and 4000 |
| `"LCP"` | `4000`  | `"needs-improvement"`| exactly at poor boundary |
| `"LCP"` | `5000`  | `"poor"`             | > 4000 ms |
| `"CLS"` | `0.05`  | `"good"`             | ≤ 0.1 |
| `"CLS"` | `0.20`  | `"needs-improvement"`| between 0.1 and 0.25 |
| `"CLS"` | `0.30`  | `"poor"`             | > 0.25 |
| `"UNKNOWN"` | `9999` | `"good"`          | unknown metric → safe default |

**Sketch:**
```js
import { getRating } from "../client/watchtower.js" // requires named export, or test via Watchtower internals

it("classifies LCP values into correct buckets", () => {
  expect(getRating("LCP", 1000)).toBe("good")
  expect(getRating("LCP", 3000)).toBe("needs-improvement")
  expect(getRating("LCP", 5000)).toBe("poor")
})

it("returns 'good' for unknown metric names", () => {
  expect(getRating("UNKNOWN_METRIC", 99999)).toBe("good")
})
```

> **Note:** `getRating` is not currently exported. Either add a named export for testing, or test it indirectly by asserting `metric_rating` on a flushed performance event.

---

## Test 2 — `track`: event silently dropped when `projectId` is missing

**What it tests:** Calling `track()` on a `Watchtower` instance that has no `projectId` (neither passed in config nor available on `document.currentScript`) results in zero events being added to the internal queue.

**Why it matters:** The SDK is designed to be a no-op when misconfigured so it never blocks the host page. If events were queued without a `projectId`, the ingest worker would respond 401 and the batch would be silently lost anyway — but the more important guarantee is that the internal `queue` stays empty, which means `_flush` is never invoked.

**Setup:** Stub `document.currentScript` to `null` (or omit `dataset.project`). Stub `sessionStorage` so the constructor does not throw.

**Assertions:**
- `wt.queue.length === 0` after calling `wt.track("pageview", {})`
- `wt.queue.length === 0` after calling `wt.captureError(new Error("boom"))`

**Sketch:**
```js
beforeEach(() => {
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {} })
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" })
  vi.stubGlobal("document", { currentScript: null, referrer: "" })
  vi.stubGlobal("window", { location: { href: "http://localhost/" } })
})

it("drops events when projectId is not configured", () => {
  const wt = new Watchtower({}) // no projectId
  wt.track("pageview", {})
  expect(wt.queue).toHaveLength(0)
})
```

---

## Test 3 — `track`: event object contains required common fields

**What it tests:** When `track("error", { message: "oops" })` is called on a correctly configured instance, the event pushed onto `queue` contains all expected common fields with valid values, and the caller-supplied `data` is merged in correctly.

**Why it matters:** The ingest worker's schema validation (see `event-schema-draft.md`) requires `event_id`, `event_type`, `timestamp`, `environment`, `url`, `session_id`, and `deploy_id` on every event. Missing or malformed fields would produce a 400 from the backend and silently lose the batch.

**Fields to assert:**

| Field | Expected value |
|---|---|
| `event_type` | `"error"` |
| `event_id` | matches UUID v4 regex |
| `timestamp` | valid ISO 8601 string (parseable by `new Date()`) |
| `environment` | `"prod"` (default) |
| `session_id` | matches UUID v4 regex |
| `deploy_id` | `"abc123"` (from config) |
| `url` | `"http://localhost/"` (from mocked `window.location.href`) |
| `message` | `"oops"` (from caller data) |

**Sketch:**
```js
it("builds a well-formed event with all common fields", () => {
  const wt = new Watchtower({ projectId: "wt_test", deployId: "abc123" })
  wt.track("error", { message: "oops" })

  expect(wt.queue).toHaveLength(1)
  const event = wt.queue[0]

  expect(event.event_type).toBe("error")
  expect(event.event_id).toMatch(/^[0-9a-f-]{36}$/)
  expect(() => new Date(event.timestamp)).not.toThrow()
  expect(event.environment).toBe("prod")
  expect(event.deploy_id).toBe("abc123")
  expect(event.session_id).toMatch(/^[0-9a-f-]{36}$/)
  expect(event.message).toBe("oops")
})
```

---

## Test 4 — `captureError`: maps a handled `Error` to the correct payload

**What it tests:** Calling the public `captureError(err)` API with a real `Error` object produces an "error" event on the queue with the correct `message`, `name`, `stack`, and `handled: true` fields.

**Why it matters:** `captureError` is the primary public API for reporting caught exceptions. `handled: true` is the field that distinguishes developer-caught errors from unhandled crashes in the dashboard UI — getting it wrong would misclassify errors. This test also exercises the `handled` flag difference from the `_setupErrorTracking` listener path, which emits `handled: false`.

**Sketch:**
```js
it("captures a handled error with correct fields", () => {
  const wt = new Watchtower({ projectId: "wt_test" })
  const err = new Error("something went wrong")

  wt.captureError(err)

  expect(wt.queue).toHaveLength(1)
  const event = wt.queue[0]

  expect(event.event_type).toBe("error")
  expect(event.message).toBe("something went wrong")
  expect(event.name).toBe("Error")
  expect(event.stack).toContain("Error: something went wrong")
  expect(event.handled).toBe(true)
})
```

---

## Shared test setup

All four tests share the same minimal browser-global stubs. Extract into a `beforeEach` block:

```js
import { beforeEach, vi } from "vitest"

beforeEach(() => {
  const sessionStore = {}
  vi.stubGlobal("sessionStorage", {
    getItem:  (k) => sessionStore[k] ?? null,
    setItem:  (k, v) => { sessionStore[k] = v },
  })
  vi.stubGlobal("crypto", {
    randomUUID: () => crypto.randomUUID(), // Node 18+ has this natively
  })
  vi.stubGlobal("document", {
    currentScript: null,
    referrer: "",
  })
  vi.stubGlobal("window", {
    location: { href: "http://localhost/" },
  })
  vi.stubGlobal("navigator", {
    sendBeacon: () => true,
  })
})
```

---

## Out of scope for these four tests

The following SDK behaviors are deferred to later test files or E2E:

- `_flush` network transport (sendBeacon vs. fetch fallback) — requires a fetch mock and is more of an integration concern
- `_setupPerformanceTracking` PerformanceObserver wiring — requires a browser environment; covered by E2E
- `_setupErrorTracking` window event listener registration — covered by E2E
- Session ID persistence across multiple `Watchtower` instances in the same tab
