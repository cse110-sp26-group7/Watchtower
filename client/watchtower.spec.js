import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { Watchtower } from "./watchtower.js"

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
    expect(event.session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
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

  it("generates unique session_id that persists across multiple track calls", () => {
    const wt = new Watchtower({ projectId: "wt_test" })
    vi.spyOn(wt, "_flush").mockImplementation(() => {})

    wt.track("error", { message: "error 1" })
    wt.track("pageview", {})

    const sessionId1 = wt.queue[0].session_id
    const sessionId2 = wt.queue[1].session_id

    expect(sessionId1).toBe(sessionId2)
    expect(sessionId1).toMatch(/^[0-9a-f-]{36}$/)
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
    expect(event.session_id).toMatch(/^[0-9a-f-]{36}$/)
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
