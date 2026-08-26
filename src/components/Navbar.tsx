import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  ChevronDown, 
  Menu, 
  X, 
  Search, 
  MapPin, 
  ArrowRight,
  ArrowLeft,
  User as UserIcon
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CIGAR_BRANDS = [
  { name: 'Cohiba', slug: 'cohiba' },
  { name: 'Partagas', slug: 'partagas' },
  { name: 'Romeo y Julieta', slug: 'romeo-y-julieta' },
  { name: 'Montecristo', slug: 'montecristo' },
  { name: 'Hoyo De Monterrey', slug: 'hoyo-de-monterrey' },
  { name: 'H. Upmann', slug: 'h-upmann' },
  { name: 'Punch', slug: 'punch' }
];

export const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales (Available)', available: true },
  { code: 'VIC', name: 'Victoria (Coming Soon)', available: false },
  { code: 'QLD', name: 'Queensland (Coming Soon)', available: false },
  { code: 'WA', name: 'Western Australia (Coming Soon)', available: false },
  { code: 'SA', name: 'South Australia (Coming Soon)', available: false },
  { code: 'TAS', name: 'Tasmania (Coming Soon)', available: false },
  { code: 'ACT', name: 'ACT (Coming Soon)', available: false },
  { code: 'NT', name: 'Northern Territory (Coming Soon)', available: false }
];

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('NSW');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const navigate = useNavigate();

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/shop');
    }
  };

  const handlePillScrollLeft = () => {
    const el = document.getElementById('cigar-pills-container');
    if (el) {
      el.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const handlePillScrollRight = () => {
    const el = document.getElementById('cigar-pills-container');
    if (el) {
      el.scrollBy({ left: 250, behavior: 'smooth' });
    }
  };

  const handleSelectState = (stateObj: typeof AUSTRALIAN_STATES[0]) => {
    if (stateObj.available) {
      setSelectedLocation(stateObj.code);
      setLocationNotice(null);
    } else {
      setSelectedLocation('NSW');
      setLocationNotice(`Delivery is currently only available in NSW.`);
      setTimeout(() => setLocationNotice(null), 3000);
    }
    setLocationDropdownOpen(false);
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      width: '100%',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid rgba(46, 26, 16, 0.1)',
      transition: 'all 0.3s ease',
      boxShadow: isScrolled ? '0 4px 20px rgba(46, 26, 16, 0.08)' : 'none'
    }}>
      {/* Top Header Bar Container */}
      <div style={{
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        
        {/* Brand Logo (CigarsForYou Official Logo) */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', minWidth: '170px' }}>
          <img 
            src="/logo.svg" 
            alt="CigarsForYou" 
            style={{ 
              height: '38px', 
              width: 'auto',
              display: 'block'
            }} 
          />
        </Link>

        {/* Center Search Capsule (Desktop) */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="desktop-search-form"
          style={{ flex: 1, maxWidth: '580px', display: 'flex' }}
        >
          <div className="medicart-search-bar" style={{ width: '100%' }}>
            {/* Category Select Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#2e1a10',
                outline: 'none',
                cursor: 'pointer',
                paddingRight: '0.5rem'
              }}
            >
              <option value="All Categories">All Categories</option>
              <option value="Cuban Cigars">Cuban Cigars</option>
              <option value="Sampler Packs">Sampler Packs</option>
              <option value="Cigarettes">Cigarettes</option>
              <option value="Accessories">Accessories</option>
            </select>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(46, 26, 16, 0.15)', margin: '0 10px' }} />

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search cigars, humidors, accessories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '0.875rem',
                color: '#2e1a10',
                outline: 'none'
              }}
            />

            {/* Search Button */}
            <button
              type="submit"
              aria-label="Search"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#c06517',
                color: '#ffffff',
                transition: 'background 0.15s ease'
              }}
            >
              <Search size={16} style={{ color: '#ffffff' }} />
            </button>
          </div>
        </form>

        {/* Right Section: Australian Location, Cart, User Profile / Sign In */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          
          {/* Australian Location Selector Pill (NSW Only Active) */}
          <div 
            style={{ position: 'relative', cursor: 'pointer' }} 
            className="desktop-location-picker"
            onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#faf6f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(47, 13, 14, 0.1)'
              }}>
                <MapPin size={17} style={{ color: '#2563eb' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.72rem', color: '#8c6062', fontWeight: 500 }}>Select location</span>
                <span style={{ fontSize: '0.85rem', color: '#2f0d0e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {selectedLocation} <ChevronDown size={12} />
                </span>
              </div>
            </div>

            {/* Australian States Dropdown */}
            {locationDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '210px',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(47, 13, 14, 0.12)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(47, 13, 14, 0.12)',
                padding: '0.4rem 0',
                zIndex: 1000
              }}>
                <div style={{ padding: '0.4rem 0.85rem', fontSize: '0.72rem', fontWeight: 700, color: '#c06517', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Australian States
                </div>
                {AUSTRALIAN_STATES.map(st => (
                  <div
                    key={st.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectState(st);
                    }}
                    style={{
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.825rem',
                      fontWeight: st.code === selectedLocation ? 700 : 500,
                      color: st.available ? '#2f0d0e' : '#9ca3af',
                      backgroundColor: st.code === selectedLocation ? '#faf6f5' : 'transparent',
                      cursor: st.available ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{st.code}</span>
                    <span style={{ fontSize: '0.7rem', color: st.available ? '#10b981' : '#9ca3af' }}>
                      {st.available ? 'Active' : 'NSW only'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Notice tooltip if user picked unsupported state */}
            {locationNotice && (
              <div style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                backgroundColor: '#2f0d0e',
                color: '#ffffff',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: 1001
              }}>
                {locationNotice}
              </div>
            )}
          </div>

          {/* Shopping Bag Button */}
          <Link 
            to="/cart" 
            style={{ 
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#faf6f5',
              border: '1px solid rgba(47, 13, 14, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
            aria-label="View Shopping Cart"
          >
            <ShoppingBag size={18} style={{ color: '#2f0d0e' }} />
            {itemCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: '#c06517',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {itemCount}
              </span>
            )}
          </Link>

          {/* User Account Pill / Sign In Prompt */}
          {currentUser ? (
            <Link 
              to="/account"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                backgroundColor: '#faf6f5',
                border: '1px solid rgba(47, 13, 14, 0.1)',
                textDecoration: 'none'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#c06517',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserIcon size={16} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }} className="desktop-user-name">
                <span style={{ fontSize: '0.7rem', color: '#8c6062', fontWeight: 500 }}>Hello!</span>
                <span style={{ fontSize: '0.825rem', color: '#2f0d0e', fontWeight: 700 }}>
                  {userProfile?.displayName || userProfile?.email?.split('@')[0] || 'My Account'}
                </span>
              </div>
            </Link>
          ) : (
            <Link 
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.25rem',
                borderRadius: '9999px',
                backgroundColor: '#c06517',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(192, 101, 23, 0.25)'
              }}
            >
              <UserIcon size={15} />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile Hamburger Toggle */}
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

      {/* Category Pills Ribbon Row with Left and Right Arrows */}
      <div style={{ borderTop: '1px solid rgba(46, 26, 16, 0.08)', backgroundColor: '#ffffff' }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          position: 'relative'
        }}>
          
          {/* Scroll Left Arrow */}
          <button
            onClick={handlePillScrollLeft}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#f8f6f3',
              border: '1px solid rgba(46, 26, 16, 0.12)',
              color: '#2e1a10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Scroll Categories Left"
          >
            <ArrowLeft size={15} />
          </button>

          {/* Scrollable Pills List */}
          <div 
            id="cigar-pills-container"
            className="no-scrollbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              overflowX: 'auto',
              flex: 1,
              padding: '0 0.25rem'
            }}
          >
            {/* Primary Category Links */}
            <Link to="/shop?category=specials" className="medicart-pill-btn" style={{ fontWeight: 700, color: '#d97706' }}>
              Specials
            </Link>
            <Link to="/shop?category=cigars" className="medicart-pill-btn" style={{ fontWeight: 600 }}>
              Cigars
            </Link>
            <Link to="/cigarettes" className="medicart-pill-btn" style={{ fontWeight: 600 }}>
              Cigarettes
            </Link>

            {/* Vertical Line Separator */}
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(46, 26, 16, 0.18)', margin: '0 6px', flexShrink: 0 }} />

            {/* Informational Links */}
            <a href="#about-us" className="medicart-pill-btn">
              About Us
            </a>
            <a href="#footer" className="medicart-pill-btn">
              Contact Us
            </a>

            {/* Vertical Line Separator */}
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(46, 26, 16, 0.18)', margin: '0 6px', flexShrink: 0 }} />

            {/* Cigar Brands List */}
            {CIGAR_BRANDS.map((b) => (
              <Link
                key={b.slug}
                to={`/shop/${b.slug}`}
                className="medicart-pill-btn"
              >
                {b.name}
              </Link>
            ))}
          </div>

          {/* Scroll Right Arrow */}
          <button
            onClick={handlePillScrollRight}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#c06517',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(192, 101, 23, 0.25)'
            }}
            aria-label="Scroll Categories Right"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(47, 13, 14, 0.12)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Mobile Search Bar */}
          <form onSubmit={handleSearchSubmit}>
            <div className="medicart-search-bar">
              <input
                type="text"
                placeholder="Search cigars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9rem', outline: 'none' }}
              />
              <button type="submit" style={{ background: 'none', border: 'none' }}>
                <Search size={18} style={{ color: '#c06517' }} />
              </button>
            </div>
          </form>

          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', fontWeight: 600, color: '#2f0d0e', textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', fontWeight: 600, color: '#2f0d0e', textDecoration: 'none' }}>
            Shop All Cigars
          </Link>
          <Link to="/cigarettes" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', fontWeight: 600, color: '#8e7362', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Cigarettes <span style={{ fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Coming Soon</span>
          </Link>
          
          <div style={{ borderTop: '1px solid rgba(46, 26, 16, 0.08)', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#8e7362', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cigar Brands</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {CIGAR_BRANDS.map(brand => (
                <Link
                  key={brand.slug}
                  to={`/shop/${brand.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#5e4233', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSS Breakpoint Rules */}
      <style>{`
        @media (min-width: 860px) {
          .desktop-search-form { display: flex !important; }
          .desktop-location-picker { display: flex !important; }
          .desktop-user-name { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 859px) {
          .desktop-search-form { display: none !important; }
          .desktop-location-picker { display: none !important; }
          .desktop-user-name { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
};
