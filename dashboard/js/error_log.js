/* global getEvents */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - raw string from untrusted data
 * @returns {string} escaped string safe for innerHTML
 */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Parses a stack trace string into structured frames
 * @param {string} stack - raw stack trace string
 * @returns {Array} array of frame objects
 */
function parseStack(stack) {
  if (!stack) return [];
  return stack
    .split("\n")
    .filter((line) => line.trim().startsWith("at "))
    .map((line) => {
      const match = line.trim().match(/at (.+?) \((.+):(\d+):(\d+)\)/);
      if (match) {
        return {
          fn: match[1],
          file: match[2],
          line: match[3],
          col: match[4],
        };
      }
      return { raw: line.trim() };
    });
}

// Search bar functionality for error log page
document.getElementById("search").addEventListener("input", function () {
  const query = this.value.toLowerCase();

  const rows = document.querySelectorAll(".full-errors-table tbody tr");

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const match = text.includes(query);

    row.style.display = match ? "" : "none";

    const detailRow = row.nextElementSibling;
    if (detailRow?.classList.contains("detail-row")) {
      detailRow.classList.remove("detail-row-open");
    }
  });
});

// Filter functionality for error log page
// Filter by date range (last 24 hours, last 7 days, last 30 days)
document.getElementById("date-filter").addEventListener("change", function () {
  const filter = this.value;
  const now = new Date();

  const rows = document.querySelectorAll(".full-errors-table tbody tr");

  rows.forEach((row) => {
    const timestampText = row.querySelector("td").textContent.trim();
    const [datePart, timePart] = timestampText.split("\n").map((s) => s.trim());
    const timestamp = new Date(`${datePart} ${timePart}`);

    let show = false;

    if (filter === "all") {
      show = true;
    } else if (filter === "24h") {
      show = now - timestamp <= 24 * 60 * 60 * 1000;
    } else if (filter === "7d") {
      show = now - timestamp <= 7 * 24 * 60 * 60 * 1000;
    } else if (filter === "30d") {
      show = now - timestamp <= 30 * 24 * 60 * 60 * 1000;
    }

    row.style.display = show ? "" : "none";

    const detailRow = row.nextElementSibling;
    if (detailRow?.classList.contains("detail-row")) {
      detailRow.classList.remove("detail-row-open");
    }
  });
});

// Filter by error level (error, warning, minimal)
document.getElementById("level-filter").addEventListener("change", function () {
  const filter = this.value;

  const rows = document.querySelectorAll(".full-errors-table tbody tr");

  rows.forEach((row) => {
    const level = row.dataset.level ?? "";
    let show = false;

    if (filter === "all") {
      show = true;
    } else if (filter === "error" && level.includes("error")) {
      show = true;
    } else if (filter === "warning" && level.includes("warning")) {
      show = true;
    } else if (filter === "minimal" && level.includes("minimal")) {
      show = true;
    }

    row.style.display = show ? "" : "none";

    const detailRow = row.nextElementSibling;
    if (detailRow?.classList.contains("detail-row")) {
      detailRow.classList.remove("detail-row-open");
    }
  });
});
/**
 * Loads real error data and updates the error log table
 */
window.loadErrorLog = async function loadErrorLog() {
  try {
    const { events } = await getEvents("wt_demo", {
      type: "error",
      since: "30d",
    });

    const tbody = document.getElementById("full-errors-body");
    tbody.innerHTML = "";

    // handle empty state
    if (events.length === 0) {
      tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; color: var(--dim); padding: 2rem;">
        No errors found
      </td>
    </tr>
  `;
      return;
    }

    // populate table with error events
    events.forEach((event) => {
      const row = document.createElement("tr");
      row.classList.add("full-errors-table-row");
      row.dataset.timestamp = event.timestamp;
      row.dataset.level = event.event_type;

      row.innerHTML = `
        <td>
          ${new Date(event.timestamp).toLocaleDateString()} 
          <br>
          ${new Date(event.timestamp).toLocaleTimeString()}
        </td>
        <td class="full-level-status">
          <span class="full-error-level-dot error"></span>
          ERROR
        </td>
        <td>${escapeHtml(event.message)}</td>
        <td>${escapeHtml(event.url)}</td>
        <td>1</td>
      `;

      // detail row — hidden by default
      /*If the stack trace is in a recognizable format, parse it into frames*/
      const detailRow = document.createElement("tr");
      detailRow.classList.add("detail-row");

      detailRow.innerHTML = `
        <td colspan="5">
          <div class="error-detail">
            <div class="error-detail-grid">
              <span class="detail-label">Name</span>
              <span class="detail-value">${escapeHtml(event.name)}</span>
              <span class="detail-label">Environment</span>
              <span class="detail-value">${escapeHtml(event.environment)}</span>
              <span class="detail-label">Handled</span>
              <span class="detail-value">${event.handled ? "Yes" : "No"}</span>
              <span class="detail-label">File</span>
              <span class="detail-value">${escapeHtml(event.filename)}</span>
              <span class="detail-label">User Agent</span>
              <span class="detail-value">${escapeHtml(event.user_agent)}</span>
              <span class="detail-label">Country</span>
              <span class="detail-value">${escapeHtml(event.country)}</span>
            </div>
            <div class="detail-label">Stack Trace</div>

            <div class="error-stack">
              ${parseStack(event.stack)
                .map((f) =>
                  f.raw
                    ? `<div class="stack-frame"><span class="stack-raw">${escapeHtml(f.raw)}</span></div>`
                    : `<div class="stack-frame">
                    <span class="stack-function">${escapeHtml(f.fn)}</span>
                    <span class="stack-location">${escapeHtml(f.file)}:${f.line}:${f.col}</span>
                  </div>`,
                )
                .join("")}
            </div>
          </div>
        </td>
      `;

      // toggle detail row on click
      row.addEventListener("click", () => {
        detailRow.classList.toggle("detail-row-open");
        row.classList.toggle("row-open");
      });

      tbody.appendChild(row);
      tbody.appendChild(detailRow);
    });
  } catch (err) {
    console.error("Error log failed to load:", err);
  }
};
