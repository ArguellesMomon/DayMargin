import { z } from 'zod';

export const TYPES = ['task', 'reminder', 'note', 'expense', 'event'];
export const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Load/data', 'Other'];
export const ZONE = 'Asia/Manila';
const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === value;
}, 'Choose a valid date.');
const timeValue = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const optionalDate = z.union([dateValue, z.literal('')]).default('');
const optionalTime = z.union([timeValue, z.literal('')]).default('');
export const isValidDate = value => dateValue.safeParse(value).success;
export const recordSchema = z.object({
  type: z.enum(TYPES), title: z.string().trim().max(160).default(''), body: z.string().max(20000).default(''),
  date: optionalDate, start: optionalTime, end: optionalTime, allDay: z.boolean().default(false),
  location: z.string().max(200).default(''), amountCents: z.number().int().positive().max(99999999999).nullable().default(null),
  category: z.string().trim().min(1, 'Choose or enter a category.').max(60).default('Other'), tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  pinned: z.boolean().default(false), excluded: z.boolean().default(false), completed: z.boolean().default(false),
  completedDates: z.array(dateValue).max(10000).default([]),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  reminderAt: z.string().max(40).default(''),
  exceptions: z.record(dateValue, z.object({ cancelled: z.boolean().optional(), changes: z.object({
    title: z.string().trim().min(1).max(160).optional(), body: z.string().max(20000).optional(),
    start: optionalTime.optional(), end: optionalTime.optional(), allDay: z.boolean().optional(),
    location: z.string().max(200).optional(),
  }).optional() })).default({}),
}).superRefine((r, ctx) => {
  const error = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (!r.title && r.type !== 'note' && r.type !== 'expense') error('title', 'Give this entry a title.');
  if (r.type === 'note' && !r.title && !r.body.trim()) error('body', 'Write a title or a note.');
  if (['expense', 'event', 'reminder'].includes(r.type) && !r.date) error('date', 'Choose a date.');
  if (r.type === 'expense' && r.amountCents === null) error('amountCents', 'Enter an amount greater than zero.');
  if (r.type === 'reminder' && !r.start) error('start', 'Choose a reminder time.');
  if (r.type === 'event' && !r.allDay && (!r.start || !r.end || r.end <= r.start)) error('end', 'End time must be after start time on the same day.');
  if (r.recurrence !== 'none' && (!r.date || !['task', 'reminder', 'event'].includes(r.type))) error('recurrence', 'A repeat needs a dated task, reminder, or event.');
  if (r.reminderAt && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.reminderAt)) error('reminderAt', 'Choose a valid reminder date and time.');
  if (r.reminderAt && (!dateValue.safeParse(r.reminderAt.slice(0, 10)).success || !timeValue.safeParse(r.reminderAt.slice(11)).success)) error('reminderAt', 'Choose a valid reminder date and time.');
});
export const money = cents => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format((cents || 0) / 100);
export function parseAmount(value) {
  const clean = String(value).trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(clean)) return null;
  const [peso, cent = ''] = clean.split('.');
  const amount = Number(peso) * 100 + Number(cent.padEnd(2, '0'));
  return amount > 0 ? amount : null;
}
export function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = name => parts.find(p => p.type === name).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const addDays = (day, count) => new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export function dateLabel(day, options = {}) {
  if (!day) return 'No date';
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC', ...options }).format(new Date(`${day}T00:00:00Z`));
}
export const timeLabel = time => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
export const titleOf = r => r.title || r.body?.split('\n').find(line => line.trim())?.slice(0, 100) || (r.type === 'expense' ? r.category : 'Untitled note');
export function occursOn(record, day) {
  if (!record.date || day < record.date || record.deleted) return false;
  if (record.exceptions?.[day]?.cancelled) return false;
  if (!record.recurrence || record.recurrence === 'none') return record.date === day;
  const distance = (Date.parse(`${day}T00:00Z`) - Date.parse(`${record.date}T00:00Z`)) / 86400000;
  if (record.recurrence === 'daily') return true;
  if (record.recurrence === 'weekly') return distance % 7 === 0;
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d === Math.min(Number(record.date.slice(8)), last);
}
export const occurrence = (record, day) => ({ ...record, ...record.exceptions?.[day]?.changes, occurrenceDate: day });
export const isComplete = (record, day) => record.recurrence !== 'none' ? record.completedDates?.includes(day) : record.completed;
export function recordsOn(records, day) {
  return records.filter(r => !r.deleted && occursOn(r, day)).map(r => occurrence(r, day));
}
export function conflictsOn(records, day) {
  const events = recordsOn(records, day).filter(r => r.type === 'event' && !r.allDay);
  return new Set(events.filter(a => events.some(b => b.id !== a.id && a.start < b.end && b.start < a.end)).map(r => r.id));
}
export function periodRange(period, anchor = today(), custom = {}) {
  if (period === 'custom') return { start: isValidDate(custom.start) ? custom.start : anchor, end: isValidDate(custom.end) ? custom.end : anchor };
  if (period === 'today') return { start: anchor, end: anchor };
  if (period === 'week') {
    const weekday = new Date(`${anchor}T00:00Z`).getUTCDay();
    const start = addDays(anchor, -((weekday + 6) % 7));
    return { start, end: addDays(start, 6) };
  }
  const [y, m] = anchor.split('-').map(Number);
  return { start: `${anchor.slice(0, 7)}-01`, end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}
export function expenseSummary(records, range) {
  const entries = records.filter(r => !r.deleted && r.type === 'expense' && r.date >= range.start && r.date <= range.end);
  const categories = {};
  for (const r of entries) categories[r.category] = (categories[r.category] || 0) + r.amountCents;
  return { totalCents: entries.reduce((sum, r) => sum + r.amountCents, 0), categories, entries };
}
export function blankRecord(type, day = today()) {
  return { type, title: '', body: '', date: type === 'note' ? '' : day, start: '', end: '', allDay: false,
    location: '', amountCents: null, category: 'Other', tags: [], pinned: false, excluded: false,
    completed: false, completedDates: [], recurrence: 'none', reminderAt: '', exceptions: {} };
}
export function toggleComplete(record, day = today()) {
  return record.recurrence !== 'none'
    ? { ...record, completedDates: isComplete(record, day) ? record.completedDates.filter(d => d !== day) : [...record.completedDates, day] }
    : { ...record, completed: !record.completed };
}
