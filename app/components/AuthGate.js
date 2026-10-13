'use client';

import { useState } from 'react';
import { keyToEmail, supabase, useSession } from '../../lib/supabase';

function SignIn() {
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: keyToEmail(key), password });
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong key or password.' : error.message);
    setBusy(false);
  };

  return (
    <form className="signin" onSubmit={submit}>
      <h2 className="section-title">Sign in</h2>
      <div className="field">
        <label htmlFor="key">Key</label>
        <input id="key" className="input" value={key} onChange={(e) => setKey(e.target.value)} autoCapitalize="none" autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

// Renders children only for a signed-in user.
export default function AuthGate({ children }) {
  const session = useSession();

  if (!supabase) {
    return <p className="error">Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild.</p>;
  }
  if (session === undefined) return <p className="notice">Loading…</p>;
  if (!session) return <SignIn />;
  return children;
}
