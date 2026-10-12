import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpRight, History, Plus, ShieldCheck, LoaderCircle, ListChecks, Wallet, MessageCircle } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { FinnAvatar, Dialog } from '../components/UI.jsx';
import { cloudRequest } from '../lib/cloud.js';
import { money, titleOf } from '../lib/domain.js';
import './Finn.css';

const questions = ['What needs my attention today?', 'Summarize my spending this month.', 'I need a little motivation.'];
const questionIcons = [ListChecks, Wallet, MessageCircle];
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
  const [pendingTurn, setPendingTurn] = useState(null);
  const [failedTurn, setFailedTurn] = useState(null);
  const [freshIds, setFreshIds] = useState([]);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const scroll = useRef(null);
  const input = useRef(null);
  const request = useRef(null);
  const mounted = useRef(true);
  const followLatest = useRef(true);
  const messages = data.chats;
  const optimistic = pendingTurn || failedTurn;
  const visibleMessages = optimistic && !messages.some(message => message.id === optimistic.id) ? [...messages, optimistic] : messages;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => { if (search.get('question')) { setQuestion(search.get('question')); setSearch({}, { replace: true }); } }, [search, setSearch]);
  useEffect(() => {
    if (!followLatest.current || !visibleMessages.length) return;
    const frame = requestAnimationFrame(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; });
    return () => cancelAnimationFrame(frame);
  }, [visibleMessages.length, busy]);
  function trackScroll() {
    const node = scroll.current;
    const away = node.scrollHeight - node.scrollTop - node.clientHeight > 72;
    followLatest.current = !away; setAwayFromBottom(away);
  }
  function showLatest() {
    followLatest.current = true; setAwayFromBottom(false);
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }
  async function ask(event, retryTurn = null) {
    event?.preventDefault();
    const text = retryTurn?.content || question.trim();
    if (!text || request.current || busy || applying) return;
    setError('');
    if (!online) { setError('Finn needs a connection for a new answer. Your question is still here.'); return; }
    if (preview || !user) { setError('Finn’s AI replies are not connected in this local preview. Your question is still here for when the service is ready.'); return; }
    if (data.queue.length || data.conflicts.length) { setError('Sync your latest changes and resolve conflicts first so Finn uses the current records.'); return; }
    const previous = retryTurn || [...messages].reverse().find(message => message.role === 'user' && ['failed', 'pending'].includes(message.delivery) && message.content === text);
    const turn = { id: previous?.id || crypto.randomUUID(), role: 'user', content: text, createdAt: new Date().toISOString(), delivery: 'pending' };
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException('Finn took too long to respond.', 'TimeoutError')), 45000);
    setQuestion(draft => !retryTurn || draft.trim() === text ? '' : draft);
    setPendingTurn(turn); setFailedTurn(null); setFreshIds([turn.id]);
    followLatest.current = true; setAwayFromBottom(false);
    setReply(0);
    setBusy(true);
    input.current?.focus();
    try {
      const snapshot = await data.chat(current => [...current.filter(message => message.id !== turn.id), turn]);
      if (!mounted.current) return;
      if (controller.signal.aborted) throw controller.signal.reason;
      const history = snapshot.chats.filter(message => message.role === 'assistant' && typeof message.memory === 'string').slice(-3).map(message => message.memory);
      const result = await cloudRequest('/api/finn', { method: 'POST', signal: controller.signal, body: JSON.stringify({ question: text, history }) });
      if (!mounted.current) return;
      if (!result.answer || !Array.isArray(result.sources)) throw new Error('Finn could not finish that answer. Please retry.');
      const answer = { id: crypto.randomUUID(), role: 'assistant', content: result.answer, sources: result.sources, memory: result.memory || null, action: result.action || null, createdAt: new Date().toISOString() };
      await data.chat(current => [...current.map(message => message.id === turn.id ? { ...message, delivery: 'sent' } : message), answer]);
      if (!mounted.current) return;
      setFreshIds([turn.id, answer.id]);
      setReply(value => value + 1);
    } catch (e) {
      if (!mounted.current) return;
      const failed = { ...turn, delivery: 'failed' };
      setFailedTurn(failed);
      try { await data.chat(current => current.map(message => message.id === turn.id ? failed : message)); } catch { /* Keep the optimistic message and restore the draft if storage fails. */ }
      if (!mounted.current) return;
      setQuestion(draft => draft || text);
      setError(e.name === 'TimeoutError' ? 'Finn took too long to respond. Your question is still here. Please retry.' : e.message);
    }
    finally {
      clearTimeout(timeout);
      if (request.current === controller) request.current = null;
      if (mounted.current) { setPendingTurn(null); setBusy(false); }
    }
  }
  async function apply() {
    if (applying || busy || !review) return;
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
      await data.chat(current => current.map(message => message.id === review.id ? { ...message, appliedRecordId: result.recordId, action: null } : message));
      setReview(null); notify('Confirmed change saved.');
    } catch (e) { setReviewError(e.message); }
    finally { setApplying(false); }
  }
  return <div className="finn-page finn-chat"><header className="finn-heading"><div><FinnAvatar thinking={busy} reply={reply} /><span><h1>Finn</h1></span></div><div><button className="icon-button" aria-label="Chat history" onClick={() => setHistoryOpen(true)}><History size={20} /></button><button className="icon-button" disabled={busy || applying} aria-label="Start a new chat" onClick={() => setHistoryOpen(true)}><Plus size={20} /></button></div></header>
    <div className="chat-content" ref={scroll} onScroll={trackScroll}>{visibleMessages.length === 0 ? <div className="finn-welcome"><div className="finn-stage"><FinnAvatar size="large" /></div><h2>What’s on your mind?</h2><div className="starter-questions">{questions.map((q, index) => { const Icon = questionIcons[index]; return <button key={q} aria-label={q} onClick={() => { setQuestion(q); input.current?.focus(); }}><span className="starter-icon"><Icon size={18} strokeWidth={1.6} /></span><strong>{q}</strong><ArrowUpRight size={15} /></button>; })}</div></div> : <div className="messages">{visibleMessages.map(message => <article key={message.id} data-new={freshIds.includes(message.id)} className={`message ${message.role}`}><div className="message-label">{message.role === 'assistant' ? 'Finn' : 'You'}<span>{new Date(message.createdAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</span>{message.role === 'user' && ['pending', 'failed'].includes(message.delivery) && <span className="message-delivery">{message.id === pendingTurn?.id ? 'Waiting' : message.delivery === 'failed' ? 'Not answered' : 'Interrupted'}</span>}</div><p>{message.content}</p>{message.role === 'user' && message.id !== pendingTurn?.id && ['failed', 'pending'].includes(message.delivery) && <button className="text-link message-retry" disabled={busy || applying} onClick={() => ask(null, message)}>Retry message <ArrowUpRight size={13} /></button>}{message.role === 'assistant' && <>{message.sources?.length > 0 && <p className="chat-age">Saved entries at time of reply.</p>}{message.sources?.length > 0 && <div className="source-links">{message.sources.map(id => { const r = data.records.find(r => r.id === id && !r.deleted); return r ? <Link key={id} to={`/record/${id}`}>{titleOf(r)}<ArrowUpRight size={12} /></Link> : <span key={id}>Entry no longer available</span>; })}</div>}{message.action && <button className="button subtle small" onClick={() => { setReview(message); setReviewError(''); }}>Review proposed change <ArrowUpRight size={14} /></button>}{message.appliedRecordId && <Link className="text-link" to={`/record/${message.appliedRecordId}`}>View saved change <ArrowUpRight size={14} /></Link>}</>}</article>)}</div>}
      {busy && <div className="thinking-status" role="status"><span className="thinking-avatar"><FinnAvatar size="medium" thinking /></span><span>Finn is thinking…<span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span></span></div>}</div>
    <div className="chat-bottom">{awayFromBottom && <button className="chat-latest" onClick={showLatest}><ArrowDown size={14} />Latest messages</button>}{preview && <p className="chat-preview-note">Local preview · AI replies are not connected yet.</p>}{error && <div className="notice error" role="alert">{error}<button onClick={() => ask(null, failedTurn)} disabled={busy || applying}>Retry</button></div>}<form className="chat-composer" onSubmit={ask}><textarea ref={input} aria-label="Ask Finn a question" placeholder={busy ? 'Draft your next message…' : 'Message Finn…'} rows={2} value={question} maxLength={1000} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(); } }} /><button aria-label="Send question to Finn" className="send-button" disabled={busy || applying || !question.trim()}>{busy ? <LoaderCircle className="chat-send-spinner" size={20} /> : <ArrowUp size={20} />}</button></form><p className="chat-footnote"><ShieldCheck size={12} />Permitted entries only. Changes wait for your confirmation.</p></div>
    {historyOpen && <Dialog title="Your conversation" onClose={() => setHistoryOpen(false)}><p>{messages.length ? `${messages.filter(message => message.role === 'user').length} messages saved on this device.` : 'No conversation saved yet.'}</p><p className="muted">Clears this device’s chat and follow-up context. Your saved entries stay.</p><div className="dialog-actions"><button className="button subtle" onClick={() => setHistoryOpen(false)}>Keep conversation</button><button className="button primary" disabled={busy || applying} onClick={async () => { await data.chat([]); setFailedTurn(null); setError(''); setReply(0); setFreshIds([]); followLatest.current = true; setAwayFromBottom(false); setHistoryOpen(false); }}>Start fresh</button></div></Dialog>}
    {review && <Dialog title="Review the change" onClose={() => { if (!applying) setReview(null); }}><p className="muted">{review.action.kind === 'edit' ? 'Edit an existing entry' : 'Create one new entry'}. Nothing changes until you apply.</p><div className="proposal-fields">{Object.entries(review.action.data).filter(([key]) => ['type', 'title', 'body', 'date', 'start', 'end', 'amountCents', 'category', 'recurrence', 'reminderAt', 'location', 'allDay', 'excluded'].includes(key)).map(([key, value]) => { const old = data.records.find(r => r.id === review.action.recordId); const display = v => key === 'amountCents' && v != null ? money(v) : typeof v === 'boolean' ? v ? 'Yes' : 'No' : String(v || 'None'); return <div key={key}><span>{({ amountCents: 'Amount · PHP', start: 'Start · Asia/Manila', end: 'End · Asia/Manila', allDay: 'All day', reminderAt: 'Reminder · Asia/Manila' })[key] || key}</span><strong>{old && old[key] !== value && <del>{display(old[key])}</del>}{display(value)}</strong></div>; })}</div>{reviewError && <p className="notice error" role="alert">{reviewError}</p>}<div className="dialog-actions"><button className="button subtle" disabled={applying} onClick={() => setReview(null)}>Cancel</button><button className="button primary" disabled={applying || busy} onClick={apply}>{applying ? 'Applying…' : 'Apply change'}</button></div></Dialog>}
  </div>;
}
