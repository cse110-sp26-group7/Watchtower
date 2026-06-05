/** function to handle login form submission
 * @param {string} username - The username entered by the user
 * @param {string} password - The password entered by the user
 * @returns {Promise<void>}
 */
async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await login(email, password);
    sessionStorage.setItem("loggedIn", "true"); // ✅ set the flag
    navigate("projects");
  } catch (err) {
    document.getElementById("login-error").textContent =
      "Login failed: " + err.message;
  }
}
