import { describe, expect, it } from 'vitest';
import { blankRecord, conflictsOn } from '../src/lib/domain.js';
import { calendarDay, monthDays, moveMonth, weekDays } from '../src/lib/calendar-view.js';

const record = (type, id, patch = {}) => ({ ...blankRecord(type, '2026-10-11'), id, title: id, ...patch });

describe('Calendar date browsing and day contents', () => {
  it('browses Monday-first weeks and months across years, leap days and short months', () => {
    expect(weekDays('2027-01-01')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
    expect(monthDays('2026-11-01')).toHaveLength(42);
    expect(monthDays('2026-11-01')[0]).toBe('2026-10-26');
    expect(moveMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(moveMonth('2028-01-31', 1)).toBe('2028-02-29');
    expect(moveMonth('2027-01-31', -1)).toBe('2026-12-31');
  });

  it('projects recurring exceptions and keeps all-day plans and deadlines separate from timed overlaps', () => {
    const records = [record('event', 'daily', { date: '2026-10-01', start: '09:00', end: '10:00', recurrence: 'daily', exceptions: { '2026-10-11': { changes: { start: '11:00', end: '12:00' } } } }),
      record('event', 'overlap', { start: '11:30', end: '12:30' }), record('event', 'all-day', { allDay: true }),
      record('event', 'cancelled', { recurrence: 'daily', exceptions: { '2026-10-11': { cancelled: true } } }),
      record('task', 'done', { completed: true }), record('task', 'open'), record('note', 'not-a-plan'), record('expense', 'not-a-plan-either')];
    const view = calendarDay(records, '2026-10-11');
    expect(view.allDay.map(r => r.id)).toEqual(['all-day']);
    expect(view.timed.map(r => r.id)).toEqual(['daily', 'overlap']);
    expect(view.tasks.map(r => r.id)).toEqual(['open', 'done']);
    expect(view.dueCount).toBe(1);
    expect([...conflictsOn(records, '2026-10-11')]).toEqual(['daily', 'overlap']);
    const monthEnd = record('task', 'monthly', { date: '2026-01-31', recurrence: 'monthly', completedDates: ['2026-02-28'] });
    expect(calendarDay([monthEnd], '2026-02-28').tasks[0].occurrenceDate).toBe('2026-02-28');
  });

  it('sorts standalone and attached alerts, opens the source date, and hides deleted/completed/cancelled alerts', () => {
    const alert = { reminderAt: '2026-10-11T08:00' };
    const records = [record('event', 'tomorrow', { ...alert, date: '2026-10-12', start: '10:00', end: '11:00' }),
      record('reminder', 'standalone', { start: '09:15', reminderAt: '2026-10-11T09:15' }),
      record('note', 'note', { ...alert, date: '', reminderAt: '2026-10-11T12:30' }),
      record('task', 'completed', { ...alert, completed: true }), record('event', 'deleted', { ...alert, deleted: true }),
      record('event', 'cancelled', { ...alert, exceptions: { '2026-10-11': { cancelled: true } } })];
    const view = calendarDay(records, '2026-10-11');
    expect(view.reminders.map(r => [r.record.id, r.day, r.attached])).toEqual([
      ['tomorrow', '2026-10-12', true], ['standalone', '2026-10-11', false], ['note', '2026-10-11', true]]);
    expect(view.dueCount).toBe(3); // Completed tasks stay visible for reopening but don't count as outstanding.
  });
});
