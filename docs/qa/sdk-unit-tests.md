# SDK Unit Test Plan — `client/watchtower.js`

- **Author:** QA Team (Benny Signer)
- **Sprint:** 3
- **Tool:** Vitest (Node environment with browser globals stubbed via `vi.stubGlobal`)
- **Test file:** `client/watchtower.spec.js`

---

## Context

`watchtower.js` exports two testable units:
- `getRating(metricName, value)` — pure function, no browser dependencies
- `Watchtower` — class with browser globals (`sessionStorage`, `crypto`, `window`, `navigator`, `document`)

Because the SDK is a browser script (not a Cloudflare Worker), tests run in plain Vitest with a node environment and manual global mocks rather than `@cloudflare/vitest-pool-workers`.

### Shared setup

All tests use a global `beforeEach` that stubs the minimum browser surface the SDK touches:

```js
beforeEach(() => {
  const sessionStore = {}
  vi.stubGlobal("sessionStorage", {
    getItem: (k) => sessionStore[k] ?? null,
    setItem: (k, v) => { sessionStore[k] = v },
    clear: () => { for (const key in sessionStore) delete sessionStore[key] },
  })
  vi.stubGlobal("crypto", {
    randomUUID: () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
    }),
  })
  vi.stubGlobal("document", { currentScript: null, referrer: "", addEventListener: vi.fn(), visibilityState: "visible" })
  vi.stubGlobal("window", { location: { href: "http://localhost/" }, addEventListener: vi.fn() })
  vi.stubGlobal("navigator", { sendBeacon: vi.fn(() => true) })
})

afterEach(() => { vi.clearAllMocks() })
```

Tests that assert on queue contents spy on `_flush` to prevent it from draining the queue synchronously:
```js
vi.spyOn(wt, "_flush").mockImplementation(() => {})
```

---

## Test 1 — `getRating`: metric threshold classification ✅ Implemented

**What it tests:** `getRating` correctly maps a raw metric value to "good", "needs-improvement", or "poor" for all five Web Vitals metrics, and returns "good" for unrecognised metric names.

**Why it matters:** Every performance event carries a `metric_rating` computed by this function. A wrong bucketing would silently misclassify data in the dashboard.

**Coverage:**

| Metric | Values tested |
|---|---|
| LCP | 1000, 2500 (good boundary), 2501, 4000 (poor boundary), 4001, 8000 |
| INP | 100, 200 (good boundary), 201, 500 (poor boundary), 501 |
| CLS | 0.05, 0.1 (good boundary), 0.20, 0.25 (poor boundary), 0.30 |
| FCP | 1000, 1800 (good boundary), 2000, 3000 (poor boundary), 3001 |
| TTFB | 400, 800 (good boundary), 1000, 1800 (poor boundary), 1801 |
| Unknown | `"UNKNOWN_METRIC"`, `""`, `undefined` → all return `"good"` |

**Note:** `getRating` is exported from `watchtower.js` as a named export alongside `Watchtower` for direct testing.

---

## Test 2 — `track()`: no-op when `projectId` is missing ✅ Implemented

**What it tests:** Calling any public API on a `Watchtower` instance with no `projectId` results in nothing being queued or sent.

**Why it matters:** The SDK must never block or error the host page when misconfigured. No events should reach the ingest worker without a valid project ID.

**Cases covered:**
- `track("pageview", {})` → queue stays empty
- `captureError(new Error(...))` → queue stays empty
- `feedback(5, "great app")` → queue stays empty
- `navigator.sendBeacon` is never called when projectId is missing
- Control case: with a valid `projectId`, `track()` does enqueue an event

---

## Test 3 — `track()`: event common fields ⚠️ Partially failing

**What it tests:** Events built by `track()` contain all required common fields (`event_id`, `event_type`, `timestamp`, `environment`, `url`, `deploy_id`) with correct values.

**Known failure:** Three assertions on `session_id` are failing because `session_id` is not currently generated in this version of `watchtower.js`. These tests are written ahead of the implementation and will go green once `_getSessionId()` and `session_id` are added to the SDK.

---

## Test 4 — `captureError()`: handled error payload ✅ Mostly passing

**What it tests:** `captureError(err)` produces an "error" event with correct `message`, `name`, `stack`, and `handled: true` fields.

**Known failure:** One assertion on `session_id` fails for the same reason as Test 3.

---

## Out of scope for these four tests

- `_flush` network transport (sendBeacon vs. fetch fallback) — requires a fetch mock
- `_setupPerformanceTracking` PerformanceObserver wiring — requires a browser environment; covered by E2E
- `_setupErrorTracking` window event listener registration — covered by E2E
- Session ID persistence — blocked until `_getSessionId()` is implemented in this branch
