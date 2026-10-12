import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Repeat2 } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { Capture, Dialog, EntryRow } from '../components/UI.jsx';
import { addDays, conflictsOn, dateLabel, isValidDate, timeLabel, titleOf, today } from '../lib/domain.js';
import { calendarDay, monthDays, moveMonth, weekDays } from '../lib/calendar-view.js';
import './Calendar.css';

const fullDate = day => dateLabel(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const monthLabel = day => new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
const plural = (count, name) => `${count} ${name}${count === 1 ? '' : 's'}`;

function DateMarks({ view }) {
  return <span className="cal-date-marks" aria-hidden="true"><i className={view.events.length ? 'has-event' : ''} /><i className={view.dueCount ? 'has-due' : ''} /></span>;
}

function MonthBrowser({ selected, currentDay, records, onSelect }) {
  const [month, setMonth] = useState(`${selected.slice(0, 7)}-01`);
  const [focused, setFocused] = useState(selected);
  const grid = useRef(null);
  const focusAfterMove = useRef(false);
  useEffect(() => { setMonth(`${selected.slice(0, 7)}-01`); setFocused(selected); }, [selected]);
  const days = useMemo(() => monthDays(month), [month]);
  const views = useMemo(() => new Map(days.map(day => [day, calendarDay(records, day)])), [records, days]);
  useEffect(() => {
    if (focusAfterMove.current) {
      grid.current?.querySelector(`[data-day="${focused}"]`)?.focus();
      focusAfterMove.current = false;
    }
  }, [focused, month]);
  function changeMonth(amount) {
    const next = moveMonth(month, amount);
    setMonth(next); setFocused(next);
  }
  function navigate(event, day) {
    const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
    const next = { ArrowLeft: () => addDays(day, -1), ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7), ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -weekday), End: () => addDays(day, 6 - weekday),
      PageUp: () => moveMonth(day, -1), PageDown: () => moveMonth(day, 1) }[event.key]?.();
    if (!next) return;
    event.preventDefault(); focusAfterMove.current = true; setFocused(next);
    if (next.slice(0, 7) !== month.slice(0, 7)) setMonth(`${next.slice(0, 7)}-01`);
  }
  return <div className="cal-month-browser">
    <div className="cal-month-heading"><button className="icon-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button><h3 aria-live="polite">{monthLabel(month)}</h3><button className="icon-button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button></div>
    <div className="cal-month-weekdays" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
    <div className="cal-month-grid" ref={grid} role="group" aria-label={monthLabel(month)}>
      {days.map(day => <button key={day} data-day={day} tabIndex={day === focused ? 0 : -1} onFocus={() => setFocused(day)} onKeyDown={event => navigate(event, day)}
        className={`${day.slice(0, 7) !== month.slice(0, 7) ? 'is-outside' : ''} ${day === selected ? 'is-selected' : ''} ${day === currentDay ? 'is-today' : ''}`}
        aria-label={`${fullDate(day)}; ${plural(views.get(day).events.length, 'event')}, ${views.get(day).dueCount} due`}
        aria-pressed={day === selected} aria-current={day === currentDay ? 'date' : undefined} onClick={() => onSelect(day)}>
        <span className="cal-month-number">{Number(day.slice(8))}</span><DateMarks view={views.get(day)} />
      </button>)}
    </div>
    <div className="cal-month-footer"><button className="text-link" onClick={() => onSelect(currentDay)}>Back to today</button><label>Jump to date<input type="date" value={selected} onChange={event => { if (isValidDate(event.target.value)) onSelect(event.target.value); }} /></label></div>
    <p className="cal-keyboard-hint">Use arrow keys to browse dates. Enter to select.</p>
  </div>;
}

function MonthPicker(props) {
  return <Dialog title="Choose a date" onClose={props.onClose} className="cal-date-dialog"><MonthBrowser {...props} /></Dialog>;
}

function EventRow({ record, day, overlap, returnTo }) {
  return <Link className={`cal-event ${record.allDay ? 'is-all-day' : ''}`} to={`/record/${record.id}?day=${day}`} state={{ returnTo }}>
    <span className="cal-event-time">{record.allDay ? <CalendarDays size={18} strokeWidth={1.5} /> : <><time>{timeLabel(record.start)}</time><small>{timeLabel(record.end)}</small></>}</span>
    <span className="cal-event-rail" aria-hidden="true"><i /></span>
    <span className="cal-event-copy"><span className="cal-event-title">{titleOf(record)}</span>
      <span className="cal-event-meta">{record.allDay && <span>All day</span>}{record.location && <span><MapPin size={12} />{record.location}</span>}{record.recurrence !== 'none' && <span><Repeat2 size={12} />Repeats {record.recurrence}</span>}</span>
      {overlap && <span className="cal-overlap">Overlaps another event</span>}
    </span><ArrowUpRight className="cal-event-arrow" size={16} />
  </Link>;
}

