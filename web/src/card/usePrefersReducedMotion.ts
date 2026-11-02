import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function getSnapshot() {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
