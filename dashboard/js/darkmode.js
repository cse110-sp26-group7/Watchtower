window.toggleTheme = function () {
  const isDark = document.body.classList.toggle("dark");
  document.getElementById("themeBtn").innerHTML = isDark
    ? '<img src="./img/darkMode.png" alt="dark mode icon" />'
    : '<img src="./img/lightMode.png" alt="light mode icon" />';
  // rerender chart with updated theme colors
  if (
    typeof updateErrorChart === "function" &&
    typeof lastTimeseries !== "undefined" &&
    lastTimeseries
  ) {
    updateErrorChart(lastTimeseries);
  }
};
