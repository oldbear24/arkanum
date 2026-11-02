// Undo and redo as a pure reducer. A series of quick changes to the same field (typing,
// dragging a slider) counts as one step.

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  group: string | null;
  at: number;
}

export type HistoryAction<T> =
  | { type: 'change'; value: T; group?: string; at: number }
  | { type: 'undo' }
  | { type: 'redo' }
  /** A change from outside, for example a co-author. It does not become an undo step. */
  | { type: 'replace'; value: T };

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 800;

export function initHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [], group: null, at: 0 };
}

export function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case 'change': {
      if (action.value === state.present) return state;
      const coalesce = action.group !== undefined && action.group === state.group && action.at - state.at < COALESCE_MS;
      return {
        past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.value,
        future: [],
        group: action.group ?? null,
        at: action.at,
      };
    }
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (previous === undefined) return state;
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], group: null, at: 0 };
    }
    case 'redo': {
      const next = state.future[0];
      if (next === undefined) return state;
      return { past: [...state.past, state.present], present: next, future: state.future.slice(1), group: null, at: 0 };
    }
    case 'replace':
      return { ...state, present: action.value, future: [], group: null, at: 0 };
  }
}
