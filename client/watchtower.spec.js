import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { Watchtower, getRating } from "./watchtower.js"

/**
 * Shared setup: mock browser globals
 */
beforeEach(() => {
  const sessionStore = {}
  vi.stubGlobal("sessionStorage", {
    getItem: (k) => sessionStore[k] ?? null,
    setItem: (k, v) => { sessionStore[k] = v },
    clear: () => { for (const key in sessionStore) delete sessionStore[key] },
  })

  vi.stubGlobal("crypto", {
    randomUUID: () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
  })

  vi.stubGlobal("document", {
    currentScript: null,
    referrer: "",
    addEventListener: vi.fn(),
    visibilityState: "visible",
  })

  vi.stubGlobal("window", {
    location: { href: "http://localhost/" },
    addEventListener: vi.fn(),
  })

  vi.stubGlobal("navigator", {
    sendBeacon: vi.fn(() => true),
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("Watchtower SDK — Test 1: getRating() metric classification", () => {
  it("classifies LCP values at and around each threshold boundary", () => {
    expect(getRating("LCP", 1000)).toBe("good")
    expect(getRating("LCP", 2500)).toBe("good")
    expect(getRating("LCP", 2501)).toBe("needs-improvement")
    expect(getRating("LCP", 4000)).toBe("needs-improvement")
    expect(getRating("LCP", 4001)).toBe("poor")
    expect(getRating("LCP", 8000)).toBe("poor")
  })

  it("classifies INP values correctly", () => {
    expect(getRating("INP", 100)).toBe("good")
    expect(getRating("INP", 200)).toBe("good")
    expect(getRating("INP", 201)).toBe("needs-improvement")
    expect(getRating("INP", 500)).toBe("needs-improvement")
    expect(getRating("INP", 501)).toBe("poor")
  })

  it("classifies CLS (unitless) values correctly", () => {
    expect(getRating("CLS", 0.05)).toBe("good")
    expect(getRating("CLS", 0.1)).toBe("good")
    expect(getRating("CLS", 0.20)).toBe("needs-improvement")
    expect(getRating("CLS", 0.25)).toBe("needs-improvement")
    expect(getRating("CLS", 0.30)).toBe("poor")
  })

  it("classifies FCP values correctly", () => {
    expect(getRating("FCP", 1000)).toBe("good")
    expect(getRating("FCP", 1800)).toBe("good")
    expect(getRating("FCP", 2000)).toBe("needs-improvement")
    expect(getRating("FCP", 3000)).toBe("needs-improvement")
    expect(getRating("FCP", 3001)).toBe("poor")
  })

  it("classifies TTFB values correctly", () => {
    expect(getRating("TTFB", 400)).toBe("good")
    expect(getRating("TTFB", 800)).toBe("good")
    expect(getRating("TTFB", 1000)).toBe("needs-improvement")
    expect(getRating("TTFB", 1800)).toBe("needs-improvement")
    expect(getRating("TTFB", 1801)).toBe("poor")
  })

  it("returns 'good' for unknown metric names", () => {
    expect(getRating("UNKNOWN_METRIC", 99999)).toBe("good")
    expect(getRating("", 100)).toBe("good")
    expect(getRating(undefined, 500)).toBe("good")
  })
})

describe("Watchtower SDK — Test 2: track() no-op without projectId", () => {
  it("keeps queue empty when no projectId is configured", () => {
    const wt = new Watchtower({})
    wt.track("pageview", {})
    expect(wt.queue).toHaveLength(0)
  })

  it("keeps queue empty after captureError when no projectId is configured", () => {
    const wt = new Watchtower({})
    wt.captureError(new Error("boom"))
    expect(wt.queue).toHaveLength(0)
  })

  it("keeps queue empty after feedback() when no projectId is configured", () => {
    const wt = new Watchtower({})
    wt.feedback(5, "great app")
    expect(wt.queue).toHaveLength(0)
  })

  it("does not call sendBeacon when projectId is missing", () => {
    const wt = new Watchtower({})
    wt.track("pageview", {})
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it("enqueues events when projectId is provided (control case)", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})
    wt.track("pageview", {})
    expect(wt.queue).toHaveLength(1)
  })
})

describe("Watchtower SDK — Test 3: track() event common fields", () => {
  it("builds a well-formed event with all common fields", () => {
    const wt = new Watchtower({
      projectId: "wt_test",
      deployId: "abc123",
    })

    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("error", { message: "oops" })

    expect(wt.queue).toHaveLength(1)
    const event = wt.queue[0]

    expect(event.event_type).toBe("error")
    expect(event.message).toBe("oops")
    expect(event.event_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(() => new Date(event.timestamp)).not.toThrow()
    expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0)
    expect(event.environment).toBe("prod")
    expect(event.deploy_id).toBe("abc123")
    expect(event.url).toBe("http://localhost/")
  })

  it("merges caller-supplied data into the event", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("error", {
      message: "custom message",
      filename: "app.js",
      lineno: 42,
      custom_field: "custom_value",
    })

    const event = wt.queue[0]
    expect(event.message).toBe("custom message")
    expect(event.filename).toBe("app.js")
    expect(event.lineno).toBe(42)
    expect(event.custom_field).toBe("custom_value")
  })

  it("includes environment from config when specified", () => {
    const wt = new Watchtower({ projectId: "wt_test", environment: "staging" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("pageview", {})
    const event = wt.queue[0]

    expect(event.environment).toBe("staging")
  })

  it("handles null deployId gracefully", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("error", { message: "test" })
    const event = wt.queue[0]

    expect(event.deploy_id).toBeNull()
  })

  it("generates unique event_id for each tracked event", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("error", { message: "error 1" })
    wt.track("error", { message: "error 2" })

    const eventId1 = wt.queue[0].event_id
    const eventId2 = wt.queue[1].event_id

    expect(eventId1).not.toBe(eventId2)
    expect(eventId1).toMatch(/^[0-9a-f-]{36}$/)
    expect(eventId2).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("respects custom deployId across multiple events", () => {
    const wt = new Watchtower({ projectId: "wt_test", deployId: "deploy-v1.2.3" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("error", { message: "error 1" })
    wt.track("pageview", {})

    expect(wt.queue[0].deploy_id).toBe("deploy-v1.2.3")
    expect(wt.queue[1].deploy_id).toBe("deploy-v1.2.3")
  })
})

describe("Watchtower SDK — Test 4: captureError() handled errors", () => {
  it("captures a handled error with correct fields", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

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

  it("preserves custom error names", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err = new TypeError("type mismatch")
    wt.captureError(err)

    const event = wt.queue[0]
    expect(event.name).toBe("TypeError")
    expect(event.message).toBe("type mismatch")
  })

  it("includes stack trace from the Error object", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err = new RangeError("value out of range")
    wt.captureError(err)

    const event = wt.queue[0]
    expect(event.stack).toBeDefined()
    expect(event.stack).toContain("RangeError")
    expect(event.stack).toContain("value out of range")
  })

  it("sets handled flag to true for captureError (vs false for unhandled)", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err = new Error("captured")
    wt.captureError(err)

    const event = wt.queue[0]
    expect(event.handled).toBe(true)
  })

  it("includes all common fields in captureError events", () => {
    const wt = new Watchtower({
      projectId: "wt_test",
      deployId: "deploy-123",
      environment: "staging",
    })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err = new Error("test error")
    wt.captureError(err)

    const event = wt.queue[0]

    expect(event.event_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(event.timestamp).toBeDefined()
    expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0)
    expect(event.environment).toBe("staging")
    expect(event.deploy_id).toBe("deploy-123")
    expect(event.url).toBe("http://localhost/")
  })

  it("handles Error with empty message", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err = new Error("")
    wt.captureError(err)

    const event = wt.queue[0]
    expect(event.message).toBe("")
    expect(event.handled).toBe(true)
  })

  it("captures multiple errors independently", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err1 = new Error("first error")
    const err2 = new TypeError("second error")

    wt.captureError(err1)
    wt.captureError(err2)

    expect(wt.queue).toHaveLength(2)

    const event1 = wt.queue[0]
    const event2 = wt.queue[1]

    expect(event1.message).toBe("first error")
    expect(event1.name).toBe("Error")

    expect(event2.message).toBe("second error")
    expect(event2.name).toBe("TypeError")

    expect(event1.event_id).not.toBe(event2.event_id)
  })

  it("differentiates handled errors from unhandled by handled flag", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    const err = new Error("comparison error")

    wt.track("error", {
      message: "unhandled error",
      name: "Error",
      stack: "stack trace",
      handled: false,
    })

    wt.captureError(err)

    expect(wt.queue).toHaveLength(2)

    const unhandled = wt.queue[0]
    const handled = wt.queue[1]

    expect(unhandled.handled).toBe(false)
    expect(handled.handled).toBe(true)
  })
})
