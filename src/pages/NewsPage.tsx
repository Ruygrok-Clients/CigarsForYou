import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NewsPost } from '../types';
import { fetchPublishedNews, newsMetaLine } from '../services/news';
import { absoluteCanonical, applySeo } from '../lib/seo';
import { responsiveImage } from '../lib/responsiveImage';

export const NewsPage: React.FC = () => {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    applySeo({
      title: 'News | Cigars For You',
      description: 'Notes on storing, choosing, and smoking Cuban cigars from Cigars For You, written for Australian conditions.',
      robots: 'index,follow',
      canonical: absoluteCanonical('/news'),
    });
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPublishedNews();
        if (!cancelled) setPosts(list);
      } catch (err) {
        console.error('Error loading news:', err);
        if (!cancelled) setError('News is unavailable right now. Please try again shortly.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="news-page">
      <style>{`
        .news-page {
          background: var(--bg-cream);
          min-height: 100vh;
          color: #2f0d0e;
        }
        .news-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 2.25rem 1.15rem 4rem;
        }
        .news-kicker {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c06517;
        }
        .news-heading {
          margin: 0.45rem 0 0.7rem;
          font-family: var(--font-serif);
          font-size: clamp(2.1rem, 5.2vw, 3.5rem);
          line-height: 1.05;
          font-weight: 600;
          color: #2f0d0e;
        }
        .news-intro {
          margin: 0;
          max-width: 38rem;
          color: #5c3537;
          font-size: 1.02rem;
          line-height: 1.6;
        }
        .news-list {
          margin-top: 2.25rem;
        }
        .news-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.1rem;
          padding: 1.6rem 0;
          border-top: 1px solid rgba(47, 13, 14, 0.12);
          text-decoration: none;
          color: inherit;
        }
        .news-frame {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 11;
          background: var(--bg-cream-alt);
        }
        .news-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(1.04);
          transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .news-row:hover .news-frame img {
          transform: scale(1);
        }
        .news-meta {
          margin: 0;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8c6062;
        }
        .news-row h2 {
          margin: 0.45rem 0 0.55rem;
          font-family: var(--font-serif);
          font-size: clamp(1.35rem, 2.5vw, 1.95rem);
          line-height: 1.15;
          font-weight: 600;
          color: #2f0d0e;
          transition: color 0.2s ease;
        }
        .news-row:hover h2 {
          color: #c06517;
        }
        .news-excerpt {
          margin: 0;
          color: #5c3537;
          line-height: 1.6;
          font-size: 0.98rem;
        }
        .news-status {
          padding: 3rem 0;
          color: #5c3537;
        }
        @media (min-width: 769px) {
          .news-shell {
            padding: 3.25rem 1.5rem 5rem;
          }
          .news-row {
            grid-template-columns: 0.42fr 1fr;
            align-items: center;
            gap: 2rem;
            padding: 2rem 0;
          }
          .news-row-lead {
            grid-template-columns: 0.85fr 1.15fr;
            padding-top: 2.4rem;
          }
          .news-row-lead h2 {
            font-size: clamp(1.7rem, 2.8vw, 2.35rem);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .news-frame img,
          .news-row:hover .news-frame img {
            transform: none;
            transition: none;
          }
        }
      `}</style>

      <div className="news-shell">
        <p className="news-kicker">News</p>
        <h1 className="news-heading">Notes from the humidor</h1>
        <p className="news-intro">
          Short pieces on Cuban cigars: how to store them in an Australian climate, how to choose a first box, and what the band is actually telling you.
        </p>

        {loading && <p className="news-status">Loading news…</p>}
        {!loading && error && <p className="news-status">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="news-status">No stories published yet. Check back soon.</p>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="news-list">
            {posts.map((post, index) => (
              <Link
                key={post.slug}
                to={`/news/${post.slug}`}
                className={index === 0 ? 'news-row news-row-lead' : 'news-row'}
              >
                <div className="news-frame">
                  {post.imageUrl ? (
                    <img
                      {...responsiveImage(post.imageUrl, '(min-width: 768px) 280px, 40vw')}
                      alt={post.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  ) : null}
                </div>
                <div>
                  <p className="news-meta">{newsMetaLine(post)}</p>
                  <h2>{post.title}</h2>
                  <p className="news-excerpt">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
