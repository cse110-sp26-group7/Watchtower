/* global getEvents */

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
      detailRow.style.display = "none";
    }
  });
});

// Filter functionality for error log page
document.getElementById("filter").addEventListener("change", function () {
  const filter = this.value;

  const rows = document.querySelectorAll(".full-errors-table tbody tr");

  rows.forEach((row) => {
    const level = row.textContent.toLowerCase() || "";
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
      detailRow.style.display = "none";
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

    events.forEach((event) => {
      const row = document.createElement("tr");
      row.classList.add("full-errors-table-row");
      row.innerHTML = `
        <td>${new Date(event.timestamp).toLocaleTimeString()}</td>
        <td class="full-level-status">
          <span class="full-error-level-dot error"></span>
          ERROR
        </td>
        <td>${event.message ?? "No message"}</td>
        <td>${event.url ?? "Unknown"}</td>
        <td>1</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error log failed to load:", err);
  }
};
