import { describe, expect, it } from 'vitest';
import { COALESCE_MS, HISTORY_LIMIT, historyReducer, initHistory } from './history';

const change = (value: number, at = 0, group?: string) => ({ type: 'change' as const, value, at, group });

describe('history', () => {
  it('undoes and redoes', () => {
    let state = initHistory(1);
    state = historyReducer(state, change(2));
    state = historyReducer(state, change(3));
    expect(state.present).toBe(3);

    state = historyReducer(state, { type: 'undo' });
    expect(state.present).toBe(2);
    state = historyReducer(state, { type: 'undo' });
    expect(state.present).toBe(1);

    state = historyReducer(state, { type: 'redo' });
    state = historyReducer(state, { type: 'redo' });
    expect(state.present).toBe(3);
  });

  it('does nothing at the ends of the history', () => {
    const start = initHistory(1);
    expect(historyReducer(start, { type: 'undo' })).toBe(start);
    expect(historyReducer(start, { type: 'redo' })).toBe(start);
  });

  it('clears the redo steps on a new change', () => {
    let state = initHistory(1);
    state = historyReducer(state, change(2));
    state = historyReducer(state, { type: 'undo' });
    state = historyReducer(state, change(5));
    expect(state.future).toEqual([]);
    expect(historyReducer(state, { type: 'redo' })).toBe(state);
  });

  it('merges quick changes of the same field into one step', () => {
    let state = initHistory(0);
    state = historyReducer(state, change(1, 1000, 'title'));
    state = historyReducer(state, change(2, 1000 + COALESCE_MS - 1, 'title'));
    state = historyReducer(state, change(3, 1000 + 2 * COALESCE_MS - 2, 'title'));
    expect(state.past).toEqual([0]);
    state = historyReducer(state, { type: 'undo' });
    expect(state.present).toBe(0);
  });

  it('starts a new step after a pause, for another field and without a group', () => {
    let state = initHistory(0);
    state = historyReducer(state, change(1, 1000, 'title'));
    state = historyReducer(state, change(2, 1000 + COALESCE_MS, 'title'));
    expect(state.past).toEqual([0, 1]);
    state = historyReducer(state, change(3, 1000 + COALESCE_MS + 1, 'foil'));
    expect(state.past).toEqual([0, 1, 2]);
    state = historyReducer(state, change(4, 1000 + COALESCE_MS + 2));
    state = historyReducer(state, change(5, 1000 + COALESCE_MS + 3));
    expect(state.past).toEqual([0, 1, 2, 3, 4]);
  });

  it('does not merge across an undo', () => {
    let state = initHistory(0);
    state = historyReducer(state, change(1, 1000, 'title'));
    state = historyReducer(state, { type: 'undo' });
    state = historyReducer(state, change(2, 1001, 'title'));
    expect(state.past).toEqual([0]);
  });

  it('keeps a remote change out of the undo steps', () => {
    let state = initHistory(0);
    state = historyReducer(state, change(1));
    state = historyReducer(state, { type: 'replace', value: 9 });
    expect(state.present).toBe(9);
    expect(state.past).toEqual([0]);
    expect(state.future).toEqual([]);
  });

  it('limits the number of steps', () => {
    let state = initHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 50; i++) state = historyReducer(state, change(i));
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    expect(state.past[0]).toBe(50);
  });
});
