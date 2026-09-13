'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

/**
 * Tracks scroll direction with a single shared listener instead of one per
 * <Reveal> instance — the landing page mounts 23 of these, so 23 independent
 * `scroll` listeners were previously doing the same window.scrollY comparison
 * on every scroll frame, which is real (measurable) scroll jank.
 */
let sharedDirection: 'up' | 'down' = 'down';
let sharedLastY = 0;
let listenerCount = 0;

function ensureSharedScrollListener() {
  if (listenerCount === 0 && typeof window !== 'undefined') {
    sharedLastY = window.scrollY;
    window.addEventListener('scroll', updateSharedDirection, { passive: true });
  }
  listenerCount += 1;
  return () => {
    listenerCount -= 1;
    if (listenerCount === 0) {
      window.removeEventListener('scroll', updateSharedDirection);
    }
  };
}

function updateSharedDirection() {
  const y = window.scrollY;
  sharedDirection = y >= sharedLastY ? 'down' : 'up';
  sharedLastY = y;
}

export default function Reveal({ children, className = '', delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // When an element is first revealed while scrolling UP, show it instantly
  // (no fade/slide) so upward navigation feels stable.
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const releaseScrollListener = ensureSharedScrollListener();

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      releaseScrollListener();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (sharedDirection === 'up') setInstant(true);
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      releaseScrollListener();
    };
  }, []);

  const transition = instant
    ? ''
    : `transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`;

  return (
    <div
      ref={ref}
      className={`${instant ? 'opacity-100' : ''} ${transition} ${className}`}
      style={instant ? undefined : { transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
