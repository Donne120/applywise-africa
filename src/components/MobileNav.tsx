import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, Sun, Moon, LogOut, LogIn, User, CreditCard,
  ShieldCheck, Users, Sprout, BookHeart, PenTool, GraduationCap,
  Search, Home,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { isAdminUser } from '../utils/admin';

/**
 * Mobile-only top bar + slide-out drawer + bottom tab-bar.
 * Hidden entirely on desktop (>= 860px).
 *
 * Phase 1 of mobile-redesign-v2: slim topbar, 5 tabs, no FAB.
 *   Topbar:  [ ☰   ApplyWise   avatar ]
 *   Tabs:    [ Home · Find · Apply · Story · Write ]
 *   Drawer:  secondary destinations + theme + sign-out
 */

const TABS = [
  { to: '/today',         icon: Home,          label: 'Home' },
  { to: '/discover',      icon: Search,        label: 'Find' },
  { to: '/applications',  icon: GraduationCap, label: 'Apply' },
  { to: '/stories',       icon: BookHeart,     label: 'Story' },
  { to: '/writing',       icon: PenTool,       label: 'Write' },
];

const DRAWER_ITEMS = [
  { to: '/profile',       icon: User,    label: 'Profile & story' },
  { to: '/recommenders',  icon: Users,   label: 'Recommenders' },
  { to: '/grow',          icon: Sprout,  label: 'Grow' },
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
  const { studentProfile, currentPlan } = useApp();
  const { user, signOut, configured } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('udonpass-theme', theme);
  }, [theme]);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

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
      localStorage.removeItem('udonpass-writing-docs');
      localStorage.removeItem('udonpass-sync-coach-dismissed-v1');
    } catch { /* ignore */ }
    await signOut();
    window.location.href = '/';
  }

  return (
    <>
      {/* ── Slim topbar ───────────────────────────── */}
      <div className="mobile-topbar">
        <button
          className="mobile-topbar-menu"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} />
        </button>

        <div className="mobile-topbar-brand">ApplyWise</div>

        <button
          className="mobile-topbar-avatar"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          {initial}
        </button>
      </div>

      {/* ── Bottom tab bar (5 tabs, no FAB) ───────── */}
      <nav className="mobile-tabbar" aria-label="Primary">
        {TABS.map(({ to, icon: Icon, label }) => (
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

      {/* ── Drawer ────────────────────────────────── */}
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
              {DRAWER_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span className="mobile-drawer-label"><span>{label}</span></span>
                </NavLink>
              ))}
            </nav>

            <div className="mobile-drawer-section">
              <div className="mobile-drawer-section-label">ACCOUNT</div>
              <button className="mobile-drawer-action" onClick={() => navigate('/billing')}>
                <CreditCard size={16} /> <span>Plan & billing · {currentPlan}</span>
              </button>
              {isAdminUser(user) && (
                <button className="mobile-drawer-action" onClick={() => navigate('/admin')}>
                  <ShieldCheck size={16} /> <span>Admin panel</span>
                </button>
              )}
            </div>

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
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
