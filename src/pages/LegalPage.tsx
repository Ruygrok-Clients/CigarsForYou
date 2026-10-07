import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export const LegalPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Terms & Conditions';
  let badge = 'Legal Compliance';

  if (path.includes('cookies')) {
    title = 'Cookies Policy';
  } else if (path.includes('privacy')) {
    title = 'Privacy Policy';
  } else if (path.includes('refund')) {
    title = 'Refund & Return Policy';
  } else if (path.includes('compliance')) {
    title = 'Compliance';
    badge = 'Age & Delivery Compliance';
  }

  const updatedOn = path.includes('cookies')
    ? '5 October 2026'
    : path.includes('compliance')
      ? '4 October 2026'
      : '3 October 2026';

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
            Last updated: {updatedOn} · CigarsForYou Australia
          </p>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <Link to="/terms" className={`btn btn-sm ${path.includes('terms') ? 'btn-primary' : 'btn-secondary'}`}>
            Terms & Conditions
          </Link>
          <Link to="/privacy" className={`btn btn-sm ${path.includes('privacy') ? 'btn-primary' : 'btn-secondary'}`}>
            Privacy Policy
          </Link>
          <Link to="/cookies" className={`btn btn-sm ${path.includes('cookies') ? 'btn-primary' : 'btn-secondary'}`}>
            Cookies Policy
          </Link>
          <Link to="/refund-policy" className={`btn btn-sm ${path.includes('refund') ? 'btn-primary' : 'btn-secondary'}`}>
            Refund & Return Policy
          </Link>
          <Link to="/compliance" className={`btn btn-sm ${path.includes('compliance') ? 'btn-primary' : 'btn-secondary'}`}>
            Compliance
          </Link>
        </div>

        {/* Content Body */}
        <div className="card" style={{ padding: '2.5rem', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {path.includes('cookies') ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>1. How Cookies and Similar Technologies Work on This Site</h2>
              <p>
                CigarsForYou uses cookies, local browser storage, and similar technologies so the storefront can function, meet age-restricted tobacco compliance requirements, and understand how visitors use the site. These technologies run by default when you browse cigarsforyou.com.au. We do not show a separate cookie consent banner before they operate.
              </p>
              <p style={{ marginTop: '1rem' }}>
                This Cookies Policy explains what we use, why we use it, and how you can ask us not to collect your data. It should be read with our{' '}
                <Link to="/privacy" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Privacy Policy</Link>.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>2. Analytics and Tracking Cookies</h2>
              <p>
                We use <strong>Google Analytics 4</strong> (measurement ID <code>G-SRZFLMB8X7</code>) via Google&apos;s gtag.js tag. The tag loads on storefront pages, including the age gate. Google may set its own cookies (for example <code>_ga</code> and related identifiers) to distinguish browsers or sessions and measure traffic.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We send events such as page views, product and cart interactions, checkout steps, lead form submissions, and similar engagement signals. Event payloads are configured so they do not include your name, email address, phone number, or free-text message content. Admin paths under <code>/admin</code> do not send storefront analytics page views or click events.
              </p>
              <p style={{ marginTop: '1rem' }}>
                Staff-only browser flags may also be stored as first-party cookies when a special URL parameter is used: <code>cfy_ga_internal</code> (marks internal traffic) and <code>cfy_ga_debug</code> (enables debug mode for Analytics testing). These are operational tools, not customer marketing profiles.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>3. Essential Site Storage</h2>
              <p>
                The site also stores data in your browser (cookies, localStorage, or sessionStorage) so core features work. This includes, for example:
              </p>
              <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Age-gate confirmation that you self-attested you are 18+ (<code>cfy_age_verified_v1</code>)</li>
                <li style={{ marginBottom: '0.5rem' }}>Cart contents and applied coupons</li>
                <li style={{ marginBottom: '0.5rem' }}>Rewards cart and loyalty-related session helpers</li>
                <li style={{ marginBottom: '0.5rem' }}>Selected store location preference</li>
                <li style={{ marginBottom: '0.5rem' }}>Guest age-verification session references related to our Didit check</li>
                <li style={{ marginBottom: '0.5rem' }}>Anonymous session identifiers used for live site/product presence indicators</li>
                <li>Short-lived flags that control closing-time or similar operational notices within a browsing session</li>
              </ul>
              <p style={{ marginTop: '1rem' }}>
                Firebase / Google authentication may also set cookies or storage needed to keep you signed in. Online age verification through{' '}
                <a href="https://didit.me/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  Didit
                </a>{' '}
                may use its own cookies or storage under Didit&apos;s terms and privacy policy.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>4. Your Right Not to Have Data Collected</h2>
              <p>
                You have the right to ask that your personal data not be collected, and to ask that data we hold about you be permanently deleted, subject to any legal retention we must keep (for example age-verification or order records required under Australian tobacco and consumer laws).
              </p>
              <p style={{ marginTop: '1rem' }}>
                If you do not want your data collected, or you want data permanently deleted, contact us directly at{' '}
                <a href="mailto:privacy@cigarsforyou.com.au" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  privacy@cigarsforyou.com.au
                </a>{' '}
                or{' '}
                <a href="mailto:hello@cigarsforyou.com.au" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  hello@cigarsforyou.com.au
                </a>
                , or use our{' '}
                <Link to="/contact" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Contact</Link> page. Tell us that you want collection stopped and/or a permanent deletion, and include enough detail for us to identify your account or prior contact (for example the email address you used). We will action verified requests as soon as reasonably practicable.
              </p>
              <p style={{ marginTop: '1rem' }}>
                You can also clear cookies and site data in your browser settings at any time. Doing so may reset age-gate confirmation, cart contents, and sign-in state on this device. Blocking Google Analytics in your browser or via privacy tools may reduce analytics collection from that browser.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>5. Updates</h2>
              <p>
                We may update this Cookies Policy when our cookies, storage, or tracking practices change. The &quot;Last updated&quot; date at the top of this page will be revised when we do.
              </p>
            </div>
          ) : path.includes('privacy') ? (
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

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>4. Cookies and Analytics</h2>
              <p>
                We use cookies, browser storage, and Google Analytics to operate the storefront and measure site usage. These technologies run by default. Full details, including your right to ask that data not be collected and to request permanent deletion, are in our{' '}
                <Link to="/cookies" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Cookies Policy</Link>.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>5. Australian Privacy Principles (APPs)</h2>
              <p>
                We adhere to the Privacy Act 1988 (Cth). You may request access to, correction of, or deletion of your personal data by contacting our Privacy Officer at privacy@cigarsforyou.com.au. Requests relating to data processed solely by Didit may need to be directed to Didit in accordance with their privacy policy.
              </p>
            </div>
          ) : path.includes('compliance') ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>1. Two-Step Age Compliance</h2>
              <p>
                Tobacco products may only be sold and delivered to adults aged 18 years or older, and only to customers in New South Wales. CigarsForYou uses two separate checks: an online age verification before an order can be paid, and a photo ID check by the courier before the order is handed over.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>2. Online Age Verification (Didit)</h2>
              <p>
                Online age verification is performed by{' '}
                <a href="https://didit.me/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  Didit
                </a>
                . The check starts with a facial age estimation. If that estimate does not indicate the person is 18 or older, the same flow asks for a government-issued photo ID, such as a driver licence. An order cannot be paid until this check has been approved at least once.
              </p>
              <p style={{ marginTop: '1rem' }}>
                An account cannot be created until Didit approves the check. Once that approval is stored on the account, later orders placed while signed in to that account do not repeat the online check. If you are not signed in, the check is completed at checkout before any payment details are collected. A guest check is not saved for reuse, so a later checkout while still signed out must be verified again.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>3. Delivery Age Verification</h2>
              <p>
                Immediate Dispatch is handled by our official partner, Didi. Express Shipping is handled by courier partners such as StarTrack or AusPost, under arrangements that include tobacco delivery and an ID check. In both cases the person receiving the order must be 18 or older, must present appropriate photo ID, and must match the customer details on the order. The order cannot be left unattended. If the ID check fails, the order is returned to CigarsForYou. For Express Shipping, it may instead be held at a local post office with instructions that the same age check is completed before collection.
              </p>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>4. Immediate Dispatch</h2>
              <p>
                At checkout we quote Immediate Dispatch from the delivery address, using a conservative distance-based price, alongside flat-fee Express Shipping. If you choose Immediate Dispatch and pay, our team arranges the delivery with Didi.
              </p>
              <p style={{ marginTop: '1rem' }}>
                If Didi cannot take the delivery, we email you two options. You can take a full refund, including the Immediate Dispatch fee, or move the order to complimentary Express Shipping. On that upgrade we refund the Immediate Dispatch fee and send the order by Express Shipping at no delivery charge to you. Reply to the email or call us and we will record your choice. We do not change the order until we hear from you.
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
