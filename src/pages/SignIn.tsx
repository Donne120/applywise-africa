import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, ArrowRight, Check, AlertCircle, User, Lock, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'signup';

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get('next') || '';
  const {
    signUp, signInWithPassword, signInWithEmail, sendPasswordReset,
    configured, user, loading,
  } = useAuth();

  // If they're already signed in, don't make them do it again.
  useEffect(() => {
    if (loading) return;
    if (user) {
      const dest = nextPath && nextPath.startsWith('/') ? nextPath : '/today';
      navigate(dest, { replace: true });
    }
  }, [user, loading, nextPath, navigate]);

  // ── Form state ─────────────────────────────────────────────────
  const initialMode: Mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your full name.'); return; }
      if (!email.trim()) { setError('Please enter your email.'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    } else {
      if (!email.trim()) { setError('Please enter your email.'); return; }
      if (!password) { setError('Please enter your password.'); return; }
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const res = await signUp(email, password, fullName, nextPath);
        if (!res.ok) { setError(res.error ?? 'Could not create account. Try again.'); return; }
        if (res.needsConfirmation) {
          setConfirmSent(true);
          return;
        }
        // No confirmation required → session is live now. AuthGate redirect fires.
      } else {
        const res = await signInWithPassword(email, password);
        if (!res.ok) { setError(res.error ?? 'Sign-in failed.'); return; }
        // Successful sign-in: auth listener fires, effect above redirects.
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgotPassword() {
    setError('');
    if (!email.trim()) { setError('Enter your email first, then click "Forgot password?"'); return; }
    setSubmitting(true);
    const res = await sendPasswordReset(email);
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? 'Could not send the reset link.'); return; }
    setResetSent(true);
  }

  async function onMagicLinkFallback() {
    setError('');
    if (!email.trim()) { setError('Enter your email first to receive a magic link.'); return; }
    setSubmitting(true);
    const res = await signInWithEmail(email, nextPath);
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? 'Could not send the magic link.'); return; }
    setConfirmSent(true);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setConfirmSent(false);
    setResetSent(false);
  }

  // ── Renders ────────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="signin-page">
        <div className="signin-bg" aria-hidden="true">
          <div className="signin-blur signin-blur-rose" />
          <div className="signin-blur signin-blur-gold" />
        </div>
        <div className="signin-card">
          <Brand />
          <div className="signin-not-ready">
            <AlertCircle size={20} />
            <h2>Sign-in isn't configured yet.</h2>
            <p>
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your{' '}
              <code>.env</code> file, then restart the dev server.
            </p>
            <button className="btn btn-secondary mt-2" onClick={() => navigate('/today')}>
              Continue locally for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (confirmSent) {
    return (
      <div className="signin-page">
        <div className="signin-bg" aria-hidden="true">
          <div className="signin-blur signin-blur-rose" />
          <div className="signin-blur signin-blur-gold" />
        </div>
        <div className="signin-card">
          <button className="signin-back" onClick={() => navigate('/')}>← Back to home</button>
          <Brand />
          <div className="signin-sent">
            <div className="signin-sent-icon"><Check size={26} /></div>
            <h2>Check your email.</h2>
            <p>
              We sent a confirmation link to <strong>{email}</strong>.
              Click it on any device to {mode === 'signup' ? 'finish creating your account' : 'come right in'}.
            </p>
            <p className="signin-sent-hint">
              No email after a minute? Check spam, or try a different address.
            </p>
            <button
              className="btn btn-secondary mt-2"
              onClick={() => { setConfirmSent(false); }}
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="signin-page">
        <div className="signin-bg" aria-hidden="true">
          <div className="signin-blur signin-blur-rose" />
          <div className="signin-blur signin-blur-gold" />
        </div>
        <div className="signin-card">
          <button className="signin-back" onClick={() => navigate('/')}>← Back to home</button>
          <Brand />
          <div className="signin-sent">
            <div className="signin-sent-icon"><Check size={26} /></div>
            <h2>Reset link sent.</h2>
            <p>
              We emailed a password-reset link to <strong>{email}</strong>. Click it to set a new
              password and sign in.
            </p>
            <button
              className="btn btn-secondary mt-2"
              onClick={() => { setResetSent(false); }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signin-page">
      <div className="signin-bg" aria-hidden="true">
        <div className="signin-blur signin-blur-rose" />
        <div className="signin-blur signin-blur-gold" />
      </div>

      <div className="signin-card">
        <button className="signin-back" onClick={() => navigate('/')}>← Back to home</button>
        <Brand />

        {/* Tabs */}
        <div className="signin-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'signin'}
            className={`signin-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === 'signup'}
            className={`signin-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Create account
          </button>
        </div>

        <h1 className="signin-title">
          {mode === 'signup'
            ? <>Begin <em>your journey.</em></>
            : <>Continue <em>your story.</em></>}
        </h1>

        <form onSubmit={onSubmit} className="signin-form">
          {mode === 'signup' && (
            <label className="signin-label">
              <User size={14} />
              <input
                type="text"
                autoComplete="name"
                placeholder="Full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
          )}

          <label className="signin-label">
            <Mail size={14} />
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={submitting}
            />
          </label>

          <label className="signin-label">
            <Lock size={14} />
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              placeholder={mode === 'signup' ? 'Create a password (8+ characters)' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={submitting}
              minLength={mode === 'signup' ? 8 : undefined}
            />
            <button
              type="button"
              className="signin-pw-toggle"
              onClick={() => setShowPw(s => !s)}
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </label>

          {mode === 'signup' && <PasswordStrength value={password} />}

          {error && (
            <div className="signin-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary signin-submit" disabled={submitting}>
            {submitting
              ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (
                <>
                  {mode === 'signup' ? 'Create account' : 'Sign in'}
                  <ArrowRight size={14} />
                </>
              )}
          </button>

          {mode === 'signup' && (
            <p className="signin-tos">
              By continuing you agree to our{' '}
              <a href="#" onClick={e => e.preventDefault()}>Terms</a> and{' '}
              <a href="#" onClick={e => e.preventDefault()}>Privacy</a>.
            </p>
          )}

          {mode === 'signin' && (
            <div className="signin-secondary-actions">
              <button type="button" className="link-btn" onClick={onForgotPassword} disabled={submitting}>
                Forgot password?
              </button>
              <button type="button" className="link-btn" onClick={onMagicLinkFallback} disabled={submitting}>
                Sign in with a magic link instead
              </button>
            </div>
          )}
        </form>

        <button className="btn btn-ghost signin-skip" onClick={() => navigate('/today')}>
          Continue without an account
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="signin-brand">
      <span className="brand-icon">🎓</span>
      <span className="signin-brand-name">ApplyWise Africa</span>
    </div>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const strength = scorePassword(value);
  const labels = ['too short', 'weak', 'okay', 'good', 'strong'];
  const label = labels[strength];
  const pct = (strength / 4) * 100;
  return (
    <div className="signin-strength">
      <div className="signin-strength-bar">
        <span className={`signin-strength-fill strength-${strength}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="signin-strength-label">
        {value.length === 0 ? ' ' : `Password strength: ${label}`}
      </div>
    </div>
  );
}

function scorePassword(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}
