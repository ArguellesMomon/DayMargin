import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { blankRecord } from '../src/lib/domain.js';
let db;
const a = '10000000-0000-4000-8000-000000000001', b = '20000000-0000-4000-8000-000000000002';
const id = '30000000-0000-4000-8000-000000000003', operation = '40000000-0000-4000-8000-000000000004';
const data = { ...blankRecord('task'), title: 'Original task' };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${a}'),('${b}');
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    create function auth.role() returns text language sql as 'select current_setting(''request.jwt.claim.role'', true)';
    grant usage on schema auth, public to authenticated, service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610110001_daymargin.sql', import.meta.url), 'utf8'));
}, 60000);
afterAll(async () => { await db?.close(); });
const asUser = async user => db.exec(`reset role; set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${user}';`);
const apply = async (op, recordId, version, fields, deleted = false) => (await db.query('select public.apply_record_change($1,$2,$3,$4,$5) as result', [op,recordId,version,fields,deleted])).rows[0].result;
it('applies the actual migration and enforces idempotent versioned writes', async () => {
  await asUser(a);
  const initial = await apply(operation,id,0,data); expect(initial.status).toBe('applied');
  const duplicate = await apply(operation,id,0,data); expect(duplicate.record.version).toBe(1);
  const edit = await apply(crypto.randomUUID(),id,1,{ ...data, title: 'First edit' }); expect(edit.record.version).toBe(2);
  const stale = await apply(crypto.randomUUID(),id,1,{ ...data, title: 'Stale edit' }); expect(stale.status).toBe('conflict');
});
it('blocks other-account reads, direct writes, and collisions against private IDs', async () => {
  await asUser(b);
  expect((await db.query('select * from public.records')).rows).toHaveLength(0);
  await expect(db.query('update public.records set deleted=true')).rejects.toThrow();
  const collision = await apply(crypto.randomUUID(),id,0,data); expect(collision).toEqual({ status: 'conflict', record: null });
});
it('rejects invalid amounts at the database boundary', async () => {
  await asUser(a);
  await expect(apply(crypto.randomUUID(),crypto.randomUUID(),0,{ ...blankRecord('expense'), amountCents: -10 })).rejects.toThrow();
  await expect(apply(crypto.randomUUID(),crypto.randomUUID(),0,{ ...blankRecord('event'), title: 'Repeating event', start: '09:00', end: '10:00', recurrence: 'daily', exceptions: { '2026-10-12': { changes: { end: '08:00' } } } })).rejects.toThrow();
});
it('keeps Finn quotas and proposal storage server-only, with atomic token reservations', async () => {
  await asUser(a);
  await expect(db.query('select public.reserve_finn_request($1,1000,10,80,2)',[a])).rejects.toThrow();
  await expect(db.query('select * from public.finn_proposals')).rejects.toThrow();
  await db.exec("reset role; set role service_role; set request.jwt.claim.role='service_role';");
  const first = (await db.query('select public.reserve_finn_request($1,5000,10,80,2) as id',[a])).rows[0].id; expect(first).toBeTruthy();
  await db.query('update public.finn_requests set finished=true where id=$1',[first]);
  const second = (await db.query('select public.reserve_finn_request($1,5000,10,80,2) as id',[b])).rows[0].id; expect(second).toBeNull();
});
