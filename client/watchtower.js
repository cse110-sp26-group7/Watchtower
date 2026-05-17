/**
 * Watchtower SDK
 *
 * Usage (ADR-0006):
 *   <script src="./watchtower.js"></script>
 *
 *   const wt = new Watchtower({
 *     projectId: "wt_a1b2c3d4",
 *     endpoint:  "https://your-worker.workers.dev/ingest"
 *   })
 *   wt.init()
 */

/* -------------------------
 * WEB VITALS THRESHOLDS
 * Each metric has independent units — never share thresholds.
 * Sources: https://web.dev/vitals/
 * LCP / FCP / INP / TTFB: milliseconds
 * CLS: unitless cumulative score
 * ------------------------- */
const THRESHOLDS = {
  LCP:  { good: 2500, poor: 4000  },
  INP:  { good: 200,  poor: 500   },
  CLS:  { good: 0.1,  poor: 0.25  },
  FCP:  { good: 1800, poor: 3000  },
  TTFB: { good: 800,  poor: 1800  },
}

/**
 * @param {string} metricName
 * @param {number} value
 * @returns {"good"|"needs-improvement"|"poor"}
 */
function getRating(metricName, value) {
  const t = THRESHOLDS[metricName]
  if (!t) return "good"
  if (value <= t.good) return "good"
  if (value <= t.poor) return "needs-improvement"
  return "poor"
}

class Watchtower {
  /**
   * @param {object}  config
   * @param {string}  config.projectId     - Required. Your Watchtower project ID.
   * @param {string}  [config.endpoint]    - Ingest URL. Defaults to "/ingest".
   * @param {string}  [config.environment] - "prod" | "staging" | "dev". Defaults to "prod".
   * @param {boolean} [config.debug]       - Log batches to console. Defaults to false.
   */
  constructor(config = {}) {
    this.projectId   = config.projectId || document.currentScript?.dataset?.project || null
    this.endpoint    = config.endpoint  || "/ingest"
    this.environment = config.environment || "prod"
    this.debug       = config.debug || false
    this.sessionId   = this._getSessionId()
    this.queue       = []
    this.isFlushing  = false
    // NOTE: init() is NOT called here — consumer calls it explicitly (ADR-0006).
  }

  /* -------------------------
   * PUBLIC INIT  (ADR-0006)
   * Must be called once by the consumer after construction.
   * ------------------------- */
  init() {
    this._trackPageView()
    this._setupErrorTracking()
    this._setupPerformanceTracking()
  }

  /* -------------------------
   * SESSION
   * ------------------------- */
  _getSessionId() {
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
    if (!this.projectId) {
      if (this.debug) console.warn("Watchtower: no projectId — event dropped.")
      return
    }
    const event = {
      event_id:    crypto.randomUUID(),
      event_type:  eventType,
      timestamp:   new Date().toISOString(),
      environment: this.environment,
      url:         window.location.href,
      session_id:  this.sessionId,
      deploy_id:   null,
      ...data,
    }
    this.queue.push(event)
    this._flush()
  }

