import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, Calendar, GraduationCap, Compass, PenTool,
  Sprout, Users, Sun, Moon, Globe, BookHeart, LogOut, LogIn,
  User, CreditCard, ShieldCheck, Plus, Mic, Sparkles, Flame,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { isAdminUser } from '../utils/admin';
import VoiceComposer from './VoiceComposer';

/**
 * Mobile-only top bar + slide-out drawer + bottom tab-bar.
 * Hidden entirely on desktop (>= 860px); the regular Sidebar handles those.
 *
 * Layout shape on mobile:
 *
 *   [ ☰ brand                avatar ]  ← .mobile-topbar (sticky top)
 *
 *     <page content>
 *
 *   [ Today · Apps · Write · Grow ]    ← .mobile-tabbar (sticky bottom)
 *
 *   Tap ☰ → full-height drawer slides in from the left with every nav item,
 *   theme toggle, and sign-in / sign-out.
 */

const NAV_LEFT = [
  { to: '/today',        icon: Calendar,      label: 'Today' },
  { to: '/applications', icon: GraduationCap, label: 'Apps' },
];
const NAV_RIGHT = [
  { to: '/writing',      icon: PenTool,       label: 'Write' },
  { to: '/grow',         icon: Sprout,        label: 'Grow' },
];

const STREAK_KEY = 'udonpass-streak-v1';
function readStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw).count || 0;
  } catch { /* ignore */ }
  return 0;
}

// Full nav (drawer) — includes everything from the desktop sidebar plus the
// secondary destinations (Discover / Stories / Recommenders) that don't fit
// in a 4-slot bottom bar.
const DRAWER_ITEMS = [
  { to: '/today',         icon: Calendar,      label: 'Today',        sublabel: 'Your daily focus' },
  { to: '/applications',  icon: GraduationCap, label: 'My Applications', sublabel: 'Scholarships you\'re tracking' },
  { to: '/discover',      icon: Compass,       label: 'Discover',     sublabel: 'AI scholarship finder' },
  { to: '/writing',       icon: PenTool,       label: 'Writing Studio', sublabel: 'SOPs, essays & letters', badge: 'AI' },
  { to: '/stories',       icon: BookHeart,     label: 'Story Vault',  sublabel: 'Your raw material' },
  { to: '/grow',          icon: Sprout,        label: 'Grow',         sublabel: 'Close your gaps' },
  { to: '/recommenders',  icon: Users,         label: 'Recommenders', sublabel: 'Letters & nudges' },
];

