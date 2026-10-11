import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Bell, Heading, List, ListChecks, ArrowLeft } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { BackLink, Dialog, TYPE_META } from '../components/UI.jsx';
import { blankRecord, CATEGORIES, money, parseAmount, recordSchema, titleOf, today } from '../lib/domain.js';
import { enableNotifications, notificationStatus } from '../lib/notifications.js';

export default function Editor() {
  const { data, notify } = useDaymargin();
  const { id, type: routeType } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = useLocation().state?.returnTo;
  const existing = id ? data.records.find(r => r.id === id && !r.deleted) : null;
  const type = existing?.type || routeType;
  const draftKey = id || `new-${type}`;
  const occurrenceDay = search.get('day');
  const repeating = existing?.recurrence !== 'none' && Boolean(existing) && Boolean(occurrenceDay);
  const [scope, setScope] = useState(repeating ? '' : 'series');
  const base = data.drafts[draftKey] || existing || blankRecord(TYPE_META[type] ? type : 'note', search.get('day') || today());
  const [form, setForm] = useState(base);
  const [amount, setAmount] = useState(base.editorAmount ?? (base.amountCents ? (base.amountCents / 100).toFixed(2) : ''));
  const [tagText, setTagText] = useState(base.editorTags ?? base.tags.join(', '));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(Boolean(data.drafts[draftKey]));
  const [draftStatus, setDraftStatus] = useState(data.drafts[draftKey] ? 'Draft restored' : '');
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(Boolean(base.reminderAt || base.tags.length || base.pinned || base.excluded));
  const noteRef = useRef(null);
  const savedRef = useRef(false);
  useEffect(() => {
    if (!changed || savedRef.current) return;
    setDraftStatus('Saving draft…');
    let active = true;
    // Begin persistence immediately. Navigation must not cancel an unsaved draft.
    data.draft(draftKey, { ...form, editorAmount: amount, editorTags: tagText, amountCents: parseAmount(amount), tags: tagText.split(',').map(t => t.trim()).filter(Boolean) })
      .then(() => { if (active) setDraftStatus('Draft saved on this device'); })
      .catch(() => { if (active) setDraftStatus('Draft could not be saved. Keep this page open.'); });
    return () => { active = false; };
  }, [form, amount, tagText, changed, draftKey, data.draft]);
  useEffect(() => {
    const warn = e => { if (changed && draftStatus !== 'Draft saved on this device') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [changed, draftStatus]);
  const field = (name, value) => { setChanged(true); setForm(f => ({ ...f, [name]: value })); setErrors(e => ({ ...e, [name]: '' })); };
  const textField = (name, label, props = {}) => <label>{label}<input value={form[name]} onChange={e => field(name, e.target.value)} aria-invalid={Boolean(errors[name])} {...props} />{errors[name] && <small className="field-error">{errors[name]}</small>}</label>;
  if (!TYPE_META[type] || id && !existing) return <div className="empty"><BackLink to="/library" /><h1>This entry is no longer available.</h1></div>;
  const selectScope = value => {
    setScope(value);
    if (value === 'occurrence') setForm(f => ({ ...f, ...existing.exceptions?.[occurrenceDay]?.changes }));
  };
  function insertNote(prefix) {
    const node = noteRef.current;
    const position = node.selectionStart;
    const before = form.body.slice(0, position);
    const lineStart = before.lastIndexOf('\n') + 1;
    field('body', `${form.body.slice(0, lineStart)}${prefix}${form.body.slice(lineStart)}`);
    requestAnimationFrame(() => { node.focus(); node.setSelectionRange(position + prefix.length, position + prefix.length); });
  }
  async function close() {
    if (changed && !savedRef.current) {
      try { await data.draft(draftKey, { ...form, editorAmount: amount, editorTags: tagText, amountCents: parseAmount(amount), tags: tagText.split(',').map(t => t.trim()).filter(Boolean) }); }
      catch { return; }
    }
    navigate(existing ? `/record/${id}${occurrenceDay ? `?day=${occurrenceDay}` : ''}` : '/library', { state: { returnTo } });
  }
  async function submit(event) {
    event.preventDefault();
    const input = { ...form, amountCents: type === 'expense' ? parseAmount(amount) : null, tags: tagText.split(',').map(t => t.trim()).filter(Boolean) };
    const result = recordSchema.safeParse(input);
    if (!result.success) { const map = {}; for (const issue of result.error.issues) map[issue.path[0]] ||= issue.message; setErrors(map); if (map.tags || map.reminderAt) setExtrasOpen(true); return; }
    if (existing && form.version !== existing.version) { setErrors({ form: 'This entry changed while you were editing. Your draft is preserved. Reopen the entry to review the latest version.' }); return; }
    setBusy(true);
    try {
      let toSave = { ...result.data, id: existing?.id, version: existing?.version };
      if (scope === 'occurrence') {
        const changes = Object.fromEntries(['title', 'body', 'start', 'end', 'allDay', 'location'].map(key => [key, result.data[key]]));
        toSave = { ...existing, exceptions: { ...existing.exceptions, [occurrenceDay]: { changes } } };
      }
      const next = await data.save(toSave);
      savedRef.current = true; setChanged(false);
      await data.clearDraft(draftKey);
      const saved = next.records.find(r => r.id === existing?.id) || next.records.at(-1);
      notify('Entry saved.');
      if ((type === 'reminder' || form.reminderAt) && notificationStatus() === 'default') { setForm(f => ({ ...f, id: saved.id })); setPermissionPrompt(true); }
      else navigate(`/record/${saved.id}${scope === 'occurrence' ? `?day=${occurrenceDay}` : ''}`, { replace: true, state: { returnTo } });
    } catch { setErrors({ form: 'This entry could not be saved. Your input is still here. Please retry.' }); }
    finally { setBusy(false); }
  }
  const finishPermission = () => { setPermissionPrompt(false); navigate(`/record/${form.id}`, { replace: true, state: { returnTo } }); };
  const TypeIcon = TYPE_META[type].icon;
  return <div className={`dm-page editor-page ${type === 'note' ? 'note-editor' : ''}`}>
    <button className="back-link" onClick={close}><ArrowLeft size={16} />{existing ? 'Back to entry' : 'Back to library'}</button>
    <header className="editor-heading"><p className="eyebrow"><TypeIcon size={14} />{existing ? 'MAKE IT YOURS' : 'KEEP THE DETAIL'}</p><h1>{existing ? `Edit ${TYPE_META[type].label.toLowerCase()}` : `A new ${TYPE_META[type].label.toLowerCase()}.`}</h1><p className="muted">{type === 'expense' ? 'Only what you spent. Nothing more to fill out.' : TYPE_META[type].description + '.'}</p></header>
    {repeating && !scope && <Dialog title="Edit this repeating entry" onClose={close}><p>Choose what changes. Other occurrences keep their exceptions.</p><div className="dialog-actions"><button className="button subtle" onClick={() => selectScope('occurrence')}>This occurrence</button><button className="button primary" onClick={() => selectScope('series')}>The series</button></div></Dialog>}
    <form onSubmit={submit} noValidate className="entry-form">
      {scope === 'occurrence' && <p className="notice">Editing only {occurrenceDay}. The date and repeat rule stay with the series.</p>}
      {type === 'expense' && <label className="amount-field">Amount · PHP<div><span>₱</span><input aria-label="Amount in Philippine pesos" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => { setAmount(e.target.value); setChanged(true); }} aria-invalid={Boolean(errors.amountCents)} /></div>{errors.amountCents && <small className="field-error">{errors.amountCents}</small>}</label>}
      {type !== 'expense' && textField('title', type === 'note' ? 'Title (optional)' : 'Title', { placeholder: type === 'note' ? 'Give the thought a name…' : 'What would you like to keep?', maxLength: 160, autoFocus: true })}
      {type === 'note' && <div className="note-tools" aria-label="Note formatting"><button type="button" onClick={() => insertNote('# ')} aria-label="Insert heading"><Heading size={17} /></button><button type="button" onClick={() => insertNote('- ')} aria-label="Insert list item"><List size={17} /></button><button type="button" onClick={() => insertNote('- [ ] ')} aria-label="Insert checklist item"><ListChecks size={17} /></button><span>Plain text, kept simple</span></div>}
      {(type === 'note' || type === 'task' || type === 'event' || type === 'reminder') && <label>{type === 'note' ? 'Your note' : 'Details (optional)'}<textarea aria-label={type === 'note' ? 'Your note' : 'Details (optional)'} ref={noteRef} rows={type === 'note' ? 14 : 3} placeholder={type === 'note' ? 'Start with what’s on your mind…' : 'A little context, if it helps.'} value={form.body} onChange={e => field('body', e.target.value)} maxLength={20000} />{errors.body && <small className="field-error">{errors.body}</small>}</label>}
      {type === 'expense' && <><div className="field-grid"><label>Category<input list="expense-categories" value={form.category} onChange={e => field('category', e.target.value)} maxLength={60} /><datalist id="expense-categories">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>{errors.category && <small className="field-error">{errors.category}</small>}</label>{textField('date', 'Date', { type: 'date', required: true })}</div>{textField('title', 'Description (optional)', { placeholder: 'What was it for?', maxLength: 160 })}</>}
      {['event', 'reminder', 'task'].includes(type) && <div className="schedule-fields">{textField('date', type === 'task' ? 'Due date (optional)' : 'Date', { type: 'date', disabled: scope === 'occurrence' })}
        {type === 'event' && <label className="check-label"><input type="checkbox" checked={form.allDay} onChange={e => field('allDay', e.target.checked)} />All-day event</label>}
        {type === 'reminder' && textField('start', 'Reminder time · Asia/Manila', { type: 'time' })}
        {type === 'event' && !form.allDay && <div className="field-grid">{textField('start', 'Start time', { type: 'time' })}{textField('end', 'End time', { type: 'time' })}</div>}
        {type === 'event' && textField('location', 'Location (optional)', { placeholder: 'Where will it be?', maxLength: 200 })}
        <label>Repeat<select value={form.recurrence} onChange={e => field('recurrence', e.target.value)} disabled={scope === 'occurrence'}>{[['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{errors.recurrence && <small className="field-error">{errors.recurrence}</small>}</label>
        {form.recurrence === 'monthly' && <p className="help-text">Repeats on this day of the month. Shorter months use their last day.</p>}<p className="help-text">All times use Asia/Manila. Task due dates do not reserve time.</p>
      </div>}
      {scope !== 'occurrence' && <details className="editor-extras" open={extrasOpen} onToggle={event => setExtrasOpen(event.currentTarget.open)}><summary>More options <span>Tags, privacy{type !== 'reminder' && type !== 'expense' ? ', reminders' : ''}</span></summary><div className="editor-extras-content">
        {type !== 'reminder' && type !== 'expense' && <label className="reminder-field"><span><Bell size={15} />Reminder (optional)</span><input type="datetime-local" value={form.reminderAt} onChange={e => field('reminderAt', e.target.value)} />{errors.reminderAt && <small className="field-error">{errors.reminderAt}</small>}</label>}
        <label>Tags (optional)<input value={tagText} onChange={e => { setTagText(e.target.value); setChanged(true); }} placeholder="Personal, Work" /><small>Separate tags with commas. Up to eight.</small>{errors.tags && <small className="field-error">{errors.tags}</small>}</label>
        <div className="form-options">{type === 'note' && <label className="check-label"><input type="checkbox" checked={form.pinned} onChange={e => field('pinned', e.target.checked)} />Pin this note</label>}<label className="check-label"><input type="checkbox" checked={form.excluded} onChange={e => field('excluded', e.target.checked)} />Exclude this entry from Finn</label></div>
      </div></details>}
      {errors.form && <p className="notice error" role="alert">{errors.form}</p>}
      <div className="editor-actions"><span role="status">{draftStatus || 'Not saved yet'}</span><div><button className="button subtle" type="button" onClick={close}>Close</button><button className="button primary" type="submit" disabled={busy || !scope}><Save size={17} />{busy ? 'Saving…' : 'Save entry'}</button></div></div>
    </form>
    {permissionPrompt && <Dialog title="Keep your reminders close." onClose={finishPermission}><p>Enable notifications to receive reminders on this device. Your entries stay saved if you choose Not now.</p><div className="dialog-actions"><button className="button subtle" onClick={finishPermission}>Not now</button><button className="button primary" disabled={permissionBusy} onClick={async () => { setPermissionBusy(true); try { const result = await enableNotifications(); notify(result.message); finishPermission(); } catch (e) { notify(e.message); } finally { setPermissionBusy(false); } }}>Enable notifications</button></div></Dialog>}
  </div>;
}
