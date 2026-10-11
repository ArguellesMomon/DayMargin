import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUp, ArrowUpRight, History, Plus, ShieldCheck } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { FinnAvatar, Dialog } from '../components/UI.jsx';
import { cloudRequest } from '../lib/cloud.js';
import { money, titleOf } from '../lib/domain.js';

const questions = ['What needs my attention today?', 'Summarize my spending this month.', 'I need a little motivation.'];
const questionLabels = ['Make a plan', 'See the spending', 'Talk it through'];
export default function Finn() {
  const { data, user, preview, online, notify } = useDaymargin();
  const [search, setSearch] = useSearchParams();
  const [question, setQuestion] = useState(search.get('question') || '');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(0);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [applying, setApplying] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const bottom = useRef(null);
  const input = useRef(null);
  const messages = data.chats;
  useEffect(() => { if (search.get('question')) { setQuestion(search.get('question')); setSearch({}, { replace: true }); } }, [search, setSearch]);
  useEffect(() => { if (messages.length || busy) bottom.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [messages.length, busy]);
  async function ask(event) {
    event?.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setError('');
    if (!online) { setError('Finn needs a connection for a new answer. Your question is still here.'); return; }
    if (preview || !user) { setError('Finn’s AI replies are not connected in this local preview. Your question is still here for when the service is ready.'); return; }
    if (data.queue.length || data.conflicts.length) { setError('Sync your latest changes and resolve conflicts first so Finn uses the current records.'); return; }
    setReply(0);
    setBusy(true);
    try {
      const history = messages.filter(message => message.role === 'assistant' && typeof message.memory === 'string').slice(-3).map(message => message.memory);
      const result = await cloudRequest('/api/finn', { method: 'POST', body: JSON.stringify({ question: text, history }) });
      if (!result.answer || !Array.isArray(result.sources)) throw new Error('Finn could not finish that answer. Please retry.');
      const now = new Date().toISOString();
      await data.chat([...messages, { id: crypto.randomUUID(), role: 'user', content: text, createdAt: now },
        { id: crypto.randomUUID(), role: 'assistant', content: result.answer, sources: result.sources, memory: result.memory || null, action: result.action || null, createdAt: now }]);
      setQuestion('');
      setReply(value => value + 1);
    } catch (e) {
      setError(e.name === 'TimeoutError' ? 'Finn took too long to respond. Your question is still here. Please retry.' : e.message);
    }
    finally { setBusy(false); }
  }
  async function apply() {
    if (applying || !review) return;
    setReviewError('');
    if (!online || preview || data.queue.length || data.conflicts.length) { setReviewError('Connect and sync your records before applying this change.'); return; }
    const action = review.action;
    const current = data.records.find(r => r.id === action.recordId && !r.deleted);
    if (action.kind === 'edit' && (!current || current.excluded || current.version !== action.expectedVersion)) {
      setReviewError('This entry changed or is no longer available to Finn. Cancel and ask for a fresh proposal.'); return;
    }
    setApplying(true);
    try {
      const result = await cloudRequest('/api/apply', { method: 'POST', body: JSON.stringify({ proposalId: action.proposalId }) });
      await data.sync();
      await data.chat(messages.map(message => message.id === review.id ? { ...message, appliedRecordId: result.recordId, action: null } : message));
      setReview(null); notify('Confirmed change saved.');
    } catch (e) { setReviewError(e.message); }
    finally { setApplying(false); }
  }
  return <div className="finn-page"><header className="finn-heading"><div><FinnAvatar thinking={busy} reply={reply} /><span><h1>Finn</h1><small>Your everyday hype bro</small></span></div><div><button className="icon-button" aria-label="Chat history" onClick={() => setHistoryOpen(true)}><History size={20} /></button><button className="icon-button" aria-label="Start a new chat" onClick={() => setHistoryOpen(true)}><Plus size={20} /></button></div></header>
    <div className="chat-content">{messages.length === 0 ? <div className="finn-welcome"><FinnAvatar size="large" /><p className="eyebrow">YOUR EVERYDAY SECOND PERSPECTIVE</p><h2>What’s on your mind?</h2><p>A busy day, a small win, or a completely random thought.<br />Pull up, bro. We’ll work it through.</p><div className="starter-questions">{questions.map((q, index) => <button key={q} aria-label={q} onClick={() => { setQuestion(q); input.current?.focus(); }}><span><small>{questionLabels[index]}</small><strong>{q}</strong></span><ArrowUpRight size={16} /></button>)}</div></div> : <div className="messages">{messages.map(message => <article key={message.id} className={`message ${message.role}`}><div className="message-label">{message.role === 'assistant' ? 'Finn' : 'You'}<span>{new Date(message.createdAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</span></div><p>{message.content}</p>{message.role === 'assistant' && <>{message.sources?.length > 0 && <p className="chat-age">Based on entries saved when this answer was written.</p>}{message.sources?.length > 0 && <div className="source-links">{message.sources.map(id => { const r = data.records.find(r => r.id === id && !r.deleted); return r ? <Link key={id} to={`/record/${id}`}>{titleOf(r)}<ArrowUpRight size={12} /></Link> : <span key={id}>Entry no longer available</span>; })}</div>}{message.action && <button className="button subtle small" onClick={() => { setReview(message); setReviewError(''); }}>Review proposed change <ArrowUpRight size={14} /></button>}{message.appliedRecordId && <Link className="text-link" to={`/record/${message.appliedRecordId}`}>View saved change <ArrowUpRight size={14} /></Link>}</>}</article>)}</div>}
      {busy && <div className="thinking-status" role="status"><FinnAvatar thinking /><span>Finn is thinking…</span></div>}<div ref={bottom} /></div>
    <div className="chat-bottom">{preview && <p className="chat-preview-note">Local preview · AI replies are not connected yet.</p>}{error && <div className="notice error" role="alert">{error}<button onClick={ask} disabled={busy}>Retry</button></div>}<form className="chat-composer" onSubmit={ask}><textarea ref={input} aria-label="Ask Finn a question" placeholder="A question, a thought, a next step…" rows={2} value={question} maxLength={1000} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(); } }} /><button aria-label="Send question to Finn" className="send-button" disabled={busy || !question.trim()}><ArrowUp size={20} /></button></form><p className="chat-footnote"><ShieldCheck size={12} />Permitted entries only. Changes wait for your confirmation.</p></div>
    {historyOpen && <Dialog title="Your conversation" onClose={() => setHistoryOpen(false)}><p>{messages.length ? `${messages.length / 2} questions in this conversation, saved on this device.` : 'No conversation saved yet.'}</p><p className="muted">Starting fresh clears this device’s conversation. Your records stay in your library. Finn can use up to three recent exchanges for follow-ups. If your entries change, that older context is dropped. Starting fresh clears it.</p><div className="dialog-actions"><button className="button subtle" onClick={() => setHistoryOpen(false)}>Keep conversation</button><button className="button primary" onClick={async () => { await data.chat([]); setHistoryOpen(false); }}>Start fresh</button></div></Dialog>}
    {review && <Dialog title="Review the change" onClose={() => { if (!applying) setReview(null); }}><p className="muted">{review.action.kind === 'edit' ? 'Edit an existing entry' : 'Create one new entry'}. Nothing changes until you apply.</p><div className="proposal-fields">{Object.entries(review.action.data).filter(([key]) => ['type', 'title', 'body', 'date', 'start', 'end', 'amountCents', 'category', 'recurrence', 'reminderAt', 'location', 'allDay', 'excluded'].includes(key)).map(([key, value]) => { const old = data.records.find(r => r.id === review.action.recordId); const display = v => key === 'amountCents' && v != null ? money(v) : typeof v === 'boolean' ? v ? 'Yes' : 'No' : String(v || 'None'); return <div key={key}><span>{({ amountCents: 'Amount · PHP', start: 'Start · Asia/Manila', end: 'End · Asia/Manila', allDay: 'All day', reminderAt: 'Reminder · Asia/Manila' })[key] || key}</span><strong>{old && old[key] !== value && <del>{display(old[key])}</del>}{display(value)}</strong></div>; })}</div>{reviewError && <p className="notice error" role="alert">{reviewError}</p>}<div className="dialog-actions"><button className="button subtle" disabled={applying} onClick={() => setReview(null)}>Cancel</button><button className="button primary" disabled={applying} onClick={apply}>{applying ? 'Applying…' : 'Apply change'}</button></div></Dialog>}
  </div>;
}
