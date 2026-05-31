/* global getEvents */

/**
 * Loads real error data and updates the dashboard
 */
window.loadDashboard = async function loadDashboard() {
  try {
    const { events } = await getEvents("wt_demo", {
      type: "error",
      since: "7d",
    });

    // update total errors card
    document.getElementById("total-errors").textContent = events.length;
    document.getElementById("error-change").textContent = "Last 7 days";

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
      <td>${new Date(event.timestamp).toLocaleTimeString()}</td>
      <td><span class="recent-error-level-dot error"></span></td>
      <td>${event.message ?? "No message"}</td>
      <td>${event.url ?? "Unknown"}</td>
      <td>1</td>
    `;
    tbody.appendChild(row);
  });
}
