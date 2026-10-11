import { useEffect, useRef } from 'react';
import { ArrowRight, Check, Circle, FileText, CalendarDays, Bell, Wallet, Pin, X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dateLabel, isComplete, money, timeLabel, titleOf, today, toggleComplete } from '../lib/domain.js';
import { useDaymargin } from '../context.jsx';
import './FinnAvatar.css';

export const TYPE_META = {
  task: { icon: Circle, label: 'Task', description: 'A small step to get done' },
  reminder: { icon: Bell, label: 'Reminder', description: 'Something to remember' },
  note: { icon: FileText, label: 'Note', description: 'An idea worth keeping' },
  expense: { icon: Wallet, label: 'Expense', description: 'Spending, simply recorded' },
  event: { icon: CalendarDays, label: 'Event', description: 'A place in your schedule' },
};
export function FinnAvatar({ size = 'small', thinking = false, reply = 0 }) {
  return <span className={`finn-avatar ${size}`} role="img" aria-label="Finn, a fluffy white dog" data-motion={thinking ? 'thinking' : reply ? 'reply' : 'idle'} data-greeting={size !== 'small'}>
    <span key={reply} className="finn-sprite" aria-hidden="true" />
  </span>;
}
export function PageHeading({ eyebrow, title, children, action }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="page-description">{children}</p>}</div>{action}</header>;
}
export function Section({ label, count, action, children, className = '' }) {
  return <section className={`section ${className}`}><div className="section-heading"><h2><span className="margin-mark" />{label}{count !== undefined && <span className="count">{count}</span>}</h2>{action}</div>{children}</section>;
}
export function Empty({ icon: Icon = FileText, title, text, action }) {
  return <div className="empty"><Icon size={23} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p>{action}</div>;
}
export function EntryRow({ record, day, compact = false, overlap = false, asReminder = false }) {
  const { data, notify, preview } = useDaymargin();
  const Icon = asReminder ? Bell : TYPE_META[record.type].icon;
  const completed = isComplete(record, day || record.occurrenceDate || today());
  const occurrenceDay = day || record.occurrenceDate;
  const query = occurrenceDay ? `?day=${occurrenceDay}` : '';
  const pending = data.queue.some(q => q.recordId === record.id);
  async function complete() {
    try {
      const original = data.records.find(r => r.id === record.id);
      const next = toggleComplete(original, occurrenceDay || today());
      const saved = await data.save(next);
      const version = saved.records.find(r => r.id === original.id).version;
      notify(completed ? 'Task reopened.' : 'Task completed.', async () => { await data.save(original, { expectedVersion: version }); });
    } catch { /* Storage errors are shown globally. */ }
  }
  return <div className={`entry-row ${compact ? 'compact' : ''} ${completed && record.type === 'task' ? 'done' : ''}`}>
    {record.type === 'task' && !asReminder ? <button type="button" className="task-check" aria-label={`${completed ? 'Reopen' : 'Complete'} ${titleOf(record)}`} onClick={complete}>{completed ? <Check size={15} /> : null}</button> : <span className={`entry-icon ${record.type}`}><Icon size={19} strokeWidth={1.65} /></span>}
    <Link className="entry-content" to={`/record/${record.id}${query}`}>
      <span className="entry-title">{titleOf(record)}{record.pinned && <Pin size={12} aria-label="Pinned" />}</span>
      <span className="entry-meta">
        {asReminder && record.reminderAt ? `${timeLabel(record.reminderAt.slice(11))} · Attached ${record.type} reminder · In-app`
          : record.type === 'event' ? `${record.allDay ? 'All day' : `${timeLabel(record.start)} – ${timeLabel(record.end)}`}${record.location ? ` · ${record.location}` : ''}`
          : record.type === 'expense' ? `${record.category} · ${dateLabel(record.date)}`
          : record.type === 'reminder' ? `${dateLabel(occurrenceDay || record.date)} · ${timeLabel(record.start)} · In-app reminder`
          : record.type === 'note' ? record.body.replace(/\n/g, ' ').slice(0, 100) || 'Note'
          : record.date ? `${record.date < today() && record.recurrence === 'none' && !completed ? 'Overdue · ' : 'Due '}${dateLabel(occurrenceDay || record.date)}` : 'No due date'}
        {record.recurrence !== 'none' && ` · ${record.recurrence}`}
        {pending && !preview && ' · Waiting to sync'}
      </span>
      {overlap && <span className="overlap">Overlaps another event</span>}
    </Link>
    {record.type === 'expense' ? <span className="entry-amount">{money(record.amountCents)}</span> : record.tags?.[0] ? <span className="tag">{record.tags[0]}</span> : <ArrowRight className="row-arrow" size={15} />}
  </div>;
}
export function Dialog({ title, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => { dialog.close(); }; }, []);
  return <dialog aria-label={title} className={`dialog ${className}`} ref={ref} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="dialog-heading"><h2>{title}</h2><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
export function Capture({ onClose, day }) {
  return <Dialog title="Make a little room." onClose={onClose} className="capture"><p className="muted">What would you like to keep?</p><div className="capture-options">{Object.entries(TYPE_META).map(([type, { icon: Icon, label, description }]) => <Link key={type} to={`/new/${type}${day ? `?day=${day}` : ''}`} onClick={onClose}><span className="capture-icon"><Icon size={21} /></span><span><strong>{label}</strong><small>{description}</small></span><Plus size={17} /></Link>)}</div></Dialog>;
}
export function BackLink({ to = '/', children = 'Back' }) { return <Link className="back-link" to={to}><ArrowRight size={16} className="reverse" />{children}</Link>; }
