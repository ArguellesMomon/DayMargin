import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { blankRecord } from '../src/lib/domain.js';
import { emptySnapshot, mutateSnapshot, readAccount, writeAccount, clearAccount, reconcile } from '../src/lib/storage.js';
it('isolates accounts and clears only the signed-out cache', async () => {
  const a = mutateSnapshot(emptySnapshot(), { ...blankRecord('note'), title: 'Private A' });
  await writeAccount('account-a', a); await writeAccount('account-b', emptySnapshot());
  expect((await readAccount('account-b')).records).toEqual([]);
  await clearAccount('account-a'); expect((await readAccount('account-a')).records).toEqual([]);
});
it('retains queued offline changes and expected versions without duplicating record IDs', () => {
  let s = mutateSnapshot(emptySnapshot(), { ...blankRecord('task'), title: 'Task' }, { cloud: true });
  const r = s.records[0]; s = mutateSnapshot(s, { ...r, title: 'Edited' }, { cloud: true });
  expect(s.records).toHaveLength(1); expect(s.queue.map(q => q.expectedVersion)).toEqual([0,1]);
  expect(s.queue[0].id).not.toBe(s.queue[1].id);
});
it('does not overwrite unsynced local edits or resurrect remote tombstones', () => {
  const local = { ...blankRecord('note'), id: 'record', title: 'Local edit', version: 2 };
  const s = { ...emptySnapshot(), records: [local], queue: [{ recordId: local.id }] };
  const remote = { ...local, title: 'Remote edit', version: 3, deleted: true };
  expect(reconcile(s, [remote]).records[0].title).toBe('Local edit');
  const result = reconcile({ ...s, queue: [] }, [remote]); expect(result.records[0].deleted).toBe(true);
});