  /* -------------------------
   * FLUSH (batch sender)
   * ------------------------- */
  _flush() {
    if (this.isFlushing || this.queue.length === 0) return
    this.isFlushing = true

    const batch = {
      project_id: this.projectId,
      events: this.queue.splice(0, 100),
    }

    if (this.debug) console.log("WATCHTOWER BATCH:", batch)

    const payload = JSON.stringify(batch)
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" })
        navigator.sendBeacon(this.endpoint, blob)
      } else {
        fetch(this.endpoint, {
          method:    "POST",
          headers:   { "Content-Type": "application/json" },
          body:      payload,
          keepalive: true,
        })
      }
    } catch (err) {
      // Analytics must never throw in the host app.
      if (this.debug) console.error("Watchtower send error:", err)
    }

    this.isFlushing = false
  }

  /* -------------------------
   * PAGE VIEW
   * Distinct event_type — not a Web Vital, not a performance event.
   * ------------------------- */
  _trackPageView() {
    this.track("page_view", {
      referrer: document.referrer || null,
    })
  }

  /* -------------------------
   * ERROR TRACKING
   * ------------------------- */
  _setupErrorTracking() {
    window.addEventListener("error", (e) => {
      this.track("error", {
        message:  e.message,
        name:     e.error?.name  || "Error",
        stack:    e.error?.stack || null,
        handled:  false,
        filename: e.filename     || null,
        lineno:   e.lineno       || null,
        colno:    e.colno        || null,  // e.colno is a real ErrorEvent property
      })
    })

    window.addEventListener("unhandledrejection", (e) => {
      this.track("error", {
        message: e.reason?.message || String(e.reason),
        name:    "UnhandledPromiseRejection",
        stack:   e.reason?.stack  || null,
        handled: false,
      })
    })
  }

  /* -------------------------
   * PERFORMANCE TRACKING  (Web Vitals)
   *
   * PerformanceObserver.observe() is called with ONE type per observer
   * to avoid cross-browser incompatibilities with multi-type calls.
   *
   * INP: uses the "event" entry type (Chrome 96+) which measures full
   *   interaction duration including presentation delay. "first-input"
   *   is NOT INP — it only measures the first interaction and is
   *   therefore not used here.
   *
   * CLS: accumulated across the entire session and flushed on page hide.
   *   Sending per-entry values is incorrect — CLS is a session aggregate.
   *
   * TTFB: responseStart − requestStart isolates true server latency,
   *   excluding DNS/TCP/TLS. Using responseStart alone includes redirect
   *   time and overstates TTFB.
   * ------------------------- */
  _setupPerformanceTracking() {
    if (!("PerformanceObserver" in window)) return

    // Registers a PerformanceObserver for exactly one entry type.
    // Each type gets its own observer — multi-type observe() calls
    // are not universally supported and may throw.
    const observe = (type, callback) => {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) callback(entry)
        })
        observer.observe({ type, buffered: true })
      } catch (_) {
        // Entry type unsupported in this browser — degrade silently.
      }
    }

    // --- LCP ---
    observe("largest-contentful-paint", (entry) => {
      const value = entry.startTime
      this.track("performance", {
        metric_name:   "LCP",
        metric_value:  value,
        metric_rating: getRating("LCP", value),
      })
    })

    // --- INP (true INP via "event" entry type, Chrome 96+) ---
    // INP is defined as the worst interaction latency observed in the session.
    // We update and re-report whenever a new worst-case interaction is found.
    let maxINP = 0
    observe("event", (entry) => {
      const value = entry.duration
      if (value <= maxINP) return
      maxINP = value
      this.track("performance", {
        metric_name:   "INP",
        metric_value:  value,
        metric_rating: getRating("INP", value),
      })
    })

    // --- CLS (cumulative session total, flushed on page hide) ---
    // Per-entry CLS values are meaningless in isolation; the metric is
    // the sum of all unexpected layout shifts across the session.
    let clsTotal = 0
    observe("layout-shift", (entry) => {
      // Exclude shifts triggered by recent user input (spec requirement).
      if (entry.hadRecentInput) return
      clsTotal += entry.value
    })
    const flushCLS = () => {
      if (clsTotal === 0) return
      this.track("performance", {
        metric_name:   "CLS",
        metric_value:  clsTotal,
        metric_rating: getRating("CLS", clsTotal),
      })
    }
    // visibilitychange covers tab switches, navigation, and app backgrounding.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushCLS()
    })
    // pagehide covers Safari and bfcache eviction scenarios.
    window.addEventListener("pagehide", flushCLS, { once: true })

    // --- FCP ---
    observe("paint", (entry) => {
      if (entry.name !== "first-contentful-paint") return
      const value = entry.startTime
      this.track("performance", {
        metric_name:   "FCP",
        metric_value:  value,
        metric_rating: getRating("FCP", value),
      })
    })

    // --- TTFB ---
    // responseStart − requestStart = server latency only.
    // responseStart alone would include redirect / service-worker time.
    observe("navigation", (entry) => {
      const value = entry.responseStart - entry.requestStart
      this.track("performance", {
        metric_name:   "TTFB",
        metric_value:  value,
        metric_rating: getRating("TTFB", value),
      })
    })
  }

  /* -------------------------
   * PUBLIC API
   * ------------------------- */

  /**
   * Manually capture a handled error.
   * @param {Error} err
   */
  captureError(err) {
    this.track("error", {
      message: err.message,
      name:    err.name,
      stack:   err.stack,
      handled: true,
    })
  }

  /**
   * Record user feedback.
   * @param {number|string} rating
   * @param {string|null}   comment
   */
  feedback(rating, comment = null) {
    this.track("feedback", {
      feedback_rating: rating,
      comment,
    })
  }
}

// Support both CommonJS/module environments and plain script-tag usage.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Watchtower }
} else {
  window.Watchtower = Watchtower
}