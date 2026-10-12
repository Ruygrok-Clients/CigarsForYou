import React, { useEffect, useRef, useState } from 'react';

const DURATION_MS = 520;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Tweens an integer toward `value`. Snaps immediately when motion is reduced. */
export const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to || prefersReducedMotion()) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const next = Math.round(from + (to - from) * easeOutCubic(t));
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
};
