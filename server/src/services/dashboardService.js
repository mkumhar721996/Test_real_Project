const { canView } = require('../domain/visibility');

function dateOnly(value) {
  return value ? value.slice(0, 10) : null;
}

function buildDailyTrend(defects) {
  if (defects.length === 0) {
    return [];
  }

  const knownDates = [];
  defects.forEach((defect) => {
    const reportedDay = dateOnly(defect.reportedAt);
    const closedDay = dateOnly(defect.closedAt);
    if (reportedDay) knownDates.push(reportedDay);
    if (closedDay) knownDates.push(closedDay);
  });
  knownDates.sort();
  const startDay = knownDates[0];
  const endDay = knownDates[knownDates.length - 1];

  const trend = [];
  let cursor = new Date(`${startDay}T00:00:00Z`);
  const endCursor = new Date(`${endDay}T00:00:00Z`);

  while (cursor <= endCursor) {
    const day = cursor.toISOString().slice(0, 10);
    let open = 0;
    let closed = 0;

    defects.forEach((defect) => {
      const reportedDay = dateOnly(defect.reportedAt);
      if (!reportedDay || reportedDay > day) return;

      const closedDay = dateOnly(defect.closedAt);
      if (closedDay && closedDay <= day) {
        closed += 1;
      } else {
        open += 1;
      }
    });

    trend.push({ date: day, open, closed });
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return trend;
}

function getDashboardSummary(user, defects) {
  const visible = defects.filter((defect) => canView(user, defect));
  const open = visible.filter((defect) => defect.status === 'open').length;
  const closed = visible.filter((defect) => defect.status === 'closed').length;
  const trend = buildDailyTrend(visible);

  return { counts: { open, closed }, trend };
}

module.exports = { getDashboardSummary, buildDailyTrend };
