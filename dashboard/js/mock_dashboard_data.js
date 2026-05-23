//fake dashboard data
const dashboardData = {
  total_errors: 20,
  site_status: "ok",

  error_rate: [
    12, 28, 18, 35, 22, 30
  ],

  totals: {
    performance_p75: {
      LCP: 2456,
      INP: 198,
      CLS: 0.12
    }
  },

  timeseries: {
    errors: [
      5, 8, 3, 12, 7, 4
    ],

  performance: [
      1800,
      2200,
      2400,
      2100,
      2600,
      2300
    ]
  }
};

//performance indicator cards
function updateMetrics(data) {
  document.getElementById(
    "total-errors"
  ).textContent =
    data.total_errors;

  const vitals =
    data.totals.performance_p75;

  document.getElementById(
    "lcp-value"
  ).textContent =
    `${vitals.LCP}ms`;

  document.getElementById(
    "inp-value"
  ).textContent =
    `${vitals.INP}ms`;

  document.getElementById(
    "cls-value"
  ).textContent =
    vitals.CLS;

  document.getElementById(
    "site-status"
  ).textContent =
    data.site_status === "ok"
      ? "LIVE"
      : "ISSUES";
}


function updateBarChart(values) {

  const chart =
    document.getElementById(
      "error-rate-chart"
    );

  // clear old bars
  chart.innerHTML = "";

  values.forEach(value => {

    const bar =
      document.createElement("div");

    bar.classList.add("bar");

    bar.style.height =
      `${value * 10}px`;

    chart.appendChild(bar);
  });
}

// function updateLineChart(values) {

//   const max =
//     Math.max(...values);

//   const points = values
//     .map((value, index) => {

//       const x =
//         (index /
//           (values.length - 1)) *
//         300;

//       const y =
//         150 -
//         (value / max) * 120;

//       return `${x},${y}`;

//     })
//     .join(" ");

//   document
//     .getElementById(
//       "performance-line"
//     )
//     .setAttribute(
//       "points",
//       points
//     );
// }

function updateDashboard(data) {

  updateMetrics(data);

  updateBarChart(
    data.timeseries.errors
  );

  updateLineChart(
    data.timeseries.performance
  );
}

updateDashboard(
  dashboardData
);