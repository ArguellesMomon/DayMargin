import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Plus, Search, X, FileText, Pin } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { Empty, EntryRow, PageHeading, Section } from '../components/UI.jsx';
import { dateLabel, expenseSummary, isComplete, money, periodRange, titleOf, today } from '../lib/domain.js';

export default function LibraryPage() {
  const { data, online, openCapture } = useDaymargin();
  const [search, setSearch] = useSearchParams();
  const filter = ['tasks', 'notes', 'expenses'].includes(search.get('filter')) ? search.get('filter') : 'all';
  const query = search.get('q') || '';
  const period = search.get('period') || 'month';
  const category = search.get('category') || '';
  const completion = search.get('status') || 'open';
  const tag = search.get('tag') || '';
  const change = patch => { const next = new URLSearchParams(search); for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k); setSearch(next, { replace: true }); };
  const range = periodRange(period, today(), { start: search.get('start'), end: search.get('end') });
  const summary = expenseSummary(data.records, range);
  const records = data.records.filter(r => !r.deleted);
  const tags = [...new Set(records.flatMap(r => r.tags))].sort();
  const results = records.filter(r =>
    (filter === 'all' || (filter === 'tasks' ? ['task', 'reminder'].includes(r.type) : filter === 'notes' ? r.type === 'note' : r.type === 'expense')) &&
    (filter !== 'expenses' || r.date >= range.start && r.date <= range.end) &&
    (filter !== 'tasks' || (completion === 'reminders' ? r.type === 'reminder' : r.type === 'task' && (completion === 'completed' ? isComplete(r, today()) : !isComplete(r, today())))) &&
    (!category || filter !== 'expenses' || r.category === category) && (!tag || r.tags.includes(tag)) &&
    `${titleOf(r)} ${r.body} ${r.category} ${r.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (filter === 'expenses' ? b.date.localeCompare(a.date) : b.updatedAt.localeCompare(a.updatedAt)));
  const groups = new Map();
  for (const record of results) {
    const day = record.date || today(new Date(record.updatedAt));
    const key = record.pinned && filter !== 'expenses' ? 'pinned' : day;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const grouped = [...groups].sort(([a], [b]) => a === 'pinned' ? -1 : b === 'pinned' ? 1 : b.localeCompare(a));
  const filtered = Boolean(query || tag || category || completion !== 'open');
  const clearFilters = () => change({ q: '', tag: '', category: '', status: '' });
  return <div className={`dm-page library-page ${filter === 'expenses' ? 'spending-page' : ''}`}><PageHeading eyebrow="THE DETAILS, TOGETHER" title={filter === 'expenses' ? 'Your recorded spending.' : 'Your library.'} action={<button className="button primary" onClick={openCapture}><Plus size={18} />Add an entry</button>}>{filter === 'expenses' ? 'A clear view of what you’ve logged.' : 'A thought, a plan, a detail. Find it here.'}</PageHeading>
    <div className="library-tools"><div className="search-box"><Search size={19} /><input aria-label="Search saved entries" placeholder="Find something you saved…" value={query} onChange={e => change({ q: e.target.value })} />{query && <button className="icon-button" aria-label="Clear search" onClick={() => change({ q: '' })}><X size={16} /></button>}</div>
      <div className="tabs" role="group" aria-label="Filter by entry type">{[['all', 'All entries'], ['tasks', 'Tasks'], ['notes', 'Notes'], ['expenses', 'Expenses']].map(([value, label]) => <button key={value} className={value === filter ? 'selected' : ''} aria-pressed={value === filter} onClick={() => change({ filter: value, category: '', tag: '', status: '' })}>{label}</button>)}</div>
    </div>
    {!online && <p className="help-text">Search includes only entries available on this device.</p>}
    {filter === 'tasks' && <div className="pills" role="group" aria-label="Task status">{['open', 'completed', 'reminders'].map(value => <button className={completion === value ? 'selected' : ''} aria-pressed={completion === value} key={value} onClick={() => change({ status: value })}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>}
    {filter === 'expenses' && <><div className="expense-period"><div className="pills" role="group" aria-label="Spending period">{['today', 'week', 'month', 'custom'].map(value => <button className={period === value ? 'selected' : ''} aria-pressed={period === value} key={value} onClick={() => change({ period: value, category: '' })}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div><Link className="text-link" to="/new/expense">Log expense <Plus size={14} /></Link></div>
      {period === 'custom' && <div className="field-grid range-fields"><label>From<input type="date" value={range.start} onChange={e => change({ start: e.target.value })} /></label><label>To<input type="date" min={range.start} value={range.end} onChange={e => change({ end: e.target.value })} /></label></div>}
      {range.start > range.end ? <p className="notice error">The end date must be on or after the start date.</p> : <div className="expense-overview"><div className="expense-total"><p>Recorded spending · {dateLabel(range.start)} – {dateLabel(range.end)}</p><strong>{money(summary.totalCents)}</strong><span>{summary.entries.length} {summary.entries.length === 1 ? 'entry' : 'entries'} · Philippine peso</span><Link className="text-link" to={`/finn?question=${encodeURIComponent(`Summarize my recorded spending from ${range.start} to ${range.end}.`)}`}>Ask Finn about spending <ArrowRight size={14} /></Link></div><div className="category-breakdown"><h2>By category</h2>{Object.entries(summary.categories).sort((a, b) => b[1] - a[1]).map(([name, cents]) => <button className={name === category ? 'selected' : ''} key={name} onClick={() => change({ category: name === category ? '' : name })} aria-pressed={name === category}><span>{name}<strong>{money(cents)}</strong></span><span className="bar-track"><i style={{ width: `${cents / summary.totalCents * 100}%` }} /></span></button>)}{!summary.entries.length && <p className="muted">Category totals will appear as you log expenses.</p>}</div></div>}
    </>}
    <div className="library-list-toolbar"><p aria-live="polite">{results.length} {results.length === 1 ? 'entry' : 'entries'}{category ? ` in ${category}` : query ? ' found' : ' saved'}</p>{tags.length > 0 && filter !== 'expenses' && <div className="tag-filter"><label htmlFor="tag-filter">Tag</label><select id="tag-filter" value={tag} onChange={e => change({ tag: e.target.value })}><option value="">All tags</option>{tags.map(t => <option key={t}>{t}</option>)}</select></div>}{filtered && <button className="text-link" onClick={clearFilters}>Clear filters <X size={13} /></button>}</div>
    {results.length ? grouped.map(([key, entries]) => <Section key={key} className="library-date-group" label={key === 'pinned' ? <><Pin size={13} />Pinned</> : dateLabel(key, { weekday: 'short', year: 'numeric' })} count={entries.length}>
      {entries.map(r => <EntryRow key={r.id} record={r} showType={filter === 'all'} returnTo={`/library?${search.toString()}`} />)}
    </Section>) : <Empty icon={FileText} title={filtered ? 'No matching entries.' : 'A fresh page.'} text={filtered ? 'Try another word, or clear your filters.' : 'The things you save will be here when you need them.'} action={filtered ? <button className="text-link" onClick={clearFilters}>Clear filters <X size={14} /></button> : <button className="text-link" onClick={openCapture}>Add an entry <Plus size={14} /></button>} />}
  </div>;
}
