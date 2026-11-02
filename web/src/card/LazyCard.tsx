import { useEffect, useRef, useState } from 'react';
import { Card3D, type Card3DProps } from './Card3D';
import { useResolvedCard } from './useResolvedCard';

export interface LazyCardProps extends Card3DProps {
  /** URL of the stored preview, shown while the card is outside of the viewport. */
  thumbnail?: string;
}

/** Keeps a live 3D card only inside the viewport. Elsewhere it shows the stored preview. */
export function LazyCard({ thumbnail, className, style, ...props }: LazyCardProps) {
  const card = useResolvedCard(props);
  const holder = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = holder.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={holder} className={className} style={{ width: '100%', aspectRatio: card.ar, ...style }}>
      {inView ? (
        <Card3D {...props} />
      ) : thumbnail ? (
        <img
          src={thumbnail}
          alt={card.ariaBase}
          loading="lazy"
          decoding="async"
          style={{ display: 'block', width: '100%', height: '100%', borderRadius: `${(card.radius / 300) * 100}%` }}
        />
      ) : (
        <div role="img" aria-label={card.ariaBase} style={{ width: '100%', height: '100%', borderRadius: `${(card.radius / 300) * 100}%`, background: card.c.base }} />
      )}
    </div>
  );
}
