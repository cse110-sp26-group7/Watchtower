import { randomUUID } from "node:crypto"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Watchtower, getRating } from "./watchtower.js"

// Minimal browser-global stubs shared by all tests that instantiate Watchtower.
// Each beforeEach creates a fresh sessionStorage so sessions don't bleed between tests.
function stubBrowserGlobals() {
  const store = {}
  vi.stubGlobal("sessionStorage", {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
  })
  // Use Node's crypto.randomUUID directly to avoid a recursive stub loop.
  vi.stubGlobal("crypto", { randomUUID })
  vi.stubGlobal("document", { currentScript: null, referrer: "" })
  vi.stubGlobal("window", { location: { href: "http://localhost/" } })
  vi.stubGlobal("navigator", { sendBeacon: () => true })
}

// ---------------------------------------------------------------------------
// Test 1 — getRating: metric threshold classification
// ---------------------------------------------------------------------------
describe("getRating", () => {
  it("classifies LCP values at and around each threshold boundary", () => {
    // good: <= 2500 ms
    expect(getRating("LCP", 1000)).toBe("good")
    expect(getRating("LCP", 2500)).toBe("good")
    // needs-improvement: 2500 < value <= 4000
    expect(getRating("LCP", 2501)).toBe("needs-improvement")
    expect(getRating("LCP", 4000)).toBe("needs-improvement")
    // poor: > 4000
    expect(getRating("LCP", 4001)).toBe("poor")
    expect(getRating("LCP", 8000)).toBe("poor")
  })

  it("classifies CLS (unitless) values correctly", () => {
    expect(getRating("CLS", 0.05)).toBe("good")
    expect(getRating("CLS", 0.1)).toBe("good")
    expect(getRating("CLS", 0.20)).toBe("needs-improvement")
    expect(getRating("CLS", 0.25)).toBe("needs-improvement")
    expect(getRating("CLS", 0.30)).toBe("poor")
  })

  it("returns 'good' for unknown metric names", () => {
    expect(getRating("UNKNOWN_METRIC", 99999)).toBe("good")
    expect(getRating("", 100)).toBe("good")
    expect(getRating(undefined, 500)).toBe("good")
  })
})

// ---------------------------------------------------------------------------
// Test 2 — track(): event silently dropped when projectId is missing
// ---------------------------------------------------------------------------
describe("Watchtower track()", () => {
  beforeEach(stubBrowserGlobals)
  afterEach(() => vi.unstubAllGlobals())

  it("keeps queue empty when no projectId is configured", () => {
    const wt = new Watchtower({})  // no projectId, no data-project attribute
    wt.track("pageview", {})
    expect(wt.queue).toHaveLength(0)
  })

  it("keeps queue empty after captureError when no projectId is configured", () => {
    const wt = new Watchtower({})
    wt.captureError(new Error("boom"))
    expect(wt.queue).toHaveLength(0)
  })

  it("does send via sendBeacon when projectId is present (control case)", () => {
    // _flush() splices the queue synchronously, so we verify transport was called
    // rather than asserting queue length after the fact.
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal("navigator", { sendBeacon })

    const wt = new Watchtower({ projectId: "wt_test123" })
    wt.track("pageview", {})
    expect(sendBeacon).toHaveBeenCalledOnce()
  })
})
