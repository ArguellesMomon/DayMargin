import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { blankRecord } from '../src/lib/domain.js';
import { RecordStore } from '../server/database.js';
let db;
const a = '10000000-0000-4000-8000-000000000001', b = '20000000-0000-4000-8000-000000000002';
const id = '30000000-0000-4000-8000-000000000003', op = '40000000-0000-4000-8000-000000000004';
const data = { ...blankRecord('task'), title: 'Private task' };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema neon_auth; create table neon_auth."user"(id uuid primary key); insert into neon_auth."user" values('${a}'),('${b}');`);
  await db.exec(await readFile(new URL('../neon/migrations/202610110002_daymargin.sql', import.meta.url), 'utf8'));
}, 60000);
afterAll(async () => { await db?.close(); });
const asUser = user => db.exec(`reset role; set role daymargin_app; set daymargin.user_id='${user}';`);
const apply = async (operation, record, version, fields, deleted = false) => (await db.query('select daymargin.apply_record_change($1,$2,$3,$4,$5) as result', [operation, record, version, fields, deleted])).rows[0].result;
it('executes the Neon migration and preserves receipts, versions, conflicts and tombstones', async () => {
  await asUser(a);
  expect((await apply(op, id, 0, data)).record.version).toBe(1);
  expect((await apply(op, id, 0, data)).record.version).toBe(1);
  expect((await apply(crypto.randomUUID(), id, 1, { ...data, title: 'Updated' })).record.version).toBe(2);
  expect((await apply(crypto.randomUUID(), id, 1, data)).status).toBe('conflict');
  expect((await apply(crypto.randomUUID(), id, 2, data, true)).record.deleted).toBe(true);
});
it('protects records, receipts, proposals and subscriptions between users', async () => {
  await asUser(a);
  await db.query('insert into daymargin.finn_proposals(id,owner_id,action,expires_at) values($1,$2,$3,now())', [crypto.randomUUID(), a, {}]);
  await db.query('insert into daymargin.push_subscriptions(endpoint,owner_id,subscription) values($1,$2,$3)', ['https://example.com/private', a, {}]);
  await asUser(b);
  for (const table of ['records', 'record_operations', 'finn_proposals', 'push_subscriptions']) expect((await db.query(`select * from daymargin.${table}`)).rows).toHaveLength(0);
  await expect(db.query('update daymargin.records set deleted=false')).rejects.toThrow();
  expect(await apply(crypto.randomUUID(), id, 0, data)).toEqual({ status: 'conflict', record: null });
  await expect(db.query('insert into daymargin.finn_proposals(id,owner_id,action,expires_at) values($1,$2,$3,now())', [crypto.randomUUID(), a, {}])).rejects.toThrow();
});
it('rejects nulls, invalid expenses and invalid recurrence exceptions', async () => {
  await asUser(a);
  await expect(apply(crypto.randomUUID(), crypto.randomUUID(), 0, null)).rejects.toThrow();
  await expect(apply(crypto.randomUUID(), crypto.randomUUID(), null, data)).rejects.toThrow();
  await expect(apply(crypto.randomUUID(), crypto.randomUUID(), 0, { ...blankRecord('expense'), amountCents: -1 })).rejects.toThrow();
  await expect(apply(crypto.randomUUID(), crypto.randomUUID(), 0, { ...blankRecord('event'), title: 'Event', start: '09:00', end: '10:00', recurrence: 'daily', exceptions: { '2026-10-12': { changes: { end: '08:00' } } } })).rejects.toThrow();
});
it('keeps shared AI reservations server-only and atomically bounded', async () => {
  await asUser(a);
  await expect(db.query('select daymargin.reserve_finn_request($1,5000,10,80,2)', [a])).rejects.toThrow();
  await expect(db.query('select * from daymargin.finn_requests')).rejects.toThrow();
  await db.exec('reset role');
  const first = (await db.query('select daymargin.reserve_finn_request($1,5000,10,80,2) as id', [a])).rows[0].id;
  expect(first).toBeTruthy();
  await db.query('update daymargin.finn_requests set finished=true where id=$1', [first]);
  expect((await db.query('select daymargin.reserve_finn_request($1,5000,10,80,2) as id', [b])).rows[0].id).toBeNull();
});
it('reconciles provider usage so the second ordinary question fits, while preserving actual limits', async () => {
  await db.exec('reset role; delete from daymargin.finn_requests');
  const store = new RecordStore(a, db);
  const limits = { user: 10, shared: 80, minute: 2 };
  const first = await store.reserve(3388, limits);
  expect(first).toBeTruthy();
  expect(await store.reserve(3388, limits)).toBeNull(); // one active request
  await store.finishReservation(first, 1000);
  const second = await store.reserve(3388, limits);
  expect(second).toBeTruthy();
  await store.finishReservation(second, 1000);
  expect(await store.reserve(3388, limits)).toBeNull(); // two requests per minute
  expect(await store.finnLimitStatus(3388, limits)).toEqual({ reason: 'minute', retryAfter: expect.any(Number) });
  await store.finishReservation(first, 1); // completed accounting is immutable
  expect((await db.query('select reserved_tokens from daymargin.finn_requests where id=$1', [first])).rows[0].reserved_tokens).toBe(1000);
  await db.exec("update daymargin.finn_requests set created_at=clock_timestamp()-interval '2 minutes'");
  expect(await store.reserve(3388, limits)).toBeTruthy();
  await db.exec('delete from daymargin.finn_requests');
});
it('keeps unknown usage conservative and reports daily limits independently of minute limits', async () => {
  await db.exec('reset role; delete from daymargin.finn_requests');
  const store = new RecordStore(a, db), other = new RecordStore(b, db);
  const limits = { user: 1, shared: 80, minute: 2 };
  const first = await store.reserve(3388, limits);
  await other.finishReservation(first, 100); // ownership cannot change another lease
  await store.finishReservation(first, -10); // invalid usage cannot refund
  expect((await db.query('select reserved_tokens from daymargin.finn_requests where id=$1', [first])).rows[0].reserved_tokens).toBe(3388);
  expect(await store.finnLimitStatus(3388, limits)).toEqual({ reason: 'user_daily', retryAfter: expect.any(Number) });
  expect(await other.finnLimitStatus(3388, { ...limits, shared: 1 })).toEqual({ reason: 'shared_daily', retryAfter: expect.any(Number) });
  await db.exec('delete from daymargin.finn_requests');
});
it('cascades application data when the managed identity is deleted', async () => {
  await db.exec('reset role');
  await db.query('delete from neon_auth."user" where id=$1', [a]);
  for (const table of ['records', 'record_operations', 'finn_requests', 'finn_proposals', 'push_subscriptions']) expect((await db.query(`select * from daymargin.${table} where owner_id=$1`, [a])).rows).toHaveLength(0);
});
