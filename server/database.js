import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';

let pool, poolUrl;
export function databasePool() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured');
  if (!pool || poolUrl !== process.env.DATABASE_URL) {
    if (pool) pool.end().catch(() => {});
    poolUrl = process.env.DATABASE_URL;
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 5000, connectionTimeoutMillis: 15000 });
    if (process.env.VERCEL) attachDatabasePool(pool);
    pool.on('error', () => {});
  }
  return pool;
}
export async function withOwner(ownerId, fn, suppliedPool = databasePool()) {
  const connection = await suppliedPool.connect();
  try {
    await connection.query('begin');
    await connection.query('set local role daymargin_app');
    await connection.query("select set_config('daymargin.user_id', $1, true)", [ownerId]);
    const result = await fn(connection);
    await connection.query('commit');
    return result;
  } catch (error) { await connection.query('rollback'); throw error; }
  finally { connection.release(); }
}
export class RecordStore {
  constructor(ownerId, suppliedPool) { this.ownerId = ownerId; this.pool = suppliedPool; }
  query(sql, params = []) { return withOwner(this.ownerId, c => c.query(sql, params), this.pool); }
  async list({ after = null, limit = 500, activeOnly = false } = {}) {
    const { rows } = await this.query(`select id,owner_id,data,version,deleted,created_at,updated_at from daymargin.records
      where owner_id=$1 and ($2::uuid is null or id>$2) and (not $3::boolean or not deleted) order by id limit $4`, [this.ownerId, after, activeOnly, limit]);
    return rows;
  }
  async get(ids) {
    return (await this.query('select id,owner_id,data,version,deleted,created_at,updated_at from daymargin.records where owner_id=$1 and id=any($2::uuid[])', [this.ownerId, ids])).rows;
  }
  async apply(op) {
    return (await this.query('select daymargin.apply_record_change($1,$2,$3,$4,$5) as result', [op.id, op.recordId, op.expectedVersion, op.data, op.deleted])).rows[0].result;
  }
  async proposal(id) { return (await this.query('select * from daymargin.finn_proposals where owner_id=$1 and id=$2', [this.ownerId, id])).rows[0]; }
  async operation(id) { return (await this.query('select result from daymargin.record_operations where owner_id=$1 and operation_id=$2', [this.ownerId, id])).rows[0]?.result; }
  async saveProposal(proposal) { await this.query('insert into daymargin.finn_proposals(id,owner_id,action,expires_at) values($1,$2,$3,$4)', [proposal.id, this.ownerId, proposal.action, proposal.expiresAt]); }
  async appliedProposal(id, recordId) { await this.query('update daymargin.finn_proposals set applied_record_id=$3 where owner_id=$1 and id=$2', [this.ownerId, id, recordId]); }
  async subscribe(subscription) {
    const { rows } = await this.query(`insert into daymargin.push_subscriptions(endpoint,owner_id,subscription) values($1,$2,$3)
      on conflict(endpoint) do update set subscription=excluded.subscription where daymargin.push_subscriptions.owner_id=excluded.owner_id returning endpoint`, [subscription.endpoint, this.ownerId, subscription]);
    if (!rows.length) throw new Error('Subscription belongs to another account');
  }
  async reserve(tokens, limits) {
    // Reservation function is inaccessible to the request role. Only server credentials run it.
    const { rows } = await (this.pool || databasePool()).query('select daymargin.reserve_finn_request($1,$2,$3,$4,$5) as id', [this.ownerId, tokens, limits.user, limits.shared, limits.minute]);
    return rows[0].id;
  }
  async finnLimitStatus(tokens, limits) {
    const { rows } = await (this.pool || databasePool()).query(`with times as (
      select clock_timestamp() as check_time, date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila' as day_start
    ) select count(*) filter (where owner_id=$1 and created_at>=day_start)::int as user_count,
      count(*) filter (where created_at>=day_start)::int as shared_count,
      coalesce(sum(reserved_tokens) filter (where created_at>=day_start),0)::int as day_tokens,
      count(*) filter (where created_at>check_time-interval '1 minute')::int as minute_count,
      greatest(1,ceil(extract(epoch from (max(created_at) filter (where created_at>check_time-interval '1 minute')+interval '1 minute'-check_time))))::int as minute_retry,
      greatest(1,ceil(extract(epoch from (day_start+interval '1 day'-check_time))))::int as day_retry
      from times left join daymargin.finn_requests on created_at>=day_start or created_at>check_time-interval '1 minute'
      group by check_time,day_start`, [this.ownerId]);
    const state = rows[0];
    if (state.user_count >= limits.user) return { reason: 'user_daily', retryAfter: state.day_retry };
    if (state.shared_count >= limits.shared || state.day_tokens + tokens > 200000) return { reason: 'shared_daily', retryAfter: state.day_retry };
    if (state.minute_count >= limits.minute) return { reason: 'minute', retryAfter: state.minute_retry };
    // The denied reservation can outlive its limit snapshot as another call finishes.
    return { reason: 'busy', retryAfter: 1 };
  }
  async finishReservation(id, usedTokens = null) {
    const actual = Number.isSafeInteger(usedTokens) && usedTokens > 0 && usedTokens <= 1000000 ? usedTokens : null;
    // Unknown usage stays reserved. Known usage includes reasoning/output tokens;
    // only the server can reconcile, and a completed lease cannot be refunded twice.
    await (this.pool || databasePool()).query(`update daymargin.finn_requests
      set finished=true,reserved_tokens=coalesce($3::integer,reserved_tokens)
      where id=$1 and owner_id=$2 and not finished`, [id, this.ownerId, actual]);
  }
}
