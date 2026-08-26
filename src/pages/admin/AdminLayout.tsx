import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdminContext } from './AdminContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Box, 
  Bell, 
  Tag, 
  Settings, 
  Lock, 
  Unlock, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { userProfile, logOut, isAdmin } = useAuth();
  const { screenLocked, toggleScreenLock, theme, toggleTheme } = useAdminContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Products & Stock', path: '/admin/products', icon: Box },
    { label: 'Stock Notifications', path: '/admin/stock-notifications', icon: Bell },
    { label: 'Marketing & Coupons', path: '/admin/marketing', icon: Tag },
    ...(isAdmin ? [{ label: 'Portal Settings', path: '/admin/settings', icon: Settings }] : [])
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 500,
        position: 'relative'
      }} className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              CFY <span style={{ color: 'var(--accent-gold)' }}>Admin</span>
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
              BUSINESS DASHBOARD
            </span>
          </div>
          <button className="mobile-only" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: active ? 'var(--text-dark)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--accent-gold)' : 'transparent',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div style={{
          padding: '1.25rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-primary)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent-gold)' }} />
            <span style={{ fontWeight: 600, color: '#ffffff' }}>{userProfile?.displayName || userProfile?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-gold" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Role: {userProfile?.role}
            </span>
            <button 
              onClick={() => logOut().then(() => navigate('/admin/login'))}
              style={{ color: 'var(--accent-ruby)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header style={{
          height: '64px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 400
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="mobile-only" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ color: 'var(--text-primary)' }}
            >
              <Menu size={22} />
            </button>

            {screenLocked && (
              <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem' }}>
                <Lock size={12} /> View-Only Screen Lock Active
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Screen Lock Toggle */}
            <button
              onClick={toggleScreenLock}
              className={`btn btn-sm ${screenLocked ? 'btn-danger' : 'btn-secondary'}`}
              title={screenLocked ? 'Unlock Editing' : 'Lock Screen (View-Only Mode)'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {screenLocked ? <Lock size={14} /> : <Unlock size={14} />}
              <span className="desktop-only">{screenLocked ? 'Locked' : 'Lock Portal'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              title="Toggle Light/Dark Theme"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: -260px;
            transition: left 0.25s ease;
          }
          .admin-sidebar.open {
            left: 0;
          }
          .mobile-only { display: block !important; }
          .desktop-only { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};
