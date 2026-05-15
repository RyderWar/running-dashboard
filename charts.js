import {
  formatSeconds,
  getCurrentWeekDayRanges,
  getRangeAveragePaceSeconds,
  getRangeMileage,
  getRecentWeekRanges
} from "./utils.js";
import { normalizeTheme } from "./theme.js";

const runCharts = {};

const CHART_COLORS = {
  blue: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#7c3aed",
  gray: "#9ca3af"
};

const DARK_CHART_COLORS = {
  blue: "#60a5fa",
  green: "#4ade80",
  amber: "#fbbf24",
  red: "#f87171",
  purple: "#a78bfa",
  gray: "#cbd5e1"
};

function getCurrentChartTheme() {
  const isDark = normalizeTheme(document.body.dataset.theme) === "dark";
  const colors = isDark ? DARK_CHART_COLORS : CHART_COLORS;

  return {
    colors: colors,
    text: isDark ? "#cbd5e1" : "#4b5563",
    grid: isDark ? "#334155" : "#e5e7eb",
    tooltipBg: isDark ? "#020617" : "#ffffff",
    tooltipText: isDark ? "#f8fafc" : "#1f2937",
    tooltipBorder: isDark ? "#475569" : "#e5e7eb",
    blueFill: isDark ? "rgba(96, 165, 250, 0.18)" : "rgba(37, 99, 235, 0.12)",
    amberFill: isDark ? "rgba(251, 191, 36, 0.18)" : "rgba(217, 119, 6, 0.12)",
    doughnutBorder: isDark ? "#111827" : "#ffffff"
  };
}

function getWeeklyMileageData(runs) {
  const weeks = getRecentWeekRanges(8);

  return {
    labels: weeks.map(function (week) {
      return week.label;
    }),
    values: weeks.map(function (week) {
      return getRangeMileage(runs, week.start, week.end);
    })
  };
}

function getDailyMileageData(runs) {
  const days = getCurrentWeekDayRanges();

  return {
    labels: days.map(function (day) {
      return day.label;
    }),
    values: days.map(function (day) {
      return getRangeMileage(runs, day.start, day.end);
    })
  };
}

function getPaceTrendData(runs) {
  const weeks = getRecentWeekRanges(8);

  return {
    labels: weeks.map(function (week) {
      return week.label;
    }),
    values: weeks.map(function (week) {
      return getRangeAveragePaceSeconds(runs, week.start, week.end);
    })
  };
}

function getRunTypeData(runs) {
  const runTypeCounts = {};

  runs.forEach(function (run) {
    const runType = run.runType || "Unknown";

    runTypeCounts[runType] = (runTypeCounts[runType] || 0) + 1;
  });

  const labels = Object.keys(runTypeCounts);

  return {
    labels: labels.length > 0 ? labels : ["No runs"],
    values: labels.length > 0 ? labels.map(function (label) {
      return runTypeCounts[label];
    }) : [0]
  };
}

function createOrUpdateChart(chartId, config) {
  if (runCharts[chartId]) {
    runCharts[chartId].data = config.data;
    runCharts[chartId].options = config.options;
    runCharts[chartId].update();
    return;
  }

  const canvas = document.getElementById(chartId);

  if (!canvas || !window.Chart) {
    return;
  }

  runCharts[chartId] = new Chart(canvas, config);
}

export function updateRunCharts(runs) {
  const weeklyMileage = getWeeklyMileageData(runs);
  const dailyMileage = getDailyMileageData(runs);
  const paceTrend = getPaceTrendData(runs);
  const runTypes = getRunTypeData(runs);
  const chartTheme = getCurrentChartTheme();

  createOrUpdateChart("weeklyMileageChart", {
    type: "line",
    data: {
      labels: weeklyMileage.labels,
      datasets: [{
        label: "Miles",
        data: weeklyMileage.values,
        borderColor: chartTheme.colors.blue,
        backgroundColor: chartTheme.blueFill,
        tension: 0.3,
        fill: true
      }]
    },
    options: getMileageChartOptions("Miles", chartTheme)
  });

  createOrUpdateChart("dailyMileageChart", {
    type: "bar",
    data: {
      labels: dailyMileage.labels,
      datasets: [{
        label: "Miles",
        data: dailyMileage.values,
        backgroundColor: chartTheme.colors.green
      }]
    },
    options: getMileageChartOptions("Miles", chartTheme)
  });

  createOrUpdateChart("paceTrendChart", {
    type: "line",
    data: {
      labels: paceTrend.labels,
      datasets: [{
        label: "Average Pace",
        data: paceTrend.values,
        borderColor: chartTheme.colors.amber,
        backgroundColor: chartTheme.amberFill,
        tension: 0.3,
        fill: true
      }]
    },
    options: getPaceChartOptions(chartTheme)
  });

  createOrUpdateChart("runTypeChart", {
    type: "doughnut",
    data: {
      labels: runTypes.labels,
      datasets: [{
        data: runTypes.values,
        backgroundColor: [
          chartTheme.colors.blue,
          chartTheme.colors.green,
          chartTheme.colors.amber,
          chartTheme.colors.red,
          chartTheme.colors.purple,
          chartTheme.colors.gray
        ],
        borderColor: chartTheme.doughnutBorder
      }]
    },
    options: getRunTypeChartOptions(chartTheme)
  });
}

function getBaseChartOptions(chartTheme) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    events: ["mousemove", "mouseout", "click"],
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        ticks: {
          color: chartTheme.text
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: chartTheme.text
        },
        grid: {
          color: chartTheme.grid
        }
      }
    }
  };
}

function setTooltipTheme(options, chartTheme) {
  options.plugins.tooltip = {
    backgroundColor: chartTheme.tooltipBg,
    titleColor: chartTheme.tooltipText,
    bodyColor: chartTheme.tooltipText,
    borderColor: chartTheme.tooltipBorder,
    borderWidth: 1
  };
}

function getMileageChartOptions(label, chartTheme) {
  const options = getBaseChartOptions(chartTheme);

  setTooltipTheme(options, chartTheme);

  options.plugins.tooltip.callbacks = {
    label: function (context) {
      return `${label}: ${context.parsed.y}`;
    }
  };

  return options;
}

function getPaceChartOptions(chartTheme) {
  const options = getBaseChartOptions(chartTheme);

  setTooltipTheme(options, chartTheme);

  options.scales.y.ticks.callback = function (value) {
    return formatSeconds(value, { forceMinutes: true });
  };
  options.plugins.tooltip.callbacks = {
    label: function (context) {
      return `Average pace: ${formatSeconds(context.parsed.y, { forceMinutes: true })} / mile`;
    }
  };

  return options;
}

function getRunTypeChartOptions(chartTheme) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    events: ["mousemove", "mouseout", "click"],
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: chartTheme.text
        }
      },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        titleColor: chartTheme.tooltipText,
        bodyColor: chartTheme.tooltipText,
        borderColor: chartTheme.tooltipBorder,
        borderWidth: 1
      }
    }
  };
}
