import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url || new URL(url).hostname.includes('-pooler')) throw new Error('Migrations require DATABASE_URL_UNPOOLED (direct connection).');
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('begin');
  await client.query('select pg_advisory_xact_lock(7151207)');
  await client.query('create table if not exists public.daymargin_migrations(name text primary key, checksum text not null, applied_at timestamptz not null default now())');
  const directory = new URL('../neon/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prior = (await client.query('select checksum from public.daymargin_migrations where name=$1', [name])).rows[0];
    if (prior) {
      if (prior.checksum !== checksum) throw new Error(`Applied migration changed: ${name}. Create a new migration instead.`);
      console.log(`Already applied: ${name}`); continue;
    }
    await client.query(sql);
    await client.query('insert into public.daymargin_migrations(name,checksum) values($1,$2)', [name, checksum]);
    console.log(`Applied: ${name}`);
  }
  await client.query('commit');
} catch (error) { await client.query('rollback'); throw error; }
finally { await client.end(); }
