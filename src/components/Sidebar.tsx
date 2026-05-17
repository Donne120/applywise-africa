import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar, GraduationCap, Compass, PenTool,
  Sprout, Users, Sun, Moon, Globe, BookHeart,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const navItems = [
  { to: '/today',         icon: Calendar,      label: 'Today',         sublabel: 'Your daily focus' },
  { to: '/applications',  icon: GraduationCap, label: 'My Applications', sublabel: 'Scholarships you\'re tracking' },
  { to: '/discover',      icon: Compass,       label: 'Discover',      sublabel: 'AI-powered scholarship finder' },
  { to: '/writing',       icon: PenTool,       label: 'Writing Studio', sublabel: 'SOPs, essays & letters', badge: 'AI' },
  { to: '/stories',       icon: BookHeart,     label: 'Story Vault',   sublabel: 'Your raw material' },
  { to: '/grow',          icon: Sprout,        label: 'Grow',          sublabel: 'Close your gaps' },
  { to: '/recommenders',  icon: Users,         label: 'Recommenders',  sublabel: 'Letters & nudges' },
];

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('udonpass-theme') as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Sidebar() {
  const { studentProfile } = useApp();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('udonpass-theme', theme);
  }, [theme]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🎓</span>
        <div>
          <div className="brand-name">ApplyWise Africa</div>
          <div className="brand-user">{studentProfile.fullName || 'Your scholarship journey'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, sublabel, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span className="nav-label-wrap">
              <span>{label}</span>
              {sublabel && <span className="nav-sublabel">{sublabel}</span>}
            </span>
            {badge && <span className={`nav-badge ${badge === 'SOON' ? 'nav-badge-soon' : ''}`}>{badge}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
        <span>{theme === 'light' ? 'Light' : 'Dark'} mode</span>
        <span className="tt-track"><span className="tt-knob" /></span>
      </button>

      <div className="sidebar-footer">
        <Globe size={14} />
        <span>{studentProfile.countryOfOrigin || 'Africa'} <span className="flag">🌍</span> → World</span>
      </div>
    </aside>
  );
}
