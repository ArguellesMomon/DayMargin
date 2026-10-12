import BrandMark from '../components/BrandMark.jsx';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useDaymargin } from '../context.jsx';
import { FinnAvatar, BackLink } from '../components/UI.jsx';
import { cloudConfigured, auth } from '../lib/cloud.js';
import { dateLabel, money, today } from '../lib/domain.js';

function AccountAside() {
  return <aside className="account-aside"><Link className="brand" to="/welcome"><BrandMark /><span>daymargin.</span></Link><div><h2>Your daily organizer.</h2><div className="account-finn"><FinnAvatar size="medium" /></div></div><p className="account-aside-footer">English · PHP · Asia/Manila</p></aside>;
}

export function Welcome() {
  const { user, preview, enterPreview } = useDaymargin();
  if (user || preview) return <Navigate to="/" replace />;
  return <div className="welcome"><div className="welcome-top"><Link className="brand" to="/welcome"><BrandMark /><span>daymargin.</span></Link><span>Your daily organizer</span></div><div className="welcome-content"><div className="welcome-copy"><h1>Your day,<br />kept in order.</h1><p>Plans, notes and expenses, together.</p><div className="welcome-buttons">{cloudConfigured ? <><Link className="button primary" to="/auth/signup">Get started <ArrowRight size={18} /></Link><Link className="text-link" to="/auth/signin">Sign in</Link></> : <button className="button primary" onClick={enterPreview}>Explore Daymargin <ArrowRight size={18} /></button>}</div><p className="welcome-footnote">{cloudConfigured ? 'English · PHP · Asia/Manila' : 'A local preview with editable sample entries. Cloud accounts and Finn’s AI replies are not connected yet.'}</p>{cloudConfigured && import.meta.env.DEV && <button className="text-link" onClick={enterPreview}>Open development preview <ArrowUpRight size={14} /></button>}</div><div className="welcome-notebook"><div className="notebook-top"><span>AN ILLUSTRATIVE DAY</span><span>01</span></div><p className="notebook-date">{dateLabel(today(), { weekday: 'long', month: 'long' })}</p><div className="notebook-lines"><span><i />A little time for a walk<small>5:30 PM</small></span><span><i />One thought worth keeping<small>Note</small></span><span><i />Lunch at the corner café<small>{money(18500)}</small></span></div><div className="welcome-finn"><FinnAvatar size="large" /><div><span className="eyebrow">MEET FINN</span></div></div></div></div></div>;
}
export function Auth() {
  const { mode } = useParams();
  const { user, notify } = useDaymargin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const signup = mode === 'signup', reset = mode === 'reset', update = mode === 'update';
  if (!cloudConfigured) return <div className="auth-page"><BackLink to="/welcome" /><h1>Accounts are not connected yet.</h1><p>You can explore the local preview from the welcome page.</p></div>;
  if (user && !update && !reset) return <Navigate to={signup ? '/setup' : '/'} replace />;
  async function submit(event) {
    event.preventDefault(); setError('');
    if (signup && !accepted) { setError('Please acknowledge how your records are used before creating your account.'); return; }
    setBusy(true);
    try {
      if (reset) {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/update` });
        if (error) throw error; setSent(true);
      } else if (update) {
        const { error } = await auth.updateUser({ password });
        if (error) throw error; notify('Password updated. Sign in with your new password.'); navigate('/auth/signin');
      } else if (signup) {
        const { data, error } = await auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/setup` } });
        if (error) throw error;
        if (data.session) navigate('/setup'); else setSent(true);
      } else {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error; navigate('/');
      }
    } catch (e) { setError(e.message || 'Could not complete this request. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="account-layout"><AccountAside /><div className="auth-page"><BackLink to="/welcome" children="Daymargin" /><h1>{signup ? 'Create account' : reset ? 'Reset password' : update ? 'New password' : 'Sign in'}</h1>
    {sent ? <div className="notice" role="status">Check your email for a {reset ? 'password recovery' : 'confirmation'} link. If it doesn’t arrive, check your spam folder.</div> : <form onSubmit={submit} className="auth-form">
      {signup && <label>Your name<input autoComplete="given-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>}
      {!update && <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {!reset && <label>Password<div className="password-input"><input type={visible ? 'text' : 'password'} minLength={8} required autoComplete={signup || update ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="icon-button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>}
      {signup && <label className="check-label notice-check"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>I understand my records are stored with my account, and Finn processes entries I allow through an external AI service when I ask a question. I can exclude individual entries.</span></label>}
      {error && <p className="notice error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Working…' : signup ? 'Create account' : reset ? 'Send recovery link' : update ? 'Save new password' : 'Sign in'}<ArrowRight size={17} /></button>
    </form>}
    {!signup && !reset && !update && <Link className="text-link" to="/auth/reset">Forgot your password?</Link>}<p className="auth-switch">{signup ? 'Already have an account?' : 'New to Daymargin?'} <Link to={signup ? '/auth/signin' : '/auth/signup'}>{signup ? 'Sign in' : 'Create account'}</Link></p>
  </div></div>;
}
export function Setup() {
  const { user, preferences, changePreferences, notify } = useDaymargin();
  const [name, setName] = useState(user?.user_metadata?.display_name || '');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (!user) return <Navigate to="/auth/signin" replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    const { error } = await auth.updateUser({ data: { display_name: name, setup_complete: true } });
    setBusy(false);
    if (error) notify('Your setup could not be saved. Please retry.'); else navigate('/');
  }
  return <div className="auth-page setup-page"><div className="setup-intro"><FinnAvatar size="medium" /></div><h1>Setup</h1><form className="auth-form" onSubmit={submit}><label>Your name<input value={name} onChange={e => setName(e.target.value)} maxLength={60} required /></label><dl className="defaults-list"><div><dt>Currency</dt><dd>PHP · Philippine peso</dd></div><div><dt>Time zone</dt><dd>Asia/Manila</dd></div><div><dt>Language</dt><dd>English</dd></div></dl><label>Appearance<select value={preferences.theme} onChange={e => changePreferences({ theme: e.target.value })}><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select></label><p className="help-text">Finn uses entries you allow. You approve changes.</p><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Continue to Today'}<ArrowRight size={17} /></button></form></div>;
}
