import { openDB } from 'idb';
import { recordSchema } from './domain.js';
const database = () => openDB('daymargin-v1', 1, { upgrade(db) { db.createObjectStore('accounts'); db.createObjectStore('preferences'); } });
export const emptySnapshot = () => ({ records: [], queue: [], conflicts: [], drafts: {}, chats: [], lastSync: null });
export async function readAccount(account) { return (await (await database()).get('accounts', account)) || emptySnapshot(); }
export async function writeAccount(account, value) { return (await database()).put('accounts', value, account); }
export async function clearAccount(account) { return (await database()).delete('accounts', account); }
export async function readPreferences() { return (await (await database()).get('preferences', 'appearance')) || { theme: 'system', reducedMotion: false }; }
export async function writePreferences(value) { return (await database()).put('preferences', value, 'appearance'); }

export function mutateSnapshot(snapshot, input, { cloud = false, deleted = false } = {}) {
  const data = recordSchema.parse(input);
  const old = snapshot.records.find(r => r.id === input.id);
  const id = input.id || crypto.randomUUID();
  const record = { ...data, id, version: (old?.version || 0) + 1, deleted,
    createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  return { ...snapshot, records: [...snapshot.records.filter(r => r.id !== id), record],
    queue: cloud ? [...snapshot.queue, { id: crypto.randomUUID(), recordId: id, expectedVersion: old?.version || 0, data, deleted }] : snapshot.queue };
}
export const fromServer = row => ({ ...row.data, id: row.id, version: row.version, deleted: row.deleted,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at });
export function reconcile(snapshot, remote) {
  // Pending/conflicting changes keep their local version until an explicit resolution.
  const pending = new Set([...snapshot.queue.map(q => q.recordId), ...snapshot.conflicts.map(c => c.recordId)]);
  const result = new Map(snapshot.records.map(r => [r.id, r]));
  for (const record of remote) if (!pending.has(record.id)) result.set(record.id, record);
  return { ...snapshot, records: [...result.values()], lastSync: new Date().toISOString() };
}
