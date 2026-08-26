import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  ChevronDown, 
  Menu, 
  X, 
  Search, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  Percent, 
  ArrowRight
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

export const CATEGORY_PILLS = [
  { label: 'Shop by Categories', path: '/shop' },
  { label: 'Under 1000', path: '/shop' },
  { label: 'New Arrivals', icon: Sparkles, iconColor: '#10b981', path: '/shop' },
  { label: 'Best Selling', icon: CheckCircle2, iconColor: '#3b82f6', path: '/shop' },
  { label: 'New Offer', icon: Percent, iconColor: '#f97316', path: '/shop' },
  { label: 'Personal care', path: '/shop' },
  { label: 'Vitamins & Supplements', path: '/shop' }
];

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Dhaka');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
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

  const handlePillScrollRight = () => {
    const el = document.getElementById('medicart-pills-container');
    if (el) {
      el.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 990,
      width: '100%',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #f0f0f0',
      transition: 'all 0.3s ease',
      boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.05)' : 'none'
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
        
        {/* Brand Logo (Medicart style with star emblem) */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', minWidth: '150px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111827'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="#111827" />
            </svg>
          </div>
          <span style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.03em',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            Medicart
          </span>
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
                color: '#374151',
                outline: 'none',
                cursor: 'pointer',
                paddingRight: '0.5rem'
              }}
            >
              <option value="All Categories">All Categories</option>
              <option value="Medicines">Medicines</option>
              <option value="Cuban Cigars">Cuban Cigars</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Vitamins">Vitamins</option>
            </select>

            <div style={{ width: '1px', height: '18px', backgroundColor: '#d1d5db', margin: '0 10px' }} />

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search for medicines, health products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '0.875rem',
                color: '#111827',
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
                background: 'transparent',
                transition: 'background 0.15s ease'
              }}
            >
              <Search size={18} style={{ color: '#4b5563' }} />
            </button>
          </div>
        </form>

        {/* Right Section: Location, Cart, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          
          {/* Location Selector Pill */}
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
                backgroundColor: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #f3f4f6'
              }}>
                <MapPin size={17} style={{ color: '#4b5563' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>Select location</span>
                <span style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {selectedLocation} <ChevronDown size={12} />
                </span>
              </div>
            </div>

            {/* Location Dropdown */}
            {locationDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '170px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                padding: '0.4rem 0',
                zIndex: 1000
              }}>
                {['Dhaka', 'Sydney', 'Miami', 'London', 'New York'].map(loc => (
                  <div
                    key={loc}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLocation(loc);
                      setLocationDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: selectedLocation === loc ? 700 : 500,
                      color: '#111827',
                      backgroundColor: selectedLocation === loc ? '#f3f4f6' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {loc}
                  </div>
                ))}
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
              backgroundColor: '#f9fafb',
              border: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
            aria-label="View Shopping Cart"
          >
            <ShoppingBag size={18} style={{ color: '#111827' }} />
            {itemCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '0.68rem',
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

          {/* User Profile Chip */}
          <Link 
            to={currentUser ? "/account" : "/login"}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
              alt="User Profile" 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }} className="desktop-user-name">
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>Hello!</span>
              <span style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 700 }}>
                {userProfile?.displayName || 'Jacob Jones'}
              </span>
            </div>
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: '#111827', padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer' }}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Category Pills Ribbon Row */}
      <div style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#ffffff' }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          position: 'relative'
        }}>
          
          {/* Scrollable Pills List */}
          <div 
            id="medicart-pills-container"
            className="no-scrollbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              overflowX: 'auto',
              flex: 1,
              paddingRight: '1rem'
            }}
          >
            {CATEGORY_PILLS.map((pill, idx) => {
              const IconComp = pill.icon;
              return (
                <Link
                  key={idx}
                  to={pill.path}
                  className="medicart-pill-btn"
                >
                  {IconComp && <IconComp size={15} style={{ color: pill.iconColor }} />}
                  <span>{pill.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Navigation Arrow Button */}
          <button
            onClick={handlePillScrollRight}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#063b30',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(6, 59, 48, 0.25)'
            }}
            aria-label="Scroll Categories Right"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Mobile Search Bar */}
          <form onSubmit={handleSearchSubmit}>
            <div className="medicart-search-bar">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9rem', outline: 'none' }}
              />
              <button type="submit" style={{ background: 'none', border: 'none' }}>
                <Search size={18} style={{ color: '#4b5563' }} />
              </button>
            </div>
          </form>

          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
            Shop All
          </Link>
          
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cigar Brands</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {CIGAR_BRANDS.map(brand => (
                <Link
                  key={brand.slug}
                  to={`/shop/${brand.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#4b5563', fontSize: '0.875rem', textDecoration: 'none' }}
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
