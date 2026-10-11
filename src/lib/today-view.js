import { conflictsOn, expenseSummary, isComplete, occurrence, occursOn, today, ZONE } from './domain.js';

export function todayView(records, now = new Date()) {
  const day = today(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const active = records.filter(record => !record.deleted);
  const tasks = active.filter(record => record.type === 'task' && !isComplete(record, day) &&
    (!record.date || (record.recurrence === 'none' ? record.date <= day : occursOn(record, day))))
    .map(record => record.recurrence === 'none' ? record : occurrence(record, day))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || Number(b.pinned) - Number(a.pinned));
  const overlaps = conflictsOn(active, day);
  const events = active.filter(record => record.type === 'event' && occursOn(record, day)).map(record => occurrence(record, day));
  const agenda = events.map(record => ({ key: `event-${record.id}`, record, type: 'event', time: record.start, end: record.end, allDay: record.allDay, overlap: overlaps.has(record.id) }));
  for (const record of active) {
    if (isComplete(record, day) || record.exceptions?.[day]?.cancelled) continue;
    if (record.type === 'reminder' && occursOn(record, day)) {
      const instance = occurrence(record, day);
      agenda.push({ key: `reminder-${record.id}`, record: instance, type: 'reminder', time: instance.start, allDay: false });
    } else if (record.type !== 'reminder' && record.reminderAt?.slice(0, 10) === day) {
      agenda.push({ key: `attached-${record.id}`, record, type: 'reminder', time: record.reminderAt.slice(11), allDay: false });
    }
  }
  agenda.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.time.localeCompare(b.time) || a.key.localeCompare(b.key));
  for (const item of agenda) {
    item.current = !item.allDay && item.type === 'event' && item.time <= time && item.end > time;
    item.earlier = !item.allDay && (item.end || item.time) < time;
  }
  const next = agenda.find(item => item.current) || agenda.find(item => !item.allDay && item.time >= time) || agenda.find(item => item.allDay) || null;
  const hour = Number(time.slice(0, 2));
  return {
    day, time, greeting: hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening',
    tasks, overdue: tasks.filter(record => record.recurrence === 'none' && record.date && record.date < day).length,
    events, agenda, next,
    notes: active.filter(record => record.type === 'note').sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3),
    spending: expenseSummary(active, { start: day, end: day }),
  };
}
