import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Download, LogOut, Moon, Monitor, Sun, ShieldCheck, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { Dialog, PageHeading, Section, BackLink } from '../components/UI.jsx';
import { clearAccount } from '../lib/storage.js';
import { auth } from '../lib/cloud.js';
import { enableNotifications, notificationStatus } from '../lib/notifications.js';
import { titleOf } from '../lib/domain.js';

export default function SettingsPage() {
  const { data, user, preview, preferences, changePreferences, notify, exitPreview } = useDaymargin();
  const [permission, setPermission] = useState(notificationStatus());
  const [delivery, setDelivery] = useState('');
  const [dialog, setDialog] = useState('');
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const excluded = data.records.filter(r => !r.deleted && r.excluded);
  function exportData() {
    const file = new Blob([JSON.stringify({ application: 'Daymargin', exportedAt: new Date().toISOString(), timezone: 'Asia/Manila', currency: 'PHP',
      records: data.records.filter(r => !r.deleted), drafts: data.drafts, chats: data.chats, pendingChanges: data.queue }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = `daymargin-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true); notify('Your export is ready. Keep it somewhere safe.');
  }
  async function signOut() {
    if (!preview && (data.queue.length || data.conflicts.length || Object.keys(data.drafts).length) && !exported) { setDialog('signout'); return; }
    setBusy(true);
    try {
      await data.flush();
      if (user) {
        const { error } = await auth.signOut({ scope: 'local' });
        if (error) throw error;
        await clearAccount(user.id);
      } else exitPreview();
    } catch { notify('Could not sign out safely. Please retry.'); }
    finally { setBusy(false); }
  }
  async function deleteAccount() {
    setBusy(true);
    try {
      await data.flush();
      await auth.deleteAccount(deletePassword);
      await clearAccount(user.id);
    } catch (e) { notify(e.message); }
    finally { setBusy(false); }
  }
  return <div className="settings-page"><PageHeading eyebrow="A FEW PERSONAL TOUCHES" title="Make it your own.">Simple controls for how Daymargin works for you.</PageHeading>
    <Section label="Appearance"><div className="appearance-options">{[['system', 'Device', Monitor], ['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([value, label, Icon]) => <button key={value} aria-pressed={preferences.theme === value} className={preferences.theme === value ? 'selected' : ''} onClick={() => changePreferences({ theme: value }).catch(() => notify('Could not save appearance. Please retry.'))}><Icon size={22} strokeWidth={1.4} /><span>{label}</span><i /></button>)}</div><label className="setting-row"><span><strong>Reduce motion</strong><small>Keep transitions and Finn still.</small></span><input type="checkbox" checked={preferences.reducedMotion} onChange={e => changePreferences({ reducedMotion: e.target.checked })} /></label></Section>
    <Section label="Your everyday defaults"><dl className="defaults-list"><div><dt>Language</dt><dd>English</dd></div><div><dt>Currency</dt><dd>PHP · Philippine peso</dd></div><div><dt>Time zone</dt><dd>Asia/Manila</dd></div></dl></Section>
    <Section label="Reminders"><div className="setting-row"><span><strong>Device notifications</strong><small>{permission === 'granted' ? 'Permission granted' : permission === 'denied' ? 'Blocked in browser settings' : permission === 'unavailable' ? 'Unavailable in this browser' : 'Not requested'}</small></span><Bell size={19} /></div><p className="help-text">Enable notifications to receive reminders on this device. Permission and scheduled delivery are separate. Your reminders stay visible in Daymargin.</p><button className="button subtle" disabled={busy || permission === 'unavailable'} onClick={() => setDialog('notifications')}>{permission === 'granted' ? 'Check delivery setup' : 'Enable notifications'}</button>{delivery && <p className="notice" role="status">{delivery}</p>}<p className="help-text">On iPhone or iPad, add Daymargin to the Home Screen for supported Web Push. Scheduled device delivery is not enabled yet.</p></Section>
    <Section label="Finn and your entries"><div className="setting-row"><span><strong>Context you control</strong><small>{excluded.length} {excluded.length === 1 ? 'entry excluded' : 'entries excluded'} from Finn</small></span><ShieldCheck size={20} /></div><p className="help-text">When you ask, relevant allowed records are processed by the connected AI service. Totals are calculated by Daymargin. Use Exclude from Finn on any entry. Past chats are not sent as context for new answers.</p>{excluded.map(r => <Link className="setting-entry" key={r.id} to={`/record/${r.id}`}>{titleOf(r)}<ArrowRight size={14} /></Link>)}</Section>
    <Section label="Account and data"><div className="setting-row"><span><strong>{user?.email || 'Local development preview'}</strong><small>{preview ? 'Sample entries and your edits stay in this browser.' : `${data.queue.length} pending changes · ${data.conflicts.length} conflicts`}</small></span>{!preview && <button className="icon-button" aria-label="Sync now" onClick={data.sync} disabled={data.syncing}><RefreshCw size={18} className={data.syncing ? 'spin' : ''} /></button>}</div>
      {preview && <p className="help-text">Cloud accounts and Finn’s AI replies are not connected. This preview is for reviewing the design and trying real entry editing. It is separate from a signed-in account.</p>}
      {!preview && <p className="help-text">Last sync: {data.lastSync ? new Date(data.lastSync).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Not synced yet'}. Unsynced changes are saved on this device.</p>}
      {data.conflicts.map(c => { const local = data.records.find(r => r.id === c.recordId); return <div className="conflict" key={c.recordId}><strong>Review: {local ? titleOf(local) : 'Changed entry'}</strong><p>Your local change conflicts with a cloud update. {c.remote?.deleted ? 'The cloud entry was deleted. Keeping yours creates a new entry.' : 'Choose the version to keep.'}</p><details><summary>Compare changes</summary><pre>{JSON.stringify({ local, cloud: c.remote }, null, 2)}</pre></details><div className="dialog-actions"><button className="button subtle" onClick={() => data.resolve(c.recordId, false)}>Use cloud version</button><button className="button primary" onClick={() => data.resolve(c.recordId, true)}>Keep my version</button></div></div>; })}
      <div className="settings-actions"><button className="setting-entry" onClick={exportData}><span><Download size={17} />Export my data</span><ArrowRight size={14} /></button><button className="setting-entry" disabled={busy} onClick={signOut}><span><LogOut size={17} />{preview ? 'Exit preview' : 'Sign out on this device'}</span><ArrowRight size={14} /></button><button className="setting-entry danger-text" onClick={() => setDialog(preview ? 'clear' : 'delete')}><span><Trash2 size={17} />{preview ? 'Clear preview entries' : 'Delete account and records'}</span><ArrowRight size={14} /></button></div>
    </Section><p className="settings-footer">Daymargin · A little more room for your day.</p>
    {dialog === 'notifications' && <Dialog title="Keep your reminders close." onClose={() => setDialog('')}><p>Allow device notifications for your saved reminders. The browser will ask for permission if needed.</p><div className="dialog-actions"><button className="button subtle" onClick={() => setDialog('')}>Not now</button><button className="button primary" disabled={busy} onClick={async () => { setBusy(true); try { const result = await enableNotifications(); setDelivery(result.message); setPermission(notificationStatus()); setDialog(''); } catch (e) { setDelivery(e.message); setDialog(''); } finally { setBusy(false); } }}>Enable notifications</button></div></Dialog>}
    {dialog === 'signout' && <Dialog title="Keep your unsynced changes." onClose={() => setDialog('')}><p>There are {data.queue.length} pending changes, {data.conflicts.length} conflicts, and {Object.keys(data.drafts).length} drafts on this device. Sync saved entries or export your work before signing out. Drafts are included in the export.</p><div className="dialog-actions"><button className="button subtle" onClick={() => setDialog('')}>Stay signed in</button><button className="button subtle" onClick={data.sync}>Sync now</button><button className="button primary" onClick={exportData}>Export changes</button>{exported && <button className="button primary" onClick={signOut}>Sign out after export</button>}</div></Dialog>}
    {(dialog === 'clear' || dialog === 'delete') && <Dialog title={preview ? 'Clear this preview?' : 'Delete your account?'} onClose={() => setDialog('')}><p>{preview ? 'This removes sample entries, your preview edits, drafts, and preview chats from this browser.' : 'Your account and all cloud records will be permanently deleted. Export anything you want to keep first.'}</p>{!preview && <label className="auth-form">Confirm your password<input type="password" autoComplete="current-password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} /></label>}<div className="dialog-actions"><button className="button subtle" onClick={() => setDialog('')}>Cancel</button><button className="button subtle" onClick={exportData}>Export first</button><button className="button danger" disabled={busy} onClick={async () => { if (preview) { await data.resetPreview(); setDialog(''); notify('Preview cleared. Your notebook is ready for your own entries.'); } else await deleteAccount(); }}>{preview ? 'Clear entries' : 'Delete account'}</button></div></Dialog>}
  </div>;
}
