/* global getEvents */

/**
 * Thresholds from Google Web Vitals standards
 * good = fast/stable, warn = needs improvement, poor = slow/unstable based on web
 */
const THRESHOLDS = {
  lcp: { warn: 2500, poor: 4000 },
  fcp: { warn: 1800, poor: 3000 },
  cls: { warn: 0.1, poor: 0.25 },
};

/**
 * Loads real error data and updates the dashboard
 */
window.loadDashboard = async function loadDashboard() {
  try {
    //fetch errors
    const { events } = await getEvents("wt_demo", {
      type: "error",
      since: "30d",
    });

    // fetch performance
    const { events: perfEvents } = await getEvents("wt_demo", {
      type: "performance",
      since: "30d",
    });

    // find latest LCP, FCP, CLS values
    const lcp = perfEvents.find((e) => e.metric_name === "LCP");
    const fcp = perfEvents.find((e) => e.metric_name === "FCP");
    const cls = perfEvents.find((e) => e.metric_name === "CLS");

    // update cards
    document.getElementById("lcp-value").textContent = lcp
      ? `${lcp.metric_value}ms`
      : "N/A";
    document.getElementById("fcp-value").textContent = fcp
      ? `${fcp.metric_value}ms`
      : "N/A";
    document.getElementById("cls-value").textContent = cls
      ? parseFloat(cls.metric_value ?? "N/A").toFixed(2)
      : "N/A";

    // apply threshold colors to performance metrics
    if (lcp)
      applyMetricColor(
        "lcp-value",
        lcp.metric_value,
        THRESHOLDS.lcp.warn,
        THRESHOLDS.lcp.poor,
      );
    if (fcp)
      applyMetricColor(
        "fcp-value",
        fcp.metric_value,
        THRESHOLDS.fcp.warn,
        THRESHOLDS.fcp.poor,
      );
    if (cls)
      applyMetricColor(
        "cls-value",
        cls.metric_value,
        THRESHOLDS.cls.warn,
        THRESHOLDS.cls.poor,
      );

    // update total errors card
    document.getElementById("total-errors").textContent = events.length;
    document.getElementById("error-change").textContent =
      events.length === 0 ? "No errors in last 30 days" : "Last 30 days";

    // update bar chart
    updateErrorChart(events);

    // update recent errors table (show 5 most recent)
    updateRecentErrors(events.slice(0, 5));
  } catch (err) {
    console.error("Dashboard failed to load:", err);
  }
};

/**
 * Updates error rate bar chart grouped by day
 * @param {Array} events
 */
function updateErrorChart(events) {
  const counts = {};
  events.forEach((e) => {
    // group by hour instead of day
    const hour = e.timestamp.split(":")[0]; // "2026-05-30T12"
    counts[hour] = (counts[hour] || 0) + 1;
  });

  const values = Object.values(counts);
  const max = Math.max(...values);
  const chartHeight = 180;

  const chart = document.getElementById("error-rate-chart");
  chart.innerHTML = "";

  values.forEach((value) => {
    const bar = document.createElement("div");
    bar.classList.add("bar");
    bar.style.height = `${(value / max) * chartHeight}px`;
    chart.appendChild(bar);
  });
}

/**
 * Updates recent errors table
 * @param {Array} events
 */
function updateRecentErrors(events) {
  const tbody = document.getElementById("recent-errors-body");
  tbody.innerHTML = "";

  events.forEach((event) => {
    const row = document.createElement("tr");
    row.classList.add("errors-table-row");
    row.innerHTML = `
      <td>
          ${new Date(event.timestamp).toLocaleDateString()} 
          <br>
          ${new Date(event.timestamp).toLocaleTimeString()}
      </td>
      <td><span class="recent-error-level-dot error"></span></td>
      <td>${event.message ?? "No message"}</td>
      <td>${event.url ?? "Unknown"}</td>
      <td>1</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Changes color to the performance metric card text based on its value and
 * thresholds
 * @param {string} elementId
 * @param {number} value
 * @param {number} warnThreshold
 * @param {number} badThreshold
 */
function applyMetricColor(elementId, value, warnThreshold, poorThreshold) {
  const el = document.getElementById(elementId);
  el.classList.remove("metric-good", "metric-warn", "metric-poor");

  if (value >= poorThreshold) {
    el.classList.add("metric-poor");
  } else if (value >= warnThreshold) {
    el.classList.add("metric-warn");
  } else {
    el.classList.add("metric-good");
  }
}
