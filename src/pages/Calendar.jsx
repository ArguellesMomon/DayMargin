import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { Empty, EntryRow, PageHeading, Section } from '../components/UI.jsx';
import { addDays, conflictsOn, dateLabel, recordsOn, today, isValidDate } from '../lib/domain.js';

export default function Calendar() {
  const { data } = useDaymargin();
  const [search, setSearch] = useSearchParams();
  const selected = isValidDate(search.get('date')) ? search.get('date') : today();
  const [monthOpen, setMonthOpen] = useState(false);
  const all = recordsOn(data.records, selected);
  const events = all.filter(r => r.type === 'event').sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  const due = all.filter(r => ['task', 'reminder'].includes(r.type));
  const overlaps = conflictsOn(data.records, selected);
  const start = addDays(selected, -((new Date(`${selected}T00:00Z`).getUTCDay() + 6) % 7));
  const select = day => setSearch({ date: day });
  return <><PageHeading eyebrow="TIME, KEPT SIMPLE" title="Your calendar." action={<Link className="button primary" to={`/new/event?day=${selected}`}><Plus size={18} />Add event</Link>}>A place for your plans. A little space between them.</PageHeading>
    <div className="calendar-toolbar"><button className="month-button" onClick={() => setMonthOpen(!monthOpen)}><CalendarDays size={17} />{dateLabel(selected, { month: 'long', year: 'numeric' }).replace(/\d{1,2},?\s*/, '')}</button><div><button className="button subtle small" onClick={() => select(today())}>Today</button><button className="icon-button" aria-label="Previous week" onClick={() => select(addDays(selected, -7))}><ChevronLeft size={19} /></button><button className="icon-button" aria-label="Next week" onClick={() => select(addDays(selected, 7))}><ChevronRight size={19} /></button></div></div>
    {monthOpen && <label className="month-picker">Go to a date<input type="date" value={selected} onChange={e => { if (e.target.value) select(e.target.value); }} /></label>}
    <div className="week-strip" aria-label="Choose a date">{Array.from({ length: 7 }, (_, i) => addDays(start, i)).map(day => <button key={day} className={`${day === selected ? 'selected' : ''} ${day === today() ? 'is-today' : ''}`} aria-pressed={day === selected} onClick={() => select(day)}><span>{dateLabel(day, { weekday: 'short' }).split(',')[0]}</span><strong>{Number(day.slice(8))}</strong><i className={recordsOn(data.records, day).some(r => r.type === 'event') ? 'has-event' : ''} /></button>)}</div>
    <div className="agenda-title"><h2>{selected === today() ? 'Today' : dateLabel(selected, { weekday: 'long' })}</h2><span>Asia/Manila</span></div>
    <Section label="Scheduled events" count={events.length}>{events.length ? <div className="calendar-agenda">{events.map(r => <div key={r.id} className="agenda-line"><span className="agenda-time">{r.allDay ? 'All day' : r.start}</span><EntryRow record={r} day={selected} overlap={overlaps.has(r.id)} /></div>)}</div> : <Empty icon={CalendarDays} title="No events scheduled for this day." text="Keep it open, or make a plan." action={<Link className="text-link" to={`/new/event?day=${selected}`}>Add an event <Plus size={14} /></Link>} />}</Section>
    <Section label="Due that day" count={due.length}>{due.length ? due.map(r => <EntryRow key={r.id} record={r} day={selected} />) : <p className="quiet-empty">No tasks or reminders due. Task deadlines appear here without reserving calendar time.</p>}</Section>
  </>;
}
