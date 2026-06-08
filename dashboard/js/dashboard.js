/* global getEvents, getSummary, Chart */
// expose lastTimeseries for darkmode.js to use

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
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this on any untrusted data before injecting into innerHTML.
 * @param {string} str - raw string from untrusted source
 * @returns {string} escaped string safe for innerHTML
 */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;") // & must be first
    .replace(/</g, "&lt;") // prevents tag injection
    .replace(/>/g, "&gt;") // closes open tags
    .replace(/"/g, "&quot;"); // prevents attribute injection
}

/**
 * Loads real error data and updates the dashboard
 */
window.loadDashboard = async function loadDashboard() {
  try {
    // fetch summary from backend and update dashboard cards
    const data = await getSummary("wt_demo", "30d");
    document.getElementById("total-errors").textContent = data.totals.errors;
    document.getElementById("error-change").textContent =
      data.totals.errors === 0 ? "No errors in last 30 days" : "Last 30 days";

    // update performance cards
    const p75 = data.totals.performance_p75;
    document.getElementById("lcp-value").textContent = p75.LCP
      ? `${p75.LCP}ms`
      : "N/A";
    document.getElementById("fcp-value").textContent = p75.FCP
      ? `${p75.FCP}ms`
      : "N/A";
    document.getElementById("cls-value").textContent = p75.CLS
      ? parseFloat(p75.CLS).toFixed(2)
      : "N/A";

    // apply threshold colors
    if (p75.LCP)
      applyMetricColor(
        "lcp-value",
        p75.LCP,
        THRESHOLDS.lcp.warn,
        THRESHOLDS.lcp.poor,
      );
    if (p75.FCP)
      applyMetricColor(
        "fcp-value",
        p75.FCP,
        THRESHOLDS.fcp.warn,
        THRESHOLDS.fcp.poor,
      );
    if (p75.CLS)
      applyMetricColor(
        "cls-value",
        p75.CLS,
        THRESHOLDS.cls.warn,
        THRESHOLDS.cls.poor,
      );

    // update bar chart using timeseries
    updateErrorChart(data.timeseries.errors);

    // update recent errors table — still uses getEvents()
    const { events } = await getEvents("wt_demo", {
      type: "error",
      since: "30d",
    });
    updateRecentErrors(events.slice(0, 5));
  } catch (err) {
    console.error("Dashboard failed to load:", err);
  }
};

//getting color values from CSS variables to use in charts for consistent theming
let errorChart = null;
function updateErrorChart(timeseries) {
  window.lastTimeseries = timeseries;
  const orange = getComputedStyle(document.documentElement)
    .getPropertyValue("--orange")
    .trim();
  const isDark = document.body.classList.contains("dark");
  const textColor = isDark ? "#e8cfc0" : "#3a2210";
  const gridColor = isDark ? "#aa8d76" : "rgba(0, 0, 0, 0.1)";
  const labels = timeseries.map((b) => b.t.split("T")[0].slice(5));
  const values = timeseries.map((b) => b.count);

  if (errorChart) errorChart.destroy();

  // using Chart.js for the bar chart for better accessibility and responsiveness.
  errorChart = new Chart(document.getElementById("error-rate-chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: orange, borderRadius: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: { display: true, text: "Date", color: textColor },
          ticks: { maxTicksLimit: 8, color: textColor },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Errors", color: textColor },
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
      },
    },
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
      <td>${escapeHtml(event.message) || "No message"}</td>
      <td>${escapeHtml(event.url) || "Unknown"}</td>
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