type Theme = 'light' | 'dark';
function getInitialTheme(): Theme {
  const saved = localStorage.getItem('udonpass-theme') as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentProfile, currentPlan, scholarships } = useApp();
  const { user, signOut, configured } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const streak = readStreak();

  const upcoming = [...scholarships]
    .filter(s => !s.isPastDue && s.daysLeft !== null && s.status !== 'Submitted' && s.status !== 'Accepted')
    .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))[0];
  const daysToNext = upcoming?.daysLeft ?? null;
  const urgent = daysToNext !== null && daysToNext <= 14;

  // Sync theme attribute & persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('udonpass-theme', theme);
  }, [theme]);

  // Close drawer when route changes (after the user taps an item)
  useEffect(() => { setDrawerOpen(false); setFabOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [drawerOpen]);

  const initial = (studentProfile.fullName || user?.email || 'A').trim().charAt(0).toUpperCase();

  async function handleSignOut() {
    if (!confirm('Sign out? Your data stays safe in your account.')) return;
    try {
      localStorage.removeItem('udonpass-profile');
      localStorage.removeItem('udonpass-stories');
      localStorage.removeItem('udonpass-recommenders');
      localStorage.removeItem('udonpass-retros');
      localStorage.removeItem('udonpass-sync-coach-dismissed-v1');
    } catch { /* ignore */ }
    await signOut();
    window.location.href = '/';
  }

  return (
    <>
      {/* ── Top bar (sticky, gamified) ─────────────────────────── */}
      <div className="mobile-topbar">
        <button
          className="mobile-topbar-menu"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} />
        </button>

        <div className="mobile-topbar-gamify">
          <div className="mobile-topbar-chip streak" aria-label={`${streak}-day streak`}>
            <Flame size={13} />
            <span>{streak}</span>
          </div>
          {daysToNext !== null ? (
            <div className={`mobile-topbar-chip countdown ${urgent ? 'urgent' : ''}`}>
              <span className="mobile-topbar-chip-val">{daysToNext}d</span>
              <span className="mobile-topbar-chip-lbl">
                to {upcoming!.name.length > 18 ? upcoming!.name.slice(0, 16) + '…' : upcoming!.name}
              </span>
            </div>
          ) : (
            <div className="mobile-topbar-chip countdown">
              <span className="mobile-topbar-chip-lbl">No deadline yet</span>
            </div>
          )}
        </div>

        <button
          className="mobile-topbar-avatar"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          {initial}
        </button>
      </div>

      {/* ── Bottom tab bar with center FAB ─────────────────────── */}
      <nav className="mobile-tabbar with-fab" aria-label="Primary">
        {NAV_LEFT.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/today'}
            className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span className="mobile-tab-label">{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`mobile-fab ${fabOpen ? 'open' : ''}`}
          aria-label="Quick actions"
          aria-expanded={fabOpen}
          onClick={() => setFabOpen(o => !o)}
        >
          <Plus size={26} />
        </button>

        {NAV_RIGHT.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/today'}
            className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span className="mobile-tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Radial quick-action menu ───────────────────────────── */}
      {fabOpen && (
        <div className="mobile-fab-sheet" onClick={() => setFabOpen(false)}>
          <div className="mobile-fab-actions" onClick={e => e.stopPropagation()}>
            <button
              className="mobile-fab-action"
              onClick={() => { setFabOpen(false); navigate('/discover'); }}
            >
              <span className="mobile-fab-action-icon"><GraduationCap size={18} /></span>
              <span>Add scholarship</span>
            </button>
            <button
              className="mobile-fab-action"
              onClick={() => { setFabOpen(false); setVoiceOpen(true); }}
            >
              <span className="mobile-fab-action-icon"><Mic size={18} /></span>
              <span>Voice a story</span>
            </button>
            <button
              className="mobile-fab-action"
              onClick={() => { setFabOpen(false); navigate('/writing'); }}
            >
              <span className="mobile-fab-action-icon"><Sparkles size={18} /></span>
              <span>Ask ApplyWise AI</span>
            </button>
            <button
              className="mobile-fab-action"
              onClick={() => { setFabOpen(false); navigate('/tasks'); }}
            >
              <span className="mobile-fab-action-icon"><Calendar size={18} /></span>
              <span>Snap a deadline</span>
            </button>
          </div>
        </div>
      )}

      <VoiceComposer open={voiceOpen} onClose={() => setVoiceOpen(false)} />

      {/* ── Drawer ──────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside
            className="mobile-drawer"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="mobile-drawer-head">
              <div className="mobile-drawer-brand">
                <span className="mobile-drawer-brand-icon">🎓</span>
                <div>
                  <div className="mobile-drawer-brand-name">ApplyWise Africa</div>
                  <div className="mobile-drawer-brand-user">
                    {studentProfile.fullName || user?.email || 'Your journey'}
                  </div>
                </div>
              </div>
              <button
                className="mobile-drawer-close"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              {DRAWER_ITEMS.map(({ to, icon: Icon, label, sublabel, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/today'}
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span className="mobile-drawer-label">
                    <span>{label}</span>
                    <span className="mobile-drawer-sublabel">{sublabel}</span>
                  </span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </NavLink>
              ))}
            </nav>

            {/* Quick account actions */}
            <div className="mobile-drawer-section">
              <div className="mobile-drawer-section-label">ACCOUNT</div>
              <button className="mobile-drawer-action" onClick={() => navigate('/profile')}>
                <User size={16} /> <span>Profile & story</span>
              </button>
              <button className="mobile-drawer-action" onClick={() => navigate('/billing')}>
                <CreditCard size={16} /> <span>Plan & billing · {currentPlan}</span>
              </button>
              {isAdminUser(user) && (
                <button className="mobile-drawer-action" onClick={() => navigate('/admin')}>
                  <ShieldCheck size={16} /> <span>Admin panel</span>
                </button>
              )}
            </div>

            {/* Theme + sign out at the bottom */}
            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-theme"
                onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'light' ? 'Light' : 'Dark'} mode</span>
                <span className="tt-track"><span className="tt-knob" /></span>
              </button>

              {user ? (
                <button className="mobile-drawer-signout" onClick={handleSignOut}>
                  <LogOut size={16} /> Sign out
                </button>
              ) : configured ? (
                <button className="mobile-drawer-signin" onClick={() => navigate('/signin')}>
                  <LogIn size={16} /> Sign in to save in the cloud
                </button>
              ) : null}

              <div className="mobile-drawer-where">
                <Globe size={12} /> {studentProfile.countryOfOrigin || 'Africa'} 🌍 → World
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
