//fake dashboard data
const dashboardData = {
  total_errors: 20,
  avg_response_time: 120,
  site_status: "up",

  error_rate: [
    12, 28, 18, 35, 22, 30
  ],

  response_time_graph: [
    100, 180, 140, 160, 120, 150
  ]
};

//performance indicator cards
document.getElementById(
  "total-errors"
).textContent =
  dashboardData.total_errors;

document.getElementById(
  "avg-response-time"
).textContent =
  `${dashboardData.avg_response_time}ms`;

document.getElementById(
  "error-change"
).textContent =
  "↑ 10 from yesterday";

document.getElementById(
  "response-change"
).textContent =
  "↓ 20ms from yesterday";

//status
const statusElement =
  document.getElementById(
    "site-status"
  );

statusElement.textContent =
  dashboardData.site_status === "up"
    ? "LIVE"
    : "DOWN";

//bar chart
const chart =
  document.getElementById(
    "error-rate-chart"
  );

dashboardData.error_rate.forEach(
  value => {
    const bar =
      document.createElement("div");

    bar.classList.add("bar");

    bar.style.height =
      `${value * 4}px`;

    chart.appendChild(bar);
  }
);

//line graph
const values =
  dashboardData.response_time_graph;

const max = Math.max(...values);

const points = values
  .map((value, index) => {
    const x =
      (index /
        (values.length - 1)) *
      300;

    const y =
      150 -
      (value / max) * 120;

    return `${x},${y}`;
  })
  .join(" ");

document.getElementById("response-line").setAttribute("points", points);