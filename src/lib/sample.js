import { addDays, blankRecord, today } from './domain.js';
export function sampleRecords() {
  const day = today();
  const items = [
    { type: 'event', title: 'Coffee with Andrea', date: day, start: '15:00', end: '16:00', location: 'The neighborhood café', body: 'Catch up and talk through the weekend.' },
    { type: 'event', title: 'A little time for a walk', date: addDays(day, 1), start: '17:30', end: '18:00' },
    { type: 'task', title: 'Send the project proposal', date: day, body: 'One final proofread, then send it over.', tags: ['Work'] },
    { type: 'task', title: 'Pick up the laundry', date: day, tags: ['Personal'] },
    { type: 'task', title: 'Book a dental appointment', date: addDays(day, -1), body: 'Ask about a Saturday appointment.' },
    { type: 'note', title: 'A few ideas for the weekend', body: 'Visit the Saturday market.\nTry the new café near home.\nLeave Sunday afternoon open.', pinned: true, tags: ['Personal'] },
    { type: 'note', title: 'The next small step', body: 'Keep the proposal focused. A clear first step is more useful than a long list of possibilities.', tags: ['Work'] },
    { type: 'expense', title: 'Lunch at the corner café', amountCents: 18500, category: 'Food', date: day },
    { type: 'expense', title: 'Jeepney fare', amountCents: 3000, category: 'Transport', date: day },
    { type: 'expense', title: 'Mobile data', amountCents: 9900, category: 'Load/data', date: addDays(day, -2) },
  ];
  return items.map((r, i) => ({ ...blankRecord(r.type), ...r, id: crypto.randomUUID(), version: 1,
    updatedAt: new Date(Date.now() - i * 60000).toISOString(), createdAt: new Date().toISOString(), deleted: false }));
}
