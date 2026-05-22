import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import AuthCallback from './pages/AuthCallback';
import Admin from './pages/Admin';
import { isAdminUser } from './utils/admin';
import AwShell from './aw/AwShell';
import ApplyWisePage from './aw/ApplyWisePage';
import FinderPage from './aw/FinderPage';
import ProfilePage from './aw/ProfilePage';
import SettingsPage from './aw/SettingsPage';
import './styles/global.css';

/** Bare layout for public pages — no sidebar, no topbar. */
function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-layout">{children}</div>;
}

/**
 * Smart root: signed-in users go straight to the ApplyWise studio.
 * Signed-out users always see the landing page first.
 */
function RootGate() {
  const { user, configured: authConfigured } = useAuth();
  const isAuthedOrLocalOnly = !!user || !authConfigured;

  if (isAuthedOrLocalOnly) {
    return <Navigate to="/aw" replace />;
  }
  return (
    <PublicLayout>
      <Landing />
    </PublicLayout>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-bootstrap">
        <div className="auth-bootstrap-spinner" />
      </div>
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdminUser(user)) navigate('/aw', { replace: true });
  }, [user, navigate]);
  if (!isAdminUser(user)) return null;
  return <>{children}</>;
}

function Shell() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<RootGate />} />
          <Route path="/signin"        element={<PublicLayout><SignIn /></PublicLayout>} />
          <Route path="/auth/callback" element={<PublicLayout><AuthCallback /></PublicLayout>} />

          {/* ApplyWise Africa — the app */}
          <Route path="/aw" element={<AwShell />}>
            <Route index             element={<ApplyWisePage />} />
            <Route path="applywise"  element={<ApplyWisePage />} />
            <Route path="finder"     element={<FinderPage />} />
            <Route path="profile"    element={<ProfilePage />} />
            <Route path="settings"   element={<SettingsPage />} />
          </Route>

          {/* Admin (support only) */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

          {/* Legacy redirects — anything else falls back to the studio */}
          <Route path="*" element={<Navigate to="/aw" replace />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </AuthProvider>
  );
}
