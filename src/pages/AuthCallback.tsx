import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Lands here after the user clicks the magic-link email.
 * Supabase auto-parses the URL hash and creates a session.
 * We just wait briefly, then redirect to /today (or back to /signin on error).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    // Give the Supabase client time to consume the URL fragment.
    const t = setTimeout(async () => {
      if (!supabase) { setError('Supabase is not configured.'); return; }
      const { data, error: authErr } = await supabase.auth.getSession();
      if (authErr || !data.session) {
        setError(authErr?.message ?? 'Could not complete sign-in. Try again.');
        return;
      }
      // Decide where to send them. Priority:
      //   1. ?next= query param on this URL (survives cross-device flows because
      //      it rides inside the magic-link email).
      //   2. sessionStorage stash (only works for same-browser flows but is a
      //      backstop for older email links that don't have the param yet).
      //   3. Default: /today.
      let next = '/today';
      const fromUrl = params.get('next');
      if (fromUrl && fromUrl.startsWith('/')) {
        next = fromUrl;
      } else {
        try {
          const stored = sessionStorage.getItem('udonpass-next-after-signin');
          if (stored && stored.startsWith('/')) next = stored;
        } catch { /* ignore */ }
      }
      try { sessionStorage.removeItem('udonpass-next-after-signin'); } catch { /* ignore */ }
      navigate(next, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [navigate, params]);

  return (
    <div className="signin-page">
      <div className="signin-bg" aria-hidden="true">
        <div className="signin-blur signin-blur-rose" />
        <div className="signin-blur signin-blur-gold" />
      </div>
      <div className="signin-card signin-callback">
        {error ? (
          <>
            <div className="signin-sent-icon signin-sent-icon-error">
              <AlertCircle size={26} />
            </div>
            <h2>Sign-in didn't complete.</h2>
            <p>{error}</p>
            <button className="btn btn-primary mt-2" onClick={() => navigate('/signin', { replace: true })}>
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="signin-spinner">
              <Sparkles size={22} />
            </div>
            <h2>Signing you in…</h2>
            <p>One moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
