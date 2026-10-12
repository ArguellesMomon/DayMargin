import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Pencil, Pin, ShieldCheck, Trash2, MessageCircle, Check, Bell, CalendarDays } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { BackLink, Dialog, TYPE_META } from '../components/UI.jsx';
import { dateLabel, isComplete, money, occurrence, timeLabel, titleOf, today, toggleComplete, isValidDate } from '../lib/domain.js';
import { organizerReturnTo } from '../lib/navigation.js';

export default function RecordPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { data, notify, preview } = useDaymargin();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const original = data.records.find(r => r.id === id && !r.deleted);
  if (!original) return <div className="empty"><BackLink to="/library" /><h1>This entry is no longer available.</h1></div>;
  const day = isValidDate(search.get('day')) ? search.get('day') : original.date || today();
  const r = occurrence(original, day);
  const Icon = TYPE_META[r.type].icon;
  const returnTo = organizerReturnTo(location.state?.returnTo, r.type === 'event' ? `/calendar?date=${day}` : '/library');
  const calendarDate = ['event', 'reminder', 'task'].includes(r.type) && r.date ? day : r.reminderAt?.slice(0, 10);
  const query = search.get('day') ? `?day=${day}` : '';
  const pending = data.queue.some(q => q.recordId === id);
  async function update(patch) { try { await data.save({ ...original, ...patch }); } catch { /* Visible storage error. */ } }
  async function remove(scope) {
    setBusy(true);
    try {
      const next = scope === 'occurrence' ? await data.save({ ...original, exceptions: { ...original.exceptions, [day]: { cancelled: true } } })
        : await data.save(original, { deleted: true });
      const version = next.records.find(r => r.id === original.id).version;
      setConfirmDelete(false); navigate(returnTo); notify(scope === 'occurrence' ? 'Occurrence removed.' : 'Entry deleted.', () => data.save(original, { expectedVersion: version }));
    } catch { /* The storage error remains visible; the entry is preserved. */ }
    finally { setBusy(false); }
  }
  return <div className={`dm-page record-page record-${r.type}`}><BackLink to={returnTo} children={returnTo.startsWith('/calendar') ? 'Back to calendar' : 'Back to library'} />
    <div className="record-type"><Icon size={18} /><span>{TYPE_META[r.type].label}</span>{r.excluded && <span className="private-label"><ShieldCheck size={13} />Excluded from Finn</span>}</div>
    <h1>{r.type === 'expense' ? money(r.amountCents) : titleOf(r)}</h1>
    {r.type === 'expense' && <h2 className="expense-description">{titleOf(r)}</h2>}
    <div className="record-metadata">{r.date && <span>{dateLabel(r.recurrence === 'none' ? r.date : day, { weekday: 'short', year: 'numeric' })}</span>}{r.type === 'event' && <span>{r.allDay ? 'All day' : `${timeLabel(r.start)} – ${timeLabel(r.end)}`}</span>}{r.type === 'reminder' && <span>{timeLabel(r.start)}</span>}{r.type === 'expense' && <span>{r.category} · PHP</span>}{['event', 'reminder'].includes(r.type) && <span>Asia/Manila</span>}{r.recurrence !== 'none' && <span>Repeats {r.recurrence}</span>}</div>
    {r.location && <p className="record-location">{r.location}</p>}
    {r.body ? <div className="note-body">{r.body.split('\n').map((line, index) => line.startsWith('# ') ? <h2 key={index}>{line.slice(2)}</h2> : <p key={index}>{line || '\u00a0'}</p>)}</div> : null}
    {r.tags.length > 0 && <div className="record-tags">{r.tags.map(t => <Link className="tag" key={t} to={`/library?q=${encodeURIComponent(t)}`}>{t}</Link>)}</div>}
    {(r.type === 'reminder' || r.reminderAt) && <div className="reminder-status"><Bell size={18} /><div><strong>{r.type === 'reminder' ? 'In-app reminder' : `Reminder · ${r.reminderAt.replace('T', ' ')}`}</strong><p><Link to="/settings#reminders">Notification setup</Link></p></div></div>}
    <div className="record-actions"><Link className="button primary" to={`/record/${id}/edit${query}`} state={{ returnTo }}><Pencil size={16} />Edit entry</Link>{calendarDate && <Link className="button subtle" to={`/calendar?date=${calendarDate}`}><CalendarDays size={16} />View on calendar</Link>}{r.type === 'task' && <button className="button subtle" onClick={() => update(toggleComplete(original, day))}><Check size={16} />{isComplete(original, day) ? 'Reopen task' : 'Complete task'}</button>}{!r.excluded && <Link className="button subtle" to={`/finn?question=${encodeURIComponent(`Help me work through this ${r.type}: ${titleOf(r)}`)}`}><MessageCircle size={16} />Ask Finn</Link>}</div>
    <div className="secondary-actions"><button onClick={() => update({ pinned: !r.pinned })}><Pin size={16} />{r.pinned ? 'Unpin entry' : 'Pin entry'}</button><button onClick={() => update({ excluded: !r.excluded })}><ShieldCheck size={16} />{r.excluded ? 'Allow Finn to use this entry' : 'Exclude from Finn'}</button><button className="danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={16} />Delete</button></div>
    <p className="record-save-status">{preview ? 'Saved on this device · Local preview' : pending ? 'Saved on this device · Waiting to sync' : data.lastSync ? 'Synced' : 'Saved on this device'}</p>
    {confirmDelete && <Dialog title={r.recurrence === 'none' ? 'Delete this entry?' : 'Remove this repeating entry?'} onClose={() => setConfirmDelete(false)}><p>{titleOf(r)}{r.type === 'expense' ? ` · ${money(r.amountCents)}` : ''}</p><div className="dialog-actions"><button className="button subtle" onClick={() => setConfirmDelete(false)}>Cancel</button>{r.recurrence !== 'none' && <button className="button subtle" disabled={busy} onClick={() => remove('occurrence')}>This occurrence</button>}<button className="button danger" disabled={busy} onClick={() => remove('series')}>{r.recurrence !== 'none' ? 'Delete series' : 'Delete entry'}</button></div></Dialog>}
  </div>;
}
