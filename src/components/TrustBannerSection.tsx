import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Sparkles } from 'lucide-react';

export const TrustBannerSection: React.FC = () => {
  return (
    <section style={{ padding: '0 1.25rem 5rem 1.25rem', backgroundColor: '#ffffff' }}>
      <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: '#1b382b',
          borderRadius: '28px',
          padding: '4.5rem 2rem 4rem 2rem',
          textAlign: 'center',
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(27, 56, 43, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Main Headline */}
          <h2 style={{
            fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem'
          }}>
            keep the smoke flowing
          </h2>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.15rem)',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.6,
            maxWidth: '660px',
            margin: '0 auto 2.25rem auto',
            fontWeight: 400
          }}>
            every cigar is 100% authentic cuban tobacco, hand-rolled by master torcedores and humidity-controlled — premium vitolas you can actually trust.
          </p>

          {/* Call To Action Button */}
          <div style={{ marginBottom: '4.5rem' }}>
            <Link
              to="/shop"
              style={{
                display: 'inline-block',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '14px 38px',
                borderRadius: '9999px',
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0f172a';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              shop cigars
            </Link>
          </div>

          {/* 3 Feature Highlights at Bottom */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem 1.5rem',
            maxWidth: '1050px',
            margin: '0 auto'
          }}>
            {/* Feature 1 */}
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.85rem',
                color: '#ffffff'
              }}>
                <ShieldCheck size={28} style={{ strokeWidth: 1.75 }} />
              </div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}>
                100% authentic cuban
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
                margin: '0 auto',
                maxWidth: '280px',
                fontWeight: 400
              }}>
                directly sourced with serial-numbered verification on every single box.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.85rem',
                color: '#ffffff'
              }}>
                <Truck size={28} style={{ strokeWidth: 1.75 }} />
              </div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}>
                two ways to your door
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
                margin: '0 auto',
                maxWidth: '280px',
                fontWeight: 400
              }}>
                Immediate Dispatch (1-3hr Delivery) with our official Didi partners, or Express Delivery with partners such as StarTrack or AusPost.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.85rem',
                color: '#ffffff'
              }}>
                <Sparkles size={28} style={{ strokeWidth: 1.75 }} />
              </div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}>
                humidor fresh guaranteed
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
                margin: '0 auto',
                maxWidth: '280px',
                fontWeight: 400
              }}>
                boveda-pack humidity seal ensures factory-fresh perfection upon arrival.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
