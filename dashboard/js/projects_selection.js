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
// function to refresh project cards with latest data from dashboardData
window.refreshProjectCards = function refreshProjectCards() {
  const vitals = dashboardData.totals.performance_p75;
  const stats = document.querySelectorAll(".project-stats");

  stats.forEach((stat) => {
    stat.innerHTML = `
      <span>errors: ${dashboardData.total_errors}</span>
      <span>LCP: ${vitals.LCP}ms</span>
      <span>INP: ${vitals.INP}ms</span>
      <span>CLS: ${vitals.CLS}</span>
    `;
  });
};
