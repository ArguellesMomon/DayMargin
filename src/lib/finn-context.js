import { addDays, expenseSummary, occursOn, periodRange, today, titleOf, money, recordsOn, isValidDate } from './domain.js';

export function buildContext(records, question, now = new Date()) {
  const day = today(now);
  const permitted = records.filter(r => !r.deleted && !r.excluded);
  const q = question.toLowerCase();
  const tomorrow = /tomorrow/.test(q);
  const focusDay = tomorrow ? addDays(day, 1) : day;
  const period = /today/.test(q) ? 'today' : /week/.test(q) ? 'week' : 'month';
  const explicitDates = q.match(/\d{4}-\d{2}-\d{2}/g) || [];
  let range = periodRange(period, day);
  if (explicitDates.length && explicitDates.every(isValidDate)) range = { start: explicitDates[0], end: explicitDates[1] || explicitDates[0] };
  else if (/yesterday/.test(q)) range = periodRange('today', addDays(day, -1));
  else if (/last week/.test(q)) range = periodRange('week', addDays(day, -7));
  else if (/last month/.test(q)) { const [year, month] = day.split('-').map(Number); range = periodRange('month', new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10)); }
  const spending = expenseSummary(permitted, range);
  const words = q.match(/[a-z]{3,}/g) || [];
  const score = r => {
    let value = 0;
    const text = `${titleOf(r)} ${r.body} ${r.tags.join(' ')}`.toLowerCase();
    for (const word of words) if (text.includes(word)) value += 2;
    if (r.pinned) value++;
    if (['event', 'reminder', 'task'].includes(r.type) && (occursOn(r, focusDay) || (r.type === 'task' && !r.completed && r.date && r.date < focusDay))) value += 8;
    if (r.type === 'expense' && /spend|expense|money|cost/.test(q) && r.date >= range.start && r.date <= range.end) value += 8;
    if (r.type === 'note' && /note|write|wrote|summar/.test(q)) value += 4;
    return value;
  };
  const selected = permitted.map(r => ({ r, score: score(r) })).sort((a, b) => b.score - a.score || b.r.updatedAt.localeCompare(a.r.updatedAt)).slice(0, 12).map(({ r }) => ({
    id: r.id, version: r.version, type: r.type, title: titleOf(r), body: r.body.slice(0, 240),
    date: r.date, start: r.start, end: r.end, allDay: r.allDay, category: r.category,
    amountCents: r.amountCents, completed: r.completed, recurrence: r.recurrence, completedDates: r.completedDates.slice(-10),
  }));
  return { date: day, focusDay, timezone: 'Asia/Manila', currency: 'PHP', records: selected,
    coverage: { permittedCount: permitted.length, selectedCount: selected.length, incomplete: selected.length < permitted.length },
    calculatedSpending: { start: range.start, end: range.end, totalCents: spending.totalCents, categories: spending.categories,
      formattedTotal: money(spending.totalCents), formattedCategories: Object.fromEntries(Object.entries(spending.categories).map(([key, cents]) => [key, money(cents)])),
      recordIds: spending.entries.map(r => r.id).slice(0, 12), entriesCount: spending.entries.length },
    recordedSchedule: recordsOn(permitted, focusDay).filter(r => r.type === 'event').slice(0, 20).map(r => ({ id: r.id, title: titleOf(r), start: r.start, end: r.end, allDay: r.allDay })),
  };
}
