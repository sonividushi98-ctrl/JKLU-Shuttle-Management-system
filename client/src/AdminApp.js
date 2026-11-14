import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart3,
  Bus,
  CalendarDays,
  ChevronRight,
  LogOut,
  Menu,
  ShieldCheck,
  Ticket,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { clearStoredAuth, getStoredToken } from './api/session';
import SignOutConfirm from './SignOutConfirm';
import './Admin.css';

const AUTH_API = 'http://localhost:5000/api/auth';

const AdminApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/?admin=1', { replace: true });
      return;
    }

    axios
      .get(`${AUTH_API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000
      })
      .then((response) => {
        if (response.data?.role !== 'Admin') {
          clearStoredAuth();
          navigate('/', { replace: true });
          return;
        }
        setUser(response.data);
      })
      .catch((error) => {
        clearStoredAuth();
        if (error.response) {
          navigate('/?admin=1', { replace: true });
        } else {
          setSessionError('The admin session could not be verified. Please try again.');
        }
      })
      .finally(() => setCheckingSession(false));
  }, [navigate, location.pathname]);

  const handleSignOut = () => {
    clearStoredAuth();
    navigate('/', { replace: true });
    setShowSignOutConfirm(false);
  };

  const handleUnauthorized = () => {
    clearStoredAuth();
    navigate('/?admin=1', { replace: true });
  };

  if (checkingSession) {
    return (
      <div className="admin-session-state">
        <ShieldCheck size={28} />
        <strong>Verifying admin access…</strong>
        <span>Checking your JKLU administrator session.</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-session-state admin-session-error">
        <XCircle size={28} />
        <strong>{sessionError || 'Admin access is required.'}</strong>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/?admin=1')}>
          Return to sign in
        </button>
      </div>
    );
  }

  const sections = [
    { id: 'admin-overview', label: 'Overview', icon: BarChart3 },
    { id: 'admin-shuttles', label: 'Shuttle operations', icon: Bus },
    { id: 'admin-passengers', label: 'Passenger lists', icon: Users },
    { id: 'admin-cancellations', label: 'Cancellations', icon: XCircle }
  ];

  const jumpToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSidebarOpen(false);
  };

  return (
    <div className="admin-app">
      {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close admin menu" />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-mark"><Bus size={21} /></div>
          <div>
            <strong>JKLU Shuttle</strong>
            <span>Operations console</span>
          </div>
          <button className="admin-mobile-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close admin menu">
            <X size={18} />
          </button>
        </div>

        <div className="admin-sidebar-label">Manage</div>
        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => jumpToSection(id)}>
              <Icon size={17} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-help">
          <Ticket size={17} />
          <strong>Keep Gate 1 moving</strong>
          <span>Review occupancy and cancellations before each departure.</span>
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">{user.name?.charAt(0).toUpperCase() || 'A'}</div>
            <div>
              <strong>{user.name}</strong>
              <span>Administrator</span>
            </div>
          </div>
          <button type="button" className="admin-signout" onClick={() => setShowSignOutConfirm(true)}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open admin menu">
            <Menu size={20} />
          </button>
          <div>
            <div className="admin-breadcrumb">JKLU Shuttle / Administration</div>
            <h1>Transport control center</h1>
          </div>
          <div className="admin-topbar-status">
            <CalendarDays size={16} />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span className="admin-live-dot" />
            Live operations
          </div>
        </header>

        <div className="admin-content">
          <AdminDashboard onUnauthorized={handleUnauthorized} />
        </div>
      </main>
      {showSignOutConfirm && (
        <SignOutConfirm
          onCancel={() => setShowSignOutConfirm(false)}
          onConfirm={handleSignOut}
        />
      )}
    </div>
  );
};

export default AdminApp;
