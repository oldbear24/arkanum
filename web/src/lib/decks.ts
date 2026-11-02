import { enums, type Edge, type Palette } from '../card/spec';
import { decks, pb, type CardRecord, type DeckRecord } from './pb';

export interface DeckBack {
  palette: Palette;
  edge: Edge;
}

const DEFAULT_BACK: DeckBack = { palette: 'pulnoc', edge: 'zlata' };

export function normalizeDeckBack(raw: unknown): DeckBack {
  const back = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    palette: enums.palette.includes(back.palette as Palette) ? (back.palette as Palette) : DEFAULT_BACK.palette,
    edge: enums.edge.includes(back.edge as Edge) ? (back.edge as Edge) : DEFAULT_BACK.edge,
  };
}

/** Cards of a deck in the deck's own order. Cards the viewer may not see are left out. */
export function orderedDeckCards(deck: DeckRecord): CardRecord[] {
  const expanded = new Map((deck.expand?.cards ?? []).map((card) => [card.id, card]));
  return deck.cards.flatMap((id) => {
    const card = expanded.get(id);
    return card ? [card] : [];
  });
}

/** Moves an item by a number of places. Returns the same list when the move is impossible. */
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function myDecks(ownerId: string) {
  return decks().getFullList({ filter: pb.filter('owner = {:owner}', { owner: ownerId }), sort: '-updated' });
}

export function createDeck(owner: string, name: string, cards: string[] = []) {
  return decks().create({ owner, name, cards, visibility: 'private', back: DEFAULT_BACK });
}
