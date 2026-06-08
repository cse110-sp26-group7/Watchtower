/* global logout, navigate */

/**
 * Logs out the user: revokes the server-side session (POST /api/logout), then
 * clears the local session flag and redirects to login. Best-effort — local
 * cleanup and redirect run even if the network call fails so the user is never
 * stranded on a protected page.
 * @returns {Promise<void>}
 */
window.handleLogout = async function handleLogout() {
  try {
    await logout();
  } catch {
    // ignore network/API errors; fall through to local cleanup
  } finally {
    sessionStorage.removeItem("loggedIn");
    navigate("login");
  }
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
