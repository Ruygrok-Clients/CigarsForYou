import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  ChevronDown,
  Search,
  MapPin,
  ArrowRight,
  ArrowLeft,
  User as UserIcon,
  Truck,
  Flame,
  X
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationSelection } from '../context/LocationContext';
import { AUSTRALIAN_STATES } from '../constants/locations';
import { CIGAR_CATALOG } from '../data/cigarCatalog';

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
  const { selectedLocation, setSelectedLocation } = useLocationSelection();
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  const headerRef = React.useRef<HTMLElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchBoxRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Sync navbar search query with URL when on /shop page
  useEffect(() => {
    if (location.pathname === '/shop') {
      const q = searchParams.get('search') || '';
      setSearchQuery(q);
    }
  }, [location.pathname, searchParams]);

  // Click outside to close live search popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node) &&
        mobileSearchBoxRef.current && !mobileSearchBoxRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const qWords = searchQuery.toLowerCase().trim().split(/\s+/);
    return CIGAR_CATALOG.filter(p => {
      const text = `${p.brand} ${p.name} ${p.description || ''} ${p.origin || ''}`.toLowerCase();
      return qWords.every(word => text.includes(word));
    });
  }, [searchQuery]);

  useEffect(() => {
    const updateNavbarHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--navbar-height', `${height}px`);
      }
    };

    updateNavbarHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateNavbarHeight();
    });

    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const navHeight = headerRef.current ? headerRef.current.offsetHeight : 120;
      const threshold = navHeight * 1.5;

      if (currentScrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Bulletproof scroll threshold:
      // 1. Within 150% of navbar height from top -> keep navbar visible
      if (currentScrollY <= threshold) {
        setMobileNavVisible(true);
      } else {
        // 2. Past 150% of navbar height:
        if (currentScrollY > lastScrollY.current + 2) {
          // Scrolling down -> hide navbar
          setMobileNavVisible(false);
          setLocationDropdownOpen(false);
        } else if (currentScrollY < lastScrollY.current - 2) {
          // Scrolling up -> reveal navbar
          setMobileNavVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateNavbarHeight);
    handleScroll();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateNavbarHeight);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    if (selectedCategory === 'Cigarettes') {
      navigate('/cigarettes');
      return;
    }
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }
    if (selectedCategory === 'Cigars') {
      params.append('category', 'cigars');
    }
    const qStr = params.toString();
    navigate(qStr ? `/shop?${qStr}` : '/shop');
  };

  const handlePillScrollLeft = () => {
    const el = document.getElementById('cigar-pills-container') || document.getElementById('cigar-pills-container-mobile');
    if (el) {
      el.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const handlePillScrollRight = () => {
    const el = document.getElementById('cigar-pills-container') || document.getElementById('cigar-pills-container-mobile');
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
    <>
      {/* Top Marquee Bar for Mobile (Appears when mobile navbar disappears on scroll) */}
      <div className={`mobile-marquee-top ${!mobileNavVisible ? 'visible' : ''}`}>
        <div className="mobile-marquee-track">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="mobile-marquee-item">
              <Truck size={13} style={{ flexShrink: 0 }} />
              <span>Immediate Dispatch (1-3hr Delivery)</span>
              <span style={{ opacity: 0.6, marginLeft: '0.8rem', marginRight: '0.4rem', fontSize: '0.7rem' }}>✦</span>
            </div>
          ))}
        </div>
      </div>

      <header
        ref={headerRef}
        className={`site-header ${mobileNavVisible ? 'mobile-visible' : 'mobile-hidden'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: '100%',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(46, 26, 16, 0.1)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, background-color 0.3s ease',
          boxShadow: isScrolled ? '0 4px 20px rgba(46, 26, 16, 0.08)' : 'none'
        }}>
        {/* DESKTOP NAVBAR (Displayed above the tablet breakpoint, from 1025px) */}
        <div className="desktop-navbar">
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
            <div ref={searchBoxRef} style={{ flex: 1, maxWidth: '580px', position: 'relative' }}>
              <form
                onSubmit={handleSearchSubmit}
                style={{ width: '100%', display: 'flex' }}
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
                    <option value="Cigars">Cigars</option>
                    <option value="Cigarettes">Cigarettes</option>
                  </select>

                  <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(46, 26, 16, 0.15)', margin: '0 10px' }} />

                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search cigars, humidors, cigarettes..."
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchFocused(true);
                    }}
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
                      transition: 'background 0.15s ease',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Search size={16} style={{ color: '#ffffff' }} />
                  </button>
                </div>
              </form>

              {/* Desktop Live Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid rgba(46, 26, 16, 0.12)',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
                  zIndex: 1050,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.65rem 1rem',
                    backgroundColor: '#faf8f5',
                    borderBottom: '1px solid rgba(46, 26, 16, 0.08)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#c06517',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{searchResults.length} matching cigar{searchResults.length === 1 ? '' : 's'}</span>
                    <button
                      type="button"
                      onClick={() => setIsSearchFocused(false)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#71717a' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {searchResults.length === 0 ? (
                    <div style={{ padding: '1.25rem 1rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                      No cigars found matching "{searchQuery}"
                    </div>
                  ) : (
                    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      {searchResults.slice(0, 6).map(item => (
                        <div
                          key={item.id || item.slug}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/product/${item.slug}`);
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            borderBottom: '1px solid rgba(0,0,0,0.04)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fcfaf7')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#f2efe9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#c06517',
                              flexShrink: 0
                            }}>
                              <Flame size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c06517', textTransform: 'uppercase' }}>
                                {item.brand}
                              </div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a' }}>
                                {item.name}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2f0d0e' }}>
                            ${item.price} AUD
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: '0.65rem 1rem', backgroundColor: '#faf8f5', borderTop: '1px solid rgba(46, 26, 16, 0.08)', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        setIsSearchFocused(false);
                        handleSearchSubmit(e);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#c06517',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        cursor: 'pointer'
                      }}
                    >
                      View all results on Shop Page &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section: Australian Location, Cart, User Profile / Sign In */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

              {/* Australian Location Selector Pill */}
              <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
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
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
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
            </div>
          </div>

          {/* Category Pills Ribbon Row */}
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
                <Link to="/shop?category=specials" className="medicart-pill-btn" style={{ fontWeight: 700, color: '#d97706' }}>
                  Specials
                </Link>
                <Link to="/shop?category=cigars" className="medicart-pill-btn" style={{ fontWeight: 600 }}>
                  Cigars
                </Link>
                <Link to="/cigarettes" className="medicart-pill-btn" style={{ fontWeight: 600 }}>
                  Cigarettes
                </Link>

                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(46, 26, 16, 0.18)', margin: '0 6px', flexShrink: 0 }} />

                <Link to="/about" className="medicart-pill-btn">
                  About Us
                </Link>
                <Link to="/contact" className="medicart-pill-btn">
                  Contact Us
                </Link>

                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(46, 26, 16, 0.18)', margin: '0 6px', flexShrink: 0 }} />

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
        </div>

        {/* COMPACT NAVBAR (Displayed through the tablet breakpoint, up to 1024px) */}
        <div className="mobile-navbar">
          {/* Top Header Row */}
          <div style={{
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            {/* Brand Logo (Enlarged for Mobile) */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img
                src="/logo.svg"
                alt="CigarsForYou"
                style={{
                  height: '44px',
                  width: 'auto',
                  display: 'block'
                }}
              />
            </Link>

            {/* Right Section: 3 Icons/Points (Location Picker, Profile Account, Cart) - Exact Same Height and Size (38px x 38px) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

              {/* 1. Location Picker Icon (To the left of profile account) */}
              <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                title={`Selected state: ${selectedLocation}`}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#faf6f5',
                  border: '1px solid rgba(47, 13, 14, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <MapPin size={18} style={{ color: '#2563eb' }} />
                  <span style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.55rem',
                    fontWeight: 800,
                    padding: '1px 3px',
                    borderRadius: '3px',
                    lineHeight: 1
                  }}>
                    {selectedLocation}
                  </span>
                </div>

                {/* Mobile Location Dropdown */}
                {locationDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '125%',
                    right: 0,
                    width: '210px',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(47, 13, 14, 0.12)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px rgba(47, 13, 14, 0.15)',
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

                {locationNotice && (
                  <div style={{
                    position: 'absolute',
                    top: '125%',
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

              {/* 2. Profile Account Icon (Middle) */}
              <Link
                to={currentUser ? '/account' : '/login'}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: currentUser ? '#c06517' : '#faf6f5',
                  border: '1px solid rgba(47, 13, 14, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  color: currentUser ? '#ffffff' : '#2f0d0e'
                }}
                aria-label="User Account"
                title={currentUser ? userProfile?.displayName || 'My Account' : 'Sign In'}
              >
                {currentUser && userProfile?.displayName ? (
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <UserIcon size={18} style={{ color: currentUser ? '#ffffff' : '#2f0d0e' }} />
                )}
              </Link>

              {/* 3. Shopping Bag Cart Icon (Right) */}
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
            </div>
          </div>

          {/* Mobile Search Bar Row */}
          <div ref={mobileSearchBoxRef} style={{ padding: '0 0.85rem 0.6rem 0.85rem', position: 'relative' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%' }}>
              <div className="medicart-search-bar" style={{ width: '100%', padding: '0.35rem 0.75rem' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#2e1a10',
                    outline: 'none',
                    cursor: 'pointer',
                    paddingRight: '0.35rem'
                  }}
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Cigars">Cigars</option>
                  <option value="Cigarettes">Cigarettes</option>
                </select>

                <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(46, 26, 16, 0.15)', margin: '0 6px' }} />

                <input
                  type="text"
                  placeholder="Search cigars, humidors..."
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.825rem',
                    color: '#2e1a10',
                    outline: 'none'
                  }}
                />

                <button
                  type="submit"
                  aria-label="Search"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#c06517',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Search size={14} style={{ color: '#ffffff' }} />
                </button>
              </div>
            </form>

            {/* Mobile Live Search Results Dropdown */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: '0.85rem',
                right: '0.85rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid rgba(46, 26, 16, 0.12)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
                zIndex: 1050,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.55rem 0.85rem',
                  backgroundColor: '#faf8f5',
                  borderBottom: '1px solid rgba(46, 26, 16, 0.08)',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: '#c06517',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{searchResults.length} matching cigar{searchResults.length === 1 ? '' : 's'}</span>
                  <button
                    type="button"
                    onClick={() => setIsSearchFocused(false)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#71717a' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {searchResults.length === 0 ? (
                  <div style={{ padding: '1rem 0.85rem', textAlign: 'center', color: '#71717a', fontSize: '0.825rem' }}>
                    No cigars found matching "{searchQuery}"
                  </div>
                ) : (
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {searchResults.slice(0, 5).map(item => (
                      <div
                        key={item.id || item.slug}
                        onClick={() => {
                          setIsSearchFocused(false);
                          navigate(`/product/${item.slug}`);
                        }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#f2efe9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#c06517',
                            flexShrink: 0
                          }}>
                            <Flame size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#c06517', textTransform: 'uppercase' }}>
                              {item.brand}
                            </div>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1a1a1a' }}>
                              {item.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#2f0d0e' }}>
                          ${item.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: '0.55rem 0.85rem', backgroundColor: '#faf8f5', borderTop: '1px solid rgba(46, 26, 16, 0.08)', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsSearchFocused(false);
                      handleSearchSubmit(e);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#c06517',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    View all results on Shop Page &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Category Pills Ribbon */}
          <div style={{ borderTop: '1px solid rgba(46, 26, 16, 0.08)', backgroundColor: '#ffffff', padding: '0.4rem 0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              position: 'relative'
            }}>
              <button
                onClick={handlePillScrollLeft}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#f8f6f3',
                  border: '1px solid rgba(46, 26, 16, 0.12)',
                  color: '#2e1a10',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer'
                }}
                aria-label="Scroll Categories Left"
              >
                <ArrowLeft size={13} />
              </button>

              <div
                id="cigar-pills-container-mobile"
                className="no-scrollbar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  flex: 1,
                  padding: '0 0.2rem'
                }}
              >
                <Link to="/shop?category=specials" className="medicart-pill-btn" style={{ fontWeight: 700, color: '#d97706', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                  Specials
                </Link>
                <Link to="/shop?category=cigars" className="medicart-pill-btn" style={{ fontWeight: 600, fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                  Cigars
                </Link>
                <Link to="/cigarettes" className="medicart-pill-btn" style={{ fontWeight: 600, fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                  Cigarettes
                </Link>

                <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(46, 26, 16, 0.18)', margin: '0 4px', flexShrink: 0 }} />

                <Link to="/about" className="medicart-pill-btn" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                  About Us
                </Link>
                <Link to="/contact" className="medicart-pill-btn" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                  Contact Us
                </Link>

                <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(46, 26, 16, 0.18)', margin: '0 4px', flexShrink: 0 }} />

                {CIGAR_BRANDS.map((b) => (
                  <Link
                    key={b.slug}
                    to={`/shop/${b.slug}`}
                    className="medicart-pill-btn"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    {b.name}
                  </Link>
                ))}
              </div>

              <button
                onClick={handlePillScrollRight}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#c06517',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: 'none'
                }}
                aria-label="Scroll Categories Right"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Compact nav through tablet. Full nav from the laptop breakpoint (1025px). */}
        <style>{`
          @keyframes topMarqueeScroll {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }

          .mobile-marquee-top {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 36px;
            background-color: #c06517;
            color: #ffffff;
            z-index: 1001;
            display: flex;
            align-items: center;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(46, 26, 16, 0.2);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
            transform: translateY(-100%);
            opacity: 0;
            pointer-events: none;
          }

          .mobile-marquee-track {
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
            animation: topMarqueeScroll 18s linear infinite;
            will-change: transform;
          }

          .mobile-marquee-item {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            color: #ffffff;
            padding-right: 0.5rem;
          }

          .desktop-navbar { display: none !important; }
          .mobile-navbar { display: block !important; }
          header.site-header.mobile-hidden {
            transform: translateY(-100%);
          }
          header.site-header.mobile-visible {
            transform: translateY(0);
          }
          .mobile-marquee-top.visible {
            transform: translateY(0);
            opacity: 1;
            pointer-events: auto;
          }

          @media (min-width: 1025px) {
            .desktop-navbar { display: block !important; }
            .mobile-navbar { display: none !important; }
            .mobile-marquee-top { display: none !important; }
            header.site-header { transform: translateY(0) !important; }
          }
        `}</style>
      </header>
    </>
  );
};
