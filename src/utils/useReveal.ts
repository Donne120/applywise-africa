import { useEffect, useRef, useState } from 'react';

/**
 * Tiny intersection-observer hook: returns a ref and a `revealed` boolean
 * that flips to true once and stays true. Used by landing-page sections to
 * fade/slide into view as the user scrolls.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { ref: React.RefObject<T | null>; revealed: boolean } {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (revealed) return;

    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold, revealed]);

  return { ref, revealed };
}
