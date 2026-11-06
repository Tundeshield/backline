import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { Logo } from '../components/Layout.jsx';
import { Button, Field } from '../components/ui.jsx';

export default function Auth({ mode }) {
  const { signIn, signUp, signInGoogle, startDemo, demoMode } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const go = async (fn) => {
    setErr(''); setBusy(true);
    try { await fn(); nav(signup ? '/onboarding' : '/app'); }
    catch (e) { setErr(e.message?.replace('Firebase: ', '') || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <Link to="/"><Logo /></Link>
        <h1 className="display mt-12 text-4xl font-semibold">{signup ? 'Set up your back office' : 'Welcome back'}</h1>
        <p className="mt-2 text-ink/60">{signup ? 'Takes about five minutes. You can invite your accountant later.' : 'Sign in to Backline.'}</p>
        <form className="mt-8 max-w-sm space-y-4" onSubmit={(e) => { e.preventDefault(); go(() => (signup ? signUp(f.name, f.email, f.password) : signIn(f.email, f.password))); }}>
          {signup && <Field label="Your name"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>}
          <Field label="Work email"><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Password"><input className="input" type="password" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          {err && <div className="rounded-lg bg-rust/10 px-3 py-2 text-sm text-rust">{err}</div>}
          <Button className="w-full" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => go(signInGoogle)}>Continue with Google</Button>
        </form>
        <p className="mt-6 text-sm text-ink/60">
          {signup ? <>Already have an account? <Link className="font-semibold text-ink underline" to="/login">Sign in</Link></> : <>New to Backline? <Link className="font-semibold text-ink underline" to="/signup">Create an account</Link></>}
        </p>
        {demoMode && (
          <div className="mt-8 max-w-sm rounded-xl border border-amber/50 bg-amber/10 p-4 text-sm">
            Firebase isn't configured yet, so accounts are stored in this browser. Or{' '}
            <button className="font-semibold underline" onClick={() => { startDemo(); nav('/app'); }}>open the sample business</button>.
          </div>
        )}
      </div>
      <div className="grain hidden items-center justify-center bg-ink p-16 lg:flex">
        <blockquote className="max-w-md text-paper">
          <div className="display text-3xl leading-snug">"We were onboarded to e-invoicing in a week. Now the books close themselves and our accountant just signs off."</div>
          <div className="mt-6 text-sm text-paper/50">— The kind of review we're building Backline to earn</div>
        </blockquote>
      </div>
    </div>
  );
}
