import React from 'react';
import { Star } from 'lucide-react';

export const GOOGLE_REVIEW_RATING = 4.9;
export const GOOGLE_REVIEW_COUNT = 310;

interface GoogleReviewsBadgeProps {
  className?: string;
  style?: React.CSSProperties;
}

export const GoogleReviewsBadge: React.FC<GoogleReviewsBadgeProps> = ({
  className,
  style
}) => (
  <div
    className={`cart-google-reviews${className ? ` ${className}` : ''}`}
    style={style}
    aria-label={`Rated ${GOOGLE_REVIEW_RATING} out of 5 on Google from ${GOOGLE_REVIEW_COUNT} reviews`}
  >
    <span className="cart-google-reviews__g" aria-hidden="true">G</span>
    <div className="cart-google-reviews__body">
      <div className="cart-google-reviews__row">
        <strong>{GOOGLE_REVIEW_RATING.toFixed(1)}</strong>
        <span className="cart-google-reviews__stars" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => {
            const fill = Math.min(1, Math.max(0, GOOGLE_REVIEW_RATING - i));
            return (
              <span key={i} className="cart-google-reviews__star-wrap">
                <Star size={14} strokeWidth={0} className="cart-google-reviews__star-empty" />
                <span className="cart-google-reviews__star-fill" style={{ width: `${fill * 100}%` }}>
                  <Star size={14} strokeWidth={0} fill="currentColor" />
                </span>
              </span>
            );
          })}
        </span>
      </div>
      <p className="cart-google-reviews__meta">
        Based on <strong>{GOOGLE_REVIEW_COUNT}</strong> Google reviews
      </p>
    </div>
  </div>
);
