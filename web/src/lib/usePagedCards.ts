import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardRecord } from './pb';

export type PageLoader = (page: number) => Promise<{ items: CardRecord[]; hasMore: boolean }>;

/** Page by page loading with a sentinel element that loads more while scrolling. */
export function usePagedCards(load: PageLoader, resetKey: string) {
  const [items, setItems] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const request = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const loadNext = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setFailed(false);
    try {
      const result = await loader.current(page.current + 1);
      if (id !== request.current) return;
      page.current += 1;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !seen.has(item.id))];
      });
      setHasMore(result.hasMore);
    } catch {
      if (id === request.current) setFailed(true);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    page.current = 0;
    setItems([]);
    setHasMore(false);
    void loadNext();
    return () => {
      request.current += 1;
    };
  }, [resetKey, loadNext]);

  const observer = useRef<IntersectionObserver | null>(null);
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const sentinel = useCallback(
    (element: HTMLElement | null) => {
      observer.current?.disconnect();
      if (!element || typeof IntersectionObserver === 'undefined') return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting) && hasMoreRef.current && !loadingRef.current) {
            void loadNext();
          }
        },
        { rootMargin: '600px 0px' },
      );
      observer.current.observe(element);
    },
    [loadNext],
  );

  // A short page can leave the sentinel in view, and the observer only fires on changes.
  const rearm = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!loading && hasMore && rearm.current) {
      const box = rearm.current.getBoundingClientRect();
      if (box.top < window.innerHeight + 600) void loadNext();
    }
  }, [loading, hasMore, loadNext]);

  const setSentinel = useCallback(
    (element: HTMLElement | null) => {
      rearm.current = element;
      sentinel(element);
    },
    [sentinel],
  );

  return { items, loading, failed, hasMore, setSentinel, retry: loadNext };
}
