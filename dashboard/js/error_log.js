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


// Filter functionality for error log page
function applyFilters() {
  const query = document.getElementById("search").value.toLowerCase();
  const dateFilter = document.getElementById("date-filter").value;
  const levelFilter = document.getElementById("level-filter").value;
  const now = new Date();

  const rows = document.querySelectorAll(".full-errors-table tbody tr:not(.detail-row)");

  rows.forEach((row) => {
    // Search bar functionality for error log page
    const text = row.textContent.toLowerCase();
    const matchesSearch = text.includes(query);

    // Filter by date range (last 24 hours, last 7 days, last 30 days)
    const timestampText = row.querySelector("td").textContent.trim();
    const [datePart, timePart] = timestampText.split("\n").map((s) => s.trim());
    const timestamp = new Date(`${datePart} ${timePart}`);
    let matchesDate = false;
    if (dateFilter === "all") {
      matchesDate = true;
    } else if (dateFilter === "24h") {
      matchesDate = now - timestamp <= 24 * 60 * 60 * 1000;
    } else if (dateFilter === "7d") {
      matchesDate = now - timestamp <= 7 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === "30d") {
      matchesDate = now - timestamp <= 30 * 24 * 60 * 60 * 1000;
    }

    // Filter by error level (error, warning, minimal)
    const level = row.dataset.level ?? "";
    let matchesLevel = false;
    if (levelFilter === "all") {
      matchesLevel = true;
    } else if (levelFilter === "error" && level.includes("error")) {
      matchesLevel = true;
    } else if (levelFilter === "warning" && level.includes("warning")) {
      matchesLevel = true;
    } else if (levelFilter === "minimal" && level.includes("minimal")) {
      matchesLevel = true;
    }
    // all filters must pass
    const show = matchesSearch && matchesDate && matchesLevel;
    row.style.display = show ? "" : "none";

    const detailRow = row.nextElementSibling;
    if (detailRow?.classList.contains("detail-row")) {
      if (!show) {
        row.classList.remove("row-open");
        detailRow.classList.remove("detail-row-open");
      }
    }
  });
}

document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("date-filter").addEventListener("change", applyFilters);
document.getElementById("level-filter").addEventListener("change", applyFilters);


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
        document.querySelectorAll(".full-errors-table-row.row-open").forEach((openRow) => {
          if (openRow !== row) {
            openRow.classList.remove("row-open");
            const openDetail = openRow.nextElementSibling;
            if (openDetail?.classList.contains("detail-row")) {
              openDetail.classList.remove("detail-row-open");
            }
          }
        });

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
