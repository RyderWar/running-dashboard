export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function createEmptyState(message, detail) {
  const detailMarkup = detail ? `<span>${escapeHtml(detail)}</span>` : "";

  return `<p class="empty-state">${escapeHtml(message)}${detailMarkup}</p>`;
}

export function formatMileage(mileage) {
  const roundedMileage = Math.round(mileage * 100) / 100;

  if (Number.isInteger(roundedMileage)) {
    return roundedMileage.toString();
  }

  return roundedMileage.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function isValidTimeFormat(time) {
  const timePattern = /^(\d+:[0-5]\d|\d+:[0-5]\d:[0-5]\d)$/;

  return timePattern.test(time);
}

export function calculatePace(distance, time) {
  const distanceNumber = Number(distance);
  const totalSeconds = timeToSeconds(time);

  if (!distanceNumber || !isValidTimeFormat(time)) {
    return "Invalid time";
  }

  const paceSeconds = totalSeconds / distanceNumber;

  return formatSeconds(paceSeconds, { forceMinutes: true });
}

export function timeToSeconds(time) {
  const timeParts = time.split(":").map(Number);

  if (timeParts.length === 2) {
    return timeParts[0] * 60 + timeParts[1];
  }

  if (timeParts.length === 3) {
    return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
  }

  return 0;
}

export function formatSeconds(totalSeconds, options = {}) {
  const roundedSeconds = Math.round(totalSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;

  if (hours > 0 && !options.forceMinutes) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  const totalMinutes = options.forceMinutes ? Math.floor(roundedSeconds / 60) : minutes;

  return `${totalMinutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseRunDate(runDateValue) {
  if (!runDateValue) {
    return null;
  }

  const dateParts = runDateValue.split("-");
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  return new Date(year, month, day);
}

export function formatRunDate(runDateValue) {
  const parsedRunDate = parseRunDate(runDateValue);

  if (!parsedRunDate) {
    return "No date saved";
  }

  return parsedRunDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function getWeekStart(date) {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

export function getCurrentWeekRange() {
  return getDateRange(getWeekStart(new Date()), 7);
}

export function getDateRange(startDate, dayCount) {
  const start = new Date(startDate);

  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + dayCount);

  return {
    start: start,
    end: end
  };
}

export function getSequentialDateRanges(options) {
  const ranges = [];
  const count = options.count;
  const daySpan = options.daySpan;
  const labelOptions = options.labelOptions;
  const startDate = new Date(options.startDate);

  for (let index = 0; index < count; index = index + 1) {
    const rangeStart = new Date(startDate);
    rangeStart.setDate(startDate.getDate() + index * daySpan);

    const range = getDateRange(rangeStart, daySpan);

    ranges.push({
      start: range.start,
      end: range.end,
      label: range.start.toLocaleDateString("en-US", labelOptions)
    });
  }

  return ranges;
}

export function getRecentWeekRanges(weekCount) {
  const currentWeekStart = getWeekStart(new Date());
  const firstWeekStart = new Date(currentWeekStart);

  firstWeekStart.setDate(currentWeekStart.getDate() - (weekCount - 1) * 7);

  return getSequentialDateRanges({
    startDate: firstWeekStart,
    count: weekCount,
    daySpan: 7,
    labelOptions: {
      month: "short",
      day: "numeric"
    }
  });
}

export function getCurrentWeekDayRanges() {
  return getSequentialDateRanges({
    startDate: getWeekStart(new Date()),
    count: 7,
    daySpan: 1,
    labelOptions: {
      weekday: "short"
    }
  });
}

export function getCurrentWeekRuns(runs) {
  const currentWeek = getCurrentWeekRange();

  return getRunsInRange(runs, currentWeek.start, currentWeek.end);
}

export function getRunStats(runs) {
  return runs.reduce(function (stats, run) {
    const distance = Number(run.distance);
    const runSeconds = timeToSeconds(run.time);

    stats.totalMileage = stats.totalMileage + distance;
    stats.totalSeconds = stats.totalSeconds + runSeconds;
    stats.totalPaceSeconds = stats.totalPaceSeconds + runSeconds / distance;
    stats.longestDistance = Math.max(stats.longestDistance, distance);

    return stats;
  }, {
    totalMileage: 0,
    totalSeconds: 0,
    totalPaceSeconds: 0,
    longestDistance: 0
  });
}

export function getAveragePaceSeconds(runs) {
  const stats = getRunStats(runs);

  if (runs.length === 0) {
    return 0;
  }

  return stats.totalPaceSeconds / runs.length;
}

export function getRangeMileage(runs, rangeStart, rangeEnd) {
  return getRunsInRange(runs, rangeStart, rangeEnd).reduce(function (total, run) {
    return total + Number(run.distance);
  }, 0);
}

export function getRangeAveragePaceSeconds(runs, rangeStart, rangeEnd) {
  const rangeRuns = getRunsInRange(runs, rangeStart, rangeEnd);

  if (rangeRuns.length === 0) {
    return 0;
  }

  return Math.round(getAveragePaceSeconds(rangeRuns));
}

export function getRunsInRange(runs, rangeStart, rangeEnd) {
  return runs.filter(function (run) {
    const parsedRunDate = parseRunDate(run.date);

    return parsedRunDate && parsedRunDate >= rangeStart && parsedRunDate < rangeEnd;
  });
}
