import { useId, useMemo } from 'react';
import { GOLD, resolveCard, type CardParams, type ResolvedCard } from './resolve';

/** Resolves the parameters only when their value changes, not on every new object. */
export function useResolvedCard(params: CardParams): ResolvedCard {
  const key = JSON.stringify(params);
  return useMemo(() => resolveCard(JSON.parse(key) as CardParams), [key]);
}

export interface CardIds {
  gold: string;
  /** The gold of the items. It runs across the box of each one, not across the card. */
  metal: string;
  filter: string;
  sky: string;
  glow: string;
  clip: string;
  emb: string;
  vignette: string;
  foil: string;
}

/** Ids of the SVG definitions, unique per rendered card and safe to use in url(#…). */
export function useCardIds(): CardIds {
  const uid = 'k' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return useMemo(
    () => ({ gold: uid + 'g', metal: uid + 'm', filter: uid + 'f', sky: uid + 's', glow: uid + 'w', clip: uid + 'c', emb: uid + 'e', vignette: uid + 'v', foil: uid + 'o' }),
    [uid],
  );
}

export function goldPaint(ids: CardIds) {
  const url = `url(#${ids.gold})`;
  return (value: string) => (value === GOLD ? url : value);
}
