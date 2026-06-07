/* global login, navigate, handleLogin */
/* exported handleLogin */

/** function to handle login form submission
 * @param {string} email - The email entered by the user
 * @param {string} password - The password entered by the user
 * @returns {Promise<void>}
 */
window.handleLogin = async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await login(email, password);
    sessionStorage.setItem("loggedIn", "true");
    navigate("projects");
    document.getElementById("navbar-logo-login").style.display = "none";
  } catch (err) {
    document.getElementById("login-error").textContent =
      "Login failed: " + err.message;
  }
};
