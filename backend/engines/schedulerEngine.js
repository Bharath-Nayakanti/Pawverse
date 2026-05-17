const DEFAULT_HORIZON_DAYS = 45;
const DEFAULT_PREFERRED_TIME = '09:00';

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const normalizeRule = (rule = {}) => ({
  frequency: rule.frequency || rule.recurrence || 'none',
  interval: Math.max(1, Number(rule.interval || 1)),
  daysOfWeek: Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [],
  intervalDays: Math.max(1, Number(rule.intervalDays || rule.interval || 1))
});

const combineDateAndTime = (date, time) => {
  const [hours = 9, minutes = 0] = String(time || DEFAULT_PREFERRED_TIME).split(':').map(Number);
  const due = new Date(date);
  due.setUTCHours(hours, minutes, 0, 0);
  return due;
};

const dateOnly = (value, fallback = new Date()) => {
  if (!value) return fallback.toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const getStep = (rule) => {
  if (rule.frequency === 'daily') return (date) => addDays(date, rule.interval);
  if (rule.frequency === 'weekly') return (date) => addDays(date, rule.interval * 7);
  if (rule.frequency === 'monthly') return (date) => addMonths(date, rule.interval);
  if (rule.frequency === 'yearly') return (date) => addMonths(date, rule.interval * 12);
  if (rule.frequency === 'custom') return (date) => addDays(date, rule.intervalDays);
  return null;
};

const shouldIncludeWeeklyDate = (date, rule) => {
  if (rule.frequency !== 'weekly' || !rule.daysOfWeek.length) return true;
  return rule.daysOfWeek.includes(date.getUTCDay());
};

const generateOccurrences = (template, options = {}) => {
  const horizonDays = Number(options.horizonDays || DEFAULT_HORIZON_DAYS);
  const from = options.from ? new Date(options.from) : new Date();
  const start = new Date(`${dateOnly(template.start_date || template.startDate, from)}T00:00:00.000Z`);
  const endDate = template.end_date || template.endDate
    ? new Date(`${dateOnly(template.end_date || template.endDate, from)}T23:59:59.999Z`)
    : addDays(from, horizonDays);
  const until = options.until ? new Date(options.until) : endDate;
  const rule = normalizeRule(template.recurrence_rule || template.recurrenceRule);
  const times = template.preferred_times || template.preferredTimes || [DEFAULT_PREFERRED_TIME];
  const preferredTimes = Array.isArray(times) && times.length ? times : [DEFAULT_PREFERRED_TIME];
  const step = getStep(rule);

  if (!step) {
    const due = combineDateAndTime(start, preferredTimes[0]);
    return due >= from && due <= until ? [due] : [];
  }

  const occurrences = [];
  let cursor = new Date(start);
  let guard = 0;

  while (cursor <= until && guard < 1000) {
    if (cursor >= addDays(from, -1) && shouldIncludeWeeklyDate(cursor, rule)) {
      preferredTimes.forEach((time) => {
        const due = combineDateAndTime(cursor, time);
        if (due >= from && due <= until) occurrences.push(due);
      });
    }
    cursor = step(cursor);
    guard += 1;
  }

  return occurrences.sort((a, b) => a - b);
};

const calculateNextOccurrence = (template, after = new Date()) => (
  generateOccurrences(template, { from: after, horizonDays: 730 })[0] || null
);

module.exports = {
  calculateNextOccurrence,
  generateOccurrences,
  normalizeRule
};
