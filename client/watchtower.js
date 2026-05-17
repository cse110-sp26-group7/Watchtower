class Watchtower {
  constructor(config = {}) {
    this.projectId =
      config.projectId ||
      document.currentScript?.dataset?.project

    // IMPORTANT: backend-agnostic (no localhost hardcoding)
    this.endpoint = config.endpoint || "/ingest"

    this.environment = config.environment || "prod"
    this.debug = config.debug || false

    this.sessionId = this.getSessionId()
    this.queue = []
    this.isFlushing = false

    this.init()
  }

  /* -------------------------
   * INIT
   * ------------------------- */
  init() {
    this.trackPageView()
    this.setupErrorTracking()
    this.setupPerformanceTracking()
  }

  /* -------------------------
   * SESSION
   * ------------------------- */
  getSessionId() {
    let id = sessionStorage.getItem("wt_session_id")

    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem("wt_session_id", id)
    }

    return id
  }

  /* -------------------------
   * CORE TRACK API
   * ------------------------- */
  track(eventType, data = {}) {
    if (!this.projectId) return

    const event = {
      event_id: crypto.randomUUID(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      environment: this.environment,

      url: window.location.href,
      session_id: this.sessionId,

      deploy_id: null,

      ...data
    }

    this.queue.push(event)
    this.flush()
  }

  /* -------------------------
   * FLUSH (batch sender)
   * ------------------------- */
  flush() {
    if (this.isFlushing || this.queue.length === 0) return

    this.isFlushing = true

    const batch = {
      project_id: this.projectId,
      events: this.queue.splice(0, 100)
    }

    // DEBUG MODE (THIS IS WHAT YOUR TASK NEEDS)
    if (this.debug) {
      console.log("WATCHTOWER BATCH:", batch)
    }

    const payload = JSON.stringify(batch)

    try {
      // sendBeacon first (analytics-safe)
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], {
          type: "application/json"
        })
        navigator.sendBeacon(this.endpoint, blob)
      } else {
        fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: payload,
          keepalive: true
        })
      }
    } catch (err) {
      // analytics must never break host app
      if (this.debug) {
        console.error("Watchtower send error:", err)
      }
    }

    this.isFlushing = false
  }

  /* -------------------------
   * PAGE VIEW
   * ------------------------- */
  trackPageView() {
    this.track("performance", {
      metric_name: "page_view",
      metric_value: 1,
      metric_rating: "good"
    })
  }

  /* -------------------------
   * ERROR TRACKING
   * ------------------------- */
  setupErrorTracking() {
    window.addEventListener("error", (e) => {
      this.track("error", {
        message: e.message,
        name: e.error?.name || "Error",
        stack: e.error?.stack || null,
        handled: false,
        filename: e.filename || null,
        lineno: e.lineno || null,
        colno: null
      })
    })

    window.addEventListener("unhandledrejection", (e) => {
      this.track("error", {
        message: e.reason?.message || String(e.reason),
        name: "UnhandledPromiseRejection",
        stack: e.reason?.stack || null,
        handled: false
      })
    })
  }

  /* -------------------------
   * PERFORMANCE TRACKING
   * ------------------------- */
  setupPerformanceTracking() {
    if (!("PerformanceObserver" in window)) return

    const types = [
      "largest-contentful-paint",
      "first-input",
      "layout-shift"
    ]

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          let metricName = null
          let value = null

          if (entry.entryType === "largest-contentful-paint") {
            metricName = "LCP"
            value = entry.startTime
          }

          if (entry.entryType === "first-input") {
            metricName = "INP"
            value = entry.processingStart - entry.startTime
          }

          if (entry.entryType === "layout-shift") {
            metricName = "CLS"
            value = entry.value
          }

          if (!metricName) continue

          let rating = "good"
          if (value > 2500) rating = "poor"
          else if (value > 1000) rating = "needs-improvement"

          this.track("performance", {
            metric_name: metricName,
            metric_value: value,
            metric_rating: rating
          })
        }
      })

      types.forEach((t) =>
        observer.observe({ type: t, buffered: true })
      )
    } catch (e) {
      // ignore browser compatibility issues
    }
  }

  /* -------------------------
   * PUBLIC API
   * ------------------------- */
  captureError(err) {
    this.track("error", {
      message: err.message,
      name: err.name,
      stack: err.stack,
      handled: true
    })
  }

  feedback(rating, comment = null) {
    this.track("feedback", {
      feedback_rating: rating,
      comment
    })
  }
}

/* -------------------------
 * BOOTSTRAP (TASK 3A CLEAN)
 * ------------------------- */
function initWatchtower() {
  const script =
    document.currentScript ||
    document.querySelector("script[data-project]")

  window.watchtower = new Watchtower({
  projectId: "wt_test_123",
  endpoint: "http://localhost:8787/ingest",
  debug: true
})

  console.log("Watchtower initialized:", window.watchtower)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWatchtower)
} else {
  initWatchtower()
}