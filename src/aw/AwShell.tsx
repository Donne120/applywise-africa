import { NavLink, Outlet } from 'react-router-dom';
import { Sparkles, Compass, User, Settings as SettingsIcon } from 'lucide-react';
import '../styles/applywise.css';

const NAV = [
  { to: '/aw/applywise', label: 'ApplyWise', icon: Sparkles },
  { to: '/aw/finder',    label: 'Finder',    icon: Compass },
  { to: '/aw/profile',   label: 'Profile',   icon: User },
  { to: '/aw/settings',  label: 'Settings',  icon: SettingsIcon },
];

export default function AwShell() {
  return (
    <div className="aw-shell">
      <aside className="aw-sidebar">
        <div className="aw-brand">
          <div className="aw-brand-mark">A</div>
          <div>
            <div className="aw-brand-name">ApplyWise</div>
            <div className="aw-brand-sub">Africa</div>
          </div>
        </div>
        <nav>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `aw-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="aw-sidebar-footer">
          A calm writing coach for African students.
        </div>
      </aside>
      <main className="aw-main">
        <Outlet />
      </main>
    </div>
  );
}
