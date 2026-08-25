import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { CIGAR_BRANDS } from '../components/Navbar';
import { ShieldCheck, Clock, Sparkles, Flame, ChevronRight, Award, RefreshCw } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(collection(db, 'products'), limit(8));
        const snap = await getDocs(q);
        const list: Product[] = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        setFeaturedProducts(list);
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '5rem 0 6rem 0',
        background: 'radial-gradient(ellipse at top, #3b2417 0%, #170f0b 70%)',
        borderBottom: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
            <span className="badge badge-gold" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
              <Sparkles size={14} /> Australia's Premier On-Demand Humidor
            </span>

            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 6vw, 4.2rem)', 
              color: '#ffffff', 
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              letterSpacing: '0.01em'
            }}>
              Authentic Cuban Cigars, <br />
              <span style={{ color: 'var(--accent-gold)', fontStyle: 'italic' }}>Delivered To Your Door.</span>
            </h1>

            <p style={{ 
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6,
              marginBottom: '2.5rem'
            }}>
              Hand-rolled Cuban classics from Cohiba, Montecristo, and Partagas. Buy one-off or set recurring deliveries on your schedule so your humidor is never empty.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
              <Link to="/shop" className="btn btn-primary btn-lg">
                Explore Cigar Catalog <ChevronRight size={18} />
              </Link>
              <Link to="/cigarettes" className="btn btn-secondary btn-lg">
                Cigarettes <span className="badge badge-amber" style={{ marginLeft: '0.4rem' }}>Coming Soon</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Ambient Decorative Glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />
      </section>

      {/* Category Tiles */}
      <section style={{ padding: '4rem 0 2rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.75rem' }}>
            {/* Tile 1: Cuban Cigars */}
            <Link to="/shop" style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{
                background: 'linear-gradient(135deg, #332119 0%, #241712 100%)',
                border: '1px solid var(--border-color)',
                padding: '2.5rem 2rem',
                minHeight: '220px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>Available Now</span>
                  <h3 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.5rem' }}>Cuban Cigars</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Authentic Habanos selections in singles, packs, and full boxes of 25.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                  <span>Shop Collection</span> <ChevronRight size={18} />
                </div>
              </div>
            </Link>

            {/* Tile 2: Cigarettes - Coming Soon */}
            <Link to="/cigarettes" style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{
                background: 'linear-gradient(135deg, #281e18 0%, #1c130d 100%)',
                border: '1px solid var(--border-subtle)',
                padding: '2.5rem 2rem',
                minHeight: '220px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: 0.95
              }}>
                <div>
                  <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>Coming Soon</span>
                  <h3 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.5rem' }}>Cigarettes</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Australian compliance compliant retail cigarette brands launching soon for door delivery.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  <span>Notify Me at Launch</span> <ChevronRight size={18} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Showcase */}
      <section style={{ padding: '3rem 0 5rem 0' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent-gold)', fontSize: '0.825rem', fontWeight: 600 }}>
                Curated Selection
              </span>
              <h2 style={{ fontSize: '2.4rem', color: '#ffffff', marginTop: '0.25rem' }}>
                Featured Cuban Cigars
              </h2>
            </div>
            <Link to="/shop" className="btn btn-outline">
              View All Cigars ({featuredProducts.length || '60+'})
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              Loading humidor inventory...
            </div>
          ) : (
            <div className="grid-responsive">
              {featuredProducts.slice(0, 8).map(product => (
                <ProductCard 
                  key={product.id || product.slug} 
                  product={product} 
                  onOpenNotifyModal={(p) => setSelectedNotifyProduct(p)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Subscribe & Save Feature Section */}
      <section style={{
        padding: '5rem 0',
        backgroundColor: 'var(--bg-surface-elevated)',
        borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '1rem' }}>
                <RefreshCw size={14} /> Subscription Delivery
              </span>
              <h2 style={{ fontSize: '2.5rem', color: '#ffffff', marginBottom: '1.25rem' }}>
                Never Run Low. <br />
                <span style={{ color: 'var(--accent-gold)' }}>Automated Humidor Restock.</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Select your favorite stick or curated collection, pick your schedule (every 2, 4, 6, or 8 weeks), and let CigarsForYou handle the rest. Modify, pause, or cancel anytime from your account portal.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>Flexible Delivery Cycles</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Choose 2, 4, 6, or 8-week recurring schedules.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>Guaranteed Freshness</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Each shipment is sealed in humidity-controlled travel pouches.</p>
                  </div>
                </div>
              </div>

              <Link to="/shop" className="btn btn-primary btn-lg">
                Start a Subscription <ChevronRight size={18} />
              </Link>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center'
            }}>
              <Flame size={48} style={{ color: 'var(--accent-gold)', margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.75rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                Curated Cigar Bundles
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Enjoy hand-picked selections of premium robustos and churchills delivered effortlessly.
              </p>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Popular Subscription</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--accent-gold)', fontWeight: 700 }}>Cohiba Siglo VI — Every 4 Weeks</span>
              </div>
              <Link to="/shop" className="btn btn-outline btn-full">
                Browse Subscription Options
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Grid Section */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent-gold)', fontSize: '0.825rem', fontWeight: 600 }}>
              World-Renowned Houses
            </span>
            <h2 style={{ fontSize: '2.5rem', color: '#ffffff', marginTop: '0.25rem' }}>
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
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)'
                }}>
                  <Award size={32} style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem', opacity: 0.8 }} />
                  <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{b.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>View Lineup</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
