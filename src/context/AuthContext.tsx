import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  /** True until we've checked for an existing session on mount. */
  loading: boolean;
  /** Set if Supabase env vars aren't configured — app runs local-only. */
  configured: boolean;
  user: User | null;
  session: Session | null;
  /** Email + password sign-in. Returns user-friendly error string on failure. */
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Create a new account. Triggers Supabase's confirmation email (when
   * "Confirm email" is ON) so the user must click a magic link to verify
   * before they can sign in. The `fullName` we provide is stored as user
   * metadata; AppProvider reads it on first sign-in and writes to profile.
   */
  signUp: (
    email: string, password: string, fullName: string, nextPath?: string,
  ) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  /** Magic link — used both for "forgot password" and as a passwordless option. */
  signInWithEmail: (email: string, nextPath?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Send a password-reset email (Supabase recovery flow). */
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Pick up an existing session on first load.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    // Keep state in sync with future auth changes (sign-in, sign-out, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Email + password sign-in ───────────────────────────────────
  async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: 'Sign-in is not configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to your .env.' };
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return { ok: false, error: 'Please enter a valid email.' };
    if (!password) return { ok: false, error: 'Please enter your password.' };

    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error) {
      // Supabase returns "Invalid login credentials" generically. Reword for clarity.
      if (/invalid login credentials/i.test(error.message)) {
        return { ok: false, error: 'Email or password is incorrect. If you signed up but haven\'t confirmed your email yet, check your inbox.' };
      }
      if (/email not confirmed/i.test(error.message)) {
        return { ok: false, error: 'Please confirm your email first — check the link we sent you when you signed up.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  // ── Sign up: create account, send confirmation email ───────────
  async function signUp(
    email: string, password: string, fullName: string, nextPath?: string,
  ): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> {
    if (!supabase) return { ok: false, error: 'Sign-up is not configured. Add Supabase env vars to your .env.' };
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) return { ok: false, error: 'Please enter a valid email.' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
    if (!trimmedName) return { ok: false, error: 'Please enter your full name.' };

    // Stash for AppProvider to pick up on first sign-in (and for the magic-link
    // confirmation flow if "Confirm email" is on).
    try {
      sessionStorage.setItem('udonpass-pending-name', trimmedName);
      if (nextPath) sessionStorage.setItem('udonpass-next-after-signin', nextPath);
    } catch { /* ignore */ }

    const callbackBase = `${window.location.origin}/auth/callback`;
    const emailRedirectTo = nextPath
      ? `${callbackBase}?next=${encodeURIComponent(nextPath)}`
      : callbackBase;

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo,
        data: { full_name: trimmedName },   // stored in auth.users.user_metadata
      },
    });
    if (error) {
      if (/already registered|already exists|user already/i.test(error.message)) {
        return { ok: false, error: 'An account with this email already exists. Try signing in instead, or use "Forgot password?" if you can\'t remember it.' };
      }
      return { ok: false, error: error.message };
    }
    // If the project has "Confirm email" ON, session is null and we must wait
    // for the user to click the confirmation link. If it's OFF, session exists
    // immediately and we're signed in right now.
    const needsConfirmation = !data.session;
    return { ok: true, needsConfirmation };
  }

  // ── Password reset (sends magic link to recover) ───────────────
  async function sendPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: 'Not configured.' };
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return { ok: false, error: 'Please enter a valid email.' };
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signInWithEmail(email: string, nextPath?: string): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: 'Supabase is not configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to your .env.' };
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      return { ok: false, error: 'Please enter a valid email.' };
    }
    // Stash the next path TWO ways so it survives:
    //   1. Same-browser flow → sessionStorage (clicks email link in same tab/browser)
    //   2. Cross-device flow → query param on the redirect URL (clicks email link
    //      on phone after starting on desktop, etc.). sessionStorage wouldn't
    //      survive that, but the URL parameter rides along inside the magic link.
    if (nextPath) {
      try { sessionStorage.setItem('udonpass-next-after-signin', nextPath); } catch { /* ignore */ }
    }
    const callbackBase = `${window.location.origin}/auth/callback`;
    const emailRedirectTo = nextPath
      ? `${callbackBase}?next=${encodeURIComponent(nextPath)}`
      : callbackBase;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  const value: AuthContextValue = {
    loading,
    configured: isSupabaseReady,
    user: session?.user ?? null,
    session,
    signInWithPassword,
    signUp,
    sendPasswordReset,
    signInWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
