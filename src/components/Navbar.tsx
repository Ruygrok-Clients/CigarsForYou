import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, ChevronDown, Menu, X, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAgeGate } from '../context/AgeGateContext';

export const CIGAR_BRANDS = [
  { name: 'Cohiba', slug: 'cohiba' },
  { name: 'Partagas', slug: 'partagas' },
  { name: 'Romeo y Julieta', slug: 'romeo-y-julieta' },
  { name: 'Montecristo', slug: 'montecristo' },
  { name: 'Hoyo De Monterrey', slug: 'hoyo-de-monterrey' },
  { name: 'H. Upmann', slug: 'h-upmann' },
  { name: 'Punch', slug: 'punch' }
];

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { isAgeVerified } = useAgeGate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 990,
      width: '100%',
      padding: isScrolled ? '0' : '0.85rem 1.25rem',
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        maxWidth: isScrolled ? '100%' : '1240px',
        width: '100%',
        margin: '0 auto',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: isScrolled ? '0px' : '9999px',
        border: isScrolled ? 'none' : '1px solid rgba(46, 26, 16, 0.08)',
        borderBottom: '1px solid rgba(46, 26, 16, 0.08)',
        boxShadow: isScrolled 
          ? '0 4px 20px rgba(0, 0, 0, 0.05)' 
          : '0 10px 30px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03)',
        padding: isScrolled ? '0.75rem 2rem' : '0.6rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Brand Logo (Exact public/logo.svg) */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img 
            src="/logo.svg" 
            alt="CigarsForYou" 
            style={{ 
              height: isScrolled ? '36px' : '40px', 
              width: 'auto',
              display: 'block',
              transition: 'height 0.3s ease'
            }} 
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'none', gap: '2.25rem', alignItems: 'center' }} className="desktop-nav">
          <Link 
            to="/" 
            style={{ 
              color: isActive('/') ? '#2e1a10' : '#5e4233', 
              fontWeight: isActive('/') ? 600 : 500,
              fontSize: '0.925rem',
              transition: 'color 0.15s ease',
              textDecoration: 'none'
            }}
          >
            Home
          </Link>

          <Link 
            to="/shop" 
            style={{ 
              color: isActive('/shop') ? '#2e1a10' : '#5e4233', 
              fontWeight: isActive('/shop') ? 600 : 500,
              fontSize: '0.925rem',
              transition: 'color 0.15s ease',
              textDecoration: 'none'
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
                color: brandDropdownOpen || location.pathname.startsWith('/shop/') ? '#2e1a10' : '#5e4233', 
                fontWeight: 500, 
                fontSize: '0.925rem',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem',
                padding: '0.5rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Brands <ChevronDown size={14} style={{ transform: brandDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            </button>

            {brandDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '-10px',
                width: '230px',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
                padding: '0.5rem 0',
                animation: 'fadeIn 0.15s ease',
                zIndex: 1000
              }}>
                {CIGAR_BRANDS.map(brand => (
                  <Link
                    key={brand.slug}
                    to={`/shop/${brand.slug}`}
                    style={{
                      display: 'block',
                      padding: '0.65rem 1.25rem',
                      color: '#2e1a10',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'background 0.15s ease'
                    }}
                    onClick={() => setBrandDropdownOpen(false)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f6f3'}
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
              color: '#8e7362', 
              fontSize: '0.925rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            Cigarettes 
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              border: '1px solid #fde68a'
            }}>
              Coming Soon
            </span>
          </Link>
        </nav>

        {/* Right Action Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* 18+ Verification Pill */}
          {isAgeVerified && (
            <div className="desktop-age-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              color: '#374151',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <ShieldCheck size={14} style={{ color: '#059669' }} />
              <span>18+ Verified</span>
            </div>
          )}

          {/* Cart Icon */}
          <Link 
            to="/cart" 
            style={{ 
              position: 'relative', 
              color: '#2e1a10', 
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none'
            }}
            aria-label="Shopping Cart"
          >
            <ShoppingBag size={21} />
            {itemCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#2e1a10',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {itemCount}
              </span>
            )}
          </Link>

          {/* Sign In / Account Pill Button */}
          {currentUser ? (
            <Link 
              to="/account" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.3rem',
                borderRadius: '999px',
                backgroundColor: '#2e1a10',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(46, 26, 16, 0.25)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#422618'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2e1a10'}
            >
              <User size={15} />
              <span>{userProfile?.displayName || 'My Account'}</span>
            </Link>
          ) : (
            <Link 
              to="/login" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.65rem 1.4rem',
                borderRadius: '999px',
                backgroundColor: '#2e1a10',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 10px rgba(46, 26, 16, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#422618'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2e1a10'}
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: '#2e1a10', padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer' }}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: isScrolled ? '0' : '24px',
          margin: isScrolled ? '0' : '0.5rem 1.25rem 0 1.25rem',
          padding: '1.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2e1a10', textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2e1a10', textDecoration: 'none' }}>
            Shop All Cigars
          </Link>
          
          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#8e7362', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Brands</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {CIGAR_BRANDS.map(brand => (
                <Link
                  key={brand.slug}
                  to={`/shop/${brand.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#5e4233', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/cigarettes" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', color: '#5e4233', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            Cigarettes <span style={{ fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>Coming Soon</span>
          </Link>
          
          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/terms" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: '#8e7362', textDecoration: 'none' }}>Terms</Link>
            <Link to="/privacy" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: '#8e7362', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/refund-policy" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.85rem', color: '#8e7362', textDecoration: 'none' }}>Refund Policy</Link>
          </div>
        </div>
      )}

      {/* Scoped CSS Styles for Media Queries */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 860px) {
          .desktop-nav { display: flex !important; }
          .desktop-age-badge { display: inline-flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 859px) {
          .desktop-nav { display: none !important; }
          .desktop-age-badge { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
};


