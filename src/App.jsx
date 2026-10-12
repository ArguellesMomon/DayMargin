import BrandMark from './components/BrandMark.jsx';
import { organizerReturnTo } from './lib/navigation.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutList, Library, MessageCircle, Plus, Settings, WifiOff, X, ArrowUpRight, Sun, Moon } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { OrganizerContext } from './context.jsx';
import { useOrganizer } from './hooks/useOrganizer.js';
import { useAppViewport } from './hooks/useAppViewport.js';
import { cloudConfigured, auth } from './lib/cloud.js';
import { readPreferences, writePreferences } from './lib/storage.js';
import { dateLabel, today } from './lib/domain.js';
import { Capture } from './components/UI.jsx';
import Today from './pages/Today.jsx';
import Calendar from './pages/Calendar.jsx';
import LibraryPage from './pages/Library.jsx';
import Editor from './pages/Editor.jsx';
import RecordPage from './pages/Record.jsx';
import Finn from './pages/Finn.jsx';
import SettingsPage from './pages/Settings.jsx';
import { Welcome, Auth, Setup } from './pages/Accounts.jsx';

const destinations = [ { path: '/', label: 'Today', icon: LayoutList }, { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/library', label: 'Library', icon: Library }, { path: '/finn', label: 'Finn', icon: MessageCircle } ];
export default function App() {
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(() => sessionStorage.getItem('daymargin-preview') === 'true');
  const [authReady, setAuthReady] = useState(!cloudConfigured);
  const [preferences, setPreferences] = useState({ theme: 'system', reducedMotion: false });
  const [activeTheme, setActiveTheme] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const preferencesRef = useRef({ theme: 'system', reducedMotion: false });
  const preferenceWrites = useRef(Promise.resolve());
  const preferencesEdited = useRef(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [capture, setCapture] = useState(false);
  const [toast, setToast] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateServiceWorker = useRef(null);
  const toastTimer = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const account = user?.id || (preview ? 'local-preview' : null);
  const data = useOrganizer(account, !user && preview);
  const fixedChat = Boolean(authReady && account && location.pathname === '/finn');
  const appShell = useAppViewport(authReady, fixedChat, location.pathname);

  useEffect(() => { readPreferences().then(value => { if (!preferencesEdited.current) { preferencesRef.current = value; setPreferences(value); } }).catch(() => {}); }, []);
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = preferences.theme === 'system' ? (query.matches ? 'dark' : 'light') : preferences.theme;
      setActiveTheme(document.documentElement.dataset.theme);
      document.documentElement.dataset.reducedMotion = preferences.reducedMotion ? 'true' : 'false';
      const browserColor = document.querySelector('meta[name="theme-color"]');
      if (browserColor) browserColor.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    };
    apply(); query.addEventListener('change', apply); return () => query.removeEventListener('change', apply);
  }, [preferences]);
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    window.addEventListener('online', change); window.addEventListener('offline', change);
    return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
  }, []);
  useEffect(() => {
    if (!cloudConfigured) return;
    auth.getSession().then(({ data }) => { setUser(data.session?.user || null); setAuthReady(true); });
    const { data: subscription } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null); setAuthReady(true);
      if (event === 'SIGNED_IN') { sessionStorage.removeItem('daymargin-preview'); setPreview(false); }
      if (event === 'PASSWORD_RECOVERY') navigate('/auth/update');
    });
    return () => subscription.subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    updateServiceWorker.current = registerSW({ onNeedRefresh() { setUpdateAvailable(true); } });
    return () => clearTimeout(toastTimer.current);
  }, []);
  const notify = useCallback((message, undo) => { clearTimeout(toastTimer.current); setToast({ message, undo }); toastTimer.current = setTimeout(() => setToast(null), undo ? 12000 : 6500); }, []);
  const changePreferences = patch => {
    preferencesEdited.current = true;
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next; setPreferences(next);
    preferenceWrites.current = preferenceWrites.current.catch(() => {}).then(() => writePreferences(next)).catch(() => notify('Appearance changed for now, but could not be saved on this device.'));
    return preferenceWrites.current;
  };
  const enterPreview = () => { sessionStorage.setItem('daymargin-preview', 'true'); setPreview(true); navigate('/'); };
  const context = { data, user, preview: !user && preview, online, preferences, changePreferences, notify, enterPreview,
    exitPreview: () => { sessionStorage.removeItem('daymargin-preview'); setPreview(false); navigate('/welcome'); },
    openCapture: () => setCapture(true) };
  if (!authReady) return <div className="loading-page"><BrandMark size={40} /><p>Opening Daymargin…</p></div>;
  const standalone = ['/welcome', '/auth', '/setup'].some(path => location.pathname.startsWith(path));
  if (!account && !standalone) return <Navigate to="/welcome" replace />;
  const visible = !standalone && account;
  const detailRecord = data.records.find(record => record.id === location.pathname.split('/')[2]);
  const entryDestination = location.pathname.startsWith('/new/') || location.pathname.startsWith('/record/')
    ? location.state?.returnTo ? organizerReturnTo(location.state.returnTo).split('?')[0] : location.pathname === '/new/event' || detailRecord?.type === 'event' ? '/calendar' : '/library'
    : null;
  const navClass = path => ({ isActive }) => isActive || path === entryDestination ? 'active' : undefined;
  return <OrganizerContext.Provider value={context}>
    <a href="#main" className="skip-link">Skip to content</a>
    <div ref={appShell} className={visible ? `app-layout${fixedChat ? ' chat-layout' : ''}` : 'standalone-layout'}>
      {visible && <aside className="sidebar"><NavLink to="/" className="brand"><BrandMark /><span>daymargin<span className="brand-dot">.</span></span></NavLink>
        <nav aria-label="Main navigation">{destinations.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} className={navClass(path)} aria-current={path === entryDestination ? 'page' : undefined}><Icon size={19} strokeWidth={1.7} /><span>{label}</span><span className="nav-marker" /></NavLink>)}</nav>
        <div className="sidebar-bottom"><NavLink className="settings-link" to="/settings"><Settings size={18} />Settings</NavLink></div></aside>}
      <div className="workspace">
        {visible && <div className="topbar"><span className="mobile-wordmark">daymargin.</span><span className="topbar-date">{dateLabel(today(), { weekday: 'long', month: 'long' })}</span><div className="topbar-actions"><span className="save-status">{preview && !user ? 'Local preview' : data.syncing ? 'Syncing…' : data.conflicts.length ? 'Review sync conflicts' : data.queue.length ? 'Waiting to sync' : data.lastSync ? 'Synced' : 'Saved on this device'}</span><button className="icon-button theme-toggle" aria-label={activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => changePreferences({ theme: activeTheme === 'dark' ? 'light' : 'dark' })}>{activeTheme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button><button className="icon-button" aria-label="Open settings" onClick={() => navigate('/settings')}><Settings size={19} /></button></div></div>}
        {visible && (!online || preview && !user) && <div className={`mode-bar ${!online ? 'offline' : ''}`}>{!online ? <><WifiOff size={14} /><span>Offline. Entries save on this device.</span></> : <><span className="status-dot" /><span>Local preview · Entries stay on this device</span></>}{online && !user && <button onClick={() => navigate('/settings')}>About this preview <ArrowUpRight size={13} /></button>}</div>}
        {data.error && visible && <div className="notice error" role="alert">{data.error}{user && <button onClick={data.sync}>Retry sync</button>}</div>}
        <main id="main" className={visible ? 'main-content' : ''}>
          {visible && data.loading ? <div className="loading-page"><p>Opening your notebook…</p></div> : <Routes>
            <Route path="/welcome" element={<Welcome />} /><Route path="/auth/:mode" element={<Auth />} /><Route path="/setup" element={<Setup />} />
            <Route path="/" element={<Today />} /><Route path="/calendar" element={<Calendar />} /><Route path="/library" element={<LibraryPage />} />
            <Route path="/new/:type" element={<Editor key={location.pathname} />} /><Route path="/record/:id/edit" element={<Editor key={location.key} />} /><Route path="/record/:id" element={<RecordPage />} />
            <Route path="/finn" element={<Finn />} /><Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<div className="empty"><h1>This page isn’t here.</h1><NavLink to="/">Return to Today</NavLink></div>} />
          </Routes>}
        </main>
      </div>
      {visible && <nav className="bottom-nav" aria-label="Mobile navigation">{destinations.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} className={navClass(path)} aria-current={path === entryDestination ? 'page' : undefined}><Icon size={21} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</nav>}
    </div>
    {capture && <Capture day={location.pathname === '/calendar' ? new URLSearchParams(location.search).get('date') : null} returnTo={location.pathname === '/calendar' ? `${location.pathname}${location.search}` : undefined} onClose={() => setCapture(false)} />}
    {toast && <div className="toast" role="status"><span>{toast.message}</span>{toast.undo && <button onClick={async () => { try { await toast.undo(); setToast(null); } catch { notify('The change could not be undone. Please retry.'); } }}>Undo</button>}<button className="icon-button" aria-label="Dismiss message" onClick={() => setToast(null)}><X size={15} /></button></div>}
    {updateAvailable && <div className="update-notice" role="status"><span>A new version is ready. Saved drafts stay on this device.</span><button onClick={() => updateServiceWorker.current?.(true)}>Update</button><button className="icon-button" aria-label="Update later" onClick={() => setUpdateAvailable(false)}><X size={15} /></button></div>}
  </OrganizerContext.Provider>;
}
