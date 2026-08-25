import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, ChevronDown, Menu, X, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAgeGate } from '../context/AgeGateContext';

export const CIGAR_BRANDS = [
  { name: 'Cohiba', slug: 'cohiba' },
  { name: 'Partagas', slug: 'partagas' },
  { name: 'Romeo y Julieta', slug: 'romeo-y-julieta' },
  { name: 'Hoyo De Monterrey', slug: 'hoyo-de-monterrey' },
  { name: 'H. Upmann', slug: 'h-upmann' },
  { name: 'Punch', slug: 'punch' },
  { name: 'Montecristo', slug: 'montecristo' }
];

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { isAgeVerified } = useAgeGate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 900,
      backgroundColor: 'rgba(23, 15, 11, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)'
    }}>
      {/* Top Banner Notice */}
      <div style={{
        backgroundColor: '#110a07',
        color: 'var(--accent-gold)',
        fontSize: '0.78rem',
        padding: '0.35rem 1rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        letterSpacing: '0.04em'
      }}>
        <ShieldCheck size={14} />
        <span>AUTHENTIC CUBAN CIGARS · EXPRESS AUSTRALIA-WIDE DELIVERY · 18+ ADULT VERIFIED</span>
      </div>

      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="CigarsForYou Logo" style={{ height: '42px', width: 'auto' }} onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: '0.04em'
            }}>
              Cigars<span style={{ color: 'var(--accent-gold)' }}>ForYou</span>
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }}>
              AUSTRALIA HUMIDOR
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'none', gap: '2rem', alignItems: 'center' }} className="desktop-nav">
          <Link 
            to="/" 
            style={{ 
              color: isActive('/') ? 'var(--accent-gold)' : 'var(--text-primary)', 
              fontWeight: 600,
              fontSize: '0.925rem'
            }}
          >
            Home
          </Link>

          <Link 
            to="/shop" 
            style={{ 
              color: isActive('/shop') ? 'var(--accent-gold)' : 'var(--text-primary)', 
              fontWeight: 600,
              fontSize: '0.925rem'
            }}
          >
            Shop All Cigars
          </Link>

          {/* Brands Dropdown */}
          <div 
            style={{ position: 'relative' }}
            onMouseEnter={() => setBrandDropdownOpen(true)}
            onMouseLeave={() => setBrandDropdownOpen(false)}
          >
            <button 
              style={{ 
                color: 'var(--text-primary)', 
                fontWeight: 600, 
                fontSize: '0.925rem',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem',
                padding: '0.5rem 0'
              }}
            >
              Brands <ChevronDown size={14} />
            </button>

            {brandDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '220px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '0.5rem 0',
                animation: 'fadeIn 0.15s ease'
              }}>
                {CIGAR_BRANDS.map(brand => (
                  <Link
                    key={brand.slug}
                    to={`/shop/${brand.slug}`}
                    style={{
                      display: 'block',
                      padding: '0.6rem 1.2rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      transition: 'background var(--transition-fast)'
                    }}
                    onClick={() => setBrandDropdownOpen(false)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {brand.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link 
            to="/cigarettes" 
            style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.925rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Cigarettes <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Coming Soon</span>
          </Link>
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAgeVerified && (
            <span className="badge badge-gold desktop-age-badge">
              18+ Verified
            </span>
          )}

          {/* Cart Icon */}
          <Link 
            to="/cart" 
            style={{ 
              position: 'relative', 
              color: 'var(--text-primary)', 
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Shopping Cart"
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: 'var(--accent-gold)',
                color: 'var(--text-dark)',
                fontSize: '0.75rem',
                fontWeight: 700,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {itemCount}
              </span>
            )}
          </Link>

          {/* User Account / Admin Link */}
          {currentUser ? (
            <Link 
              to="/account" 
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <User size={16} />
              <span>{userProfile?.displayName || 'My Account'}</span>
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="btn btn-outline btn-sm"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'var(--text-primary)', padding: '0.5rem' }}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Home
          </Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Shop All Cigars
          </Link>
          
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brands</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {CIGAR_BRANDS.map(brand => (
                <Link
                  key={brand.slug}
                  to={`/shop/${brand.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/cigarettes" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Cigarettes <span className="badge badge-amber">Coming Soon</span>
          </Link>
          
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/terms" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Terms</Link>
            <Link to="/privacy" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Privacy</Link>
            <Link to="/refund-policy" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Refund Policy</Link>
          </div>
        </div>
      )}

      {/* Inline styles for media queries */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .desktop-age-badge { display: inline-flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-age-badge { display: none !important; }
        }
      `}</style>
    </header>
  );
};
