import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { DISTRIBUTION_HUBS, formatHubAddressLine, formatHubMapsQuery } from '../constants/distributionHubs';
import { CopyIconButton } from '../components/CopyIconButton';

const HUB_REQUIREMENTS = [
  'Dedicated cigar storage/humidor area within the premises',
  'CigarsForYou inventory held there',
  'CigarsForYou online orders fulfilled there',
  'Customers can select “Pick up from CigarsForYou” online to pickup instead of being sent out via couriers during open hours.',
  'Permanent CigarsForYou signage visible from outside',
  'Separate CigarsForYou Google Business Profile at the same address',
];

export const DistributionHubsPage: React.FC = () => {
  const hub = DISTRIBUTION_HUBS[0];
  const addressLine = formatHubAddressLine(hub);

  return (
    <div className="hubs-page">
      <style>{`
        .hubs-page {
          background: #ffffff;
          min-height: 100vh;
          color: #2f0d0e;
        }
        .hubs-hero,
        .hubs-section {
          padding-block: clamp(2rem, 6vw, 3rem);
          padding-inline: clamp(1rem, 4vw, 1.5rem);
        }
        .hubs-hero {
          background:
            radial-gradient(120% 80% at 50% -10%, rgba(192, 101, 23, 0.28), transparent 55%),
            #2f0d0e;
          color: #ffffff;
          border-bottom: 1px solid rgba(192, 101, 23, 0.25);
        }
        .hubs-hero-inner,
        .hubs-section-inner {
          width: min(100%, 40rem);
          margin-inline: auto;
        }
        .hubs-kicker {
          margin: 0 0 0.75rem;
          color: #e59d5c;
          font-size: clamp(0.75rem, 2vw, 0.85rem);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .hubs-hero h1,
        .hubs-section h2 {
          font-family: var(--font-serif);
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 0.75rem;
        }
        .hubs-hero h1 {
          font-size: clamp(2.1rem, 8vw, 3.2rem);
          color: #ffffff;
        }
        .hubs-section h2 {
          font-size: clamp(1.45rem, 4vw, 2rem);
          color: #2f0d0e;
        }
        .hubs-lead,
        .hubs-copy {
          margin: 0;
          line-height: 1.6;
          font-size: clamp(0.95rem, 2.2vw, 1.05rem);
        }
        .hubs-lead { color: #d1d5db; max-width: 38rem; }
        .hubs-copy { color: #5c4030; }
        .hubs-steps,
        .hubs-requirements {
          margin: 1.25rem 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .hubs-steps li,
        .hubs-requirements li {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          line-height: 1.5;
          font-size: clamp(0.92rem, 2vw, 1rem);
        }
        .hubs-mark {
          flex-shrink: 0;
          width: 1.6rem;
          color: #c06517;
          font-weight: 700;
        }
        .hubs-address {
          margin-top: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding: clamp(1rem, 3vw, 1.35rem);
          border-top: 1px solid rgba(46, 26, 16, 0.12);
          border-bottom: 1px solid rgba(46, 26, 16, 0.12);
        }
        .hubs-address-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .hubs-address strong {
          display: block;
          font-size: clamp(1.05rem, 2.4vw, 1.2rem);
          margin-bottom: 0.25rem;
        }
        .hubs-links {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem 1.25rem;
        }
        .hubs-links a {
          color: #c06517;
          font-weight: 600;
          text-decoration: none;
        }
        .hubs-cta {
          margin-top: 1.5rem;
        }
        .hubs-band {
          background: #faf6f5;
        }

        @media (min-width: 769px) {
          .hubs-hero,
          .hubs-section {
            padding-block: clamp(2.75rem, 5vw, 4rem);
          }
          .hubs-hero-inner,
          .hubs-section-inner {
            width: min(100%, 46rem);
          }
          .hubs-steps {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem 1.5rem;
          }
        }

        @media (min-width: 1025px) {
          .hubs-hero-inner {
            width: min(100%, 52rem);
          }
          .hubs-split {
            width: min(100%, 64rem);
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(16rem, 0.9fr);
            gap: clamp(2rem, 4vw, 4rem);
            align-items: start;
          }
          .hubs-address {
            margin-top: 0;
            border: 1px solid rgba(46, 26, 16, 0.12);
            border-radius: 0;
            height: 100%;
          }
        }

        @media (min-width: 1921px) {
          .hubs-hero-inner {
            width: min(100%, 60rem);
          }
          .hubs-split,
          .hubs-section-inner {
            width: min(100%, 72rem);
          }
          .hubs-hero h1 {
            font-size: 3.6rem;
          }
        }
      `}</style>

      <section className="hubs-hero">
        <div className="hubs-hero-inner">
          <p className="hubs-kicker">Collection only</p>
          <h1>Distribution Hubs</h1>
          <p className="hubs-lead">
            Collect a CigarsForYou online order from a Sydney distribution hub. These locations are pickup points only. You cannot browse products or catalogues there.
          </p>
        </div>
      </section>

      <section className="hubs-section">
        <div className="hubs-section-inner hubs-split">
          <div>
            <h2>How pickup works</h2>
            <p className="hubs-copy">
              Choose In-Store Pickup at checkout. It is free. We email you when the order is ready to collect, between 7:00am and 7:00pm Sydney time. Bring photo ID.
            </p>
            <ol className="hubs-steps">
              <li><span className="hubs-mark">01</span><span>Place the order online and select In-Store Pickup.</span></li>
              <li><span className="hubs-mark">02</span><span>The hub prepares the cigars you already ordered.</span></li>
              <li><span className="hubs-mark">03</span><span>You receive an email when the order is ready.</span></li>
              <li><span className="hubs-mark">04</span><span>Collect during open hours. No in-store shopping.</span></li>
            </ol>
          </div>
          <div className="hubs-address">
            <div className="hubs-address-row">
              <div>
                <strong>{hub.label}</strong>
                <span>{addressLine}</span>
              </div>
              <CopyIconButton label="address" value={addressLine} />
            </div>
            <div className="hubs-links">
              <a href={`https://maps.google.com/?q=${formatHubMapsQuery(hub)}`} target="_blank" rel="noopener noreferrer">
                <MapPin size={14} style={{ marginRight: '0.35rem', verticalAlign: '-2px' }} />
                Open in maps
              </a>
              <Link to="/contact">Contact CigarsForYou</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="hubs-section hubs-band">
        <div className="hubs-section-inner">
          <h2>Become a distribution hub</h2>
          <p className="hubs-copy">
            Licensed premises can enquire to hold CigarsForYou orders for collection. An official hub is more than a pickup shelf.
          </p>
          <ul className="hubs-requirements">
            {HUB_REQUIREMENTS.map((item) => (
              <li key={item}>
                <span className="hubs-mark" aria-hidden="true">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="hubs-cta">
            <Link to="/partnerships?interest=Distribution%20hub" className="btn btn-primary">
              Enquire to join the network
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
