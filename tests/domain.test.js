import { describe, expect, it } from 'vitest';
import { blankRecord, conflictsOn, expenseSummary, occursOn, parseAmount, periodRange, recordSchema, today, toggleComplete } from '../src/lib/domain.js';
import { buildContext } from '../src/lib/finn-context.js';
import { validateFinnOutput } from '../server/finn.js';

const id = '10000000-0000-4000-8000-000000000001';
const record = (type, extra = {}) => ({ ...blankRecord(type, '2026-10-11'), id, version: 1, updatedAt: '2026-10-11T01:00:00Z', deleted: false, ...extra });
describe('Money and Manila dates', () => {
  it('uses integer centavos and rejects negatives, zero, and fractional centavos', () => {
    expect(parseAmount('185.10')).toBe(18510); expect(parseAmount('0.10')).toBe(10);
    for (const bad of ['-1', '0', '1.999', '1e6', 'NaN', '']) expect(parseAmount(bad)).toBeNull();
  });
  it('uses Manila midnight instead of the device timezone', () => {
    expect(today(new Date('2026-10-10T16:01:00Z'))).toBe('2026-10-11');
    expect(today(new Date('2026-10-10T15:59:00Z'))).toBe('2026-10-10');
    expect(periodRange('week', '2026-10-11')).toEqual({ start: '2026-10-05', end: '2026-10-11' });
  });
  it('excludes reminders/deleted expenses and recalculates selected ranges', () => {
    const entries = [record('expense', { amountCents: 10, category: 'Food' }), record('expense', { amountCents: 20, category: 'Food' }), record('expense', { amountCents: 300, deleted: true }), record('reminder', { amountCents: null }), record('expense', { amountCents: 999, date: '2026-10-12' })];
    expect(expenseSummary(entries, { start: '2026-10-11', end: '2026-10-11' }).totalCents).toBe(30);
  });
  it('rejects impossible dates and reversed event times', () => {
    expect(recordSchema.safeParse(record('event', { title: 'Test', date: '2026-02-30', start: '09:00', end: '10:00' })).success).toBe(false);
    expect(recordSchema.safeParse(record('event', { title: 'Test', start: '10:00', end: '09:00' })).success).toBe(false);
  });
});
describe('Recurrence and overlaps', () => {
  it('anchors monthly repeats to the original day across shorter and leap months', () => {
    const r = record('event', { date: '2024-01-31', recurrence: 'monthly' });
    for (const day of ['2024-02-29', '2024-03-31', '2024-04-30', '2025-02-28']) expect(occursOn(r, day)).toBe(true);
    expect(occursOn(r, '2024-03-29')).toBe(false); expect(occursOn(r, '2023-12-31')).toBe(false);
  });
  it('preserves cancelled occurrences and independent completion history', () => {
    const r = record('task', { recurrence: 'daily', exceptions: { '2026-10-12': { cancelled: true } } });
    expect(occursOn(r, '2026-10-12')).toBe(false);
    const completed = toggleComplete(r, '2026-10-11');
    expect(completed.completedDates).toEqual(['2026-10-11']); expect(completed.completed).toBe(false);
    expect(toggleComplete(completed, '2026-10-11').completedDates).toEqual([]);
  });
  it('does not treat task deadlines or touching event endpoints as overlaps', () => {
    const a = record('event', { start: '09:00', end: '10:00' });
    const b = record('event', { id: 'b', start: '10:00', end: '11:00' });
    const task = record('task', { id: 'c', start: '09:30', end: '10:30' });
    expect(conflictsOn([a,b,task], '2026-10-11').size).toBe(0);
    expect(conflictsOn([a,{ ...b, start: '09:30' }], '2026-10-11').size).toBe(2);
  });
});
describe('Finn grounding and proposals', () => {
  const now = new Date('2026-10-11T01:00Z');
  it('never includes excluded/deleted entries in context or spending totals', () => {
    const records = [record('expense', { amountCents: 10 }), record('expense', { id: 'x', amountCents: 9900, excluded: true }), record('note', { id: 'y', title: 'PRIVATE', deleted: true })];
    const context = buildContext(records, 'Summarize spending today', now);
    expect(context.calculatedSpending.totalCents).toBe(10); expect(context.records).toHaveLength(1);
    expect(JSON.stringify(context)).not.toContain('PRIVATE');
  });
  it('uses explicit expense ranges and previous-week calculations rather than substituting this month', () => {
    const records = [record('expense', { amountCents: 10, date: '2026-09-30' }), record('expense', { amountCents: 20, date: '2026-10-01' }), record('expense', { amountCents: 99 })];
    expect(buildContext(records,'Spending from 2026-09-30 to 2026-10-01',now).calculatedSpending.totalCents).toBe(30);
    expect(buildContext(records,'Spending last week',now).calculatedSpending.totalCents).toBe(30);
  });
  it('rejects invented citations and unauthorized edits', () => {
    const r = record('task', { title: 'One task' });
    const context = buildContext([r], 'today', now);
    const other = '20000000-0000-4000-8000-000000000002';
    expect(() => validateFinnOutput({ answer: 'One task.', sources: [id, other], action: null }, context, [r])).toThrow();
    expect(() => validateFinnOutput({ answer: 'Change.', sources: [], action: { kind: 'edit', recordId: other, data: { title: 'Changed' } } }, context, [r])).toThrow();
  });
  it('prepares a valid versioned proposal without mutating records', () => {
    const r = record('task', { title: 'Original' }); const context = buildContext([r], 'today', now);
    const output = validateFinnOutput({ answer: 'Review this change.', sources: [id], action: { kind: 'edit', recordId: id, data: { title: 'New title' } } }, context, [r]);
    expect(output.action.expectedVersion).toBe(1); expect(output.action.data.title).toBe('New title'); expect(r.title).toBe('Original');
    expect(() => validateFinnOutput({ answer: 'A change', sources: [], action: { kind: 'edit', recordId: id, data: { owner_id: 'someone' } } }, context, [r])).toThrow();
  });
});
