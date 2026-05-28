/**
 * Per-metric thresholds used to classify a Web Vital value as
 * "good", "needs-improvement", or "poor".
 * 
 * Each metric uses independent units — thresholds must never be shared:
 *   - LCP, FCP, INP, TTFB: milliseconds
 *   - CLS: unitless cumulative score
 * @see https://web.dev/vitals/
 * @type {Object.<string, {good: number, poor: number}>}
 */
const THRESHOLDS = {
  LCP:  { good: 2500, poor: 4000  },
  INP:  { good: 200,  poor: 500   },
  CLS:  { good: 0.1,  poor: 0.25  },
  FCP:  { good: 1800, poor: 3000  },
  TTFB: { good: 800,  poor: 1800  },
};

/**
 * Returns a Web Vitals rating for a given metric value by comparing it
 * against the per-metric thresholds defined in {@link THRESHOLDS}.
 *
 * Returns "good" for unknown metric names so unrecognised metrics never
 * produce false "poor" alerts.
 * @param {string} metricName - One of "LCP" | "INP" | "CLS" | "FCP" | "TTFB".
 * @param {number} value      - The raw metric value in the metric's native unit.
 * @returns {"good"|"needs-improvement"|"poor"} The Web Vitals rating bucket.
 */
function getRating(metricName, value) {
  const t = THRESHOLDS[metricName];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

/**
 * Watchtower analytics client.
 *
 * Collects page views, unhandled errors, and Web Vitals (LCP, INP, CLS,
 * FCP, TTFB) and sends them in batches to the configured ingest endpoint.
 *
 * @example
 * const wt = new Watchtower({
 *   projectId: "wt_a1b2c3d4",
 *   endpoint:  "https://your-worker.workers.dev/ingest",
 *   debug:     true,
 * })
 * wt.init()
 */
class Watchtower {
  /**
   * Creates a Watchtower instance. Does NOT start tracking — call
   * {@link Watchtower#init} explicitly after construction (ADR-0006).
   *
   * @param {object}  [config={}]
   * @param {string}  config.projectId       - Your Watchtower project ID. Falls back to
   *                                           the loading script's `data-project` attribute.
   * @param {string}  [config.endpoint]      - Ingest URL events are POSTed to.
   *                                           Defaults to "/ingest".
   * @param {string}  [config.environment]   - Deployment environment label
   *                                           ("prod" | "staging" | "dev"). Defaults to "prod".
   * @param {string}  [config.deployId]      - Identifier for the active deployment (e.g. a git
   *                                           SHA or release tag). Attached to every event so
   *                                           regressions can be correlated with specific deploys.
   * @param {boolean} [config.debug=false]   - When true, logs every outbound batch to the console.
   */
  constructor(config = {}) {
    this.projectId   = config.projectId || document.currentScript?.dataset?.project || null;
    this.endpoint    = config.endpoint  || "/ingest";
    this.environment = config.environment || "prod";
    this.deployId    = config.deployId  || null;
    this.debug       = config.debug || false;
    this.queue       = [];
    this.isFlushing  = false;
  }

  /**
   * Starts all automatic tracking: page view, uncaught errors, and Web Vitals.
   * Calling it more than once will register duplicate event listeners.
   * @returns {void}
   */
  init() {
    console.log("Watchtower Initialized");
    console.log("Debug Mode", this.debug);
    this._trackPageView();
    this._setupErrorTracking();
    this._setupPerformanceTracking();
  }

  /**
   * Enqueues a single analytics event and triggers a flush.
   * The event is silently dropped if no `projectId` is configured.
   * Common fields (event_id, timestamp, url, session_id, etc.) are
   * added automatically; fields in `data` are merged in and can
   * override defaults.
   * @param {string} eventType          - The event category, e.g. "error", "performance",
   *                                      "pageview", or "feedback".
   * @param {object} [data={}]          - Additional fields to merge into the event payload.
   * @returns {void}
   */
  track(eventType, data = {}) {
    if (!this.projectId) {
      if (this.debug) console.warn("Watchtower: no projectId — event dropped.")
      return
    }
    const event = {
      event_type:  eventType,
      event_id:    crypto.randomUUID(),
      timestamp:   new Date().toISOString(),
      environment: this.environment,
      url:         window.location.href,
      deploy_id:   this.deployId,
      ...data,
    }
    this.queue.push(event)
    this._flush()
  }

  /**
   * Drains up to 100 events from the queue and sends them as a single
   * JSON batch to {@link Watchtower#endpoint}.
   *
   * Prefers `navigator.sendBeacon` (fire-and-forget, page-unload safe) but
   * falls back to `fetch` with `keepalive: true` when sendBeacon is unavailable
   * or returns false (e.g. the payload exceeds the browser's size limit).
   * Errors are caught and logged in debug mode so analytics never interrupts
   * the host app.
   *
   * Re-entrant calls while a flush is in progress are no-ops.
   *
   * @private
   * @returns {void}
   */
  _flush() {
    if (this.isFlushing || this.queue.length === 0) return
    this.isFlushing = true

    const batch = {
      project_id: this.projectId,
      events: this.queue.splice(0, 100),
    }

    if (this.debug) console.log(`WATCHTOWER: flushing ${batch.events.length} event(s) to ${this.endpoint}:`, batch)
    const payload = JSON.stringify(batch)
    
    try {
      const beaconQueued = navigator.sendBeacon
        ? navigator.sendBeacon(this.endpoint, new Blob([payload], { type: "text/plain;charset=UTF-8" }))
        : false
      if (!beaconQueued) {
        fetch(this.endpoint, {
          method:    "POST",
          headers:   { "Content-Type": "application/json" },
          body:      payload,
          keepalive: true,
        }).catch(err => {
          if (this.debug) console.error("Watchtower fetch failed:", err.message)
        })
      }
    } catch (err) {
      // Analytics must never throw in the host app.
      if (this.debug) console.error("Watchtower send error:", err.message)
    }

    this.isFlushing = false
  }

  /**
   * Emits a "pageview" event for the current page load.
   *
   * @private
   * @returns {void}
   */
  _trackPageView() {
    this.track("pageview", {
      referrer: document.referrer || null,
    })
  }

  /**
   * Registers global listeners to automatically capture unhandled errors.
   *
   * Listens for:
   *   - `window.onerror` (synchronous runtime exceptions) via the "error" event.
   *   - `window.onunhandledrejection` (unhandled Promise rejections).
   *
   * Both produce an "error" event with `handled: false`. Use
   * {@link Watchtower#captureError} to report errors your code catches explicitly.
   *
   * @private
   * @returns {void}
   */
  _setupErrorTracking() {
    window.addEventListener("error", (e) => {
      this.track("error", {
        message:  e.message,
        name:     e.error?.name  || "Error",
        stack:    e.error?.stack || null,
        handled:  false,
        filename: e.filename     || null,
        lineno:   e.lineno       || null,
        colno:    e.colno        || null,
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

  /**
   * Registers {@link PerformanceObserver} instances to collect Core Web Vitals
   * and navigation timing metrics, then emits them as "performance" events.
   *
   * Collected metrics:
   *   - **LCP** (Largest Contentful Paint) — load responsiveness, ms.
   *   - **INP** (Interaction to Next Paint) — runtime responsiveness, ms.
   *     Uses the `"event"` entry type (Chrome 96+) which captures full
   *     interaction duration. `"first-input"` is NOT used — it only covers
   *     the first interaction and is not a valid INP proxy.
   *   - **CLS** (Cumulative Layout Shift) — visual stability, unitless.
   *     Accumulated across the entire session and flushed once on page hide
   *     via `visibilitychange` and `pagehide`. Per-entry values are not reported.
   *   - **FCP** (First Contentful Paint) — perceived load speed, ms.
   *   - **TTFB** (Time to First Byte) — server response latency, ms.
   *     Calculated as `responseStart − requestStart` to exclude redirect time.
   *
   * Each metric uses a dedicated observer (one type per observer) to avoid
   * cross-browser issues with multi-type `observe()` calls. Unsupported entry
   * types are silently ignored so the SDK degrades gracefully.
   *
   * @private
   * @returns {void}
   */
  _setupPerformanceTracking() {
    if (!("PerformanceObserver" in window)) return

    /**
     * Creates a {@link PerformanceObserver} for a single entry type and
     * invokes `callback` for each entry. Silently ignores entry types that
     * are unsupported in the current browser.
     *
     * @param {string}   type     - PerformanceEntry type, e.g. "largest-contentful-paint".
     * @param {function(PerformanceEntry): void} callback - Handler for each observed entry.
     * @returns {void}
     */
    const observe = (type, callback) => {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) callback(entry)
        })
        observer.observe({ type, buffered: true })
      } catch {
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

    // --- CLS (cumulative session total, flushed once on page hide) ---
    // Per-entry CLS values are meaningless in isolation; the metric is
    // the sum of all unexpected layout shifts across the session.
    let clsTotal    = 0
    let clsFlushed  = false

    observe("layout-shift", (entry) => {
      // Exclude shifts triggered by recent user input (spec requirement).
      if (entry.hadRecentInput) return
      clsTotal += entry.value
    })

    const flushCLS = () => {
      if (clsTotal === 0 || clsFlushed) return
      clsFlushed = true
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
