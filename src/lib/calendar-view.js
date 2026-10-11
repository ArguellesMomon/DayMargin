import { addDays, isComplete, recordsOn } from './domain.js';

export function weekDays(day) {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(day, -weekday);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthDays(day) {
  const start = weekDays(`${day.slice(0, 7)}-01`)[0];
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function moveMonth(day, amount) {
  const [year, month, date] = day.split('-').map(Number);
  const target = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  target.setUTCFullYear(year, month - 1 + amount, 1);
  const last = new Date(target); last.setUTCMonth(last.getUTCMonth() + 1, 0);
  target.setUTCDate(Math.min(date, last.getUTCDate()));
  return target.toISOString().slice(0, 10);
}

export function calendarDay(records, day) {
  const instances = recordsOn(records, day);
  const events = instances.filter(record => record.type === 'event')
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  const tasks = instances.filter(record => record.type === 'task')
    .sort((a, b) => Number(!!isComplete(a, day)) - Number(!!isComplete(b, day)) || Number(b.pinned) - Number(a.pinned));
  const reminders = instances.filter(record => record.type === 'reminder' && !isComplete(record, day))
    .map(record => ({ key: `reminder-${record.id}`, record, day, time: record.start, attached: false }));
  for (const record of records) {
    if (record.deleted || record.type === 'reminder' || isComplete(record, day) || record.exceptions?.[day]?.cancelled || record.reminderAt?.slice(0, 10) !== day) continue;
    reminders.push({ key: `attached-${record.id}`, record, time: record.reminderAt.slice(11), attached: true,
      // An attached alert may precede its source event/task; open that source's date.
      day: record.date || day });
  }
  reminders.sort((a, b) => a.time.localeCompare(b.time) || a.key.localeCompare(b.key));
  return { events, allDay: events.filter(record => record.allDay), timed: events.filter(record => !record.allDay), tasks, reminders,
    dueCount: tasks.filter(record => !isComplete(record, day)).length + reminders.length };
}
