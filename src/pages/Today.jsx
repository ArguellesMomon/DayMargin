import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Plus, CalendarDays, Check, FileText, Wallet, Bell, Pin, MapPin } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { EntryRow, FinnAvatar } from '../components/UI.jsx';
import { dateLabel, money, timeLabel, titleOf } from '../lib/domain.js';
import { todayView } from '../lib/today-view.js';
import './Today.css';

function SectionHeading({ id, title, count, children }) {
  return <div className="today-section-heading"><h2 id={id}>{title}{count !== undefined && <span className="today-count">{count}</span>}</h2>{children}</div>;
}

export default function Today() {
  const { data, user, openCapture } = useDaymargin();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setNow(new Date()); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const { day, greeting, tasks, overdue, events, agenda, next, notes, spending } = todayView(data.records, now);
  const name = user?.user_metadata?.display_name?.trim().split(/\s+/)[0];
  const spotlight = next?.record || tasks[0];
  const spotlightLabel = next ? next.current ? 'HAPPENING NOW' : next.allDay ? 'ON TODAY’S CALENDAR' : 'UP NEXT' : tasks.length ? 'FIRST ON YOUR LIST' : 'THE REST OF TODAY';

  return <div className="today-page">
    <header className="today-header">
      <div><p className="today-greeting">{greeting}{name ? `, ${name}` : ''}.</p><h1>Your day, in view.</h1><p className="today-date">{dateLabel(day, { weekday: 'long', month: 'long' })}<span className="today-date-dot" />Asia/Manila</p></div>
      <button className="button primary today-add" onClick={openCapture}><Plus size={18} />Add an entry</button>
    </header>
    <nav className="today-overview" aria-label="Today's overview">
      <a href="#today-tasks"><span className="today-stat-label"><Check size={15} />Open tasks</span><strong>{tasks.length}<small>{overdue ? `${overdue} overdue` : tasks.length ? 'One step at a time' : 'A clear list'}</small></strong></a>
      <a href="#today-timeline"><span className="today-stat-label"><CalendarDays size={15} />Plans today</span><strong>{events.length}<small>On your calendar</small></strong></a>
      <Link to="/library?filter=expenses&period=today"><span className="today-stat-label"><Wallet size={15} />Spent today</span><strong className="today-spending">{money(spending.totalCents)}<small>{spending.entries.length} recorded {spending.entries.length === 1 ? 'entry' : 'entries'}</small></strong></Link>
    </nav>
    <div className="today-body"><div className="today-main">
      <section className={`today-spotlight ${next?.current ? 'is-current' : ''}`} aria-label="Next focus">
        <div className="today-spotlight-caption"><span className="today-live-dot" /><span>{spotlightLabel}</span>{next?.type === 'reminder' && <Bell size={13} />}</div>
        {spotlight ? <Link className="today-focus-link" to={`/record/${spotlight.id}${next || spotlight.recurrence !== 'none' ? `?day=${day}` : ''}`}>
          {next && <span className="today-focus-time">{next.allDay ? 'All day' : timeLabel(next.time)}</span>}
          <div className="today-focus-copy"><h2>{titleOf(spotlight)}</h2><p>{next ? next.type === 'reminder' ? 'Reminder · In-app' : [next.end && !next.allDay ? `Until ${timeLabel(next.end)}` : 'On today’s calendar', spotlight.location].filter(Boolean).join(' · ') : spotlight.date ? `${spotlight.date < day && spotlight.recurrence === 'none' ? 'Overdue · ' : 'Due '}${dateLabel(spotlight.recurrence === 'none' ? spotlight.date : day)}` : 'No due date'}</p></div>
          <ArrowUpRight size={21} />
        </Link> : <div className="today-focus-empty"><h2>A little space ahead.</h2><p>No later timed plans or open tasks recorded.</p><Link className="text-link" to={`/new/event?day=${day}`}>Add a plan <ArrowRight size={15} /></Link></div>}
      </section>
      <section className="today-tasks" aria-labelledby="today-tasks">
        <SectionHeading id="today-tasks" title="Your next steps" count={tasks.length}><Link className="text-link" to="/library?filter=tasks">All tasks <ArrowUpRight size={14} /></Link></SectionHeading>
        {tasks.length ? <><div className="today-task-list">{tasks.slice(0, 7).map(record => <EntryRow key={record.id} record={record} day={record.recurrence === 'none' ? undefined : day} />)}</div>{tasks.length > 7 && <Link className="text-link today-more" to="/library?filter=tasks">View all {tasks.length} open tasks <ArrowRight size={14} /></Link>}</> : <div className="today-empty"><span className="today-empty-icon"><Check size={19} /></span><div><h3>Your list is clear.</h3><p>Add a task when something needs doing.</p><Link className="text-link" to="/new/task">Add a task <Plus size={14} /></Link></div></div>}
      </section>
      <section className="today-timeline" aria-labelledby="today-timeline">
        <SectionHeading id="today-timeline" title="Today's timeline"><Link className="text-link" to="/calendar">View calendar <ArrowUpRight size={14} /></Link></SectionHeading>
        {agenda.length ? <div className="today-agenda">{agenda.map(item => <Link key={item.key} className={`today-agenda-item ${item.current ? 'is-current' : ''} ${item.earlier ? 'is-earlier' : ''}`} to={`/record/${item.record.id}?day=${day}`}>
          <span className="today-agenda-time">{item.allDay ? 'All day' : timeLabel(item.time)}<small>{item.end && !item.allDay ? timeLabel(item.end) : item.type === 'reminder' ? 'Reminder' : ''}</small></span>
          <span className="today-agenda-marker">{item.type === 'reminder' ? <Bell size={13} /> : <span />}</span>
          <span className="today-agenda-content"><span className="today-agenda-title">{titleOf(item.record)}{item.current && <span className="today-now">Now</span>}</span><span className="today-agenda-meta">{item.record.location && item.type === 'event' ? <><MapPin size={12} />{item.record.location}</> : item.type === 'reminder' ? 'In-app reminder' : item.allDay ? 'On your calendar' : 'Calendar event'}{item.overlap && <span className="today-overlap">Overlaps another event</span>}{item.earlier && <span> · Earlier</span>}</span></span>
          <ArrowUpRight className="today-agenda-arrow" size={15} />
        </Link>)}</div> : <div className="today-empty"><span className="today-empty-icon"><CalendarDays size={19} /></span><div><h3>No plans on the page yet.</h3><p>Keep appointments and reminders in one timeline.</p><Link className="text-link" to={`/new/event?day=${day}`}>Add an event <Plus size={14} /></Link></div></div>}
      </section>
    </div>
    <aside className="today-side" aria-label="Finn and recent notes">
      <section className="finn-invitation today-finn"><div className="today-finn-top"><span className="today-panel-label">A SECOND PERSPECTIVE</span><FinnAvatar size="medium" /></div><h2>A little help<br />from Finn.</h2><p>Let’s work through what you’ve saved.</p><Link className="today-finn-link" to="/finn?question=What%20needs%20my%20attention%20today%3F">Talk it through <ArrowUpRight size={18} /></Link></section>
      <section className="today-notes" aria-labelledby="today-notes"><SectionHeading id="today-notes" title="Recent notes"><Link className="icon-button" aria-label="Write a note" to="/new/note"><Plus size={17} /></Link></SectionHeading>
        {notes.length ? <div className="today-note-list">{notes.map(record => <Link key={record.id} className="today-note" to={`/record/${record.id}`}><span className="today-note-meta"><FileText size={13} />Note{record.pinned && <span><Pin size={11} />Pinned</span>}</span><h3>{titleOf(record)}</h3><p>{record.body || 'Open this note to add a thought.'}</p><span className="today-note-open">Open note <ArrowUpRight size={13} /></span></Link>)}</div> : <div className="today-note-empty"><FileText size={20} strokeWidth={1.5} /><h3>Make room for a thought.</h3><p>A quick idea, a list, something to return to.</p><Link className="text-link" to="/new/note">Write a note <ArrowRight size={14} /></Link></div>}
        {notes.length > 0 && <Link className="text-link today-notes-all" to="/library?filter=notes">All your notes <ArrowRight size={14} /></Link>}
      </section>
    </aside></div>
  </div>;
}
