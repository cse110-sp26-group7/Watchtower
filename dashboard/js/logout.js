/**
 * Logs out the user by clearing session and redirecting to login
 */
window.handleLogout = function handleLogout() {
  // clear login session
  sessionStorage.removeItem("loggedIn");
  // redirect to login page
  window.navigate("login");
};

// toggle avatar dropdown on click
document.getElementById("avatar-btn").addEventListener("click", () => {
  const dropdown = document.getElementById("avatar-dropdown");
  const isOpen = dropdown.style.display === "block";
  dropdown.style.display = isOpen ? "none" : "block";
});

// close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (
    !e.target.closest("#avatar-btn") &&
    !e.target.closest("#avatar-dropdown")
  ) {
    document.getElementById("avatar-dropdown").style.display = "none";
  }
});
