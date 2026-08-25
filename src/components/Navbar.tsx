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
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Top Banner Notice */}
      <div style={{
        backgroundColor: '#f5f5f7',
        color: '#1d1d1f',
        fontSize: '0.78rem',
        padding: '0.4rem 1rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontWeight: 500,
        letterSpacing: '0.01em'
      }}>
        <ShieldCheck size={14} style={{ color: '#b8860b' }} />
        <span>AUTHENTIC CUBAN CIGARS · EXPRESS AUSTRALIA-WIDE DELIVERY · 18+ ADULT VERIFIED</span>
      </div>

      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '74px' }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="CigarsForYou Logo" style={{ height: '40px', width: 'auto' }} onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1d1d1f',
              lineHeight: 1,
              letterSpacing: '-0.03em'
            }}>
              Cigars<span style={{ color: '#b8860b' }}>ForYou</span>
            </span>
            <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#86868b', fontWeight: 600, marginTop: '2px' }}>
              AUSTRALIA HUMIDOR
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'none', gap: '2rem', alignItems: 'center' }} className="desktop-nav">
          <Link 
            to="/" 
            style={{ 
              color: isActive('/') ? '#1d1d1f' : '#515154', 
              fontWeight: isActive('/') ? 600 : 500,
              fontSize: '0.925rem',
              transition: 'color 0.15s ease'
            }}
          >
            Home
          </Link>

          <Link 
            to="/shop" 
            style={{ 
              color: isActive('/shop') ? '#1d1d1f' : '#515154', 
              fontWeight: isActive('/shop') ? 600 : 500,
              fontSize: '0.925rem',
              transition: 'color 0.15s ease'
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
                color: '#515154', 
                fontWeight: 500, 
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
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)',
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
                      color: '#1d1d1f',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'background var(--transition-fast)'
                    }}
                    onClick={() => setBrandDropdownOpen(false)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
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
              color: '#86868b', 
              fontSize: '0.925rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 500
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
              color: '#1d1d1f', 
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
                backgroundColor: '#1d1d1f',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
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
              className="btn btn-primary btn-sm"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: '#1d1d1f', padding: '0.5rem' }}
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
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '1.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1d1d1f' }}>
            Home
          </Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1d1d1f' }}>
            Shop All Cigars
          </Link>
          
          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brands</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {CIGAR_BRANDS.map(brand => (
                <Link
                  key={brand.slug}
                  to={`/shop/${brand.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#515154', fontSize: '0.9rem' }}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/cigarettes" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', color: '#515154', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Cigarettes <span className="badge badge-amber">Coming Soon</span>
          </Link>
          
          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/terms" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: '#86868b' }}>Terms</Link>
            <Link to="/privacy" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: '#86868b' }}>Privacy</Link>
            <Link to="/refund-policy" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: '#86868b' }}>Refund Policy</Link>
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
