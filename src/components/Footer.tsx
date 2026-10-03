import React from 'react';
import { Link } from 'react-router-dom';
import { useCigarCategories } from '../hooks/useCigarCategories';

const MARQUEE_ITEMS = [
  'IMMEDIATE DISPATCH',
  'EXPRESS DELIVERY',
  '100% GENUINE CUBAN',
  'AGE VERIFIED 18+'
];

export const Footer: React.FC = () => {
  const cigarCategories = useCigarCategories();
  return (
    <footer style={{
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-secondary)',
      borderTop: '1px solid var(--border-color)',
      marginTop: '0',
      paddingTop: '3rem',
      paddingBottom: '2rem'
    }}>
      {/* Keyframe animation for infinite marquee & responsive footer styles */}
      <style>{`
        @keyframes footerMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        .footer-grid {
          grid-template-columns: 1fr !important;
          gap: 2rem !important;
          text-align: left !important;
        }
        .footer-brand {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
        }
        .footer-logo {
          height: 95px !important;
          max-width: 100% !important;
        }
        .footer-col {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
        }
        .footer-copyright {
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
          gap: 0.5rem !important;
        }
        .footer-warning {
          text-align: left !important;
        }

        @media (min-width: 769px) {
          .footer-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 2.5rem !important;
            text-align: initial !important;
          }
          .footer-brand {
            display: block !important;
            align-items: stretch !important;
            text-align: initial !important;
          }
          .footer-logo {
            height: 48px !important;
            max-width: 100% !important;
          }
          .footer-col {
            display: block !important;
            align-items: stretch !important;
            text-align: initial !important;
          }
          .footer-copyright {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            justify-content: space-between !important;
            align-items: center !important;
            text-align: initial !important;
            gap: 1rem !important;
          }
          .footer-warning {
            text-align: center !important;
          }
        }
      `}</style>

      {/* Looped Marquee of Title Text (No Subtext) */}
      <div style={{
        overflow: 'hidden',
        width: '100%',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '2.5rem',
        marginBottom: '3.5rem',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3rem',
          animation: 'footerMarquee 24s linear infinite',
          willChange: 'transform'
        }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
            <React.Fragment key={index}>
              <span style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                {item}
              </span>
              <span style={{ color: '#c06517', fontSize: '0.9rem', opacity: 0.8 }}>✦</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="container">
        {/* Footer Navigation Columns */}
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem'
        }}>
          {/* Brand Info with White SVG Logo */}
          <div className="footer-brand" style={{ gridColumn: 'span 1' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <Link to="/" style={{ display: 'inline-block' }}>
                <img
                  src="/logo-white.svg"
                  alt="CigarsForYou Logo"
                  className="footer-logo"
                  style={{ height: '48px', width: 'auto', display: 'block' }}
                />
              </Link>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Australia's premier online humidor experience. Bringing world-class Cuban cigars directly to connoisseurs across the nation.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: 0, margin: 0 }}>
              <li><Link to="/about" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>About Us</Link></li>
              <li><Link to="/news" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>News</Link></li>
              <li><Link to="/contact" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Contact Us</Link></li>
              <li><Link to="/shop" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Shop All Cigars</Link></li>
              <li><Link to="/cigarettes" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Cigarettes</Link></li>
              <li><Link to="/accessories" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Accessories</Link></li>
              <li><Link to="/cart" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Shopping Cart</Link></li>
              <li><Link to="/account" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>My Account</Link></li>
            </ul>
          </div>

          {/* Premium Brands */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Cuban Brands</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: 0, margin: 0 }}>
              {cigarCategories.map(brand => (
                <li key={brand.slug}>
                  <Link to={`/shop/${brand.slug}`} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance & Legal */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Compliance & Legal</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: 0, margin: 0 }}>
              <li><Link to="/terms" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Terms & Conditions</Link></li>
              <li><Link to="/privacy" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Privacy Policy</Link></li>
              <li><Link to="/refund-policy" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Refund & Return Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Health Warning + Age Compliance */}
        <div className="footer-warning" style={{
          backgroundColor: '#2f0d0e',
          border: '1px solid rgba(192, 101, 23, 0.3)',
          borderRadius: '8px',
          padding: '1.35rem 1.5rem 1.25rem',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <p style={{
            color: '#f5ebe6',
            fontWeight: 800,
            fontSize: '1.05rem',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            WARNING: TOBACCO SMOKE CAUSES FATAL DISEASES AND DISABILITY.
          </p>
          <p style={{
            color: 'rgba(245, 235, 230, 0.88)',
            fontSize: '0.84rem',
            lineHeight: 1.6,
            margin: '0.75rem auto 0',
            maxWidth: '46rem'
          }}>
            Strictly 18+. We go beyond reasonable steps to comply with Australian age-restricted tobacco laws and do not support or condone underage smoking. Every order is age-verified through our partner{' '}
            <a
              href="https://didit.me/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#f5ebe6', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Didit
            </a>
            , to 99.9% accuracy, at account creation or before checkout.
          </p>
          <a
            href="https://didit.me/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Learn more about Didit identity verification"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginTop: '1rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid rgba(245, 235, 230, 0.18)',
              backgroundColor: 'rgba(0, 0, 0, 0.22)',
              textDecoration: 'none',
              color: 'rgba(245, 235, 230, 0.78)',
              fontSize: '0.75rem',
              letterSpacing: '0.02em'
            }}
          >
            <span style={{ opacity: 0.75 }}>Age verification by</span>
            <img
              src="/didit-logo-wordmark-white.svg"
              alt="Didit"
              style={{ height: '18px', width: 'auto', display: 'block' }}
            />
          </a>
        </div>

        {/* Copyright */}
        <div className="footer-copyright" style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} CigarsForYou Australia. All rights reserved.</p>
          <p style={{ margin: 0 }}>ABN 23 679 156 131 </p>
        </div>
      </div>
    </footer>
  );
};
