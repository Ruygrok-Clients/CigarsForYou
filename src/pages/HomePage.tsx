import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { ProductSeparationsSection } from '../components/ProductSeparationsSection';
import { FeaturedProductsShowcase } from '../components/FeaturedProductsShowcase';
import { AboutUsSection } from '../components/AboutUsSection';
import { DispatchPackagingSection } from '../components/DispatchPackagingSection';
import { TrustBannerSection } from '../components/TrustBannerSection';
import { SocialProofSlider } from '../components/SocialProofSlider';
import { CIGAR_BRANDS } from '../components/Navbar';
import { Award, ChevronRight, Truck } from 'lucide-react';
import bgVideo from '../assets/BG-Vid.mov';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  // Hero docked widget state
  const [heroCategory, setHeroCategory] = useState('All Categories');
  const [heroBrand, setHeroBrand] = useState('Brands');
  const [skuInput, setSkuInput] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(collection(db, 'products'), limit(100));
        const snap = await getDocs(q);
        const list: Product[] = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });

        // Group products by brand and interleave to create a diverse brand mix
        const brandGroups: Record<string, Product[]> = {};
        list.forEach(p => {
          const b = p.brand?.trim() || 'Other';
          if (!brandGroups[b]) brandGroups[b] = [];
          brandGroups[b].push(p);
        });

        const brands = Object.keys(brandGroups);
        const mixed: Product[] = [];
        let maxItems = 0;
        brands.forEach(b => {
          if (brandGroups[b].length > maxItems) maxItems = brandGroups[b].length;
        });

        for (let i = 0; i < maxItems; i++) {
          for (const b of brands) {
            if (brandGroups[b][i]) {
              mixed.push(brandGroups[b][i]);
              if (mixed.length >= 10) break;
            }
          }
          if (mixed.length >= 10) break;
        }

        setFeaturedProducts(mixed.length > 0 ? mixed : list.slice(0, 8));
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleHeroShopNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroCategory === 'Cigarettes') {
      navigate('/cigarettes');
      return;
    }
    const params = new URLSearchParams();
    if (heroCategory === 'Cigars') params.append('category', 'cigars');
    if (heroBrand !== 'Brands') params.append('brand', heroBrand);
    if (skuInput.trim()) params.append('search', skuInput.trim());

    const queryString = params.toString();
    navigate(queryString ? `/shop?${queryString}` : '/shop');
  };

  return (
    <div>
      {/* CigarsForYou Hero Section with Background Video */}
      <section style={{ padding: '1.25rem 1.25rem 3.5rem 1.25rem', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>

          {/* DESKTOP HERO (Displayed when width >= 1110px) */}
          <div className="desktop-hero">
            <div className="medicart-hero-card" style={{
              position: 'relative',
              borderRadius: '28px',
              overflow: 'hidden',
              backgroundColor: '#2f0d0e',
              boxShadow: '0 20px 40px rgba(47, 13, 14, 0.25)'
            }}>

              {/* Background Video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                src="/BG-Vid.mov"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 0
                }}
              >
                <source src="/BG-Vid.mov" type="video/quicktime" />
                <source src={bgVideo} type="video/mp4" />
              </video>

              {/* Transparent Dark Overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(28, 17, 11, 0.65)',
                backdropFilter: 'blur(2px)',
                zIndex: 1
              }} />

              {/* Hero Content Wrapper */}
              <div style={{
                maxWidth: '860px',
                margin: '0 auto',
                textAlign: 'center',
                padding: '4.5rem 2rem 8.5rem 2rem',
                position: 'relative',
                zIndex: 2
              }}>

                {/* Delivery Speed Badge */}
                <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    padding: '0.45rem 1.25rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(37, 99, 235, 0.25)',
                    color: '#93c5fd',
                    border: '1px solid rgba(147, 197, 253, 0.4)',
                    backdropFilter: 'blur(12px)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <Truck size={15} /> Immediate Dispatch (1-3hr Delivery)
                  </span>
                </div>

                {/* Main Hero Headline */}
                <h1 style={{
                  fontSize: 'clamp(2.8rem, 6vw, 4.6rem)',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  marginBottom: '1.25rem',
                  textShadow: '0 4px 20px rgba(0, 0, 0, 0.6)'
                }}>
                  Authentic Cuban Cigars, <br />
                  <span style={{
                    color: '#c06517',
                    textShadow: '0 2px 12px rgba(0, 0, 0, 0.5)'
                  }}>
                    Delivered To Your Door.
                  </span>
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)',
                  color: '#f3f4f6',
                  lineHeight: 1.6,
                  marginBottom: '2.5rem',
                  maxWidth: '680px',
                  marginInline: 'auto',
                  fontWeight: 400,
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)'
                }}>
                  Hand-rolled Cuban classics from Cohiba, Montecristo, and Partagás. Buy one-off or set recurring deliveries on your schedule so your humidor is never empty.
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <Link
                    to="/shop"
                    style={{
                      backgroundColor: '#c06517',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '14px 32px',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 8px 25px rgba(192, 101, 23, 0.4)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a2520d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c06517'}
                  >
                    Explore Cigar Catalog <ChevronRight size={18} />
                  </Link>

                  <Link
                    to="/cigarettes"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontWeight: 600,
                      padding: '14px 28px',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(16px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                  >
                    Cigarettes
                    <span style={{
                      fontSize: '0.7rem',
                      backgroundColor: 'rgba(217, 119, 6, 0.3)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.5)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      Coming Soon
                    </span>
                  </Link>
                </div>

              </div>

              {/* Bottom Docked White Floating Search Card */}
              <div className="medicart-bottom-dock" style={{
                position: 'absolute',
                bottom: '1.5rem',
                left: '2rem',
                right: '2rem',
                zIndex: 10
              }}>
                <form onSubmit={handleHeroShopNow} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2f0d0e', minWidth: '130px' }}>
                    Select a product
                  </span>

                  <select
                    className="medicart-select"
                    value={heroCategory}
                    onChange={(e) => setHeroCategory(e.target.value)}
                    style={{ flex: '1 1 140px', minWidth: '140px' }}
                  >
                    <option value="All Categories">All Categories</option>
                    <option value="Cigars">Cigars</option>
                    <option value="Cigarettes">Cigarettes</option>
                  </select>

                  <select
                    className="medicart-select"
                    value={heroBrand}
                    onChange={(e) => setHeroBrand(e.target.value)}
                    style={{ flex: '1 1 140px', minWidth: '140px' }}
                  >
                    <option value="Brands">Brands</option>
                    {CIGAR_BRANDS.map(b => (
                      <option key={b.slug} value={b.name}>{b.name}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: '0.875rem', color: '#8c6062', fontWeight: 500 }}>or</span>

                  <input
                    type="text"
                    placeholder="Enter SKU"
                    className="medicart-input"
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    style={{ flex: '1 1 160px', minWidth: '140px' }}
                  />

                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#c06517',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.925rem',
                      padding: '12px 32px',
                      borderRadius: '6px',
                      marginLeft: 'auto',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 14px rgba(192, 101, 23, 0.3)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a2520d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c06517'}
                  >
                    Shop Now
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* MOBILE HERO (Displayed when width < 1110px) */}
          <div className="mobile-hero">
            <div className="medicart-hero-card" style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              backgroundColor: '#2f0d0e',
              boxShadow: '0 16px 36px rgba(47, 13, 14, 0.25)',
              padding: '2.5rem 1.25rem 1.75rem 1.25rem'
            }}>
              {/* Background Video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                src="/BG-Vid.mov"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 0
                }}
              >
                <source src="/BG-Vid.mov" type="video/quicktime" />
                <source src={bgVideo} type="video/mp4" />
              </video>

              {/* Transparent Dark Overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(28, 17, 11, 0.7)',
                backdropFilter: 'blur(2px)',
                zIndex: 1
              }} />

              {/* Mobile Content Wrapper */}
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>

                {/* Headline (Scales up dynamically on increasing mobile screen size) */}
                <h1 style={{
                  fontSize: 'clamp(2.4rem, 8.2vw, 4.2rem)',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.12,
                  letterSpacing: '-0.025em',
                  marginBottom: '1.25rem',
                  textShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                  maxWidth: '750px',
                  width: '100%',
                  marginInline: 'auto'
                }}>
                  Authentic Cuban Cigars,{' '}
                  <span style={{ color: '#c06517', textShadow: '0 2px 12px rgba(0, 0, 0, 0.5)' }}>
                    Delivered To Your Door.
                  </span>
                </h1>

                {/* Subtitle set to 80% width relative to title text */}
                <p style={{
                  fontSize: '1.05rem',
                  color: '#f3f4f6',
                  lineHeight: 1.65,
                  marginBottom: '1.75rem',
                  fontWeight: 400,
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)',
                  width: '80%',
                  maxWidth: '580px',
                  marginInline: 'auto'
                }}>
                  Hand-rolled Cuban classics from Cohiba, Montecristo, and Partagás. Buy one-off or set recurring deliveries on your schedule so your humidor is never empty. Choose Immediate Dispatch (1-3hr Delivery) or Free Express Delivery.
                </p>

                {/* Action Buttons (Dynamically shrink on small screens via 100% width, max-width & horizontal margin) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.75rem', width: '100%', padding: '0 1rem', boxSizing: 'border-box' }}>
                  <Link
                    to="/shop"
                    style={{
                      width: '100%',
                      maxWidth: '350px',
                      height: '52px',
                      marginInline: 'auto',
                      backgroundColor: '#c06517',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 8px 25px rgba(192, 101, 23, 0.4)',
                      boxSizing: 'border-box'
                    }}
                  >
                    Explore Cigar Catalog <ChevronRight size={18} />
                  </Link>

                  <Link
                    to="/cigarettes"
                    style={{
                      width: '100%',
                      maxWidth: '350px',
                      height: '52px',
                      marginInline: 'auto',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontWeight: 600,
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(16px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    Cigarettes
                    <span style={{
                      fontSize: '0.68rem',
                      backgroundColor: 'rgba(217, 119, 6, 0.3)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.5)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      Coming Soon
                    </span>
                  </Link>
                </div>

                {/* Mobile White Search Card */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(46, 26, 16, 0.1)',
                  textAlign: 'left'
                }}>
                  <form onSubmit={handleHeroShopNow} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#2f0d0e',
                      display: 'block',
                      marginBottom: '0.85rem'
                    }}>
                      Select a product
                    </span>

                    <select
                      className="medicart-select"
                      value={heroCategory}
                      onChange={(e) => setHeroCategory(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="All Categories">All Categories</option>
                      <option value="Cigars">Cigars</option>
                      <option value="Cigarettes">Cigarettes</option>
                    </select>

                    <select
                      className="medicart-select"
                      value={heroBrand}
                      onChange={(e) => setHeroBrand(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="Brands">Brands</option>
                      {CIGAR_BRANDS.map(b => (
                        <option key={b.slug} value={b.name}>{b.name}</option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#8c6062', fontWeight: 600 }}>or</span>
                      <input
                        type="text"
                        placeholder="Enter SKU"
                        className="medicart-input"
                        value={skuInput}
                        onChange={(e) => setSkuInput(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        backgroundColor: '#c06517',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(192, 101, 23, 0.3)',
                        marginTop: '0.35rem'
                      }}
                    >
                      Shop Now
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Mobile hero is the default. The desktop hero returns at 1110px. */}
        <style>{`
          .desktop-hero { display: none !important; }
          .mobile-hero { display: block !important; }

          @media (min-width: 1110px) {
            .desktop-hero { display: block !important; }
            .mobile-hero { display: none !important; }
          }
        `}</style>
      </section>

      {/* Product Separations Section */}
      <ProductSeparationsSection />

      {/* Featured Products Showcase (Light Theme) */}
      <FeaturedProductsShowcase
        products={featuredProducts}
        loading={loading}
        onOpenNotifyModal={(p) => setSelectedNotifyProduct(p)}
      />

      {/* Dispatch Packaging Section */}
      <DispatchPackagingSection />

      {/* About Us Feature Section */}
      <div id="about-us" style={{ scrollMarginTop: '90px' }}>
        <AboutUsSection />
      </div>

      {/* Brand Grid Section */}
      <section style={{ padding: '5rem 0 3rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c06517', fontSize: '0.825rem', fontWeight: 600 }}>
              World-Renowned Houses
            </span>
            <h2 style={{ fontSize: '2.5rem', color: '#2f0d0e', marginTop: '0.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Explore Cuban Brands
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1.25rem'
          }}>
            {CIGAR_BRANDS.map(b => (
              <Link
                key={b.slug}
                to={`/shop/${b.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card card-hover" style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  border: '1px solid rgba(47, 13, 14, 0.08)',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 16px rgba(47, 13, 14, 0.04)'
                }}>
                  <Award size={32} style={{ color: '#c06517', marginBottom: '0.75rem', opacity: 0.9 }} />
                  <h3 style={{ fontSize: '1.15rem', color: '#2f0d0e', fontWeight: 600 }}>{b.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#8c6062', marginTop: '0.25rem', display: 'block' }}>View Lineup</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Craftsmanship Banner Section (Underneath World-Renowned Houses) */}
      <TrustBannerSection />

      {/* Social Proof Testimonials Slider Section */}
      <SocialProofSlider />

      {/* Stock Notification Modal */}
      {selectedNotifyProduct && (
        <StockNotificationModal
          product={selectedNotifyProduct}
          onClose={() => setSelectedNotifyProduct(null)}
        />
      )}
    </div>
  );
};
