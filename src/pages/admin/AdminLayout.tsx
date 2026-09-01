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
  X
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { userProfile, logOut, isAdmin } = useAuth();
  const { screenLocked, toggleScreenLock, theme, toggleTheme } = useAdminContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const overviewItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard }
  ];

  const marketingItems = [
    { label: 'Coupons', path: '/admin/marketing', icon: Tag },
    { label: 'Stock Notifications', path: '/admin/stock-notifications', icon: Bell }
  ];

  const operationsItems = [
    { label: 'Products & Stock', path: '/admin/products', icon: Box },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag }
  ];

  const systemItems = [
    ...(isAdmin ? [{ label: 'Portal Settings', path: '/admin/settings', icon: Settings }] : [])
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: { label: string; path: string; icon: React.ElementType }) => {
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
          padding: '0.7rem 1rem',
          borderRadius: 'var(--radius-md)',
          color: active ? 'var(--text-dark)' : 'var(--text-secondary)',
          backgroundColor: active ? 'var(--accent-gold)' : 'transparent',
          fontWeight: active ? 700 : 500,
          fontSize: '0.9rem',
          textDecoration: 'none',
          transition: 'all var(--transition-fast)'
        }}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const getPageTitleInfo = () => {
    const path = location.pathname;
    if (path === '/admin') return { section: 'Overview', title: 'Dashboard' };
    if (path.startsWith('/admin/marketing')) return { section: 'Marketing', title: 'Coupons' };
    if (path.startsWith('/admin/stock-notifications')) return { section: 'Marketing', title: 'Stock Notifications' };
    if (path.startsWith('/admin/products')) return { section: 'Operations', title: 'Products & Stock' };
    if (path.startsWith('/admin/orders')) return { section: 'Operations', title: 'Orders' };
    if (path.startsWith('/admin/settings')) return { section: 'Settings', title: 'Portal Settings & Staff' };
    return { section: 'Admin', title: 'Dashboard' };
  };

  const { section: currentSection, title: currentTitle } = getPageTitleInfo();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        height: '100vh',
        maxHeight: '100vh',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 500,
        position: 'sticky',
        top: 0,
        overflowY: 'auto'
      }} className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header with Logo */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/admin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textDecoration: 'none', gap: '0.35rem' }}>
            <img 
              src={theme === 'dark' ? "/logo-white.svg" : "/logo.svg"} 
              alt="CigarsForYou Admin Logo" 
              style={{ height: '52px', width: 'auto', display: 'block' }} 
            />
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--accent-gold)'
            }}>
              Admin Portal
            </span>
          </Link>
          <button className="mobile-only" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Links Navigation */}
        <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
          {/* Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {overviewItems.map(renderNavItem)}
          </div>

          {/* Marketing Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '0.25rem 0.75rem 0.35rem 0.75rem',
              letterSpacing: '0.05em'
            }}>
              Marketing
            </div>
            {marketingItems.map(renderNavItem)}
          </div>

          {/* Operations Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '0.25rem 0.75rem 0.35rem 0.75rem',
              letterSpacing: '0.05em'
            }}>
              Operations
            </div>
            {operationsItems.map(renderNavItem)}
          </div>

          {/* System Section */}
          {systemItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {systemItems.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* User Account Info Footer (On-Brand Warm Colors) */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          {/* User Card */}
          <div style={{
            backgroundColor: theme === 'dark' ? 'var(--bg-surface-elevated)' : '#f5edea',
            borderRadius: '16px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            border: '1px solid var(--border-subtle)'
          }}>
            {/* Yellow Squircle Avatar */}
            <div style={{
              position: 'relative',
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              backgroundColor: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: '#000000',
              flexShrink: 0
            }}>
              {userProfile?.displayName?.[0]?.toUpperCase() || userProfile?.email?.[0]?.toUpperCase() || 'A'}
              {/* Online Status Green Indicator */}
              <span style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: `2px solid ${theme === 'dark' ? '#3b2317' : '#f5edea'}`
              }} />
            </div>

            {/* User Details */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userProfile?.displayName || 'Admin'}
              </span>
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userProfile?.email || 'admin@cigarsforyou.com.au'}
              </span>
            </div>
          </div>

          {/* Segmented Light/Dark Theme Switch */}
          <div style={{
            backgroundColor: theme === 'dark' ? 'var(--bg-surface-elevated)' : '#f5edea',
            borderRadius: '12px',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => theme !== 'light' && toggleTheme()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: theme === 'light' ? '#ffffff' : 'transparent',
                color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: theme === 'light' ? '0 2px 6px rgba(47, 13, 14, 0.1)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Sun size={16} />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => theme !== 'dark' && toggleTheme()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: theme === 'dark' ? 'var(--bg-primary)' : 'transparent',
                color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: theme === 'dark' ? '0 2px 6px rgba(0, 0, 0, 0.3)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Moon size={16} />
              <span>Dark</span>
            </button>
          </div>

          {/* Logout Button */}
          <button 
            onClick={() => logOut().then(() => navigate('/admin/login'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.4rem 0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: '0.2rem'
            }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
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
          {/* Left: Mobile Toggle & Page Section / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="mobile-only" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb Title Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {currentSection}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentTitle}
              </span>
            </div>

            {screenLocked && (
              <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem' }}>
                <Lock size={12} /> View-Only Mode
              </span>
            )}
          </div>

          {/* Right: Screen Lock, Theme Toggle & Account Detailed Breakdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Screen Lock Toggle */}
            <button
              onClick={toggleScreenLock}
              className={`btn ${screenLocked ? 'btn-danger' : 'btn-secondary'}`}
              title={screenLocked ? 'Unlock Editing' : 'Lock Screen (View-Only Mode)'}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0 0.85rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                boxSizing: 'border-box'
              }}
            >
              {screenLocked ? <Lock size={15} /> : <Unlock size={15} />}
              <span className="desktop-only">{screenLocked ? 'Locked' : 'Lock Portal'}</span>
            </button>

            {/* Quick Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              title="Toggle Light/Dark Theme"
              style={{
                height: '40px',
                width: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: '10px',
                boxSizing: 'border-box'
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Signed-In Account Detailed Breakdown (Right of Theme Toggle) */}
            <div 
              className="desktop-only"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0 0.75rem',
                borderRadius: '10px',
                backgroundColor: theme === 'dark' ? 'var(--bg-surface-elevated)' : '#f5edea',
                border: '1px solid var(--border-subtle)',
                boxSizing: 'border-box'
              }}
            >
              {/* Small Avatar */}
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                backgroundColor: '#facc15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#000000',
                flexShrink: 0
              }}>
                {userProfile?.displayName?.[0]?.toUpperCase() || userProfile?.email?.[0]?.toUpperCase() || 'A'}
              </div>

              {/* Account Breakdown Text */}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.2' }}>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap'
                }}>
                  {userProfile?.email || 'admin@cigarsforyou.com.au'}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}>
                  {userProfile?.role ? (userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)) : 'Administrator'} Profile
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
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

