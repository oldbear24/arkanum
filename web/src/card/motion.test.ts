import { describe, expect, it } from 'vitest';
import { computeMotion, hasFoilOverlay, REST, restingMotion, type MotionState } from './motion';
import { resolveCard } from './resolve';
import { turn, NO_TURN } from './rotation';

const options = { flip: false, mode: 'drag', spinning: false, reducedMotion: false } as const;

function floating(state: Partial<MotionState>, flip = false) {
  const { vars } = computeMotion(resolveCard({}), { ...REST, ...state }, { ...options, flip });
  return { front: parseFloat(vars['--ifx']!), back: parseFloat(vars['--ibx']!), y: parseFloat(vars['--ify']!) };
}

describe('items above the card', () => {
  it('lie still on a card that faces the viewer, so the export needs no motion', () => {
    expect(floating({})).toEqual({ front: 0, back: 0, y: 0 });
    const { vars } = restingMotion(resolveCard({}));
    expect(parseFloat(vars['--ifx']!)).toBe(0);
  });

  it('move on the front the way a point above it would', () => {
    // rotateY takes what is in front of the card to the right, seen by the viewer.
    expect(floating({ ry: 30 }).front).toBeCloseTo(0.4375, 2);
    // rotateX takes it up, and up is negative on a screen.
    expect(floating({ rx: 30 }).y).toBeCloseTo(-0.4375, 2);
  });

  it('move on the back the way a point above the back would', () => {
    // Turned over and a bit further: what is above the back moves to the right on the screen.
    expect(floating({ ry: 30 }, true).back).toBeCloseTo(0.4375, 2);
  });

  it('do the same on a card turned over by dragging', () => {
    const orient = turn(NO_TURN, 0, 210, 0);
    expect(floating({ orient }).back).toBeCloseTo(floating({ ry: 30 }, true).back, 3);
  });

  it('follow the plane of a card turned in its plane', () => {
    // Rolled by a quarter, the top of the card points to the right of the screen.
    const orient = turn(turn(NO_TURN, 0, 0, 90), 0, 30, 0);
    const { front, y } = floating({ orient });
    expect(front).toBeCloseTo(0, 2);
    expect(y).toBeCloseTo(-0.4375, 2);
  });
});

describe('hasFoilOverlay', () => {
  it('knows the foils with a layer over the card', () => {
    expect(hasFoilOverlay('duha')).toBe(true);
    expect(hasFoilOverlay('galaxie')).toBe(true);
    expect(hasFoilOverlay('zlata')).toBe(false);
    expect(hasFoilOverlay('zadna')).toBe(false);
    expect(hasFoilOverlay('ruzova')).toBe(false);
  });
});
