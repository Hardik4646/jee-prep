import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FileText, Mail, Lock, ArrowRight, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'forgot';

export function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email.trim());
      setBusy(false);
      if (error) {
        setError(error);
      } else {
        setInfo('Password reset link sent! Check your email inbox (and spam folder) for a link to reset your password.');
      }
      return;
    }

    if (!password) { setBusy(false); return; }
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-button)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <FileText size={22} className="text-white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Mistake Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>JEE Analytics — sign in to sync your data</p>
        </div>

        <div className="card animate-slide-up" style={{ padding: 28 }}>
          {/* Mode toggle — hidden in forgot mode */}
          {mode !== 'forgot' && (
            <div className="flex gap-1" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', padding: 3, marginBottom: 24 }}>
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-button)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-tertiary)', transition: 'all 150ms' }}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <button onClick={() => switchMode('signin')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
              <ArrowLeft size={14} /> Back to sign in
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input type="email" className="field" style={{ paddingLeft: 38 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="field-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input type="password" className="field" style={{ paddingLeft: 38 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-button)', display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.2)' }}>
                <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
              </div>
            )}

            {info && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-button)', display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--success)', lineHeight: 1.5 }}>{info}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Please wait…' : (
                <>
                  {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {mode === 'signin' && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => switchMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Forgot your password?
              </button>
            </p>
          )}

          {mode !== 'forgot' && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
