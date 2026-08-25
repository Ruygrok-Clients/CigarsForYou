import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Clock, Lock } from 'lucide-react';
import { CIGAR_BRANDS } from './Navbar';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#f5f5f7',
      color: '#515154',
      borderTop: '1px solid rgba(0, 0, 0, 0.08)',
      marginTop: '4rem',
      paddingTop: '3.5rem',
      paddingBottom: '2rem'
    }}>
      <div className="container">
        {/* Value Proposition Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          paddingBottom: '3rem',
          marginBottom: '3rem',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Truck size={26} style={{ color: '#b8860b', flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#1d1d1f', fontWeight: 600 }}>Australia-Wide Express</h4>
              <p style={{ fontSize: '0.85rem', color: '#86868b', margin: 0 }}>Fast humidor-sealed delivery directly to your doorstep.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={26} style={{ color: '#b8860b', flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#1d1d1f', fontWeight: 600 }}>100% Genuine Cuban</h4>
              <p style={{ fontSize: '0.85rem', color: '#86868b', margin: 0 }}>Guaranteed authentic premium hand-rolled selection.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Clock size={26} style={{ color: '#b8860b', flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#1d1d1f', fontWeight: 600 }}>Subscribe & Save</h4>
              <p style={{ fontSize: '0.85rem', color: '#86868b', margin: 0 }}>Never run out. Automated delivery on your preferred schedule.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Lock size={26} style={{ color: '#b8860b', flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#1d1d1f', fontWeight: 600 }}>Age Verified 18+</h4>
              <p style={{ fontSize: '0.85rem', color: '#86868b', margin: 0 }}>Strict regulatory compliance and ID verification on delivery.</p>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem'
        }}>
          {/* Brand Info */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.6rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em' }}>
                Cigars<span style={{ color: '#b8860b' }}>ForYou</span>
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#86868b', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Australia's premier online humidor experience. Bringing world-class Cuban cigars directly to connoisseurs across the nation with effortless subscription reordering.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: '#1d1d1f', fontWeight: 600 }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li><Link to="/shop" style={{ color: '#515154', fontSize: '0.875rem' }}>Shop All Cigars</Link></li>
              <li><Link to="/cigarettes" style={{ color: '#515154', fontSize: '0.875rem' }}>Cigarettes (Coming Soon)</Link></li>
              <li><Link to="/cart" style={{ color: '#515154', fontSize: '0.875rem' }}>Shopping Cart</Link></li>
              <li><Link to="/account" style={{ color: '#515154', fontSize: '0.875rem' }}>My Account</Link></li>
            </ul>
          </div>

          {/* Premium Brands */}
          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: '#1d1d1f', fontWeight: 600 }}>Cuban Brands</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {CIGAR_BRANDS.map(brand => (
                <li key={brand.slug}>
                  <Link to={`/shop/${brand.slug}`} style={{ color: '#515154', fontSize: '0.875rem' }}>
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance & Legal */}
          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: '#1d1d1f', fontWeight: 600 }}>Compliance & Legal</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li><Link to="/terms" style={{ color: '#515154', fontSize: '0.875rem' }}>Terms & Conditions</Link></li>
              <li><Link to="/privacy" style={{ color: '#515154', fontSize: '0.875rem' }}>Privacy Policy</Link></li>
              <li><Link to="/refund-policy" style={{ color: '#515154', fontSize: '0.875rem' }}>Refund & Return Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Health Warning Box */}
        <div style={{
          backgroundColor: '#1d1d1f',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <p style={{
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.05rem',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            WARNING: TOBACCO SMOKE CAUSES FATAL DISEASES AND DISABILITY.
          </p>
          <p style={{ color: '#a1a1a6', fontSize: '0.8rem', marginTop: '0.4rem', marginBottom: 0 }}>
            Strictly 18+. Proof of age with government-issued photo ID is required upon delivery.
          </p>
        </div>

        {/* Copyright */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          fontSize: '0.8rem',
          color: '#86868b'
        }}>
          <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} CigarsForYou Australia. All rights reserved.</p>
          <p style={{ margin: 0 }}>ABN 88 123 456 789 (Placeholder)</p>
        </div>
      </div>
    </footer>
  );
};
