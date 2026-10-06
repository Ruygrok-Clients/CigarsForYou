import React, { useEffect, useState } from 'react';
import StrokeText from './StrokeText';
import { Flame } from 'lucide-react';
import { BRAND_NAME } from '../lib/brand';
import './LoadingScreen.css';

export interface LoadingScreenProps {
  text?: string;
  subtitle?: string;
  minimumDuration?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  drawDuration?: number;
  fillDelay?: number;
  stagger?: number;
  fontSize?: number;
  onComplete?: () => void;
  isLoading?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  text = BRAND_NAME,
  subtitle = 'FINEST HAND-ROLLED CUBAN SELECTION',
  minimumDuration = 2400,
  strokeColor = '#c06517',
  fillColor = '#f8f5f0',
  strokeWidth = 1.6,
  drawDuration = 1.6,
  fillDelay = 0.2,
  stagger = 0.04,
  fontSize = 72,
  onComplete,
  isLoading = true
}) => {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minimumDuration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minimumDuration]);

  useEffect(() => {
    if (progress >= 100 && !isLoading) {
      const fadeTimeout = setTimeout(() => {
        setIsFading(true);
      }, 300);

      const hideTimeout = setTimeout(() => {
        setIsHidden(true);
        if (onComplete) onComplete();
      }, 1100); // 300ms + 800ms CSS transition

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(hideTimeout);
      };
    }
  }, [progress, isLoading, onComplete]);

  if (isHidden) return null;

  return (
    <div className={`loading-screen ${isFading ? 'loading-screen--fading' : ''}`}>
      <div className="loading-screen__decorative-ring" />
      <div className="loading-screen__inner">
        <Flame className="loading-screen__brand-icon" />
        
        <div className="loading-screen__stroke-wrapper">
          <StrokeText
            text={text}
            strokeColor={strokeColor}
            fillColor={fillColor}
            strokeWidth={strokeWidth}
            drawDuration={drawDuration}
            fillDelay={fillDelay}
            stagger={stagger}
            ease="power2.out"
            trigger="mount"
            fillMode="wipe"
            fontSize={fontSize}
            fontWeight={800}
            letterSpacing={-2}
          />
        </div>

        {subtitle && <div className="loading-screen__subtitle">{subtitle}</div>}

        <div className="loading-screen__progress-bar-container">
          <div
            className="loading-screen__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
