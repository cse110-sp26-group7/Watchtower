window.toggleTheme = function () {
  const isDark = document.body.classList.toggle("dark");
  document.getElementById("themeBtn").innerHTML = isDark
    ? '<img src="./img/darkMode.png" class="navbar-icon"alt="dark mode icon" />'
    : '<img src="img/lightMode.png" class="navbar-icon"alt="light mode icon" />';
};
