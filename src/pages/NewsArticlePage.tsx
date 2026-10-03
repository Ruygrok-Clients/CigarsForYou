import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { NewsPost } from '../types';
import { fetchNewsBySlug, newsMetaLine, parseNewsBody } from '../services/news';

export const NewsArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    setPost(null);

    (async () => {
      if (!slug) {
        if (!cancelled) {
          setMissing(true);
          setLoading(false);
        }
        return;
      }
      try {
        const found = await fetchNewsBySlug(slug);
        if (cancelled) return;
        if (!found) {
          setMissing(true);
          document.title = 'News | Cigars For You';
        } else {
          setPost(found);
          document.title = `${found.title} | Cigars For You`;
        }
      } catch (err) {
        console.error('Error loading news article:', err);
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const blocks = post ? parseNewsBody(post.body) : [];

  return (
    <div className="news-article">
      <style>{`
        .news-article {
          background: var(--bg-cream);
          min-height: 100vh;
          color: #2f0d0e;
        }
        .news-article-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 2.25rem 1.15rem 4.5rem;
        }
        .news-back {
          display: inline-block;
          margin-bottom: 1.4rem;
          color: #c06517;
          text-decoration: underline;
          text-underline-offset: 0.22em;
          font-size: 0.95rem;
        }
        .news-article h1 {
          margin: 0 0 0.7rem;
          font-family: var(--font-serif);
          font-size: clamp(2rem, 5vw, 3.1rem);
          line-height: 1.08;
          font-weight: 600;
          color: #2f0d0e;
        }
        .news-article-meta {
          margin: 0 0 1.4rem;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8c6062;
        }
        .news-article-hero {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
          margin-bottom: 1.75rem;
          background: var(--bg-cream-alt);
        }
        .news-article-body p {
          margin: 0 0 1.05rem;
          color: #5c3537;
          font-size: 1.05rem;
          line-height: 1.7;
        }
        .news-article-body h2 {
          margin: 1.8rem 0 0.7rem;
          font-family: var(--font-serif);
          font-size: clamp(1.35rem, 2.4vw, 1.7rem);
          line-height: 1.2;
          color: #2f0d0e;
        }
        .news-article-status {
          color: #5c3537;
          line-height: 1.6;
        }
        @media (min-width: 769px) {
          .news-article-shell {
            padding: 3.25rem 1.5rem 5.5rem;
          }
        }
      `}</style>

      <article className="news-article-shell">
        <Link to="/news" className="news-back">Back to News</Link>

        {loading && <p className="news-article-status">Loading…</p>}

        {!loading && missing && (
          <>
            <h1>That story is not on the site</h1>
            <p className="news-article-status">
              It may have been unpublished, or the link is out of date.
            </p>
          </>
        )}

        {!loading && post && (
          <>
            <h1>{post.title}</h1>
            <p className="news-article-meta">{newsMetaLine(post)}</p>
            {post.imageUrl && <img className="news-article-hero" src={post.imageUrl} alt="" />}
            <div className="news-article-body">
              {blocks.map((block, index) =>
                block.type === 'heading' ? (
                  <h2 key={index}>{block.text}</h2>
                ) : (
                  <p key={index}>{block.text}</p>
                )
              )}
            </div>
          </>
        )}
      </article>
    </div>
  );
};
