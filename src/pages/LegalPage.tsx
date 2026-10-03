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
          <h1 style={{ fontSize: '2.8rem', color: 'var(--text-primary)' }}>{title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Last updated: 3 October 2026 · CigarsForYou Australia
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
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Legal Review Advisory</strong>
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
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>1. Information We Collect</h2>
              <p>
                CigarsForYou collects personal information necessary to provide products and meet Australian age-restricted tobacco laws. This typically includes your name, email address, physical delivery address, and contact phone number. Account profiles may also store an age-verification status (for example, whether you have completed our online age check) and related session references.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We do not ask you to enter a date of birth into our storefront for age checks. Online age verification is performed by our identity partner,{' '}
                <a href="https://didit.me/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  Didit
                </a>
                , using their Adaptive Age Estimation workflow. Didit may process biometric or identity-related data according to its own terms and privacy policy. We retain verification outcomes needed for compliance (such as approved/declined status, session identifiers, and timestamps), not a copy of your government ID document.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>2. Age Verification Data</h2>
              <p>
                Tobacco products may only be sold and delivered to adults aged 18 years or older. Before an account is created, or before checkout if you are not already verified on your account, you must complete a secure Didit age check. Approved results may be linked to your account so you do not need to repeat the check on every visit. Site-entry confirmation (self-attesting that you are 18+) is stored in your browser only and is separate from Didit verification.
              </p>
              <p style={{ marginTop: '1rem' }}>
                Delivery still requires a government-issued photo ID (driver licence, proof of age card, or passport) to be presented to the courier. Age-verification records are kept for statutory compliance and audit purposes.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>3. Third-Party Payment & Service Processors</h2>
              <p>
                Online card payments are not currently offered while a new payment processor is being set up. CigarsForYou does not store raw credit card credentials on its servers. Database infrastructure and user authentication services are provided via <strong>Firebase / Google Cloud Platform</strong>. Online age verification is provided by <strong>Didit</strong>. When you start an age check, relevant session information is shared with Didit solely to complete that verification.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>4. Australian Privacy Principles (APPs)</h2>
              <p>
                We adhere to the Privacy Act 1988 (Cth). You may request access to, correction of, or deletion of your personal data by contacting our Privacy Officer at privacy@cigarsforyou.com.au. Requests relating to data processed solely by Didit may need to be directed to Didit in accordance with their privacy policy.
              </p>
            </div>
          ) : path.includes('refund') ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>1. Australian Consumer Law Guarantees</h2>
              <p>
                Our goods come with guarantees that cannot be excluded under the Australian Consumer Law (ACL). You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>2. Consumable Goods & Damage in Transit</h2>
              <p>
                Cigars are perishable luxury goods. If your cigars arrive damaged, or compromised in transit, please notify us within 48 hours of delivery at hello@cigarsforyou.com.au with photographic proof for immediate replacement.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>3. Change of Mind Policy</h2>
              <p>
                Due to strict sanitary requirements and state tobacco storage regulations, we cannot accept returns or exchanges for change of mind once a package has been received.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>4. Failed Age Verification at Delivery</h2>
              <p>
                If a recipient cannot present valid government-issued photo ID proving they are 18 years of age or older at delivery, the order may be cancelled. Shipping and any non-recoverable fulfilment costs are non-refundable in that event.
              </p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>1. Acceptance & Strict 18+ Age Restriction</h2>
              <p>
                By accessing CigarsForYou or purchasing tobacco products, you explicitly warrant that you are <strong>18 years of age or older</strong>. Under Australian law, tobacco products may only be sold and delivered to adults.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We enforce age restriction in layers: (a) a site-entry confirmation that you are 18+; (b) a mandatory online age check through our partner{' '}
                <a href="https://didit.me/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  Didit
                </a>{' '}
                at account creation, or before checkout if your account (or guest session) is not already age verified; and (c) government-issued photo ID checked by delivery personnel prior to hand-off. An account is created only after Didit approval. Orders will be cancelled without refund of shipping if age cannot be verified at delivery.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>2. Online Age Verification (Didit)</h2>
              <p>
                Completing the Didit age check is a condition of creating an account and of placing an order. If verification is declined, or is not approved, you cannot create an account or proceed to checkout. Approved verification may be saved against your account so future checkouts can proceed without repeating the check, subject to re-verification if a prior result expires or is no longer valid.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>3. Order Acceptance & Inventory</h2>
              <p>
                All orders are subject to stock availability, age-verification clearance, and confirmation. CigarsForYou reserves the right to cancel or adjust orders in the event of pricing errors, supply disruptions, or failed age verification.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>4. Governing Law</h2>
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
