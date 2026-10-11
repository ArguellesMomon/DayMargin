import { useCallback, useEffect, useRef, useState } from 'react';
import { emptySnapshot, readAccount, writeAccount, mutateSnapshot, fromServer, reconcile } from '../lib/storage.js';
import { cloudConfigured, cloudRequest } from '../lib/cloud.js';
import { sampleRecords } from '../lib/sample.js';

export function useOrganizer(account, preview) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loadedAccount, setLoadedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const current = useRef(emptySnapshot());
  const serial = useRef(Promise.resolve());
  const generation = useRef(0);
  const syncLock = useRef(null);
  useEffect(() => {
    const gen = ++generation.current;
    setLoadedAccount(null); setLoading(true); setError(''); setSnapshot(emptySnapshot()); current.current = emptySnapshot();
    serial.current = Promise.resolve(); syncLock.current = null; setSyncing(false);
    if (!account) { setLoading(false); return; }
    readAccount(account).then(async value => {
      if (preview && !value.initialized) {
        value = { ...value, records: sampleRecords(), initialized: true };
        await writeAccount(account, value);
      }
      if (gen === generation.current) { current.current = value; setSnapshot(value); setLoadedAccount(account); setLoading(false); }
    }).catch(() => { if (gen === generation.current) { setError('Device storage could not be opened. Check your browser’s storage settings.'); setLoading(false); } });
    return () => { generation.current++; };
  }, [account, preview]);

  const transact = useCallback(fn => {
    const gen = generation.current;
    const operation = serial.current.catch(() => {}).then(async () => {
      if (!account || gen !== generation.current) throw new Error('Please reopen your account before saving.');
      const next = await fn(current.current);
      await writeAccount(account, next);
      if (gen !== generation.current) return;
      current.current = next; setSnapshot(next); setError('');
      return next;
    });
    serial.current = operation;
    return operation.catch(e => { if (gen === generation.current) setError(e.message || 'This change could not be saved. Please retry.'); throw e; });
  }, [account]);
  const save = useCallback((input, options = {}) => transact(s => {
    const existing = s.records.find(r => r.id === input.id);
    const expected = options.expectedVersion ?? input.version;
    if (existing && expected != null && expected !== existing.version) throw new Error('This entry changed. Review the latest version before saving.');
    return mutateSnapshot(s, input, { cloud: !preview, ...options });
  }), [transact, preview]);
  const draft = useCallback((key, value) => transact(s => ({ ...s, drafts: { ...s.drafts, [key]: value } })), [transact]);
  const clearDraft = useCallback(key => transact(s => { const drafts = { ...s.drafts }; delete drafts[key]; return { ...s, drafts }; }), [transact]);
  const chat = useCallback(messages => transact(s => ({ ...s, chats: messages })), [transact]);
  const resetPreview = useCallback(() => transact(() => ({ ...emptySnapshot(), initialized: true })), [transact]);

  const sync = useCallback(async () => {
    if (!account || preview || !cloudConfigured || !navigator.onLine || syncLock.current === generation.current) return;
    const gen = generation.current;
    syncLock.current = gen; setSyncing(true);
    try {
      await transact(async original => {
        let next = structuredClone(original);
        // Persist every acknowledgement before another network request. Retries reuse operation IDs.
        while (next.queue.length) {
          const op = next.queue[0];
          const data = await cloudRequest('/api/records', { method: 'POST', body: JSON.stringify(op) });
          if (gen !== generation.current) throw new Error('Account changed during synchronization.');
          if (data.status === 'conflict') {
            next.conflicts = [...next.conflicts.filter(c => c.recordId !== op.recordId), { recordId: op.recordId, remote: data.record ? fromServer(data.record) : null }];
            next.queue = next.queue.filter(q => q.recordId !== op.recordId);
          } else {
            next.queue.shift();
            if (!next.queue.some(q => q.recordId === op.recordId)) next.records = [...next.records.filter(r => r.id !== op.recordId), fromServer(data.record)];
          }
          await writeAccount(account, next);
          if (gen === generation.current) { current.current = next; setSnapshot(next); }
        }
        const remote = [];
        let cursor = null;
        do {
          const { records: rows, next: nextCursor } = await cloudRequest(`/api/records${cursor ? `?after=${cursor}` : ''}`);
          if (gen !== generation.current) throw new Error('Account changed during synchronization.');
          remote.push(...rows.map(fromServer)); cursor = nextCursor;
        } while (cursor);
        return reconcile(next, remote);
      });
    } catch { /* The transaction reports a recoverable, visible error. */ }
    finally { if (syncLock.current === gen) syncLock.current = null; if (gen === generation.current) setSyncing(false); }
  }, [account, preview, transact]);

  useEffect(() => {
    if (loading || preview || !account) return;
    sync();
    const timer = setInterval(sync, 45000);
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    return () => { clearInterval(timer); window.removeEventListener('online', sync); window.removeEventListener('focus', sync); };
  }, [loading, preview, account, sync]);
  useEffect(() => { if (snapshot.queue.length && !loading) sync(); }, [snapshot.queue.length, loading, sync]);

  const resolve = useCallback((id, keepLocal) => transact(s => {
    const conflict = s.conflicts.find(c => c.recordId === id);
    const local = s.records.find(r => r.id === id);
    if (!conflict) return s;
    let next = { ...s, conflicts: s.conflicts.filter(c => c.recordId !== id), records: s.records.filter(r => r.id !== id) };
    if (conflict.remote) next.records.push(conflict.remote);
    if (keepLocal && local) {
      // A remotely deleted record is restored as a NEW entry only after this explicit choice.
      next = mutateSnapshot(next, { ...local, id: conflict.remote?.deleted ? undefined : id }, { cloud: true, deleted: local.deleted });
    }
    return next;
  }), [transact]);
  const visible = loadedAccount === account ? snapshot : emptySnapshot();
  return { ...visible, loading: loading || Boolean(account && loadedAccount !== account), error, syncing, save, draft, clearDraft, chat, sync, resolve, resetPreview, flush: () => serial.current };
}