export default function Calendar() {
  const { data } = useDaymargin();
  const [search, setSearch] = useSearchParams();
  const [currentDay, setCurrentDay] = useState(() => today());
  const selected = isValidDate(search.get('date')) ? search.get('date') : currentDay;
  const returnTo = `/calendar?date=${selected}`;
  const [entryOpen, setEntryOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const monthTrigger = useRef(null);
  const pickerWasOpen = useRef(false);
  useEffect(() => {
    if (pickerWasOpen.current && !monthOpen) monthTrigger.current?.focus();
    pickerWasOpen.current = monthOpen;
  }, [monthOpen]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setCurrentDay(today()); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const view = useMemo(() => calendarDay(data.records, selected), [data.records, selected]);
  const overlaps = useMemo(() => conflictsOn(data.records, selected), [data.records, selected]);
  const week = useMemo(() => weekDays(selected), [selected]);
  const weekViews = useMemo(() => new Map(week.map(day => [day, calendarDay(data.records, day)])), [data.records, week]);
  const select = day => { setSearch({ date: day }); setMonthOpen(false); };
  return <div className="calendar-page">
    <header className="cal-header"><div><h1>Calendar</h1></div><button className="button primary cal-add" onClick={() => setEntryOpen(true)}><Plus size={17} />Add entry</button></header>
    <section className="cal-navigation" aria-label="Browse dates">
      <div className="cal-toolbar"><button ref={monthTrigger} className="cal-month-button" onClick={() => setMonthOpen(true)} aria-haspopup="dialog" aria-expanded={monthOpen}><CalendarDays size={17} /><span>{monthLabel(selected)}</span><ChevronDown size={15} /></button><div className="cal-nav-actions"><button className="button subtle small cal-today-button" onClick={() => select(currentDay)}>Today</button><button className="icon-button" aria-label="Previous week" onClick={() => select(addDays(selected, -7))}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Next week" onClick={() => select(addDays(selected, 7))}><ChevronRight size={18} /></button></div></div>
      <div className="cal-week" role="group" aria-label="Choose a day this week">{week.map(day => <button key={day} className={`${day === selected ? 'is-selected' : ''} ${day === currentDay ? 'is-today' : ''}`}
        aria-label={`${fullDate(day)}; ${plural(weekViews.get(day).events.length, 'event')}, ${weekViews.get(day).dueCount} due`} aria-pressed={day === selected} aria-current={day === currentDay ? 'date' : undefined} onClick={() => select(day)}>
        <span>{new Intl.DateTimeFormat('en-PH', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))}</span><strong>{Number(day.slice(8))}</strong><DateMarks view={weekViews.get(day)} />
      </button>)}</div>
      <div className="cal-legend"><span><i className="cal-event-dot" />Event</span><span><i className="cal-due-dot" />Task or reminder</span><span className="cal-zone"><Clock3 size={12} />Manila time</span></div>
    </section>
    <div className="cal-day-heading"><div><p>{selected === currentDay ? 'TODAY' : selected === addDays(currentDay, 1) ? 'TOMORROW' : 'YOUR DAY AT A GLANCE'}</p><h2>{dateLabel(selected, { weekday: 'long', month: 'short', day: 'numeric' })}</h2></div><span className="cal-day-summary" aria-live="polite">{plural(view.events.length, 'event')}<i />{view.dueCount} due</span></div>
    <div className="cal-body"><section className="cal-agenda" aria-labelledby="cal-agenda-title"><div className="cal-section-heading"><h3 id="cal-agenda-title">On the schedule <span>{view.events.length}</span></h3></div>
      {view.events.length ? <>
        {!!view.allDay.length && <div className="cal-event-group"><h4>ALL DAY</h4>{view.allDay.map(record => <EventRow key={record.id} record={record} day={selected} returnTo={returnTo} />)}</div>}
        {!!view.timed.length && <div className="cal-event-group"><h4>THE TIMELINE</h4>{view.timed.map(record => <EventRow key={record.id} record={record} day={selected} overlap={overlaps.has(record.id)} returnTo={returnTo} />)}</div>}
      </> : <div className="cal-empty"><span className="cal-empty-icon"><CalendarDays size={22} strokeWidth={1.4} /></span><h3>No events.</h3></div>}
      <div className="cal-agenda-footer"><button className="text-link" onClick={() => setEntryOpen(true)}>Add entry <Plus size={14} /></button></div>
    </section>
    <aside className="cal-due" aria-labelledby="cal-due-title"><div className="cal-section-heading"><h3 id="cal-due-title">Due this day <span>{view.dueCount}</span></h3></div>
      <div className="cal-due-group"><div className="cal-due-label"><h4>Tasks</h4><Link className="icon-button" aria-label="Add a task for this day" to={`/new/task?day=${selected}`} state={{ returnTo }}><Plus size={15} /></Link></div>
        {view.tasks.length ? view.tasks.map(record => <EntryRow key={record.id} record={record} day={selected} returnTo={returnTo} />) : <p className="cal-quiet">No tasks due.</p>}
      </div>
      <div className="cal-due-group"><div className="cal-due-label"><h4><Bell size={13} />Reminders</h4><Link className="icon-button" aria-label="Add a reminder for this day" to={`/new/reminder?day=${selected}`} state={{ returnTo }}><Plus size={15} /></Link></div>
        {view.reminders.length ? view.reminders.map(item => <EntryRow key={item.key} record={item.record} day={item.day} asReminder={item.attached} returnTo={returnTo} />) : <p className="cal-quiet">No reminders.</p>}
      </div>
    </aside></div>
    {entryOpen && <Capture day={selected} returnTo={returnTo} types={['event', 'task', 'reminder']} onClose={() => setEntryOpen(false)} />}
    {monthOpen && <MonthPicker selected={selected} currentDay={currentDay} records={data.records} onSelect={select} onClose={() => setMonthOpen(false)} />}
  </div>;
}
