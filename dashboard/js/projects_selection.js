/* global getEvents */

// function to add a new project card to the projects page
window.addProject = function addProject() {
  const grid = document.querySelector(".project-grid");
  const addBtn = document.querySelector(".project-card-add");

  const newCard = document.createElement("div");
  newCard.classList.add("project-card");
  newCard.setAttribute("onclick", "navigate('dashboard')");
  newCard.innerHTML = `
    <div class="project-card-top">
      <div class="project-logo">logo</div>
      <span class="project-status dot-up"></span>
    </div>
    <div class="project-name">New Project</div>
    <div class="project-stats">
      <span>errors: 0</span>
      <span>LCP: 0ms</span>
      <span>INP: 0ms</span>
      <span>CLS: 0</span>
    </div>
  `;

  grid.insertBefore(newCard, addBtn);
};

// function to refresh project cards with latest data from API
window.refreshProjectCards = async function refreshProjectCards() {
  try {
    // fetch errors
    const { events: errorEvents } = await getEvents("wt_demo", {
      type: "error",
      since: "7d",
    });

    // fetch performance
    const { events: perfEvents } = await getEvents("wt_demo", {
      type: "performance",
      since: "7d",
    });

    // find latest performance metrics
    const lcp = perfEvents.find((e) => e.metric_name === "LCP");
    const fcp = perfEvents.find((e) => e.metric_name === "FCP");
    const cls = perfEvents.find((e) => e.metric_name === "CLS");

    const stats = document.querySelectorAll(".project-stats");

    stats.forEach((stat) => {
      stat.innerHTML = `
        <span>errors: ${errorEvents.length}</span>
        <span>LCP: ${lcp ? `${lcp.metric_value}ms` : "0ms"}</span>
        <span>FCP: ${fcp ? `${fcp.metric_value}ms` : "0ms"}</span>
        <span>CLS: ${cls ? parseFloat(cls.metric_value).toFixed(2) : "0"}</span>
      `;
    });
  } catch (err) {
    console.error("Failed to refresh project cards:", err);
  }
};
