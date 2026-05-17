function navigate(route) {
  // hide all pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  // remove active from all sidebar buttons
  document.querySelectorAll(".sidebar-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // show correct page
  document.getElementById("page-" + route).classList.add("active");

  // highlight correct sidebar button
  document.querySelector(`[data-route="${route}"]`).classList.add("active");

  // update URL hash
  window.location.hash = "/" + route;
}

// on page load, read hash and navigate
window.addEventListener("load", () => {
  const hash = window.location.hash.replace("#/", "");
  navigate(hash || "overview");
});
