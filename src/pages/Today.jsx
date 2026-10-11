import { Link } from 'react-router-dom';
import { ArrowRight, Plus, CalendarDays, Circle, FileText, Wallet } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { EntryRow, Empty, FinnAvatar, PageHeading, Section } from '../components/UI.jsx';
import { dateLabel, expenseSummary, isComplete, money, occurrence, occursOn, today } from '../lib/domain.js';

export default function Today() {
  const { data, user, openCapture } = useDaymargin();
  const day = today();
  const records = data.records.filter(r => !r.deleted);
  const events = records.filter(r => r.type === 'event' && occursOn(r, day)).map(r => occurrence(r, day)).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  const tasks = records.filter(r => r.type === 'task' && !isComplete(r, day) && (!r.date || (r.recurrence === 'none' ? r.date <= day : occursOn(r, day)))).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const reminders = records.filter(r => r.type === 'reminder' && occursOn(r, day) || r.reminderAt?.slice(0, 10) === day && !isComplete(r, day)).map(r => occurrence(r, day));
  const notes = records.filter(r => r.type === 'note').sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const spending = expenseSummary(records, { start: day, end: day });
  const name = user?.user_metadata?.display_name?.split(' ')[0];
  return <><PageHeading eyebrow={name ? `A DAY OF YOUR OWN, ${name.toUpperCase()}` : 'A DAY OF YOUR OWN'} title="A little room for today." action={<button className="button primary" onClick={openCapture}><Plus size={18} />Add an entry</button>}>Your plans, your thoughts, and the next small step.</PageHeading>
    <div className="today-grid"><div>
      <Section label="Next on your schedule" count={events.length} action={<Link className="text-link" to="/calendar">View calendar <ArrowRight size={14} /></Link>}>
        {events.length ? <div className="agenda-preview">{events.map(r => <EntryRow key={r.id} record={r} day={day} />)}</div> : <Empty icon={CalendarDays} title="A little space in your schedule." text="No events recorded for today." action={<Link className="text-link" to={`/new/event?day=${day}`}>Add an event <Plus size={14} /></Link>} />}
      </Section>
      <Section label="Tasks needing attention" count={tasks.length} action={<Link className="text-link" to="/library?filter=tasks">All tasks <ArrowRight size={14} /></Link>}>
        {tasks.length ? tasks.slice(0, 7).map(r => <EntryRow key={r.id} record={r} day={r.recurrence === 'none' ? undefined : day} />) : <Empty icon={Circle} title="Nothing waiting on you." text="Add a task when your next step comes to mind." action={<Link className="text-link" to="/new/task">Add a task <Plus size={14} /></Link>} />}
      </Section>
      {reminders.length > 0 && <Section label="Reminders today" count={reminders.length}>{reminders.map(r => <EntryRow key={r.id} record={r} day={day} asReminder />)}</Section>}
      <Section label="Recently saved" action={<Link className="text-link" to="/library?filter=notes">Your notes <ArrowRight size={14} /></Link>}>
        {notes.length ? notes.map(r => <EntryRow key={r.id} record={r} compact />) : <Empty icon={FileText} title="Keep the thought." text="A note is a good place to start." action={<Link className="text-link" to="/new/note">Write a note <Plus size={14} /></Link>} />}
      </Section>
    </div><aside className="today-aside">
      <div className="day-stamp"><span>{dateLabel(day, { weekday: 'long' }).split(',')[0]}</span><strong>{day.slice(8)}</strong><span>{dateLabel(day, { month: 'long', year: 'numeric' }).replace(/\d{1,2},?\s*/, '')}</span><div className="stamp-line" /></div>
      <div className="spending-snapshot"><Wallet size={19} strokeWidth={1.5} /><p>Recorded spending today</p><strong>{money(spending.totalCents)}</strong><span>{spending.entries.length} {spending.entries.length === 1 ? 'entry' : 'entries'} · PHP</span><Link className="text-link" to="/library?filter=expenses&period=today">View expenses <ArrowRight size={14} /></Link></div>
      <div className="finn-invitation"><FinnAvatar size="medium" /><span className="eyebrow">A SECOND PERSPECTIVE</span><h3>A small question.<br />A clearer next step.</h3><p>Ask Finn to work through what you’ve saved.</p><Link className="text-link" to="/finn?question=What%20needs%20my%20attention%20today%3F">Ask Finn <ArrowRight size={14} /></Link></div>
    </aside></div></>;
}
