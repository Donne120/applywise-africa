import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, User, CreditCard, Settings, ShieldCheck, Bell, LogOut,
  Check, RefreshCw, CloudOff, AlertCircle, LogIn,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { isAdminUser } from '../utils/admin';

export default function UserMenu() {
  const navigate = useNavigate();
  const { studentProfile, writingCredits, currentPlan, syncStatus } = useApp();
  const { user, signOut, configured } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (studentProfile.fullName || user?.email || 'A').trim().charAt(0).toUpperCase();
  const display = studentProfile.fullName || user?.email || 'Set up your profile';
  const subText = user?.email
    ? `${user.email} · ${currentPlan} plan`
    : `${writingCredits === 999 ? '∞' : writingCredits} credits · ${currentPlan} plan`;

  const go = (path: string) => { setOpen(false); navigate(path); };

  const handleSignOut = async () => {
    if (!confirm('Sign out? Your data stays safe in your account — you can come back any time.')) return;
    setOpen(false);
    // Clear local cache FIRST so even if the Supabase signOut races, the
    // page reload sees a clean state and lands on the marketing page.
    try {
      localStorage.removeItem('udonpass-profile');
      localStorage.removeItem('udonpass-stories');
      localStorage.removeItem('udonpass-recommenders');
      localStorage.removeItem('udonpass-retros');
      localStorage.removeItem('udonpass-writing-docs');
      localStorage.removeItem('udonpass-sync-coach-dismissed-v1');
      sessionStorage.removeItem('udonpass-next-after-signin');
    } catch { /* ignore */ }
    await signOut();
    // Hard reload to root so AuthContext + AppContext re-initialize from scratch.
    window.location.href = '/';
  };

  const handleLocalReset = () => {
    if (!confirm('Reset local session and return to home? Your stories and applications on this device will be cleared.')) return;
    try {
      localStorage.removeItem('udonpass-profile');
      localStorage.removeItem('udonpass-sync-coach-dismissed-v1');
    } catch { /* ignore */ }
    setOpen(false);
    window.location.href = '/';
  };

  return (
    <div className="user-menu" ref={ref}>
      <SyncIndicator status={syncStatus} configured={configured} signedIn={!!user} />

      <button
        type="button"
        className="user-menu-notif"
        aria-label="Notifications"
        title="Notifications (coming soon)"
      >
        <Bell size={16} />
      </button>

      <button
        type="button"
        className={`user-menu-pill ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="user-menu-avatar">{initial}</span>
        <span className="user-menu-name">{display}</span>
        <span className={`user-menu-plan plan-${currentPlan.toLowerCase()}`}>{currentPlan}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="user-menu-popover">
          <div className="user-menu-header">
            <div className="user-menu-avatar lg">{initial}</div>
            <div>
              <div className="user-menu-fullname">{display}</div>
              <div className="user-menu-sub">{subText}</div>
            </div>
          </div>

          <button className="user-menu-item" onClick={() => go('/profile')}>
            <User size={15} /> Profile & story
          </button>
          <button className="user-menu-item" onClick={() => go('/billing')}>
            <CreditCard size={15} /> Plan & billing
          </button>
          <button className="user-menu-item" onClick={() => go('/dashboard')}>
            <Settings size={15} /> Classic dashboard
          </button>
          {isAdminUser(user) && (
            <>
              <div className="user-menu-divider" />
              <button className="user-menu-item user-menu-admin" onClick={() => go('/admin')}>
                <ShieldCheck size={15} /> Admin panel
              </button>
            </>
          )}
          {user ? (
            <button className="user-menu-item user-menu-signout" onClick={handleSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          ) : configured ? (
            <button className="user-menu-item user-menu-signin" onClick={() => go('/signin')}>
              <LogIn size={15} /> Sign in to save in the cloud
            </button>
          ) : (
            <button className="user-menu-item user-menu-signout" onClick={handleLocalReset}>
              <LogOut size={15} /> Reset local session
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sync indicator ────────────────────────────────────────────────
function SyncIndicator({ status, configured, signedIn }: {
  status: 'offline' | 'syncing' | 'synced' | 'error';
  configured: boolean;
  signedIn: boolean;
}) {
  // Don't render anything if Supabase isn't configured at all — would just confuse the user.
  if (!configured) return null;
  // If not signed in, show a soft "Local only" pill that invites sign-in.
  if (!signedIn) {
    return (
      <span className="sync-pill sync-pill-offline" title="Sign in to sync your work across devices">
        <CloudOff size={12} /> Local only
      </span>
    );
  }

  const meta = ({
    offline: { label: 'Offline', icon: <CloudOff size={12} />,     className: 'sync-pill-offline' },
    syncing: { label: 'Syncing', icon: <RefreshCw size={12} className="spin" />, className: 'sync-pill-syncing' },
    synced:  { label: 'Synced',  icon: <Check size={12} />,        className: 'sync-pill-synced'  },
    error:   { label: 'Sync error', icon: <AlertCircle size={12} />, className: 'sync-pill-error' },
  } as const)[status];

  return (
    <span className={`sync-pill ${meta.className}`} title={`Cloud sync: ${meta.label}`}>
      {meta.icon} {meta.label}
    </span>
  );
}
