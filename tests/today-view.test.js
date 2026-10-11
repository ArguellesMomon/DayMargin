import { describe, expect, it } from 'vitest';
import { blankRecord } from '../src/lib/domain.js';
import { todayView } from '../src/lib/today-view.js';

const day = '2026-10-11';
const now = new Date('2026-10-11T01:30:00Z'); // 9:30 AM in Manila.
const record = (type, id, patch = {}) => ({ ...blankRecord(type, day), id, title: id, updatedAt: now.toISOString(), ...patch });

describe('Today uses actual records and Manila time', () => {
  it('prioritizes an ongoing event before a later reminder, and treats all-day records separately', () => {
    const records = [record('event', 'all-day', { allDay: true }), record('event', 'earlier', { start: '08:00', end: '09:00' }),
      record('event', 'current', { start: '09:00', end: '10:00' }), record('reminder', 'later', { start: '10:15' })];
    const view = todayView(records, now);
    expect(view.next.record.id).toBe('current');
    expect(view.next.current).toBe(true);
    expect(view.agenda.find(item => item.record.id === 'earlier').earlier).toBe(true);
    expect(todayView(records, new Date('2026-10-11T02:05:00Z')).next.record.id).toBe('later');
    expect(todayView(records, new Date('2026-10-11T12:00:00Z')).next.record.id).toBe('all-day');
  });
  it('retains overdue and undated tasks while honoring repeat exceptions and completion', () => {
    const records = [record('task', 'undated', { date: '' }), record('task', 'future', { date: '2026-10-12' }),
      record('task', 'overdue', { date: '2026-10-09' }), record('task', 'done', { completed: true }),
      record('task', 'repeat', { date: '2026-10-10', recurrence: 'daily', exceptions: { [day]: { changes: { title: 'Today’s title' } } } }),
      record('task', 'cancelled', { recurrence: 'daily', exceptions: { [day]: { cancelled: true } } }),
      record('task', 'repeat-done', { recurrence: 'daily', completedDates: [day] })];
    const view = todayView(records, now);
    expect(view.tasks.map(item => item.id)).toEqual(['overdue', 'repeat', 'undated']);
    expect(view.tasks[1].title).toBe('Today’s title');
    expect(view.overdue).toBe(1);
  });
  it('keeps attached alerts linked to their source without duplicating standalone reminders', () => {
    const view = todayView([record('note', 'note', { reminderAt: `${day}T11:00` }),
      record('task', 'done', { completed: true, reminderAt: `${day}T10:00` }),
      record('reminder', 'standalone', { start: '12:00', reminderAt: `${day}T12:00` }),
      record('reminder', 'deleted', { deleted: true, start: '10:00' }),
      record('event', 'cancelled-source', { recurrence: 'daily', reminderAt: `${day}T13:00`, exceptions: { [day]: { cancelled: true } } })], now);
    expect(view.agenda.map(item => [item.record.id, item.time])).toEqual([['note', '11:00'], ['standalone', '12:00']]);
    expect(view.next.record.id).toBe('note');
  });
  it('rolls the date and expense totals over at Manila midnight with exact centavos', () => {
    const records = [record('expense', 'first', { amountCents: 10 }), record('expense', 'second', { amountCents: 20 }),
      record('expense', 'tomorrow', { date: '2026-10-12', amountCents: 500 }), record('expense', 'deleted', { deleted: true, amountCents: 999 })];
    expect(todayView(records, now).spending.totalCents).toBe(30);
    const tomorrow = todayView(records, new Date('2026-10-11T16:00:00Z'));
    expect(tomorrow.day).toBe('2026-10-12');
    expect(tomorrow.time).toBe('00:00');
    expect(tomorrow.spending.totalCents).toBe(500);
  });
});
