import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const LegalPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Terms & Conditions';
  let badge = 'Legal Compliance';

  if (path.includes('privacy')) {
    title = 'Privacy Policy';
  } else if (path.includes('refund')) {
    title = 'Refund & Return Policy';
  }

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '840px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
            {badge}
          </span>
          <h1 style={{ fontSize: '2.8rem', color: '#ffffff' }}>{title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Last updated: 25 August 2026 · CigarsForYou Australia
          </p>
        </div>

        {/* Legal Counsel Notice */}
        <div style={{
          padding: '1.25rem',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid var(--accent-gold)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'flex-start'
        }}>
          <ShieldAlert size={22} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.2rem' }}>Legal Review Advisory</strong>
            This document represents a comprehensive starter draft for CigarsForYou Australia. Given the regulated nature of tobacco products and age-restriction enforcement in Australia, this text should be formally reviewed by qualified Australian legal counsel prior to commercial launch.
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <Link to="/terms" className={`btn btn-sm ${path.includes('terms') ? 'btn-primary' : 'btn-secondary'}`}>
            Terms & Conditions
          </Link>
          <Link to="/privacy" className={`btn btn-sm ${path.includes('privacy') ? 'btn-primary' : 'btn-secondary'}`}>
            Privacy Policy
          </Link>
          <Link to="/refund-policy" className={`btn btn-sm ${path.includes('refund') ? 'btn-primary' : 'btn-secondary'}`}>
            Refund & Return Policy
          </Link>
        </div>

        {/* Content Body */}
        <div className="card" style={{ padding: '2.5rem', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {path.includes('privacy') ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginBottom: '1rem' }}>1. Information We Collect</h2>
              <p>
                CigarsForYou collects personal information necessary to provide products and verify adult age compliance under Australian law. This includes your name, email address, physical delivery address, contact phone number, and verified Date of Birth (DOB).
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>2. Age Verification & DOB Data</h2>
              <p>
                Because tobacco sales are strictly regulated to adults aged 18 years or older, we collect and securely store your Date of Birth in your Firestore profile. DOB records are maintained for statutory compliance auditing.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>3. Third-Party Payment & Service Processors</h2>
              <p>
                Payment information is tokenized and processed securely via <strong>Stripe Inc.</strong> and <strong>PayPal Holdings Inc.</strong> CigarsForYou does not store raw credit card credentials on its servers. Database infrastructure and user authentication services are provided via <strong>Firebase / Google Cloud Platform</strong>.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>4. Australian Privacy Principles (APPs)</h2>
              <p>
                We adhere to the Privacy Act 1988 (Cth). You may request access to, correction of, or deletion of your personal data by contacting our Privacy Officer at privacy@cigarsforyou.com.au.
              </p>
            </div>
          ) : path.includes('refund') ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginBottom: '1rem' }}>1. Australian Consumer Law Guarantees</h2>
              <p>
                Our goods come with guarantees that cannot be excluded under the Australian Consumer Law (ACL). You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>2. Consumable Goods & Damage in Transit</h2>
              <p>
                Cigars are perishable luxury goods requiring humidity control. If your cigars arrive damaged, unsealed, or compromised in transit, please notify us within 48 hours of delivery at support@cigarsforyou.com.au with photographic proof for immediate replacement.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>3. Change of Mind Policy</h2>
              <p>
                Due to strict sanitary requirements and state tobacco storage regulations, we cannot accept returns or exchanges for change of mind once a package has been opened or unsealed.
              </p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginBottom: '1rem' }}>1. Acceptance & Strict 18+ Age Restriction</h2>
              <p>
                By accessing CigarsForYou or purchasing tobacco products, you explicitly warrant that you are <strong>18 years of age or older</strong>. Delivery personnel will demand government-issued photo ID (driver license, proof of age card, or passport) prior to hand-off. Orders will be cancelled without refund of shipping if age cannot be verified at delivery.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>2. Order Acceptance & Inventory</h2>
              <p>
                All orders are subject to stock availability and confirmation. CigarsForYou reserves the right to cancel or adjust orders in the event of pricing errors or supply disruptions.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>3. Governing Law</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of Australia and the relevant State or Territory of sale.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
