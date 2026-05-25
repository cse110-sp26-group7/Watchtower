function navigate(route) {
  // hide all pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  // remove active from all sidebar buttons
  document.querySelectorAll(".sidebar-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // add null check for page
  const page = document.getElementById("page-" + route);
  if (page) page.classList.add("active");

  // null check for sidebar button
  const btn = document.querySelector(`[data-route="${route}"]`);
  if (btn) btn.classList.add("active");

  //when navigating to projects page, refresh project cards to update the status and stats of each project
  if (route === "projects" && typeof refreshProjectCards === "function") {
    refreshProjectCards();
  }
  // update URL hash
  window.location.hash = "/" + route;
}

// on page load, read hash and navigate
window.addEventListener("load", () => {
  const hash = window.location.hash.replace("#/", "");
  navigate(hash || "projects");
});
