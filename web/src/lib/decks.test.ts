import { describe, expect, it } from 'vitest';
import { moveItem, normalizeDeckBack, orderedDeckCards } from './decks';
import type { CardRecord, DeckRecord } from './pb';

const card = (id: string) => ({ id }) as CardRecord;

describe('normalizeDeckBack', () => {
  it('fills in defaults and rejects unknown values', () => {
    expect(normalizeDeckBack(null)).toEqual({ palette: 'pulnoc', edge: 'zlata' });
    expect(normalizeDeckBack({ palette: 'krev', edge: 'cerna' })).toEqual({ palette: 'krev', edge: 'cerna' });
    expect(normalizeDeckBack({ palette: 'modra', edge: 7 })).toEqual({ palette: 'pulnoc', edge: 'zlata' });
  });
});

describe('orderedDeckCards', () => {
  it('follows the order of the deck, not of the expand', () => {
    const deck = { cards: ['c', 'a', 'b'], expand: { cards: [card('a'), card('b'), card('c')] } } as DeckRecord;
    expect(orderedDeckCards(deck).map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('leaves out cards the viewer cannot see', () => {
    const deck = { cards: ['a', 'hidden', 'b'], expand: { cards: [card('a'), card('b')] } } as DeckRecord;
    expect(orderedDeckCards(deck).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('survives a deck without an expand', () => {
    expect(orderedDeckCards({ cards: ['a'] } as DeckRecord)).toEqual([]);
  });
});

describe('moveItem', () => {
  it('moves in both directions', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  });

  it('keeps the list at the edges', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, 5, 1)).toBe(list);
  });

  it('does not touch the original', () => {
    const list = ['a', 'b'];
    moveItem(list, 0, 1);
    expect(list).toEqual(['a', 'b']);
  });
});
