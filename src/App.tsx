import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import UserMenu from './components/UserMenu';
import MobileNav from './components/MobileNav';
import OnboardingModal from './components/OnboardingModal';
import SyncCoach from './components/SyncCoach';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import AuthCallback from './pages/AuthCallback';
import Checkout from './pages/Checkout';
import Today from './pages/Today';
import Dashboard from './pages/Dashboard';
import Scholarships from './pages/Scholarships';
import ApplicationWorkspace from './pages/ApplicationWorkspace';
import Finder from './pages/Finder';
import Tasks from './pages/Tasks';
import ApplyWise from './pages/ApplyWise';
import Learning from './pages/Learning';
import Grow from './pages/Grow';
import Stories from './pages/Stories';
import Recommenders from './pages/Recommenders';
import Profile from './pages/Profile';
import Billing from './pages/Billing';
import Admin from './pages/Admin';
import { isAdminUser } from './utils/admin';
import './styles/global.css';

/** Bare layout for public pages — no sidebar, no topbar. */
function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-layout">{children}</div>;
}

/** Full app shell — sidebar, topbar, onboarding, sync coach. */
function AppLayout({ children }: { children: React.ReactNode }) {
  const { studentProfile } = useApp();
  return (
    <>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="app-topbar">
            <UserMenu />
          </div>
          {children}
        </main>
      </div>
      <MobileNav />
      {!studentProfile.onboardingComplete && <OnboardingModal />}
      {studentProfile.onboardingComplete && <SyncCoach />}
    </>
  );
}

/**
 * Smart root: if the user is signed in AND has completed onboarding, send
 * them straight to /today. Otherwise show the landing page. Returning users
 * never see the marketing again — but signed-out users always do, even if
 * they previously had a profile cached locally.
 */
function RootGate() {
  const { studentProfile } = useApp();
  const { user, configured: authConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') return;
    // Only auto-skip the landing for genuinely signed-in users (or local-only
    // mode where Supabase isn't configured). Signed-out users always land here.
    const isAuthedOrLocalOnly = !!user || !authConfigured;
    if (isAuthedOrLocalOnly && studentProfile.onboardingComplete) {
      navigate('/today', { replace: true });
    }
  }, [studentProfile.onboardingComplete, location.pathname, navigate, user, authConfigured]);

  return (
    <PublicLayout>
      <Landing />
    </PublicLayout>
  );
}

/**
 * Wait briefly while AuthContext determines whether there's an existing session.
 * Prevents a flash of the landing for already-signed-in users.
 */
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

/** Hides the admin page from non-admins. UI-level only; real security is RLS. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdminUser(user)) {
      navigate('/today', { replace: true });
    }
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
          <Route path="/"               element={<RootGate />} />
          <Route path="/signin"         element={<PublicLayout><SignIn /></PublicLayout>} />
          <Route path="/auth/callback"  element={<PublicLayout><AuthCallback /></PublicLayout>} />

          {/* App */}
          <Route path="/today"            element={<AppLayout><Today /></AppLayout>} />
          <Route path="/applications"     element={<AppLayout><Scholarships /></AppLayout>} />
          <Route path="/applications/:id" element={<AppLayout><ApplicationWorkspace /></AppLayout>} />
          <Route path="/scholarships"     element={<AppLayout><Scholarships /></AppLayout>} />
          <Route path="/discover"         element={<AppLayout><Finder /></AppLayout>} />
          <Route path="/finder"           element={<AppLayout><Finder /></AppLayout>} />
          <Route path="/tasks"            element={<AppLayout><Tasks /></AppLayout>} />
          <Route path="/writing"          element={<AppLayout><ApplyWise /></AppLayout>} />
          <Route path="/applywise"        element={<AppLayout><ApplyWise /></AppLayout>} />
          <Route path="/grow"             element={<AppLayout><Grow /></AppLayout>} />
          <Route path="/learning"         element={<AppLayout><Learning /></AppLayout>} />
          <Route path="/stories"          element={<AppLayout><Stories /></AppLayout>} />
          <Route path="/recommenders"     element={<AppLayout><Recommenders /></AppLayout>} />
          <Route path="/dashboard"        element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/profile"          element={<AppLayout><Profile /></AppLayout>} />
          <Route path="/billing"          element={<AppLayout><Billing /></AppLayout>} />
          <Route path="/checkout"         element={<AppLayout><Checkout /></AppLayout>} />
          <Route path="/admin"            element={<AppLayout><AdminRoute><Admin /></AdminRoute></AppLayout>} />
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
