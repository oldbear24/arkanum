import { describe, expect, it } from 'vitest';
import { recordMove, releaseSpeed, slowDown, type DragMove } from './momentum';

const move = (at: number, y = 0, x = 0, z = 0): DragMove => ({ at, x, y, z });

function trail(...moves: DragMove[]) {
  return moves.reduce<DragMove[]>(recordMove, []);
}

describe('releaseSpeed', () => {
  it('measures the speed of the last moves', () => {
    const speed = releaseSpeed(trail(move(0), move(10, 3), move(20, 3), move(30, 3)), 30);
    expect(speed?.y).toBeCloseTo(0.3, 6);
    expect(speed?.x).toBe(0);
  });

  it('keeps the axis of the flick', () => {
    const speed = releaseSpeed(trail(move(0), move(10, 2, -2), move(20, 2, -2)), 20);
    expect(speed?.x).toBeCloseTo(-0.2, 6);
    expect(speed?.y).toBeCloseTo(0.2, 6);
  });

  it('forgets how the drag began', () => {
    // A slow start, then a flick in the opposite direction.
    const slowly = Array.from({ length: 30 }, (_, i) => move(i * 10, 0.5));
    const flick = Array.from({ length: 10 }, (_, i) => move(300 + i * 10, -6));
    expect(releaseSpeed(trail(...slowly, ...flick), 390)?.y).toBeCloseTo(-0.6, 6);
  });

  it('leaves the card alone after the pointer held still', () => {
    expect(releaseSpeed(trail(move(0), move(10, 8), move(20, 8)), 200)).toBeNull();
  });

  it('loses speed when the pointer slows down before letting go', () => {
    expect(releaseSpeed(trail(move(0), move(10, 3), move(20, 3)), 60)?.y).toBeCloseTo(0.1, 6);
  });

  it('does not count the pause before a new move', () => {
    const speed = releaseSpeed(trail(move(0), move(10, 1), move(1000, 1), move(1010, 4), move(1020, 4)), 1020);
    expect(speed?.y).toBeCloseTo(0.4, 6);
  });

  it('works on a phone that only manages 15 frames a second', () => {
    const speed = releaseSpeed(trail(move(0), move(66, 20), move(132, 20), move(198, 20), move(264, 20)), 264);
    expect(speed?.y).toBeCloseTo(40 / 132, 6);
  });

  it('leaves a card that was only placed slowly where it is', () => {
    expect(releaseSpeed(trail(move(0), move(100 / 3, 0.5), move(200 / 3, 0.5)), 70)).toBeNull();
  });

  it('has a speed limit that keeps the axis', () => {
    const speed = releaseSpeed(trail(move(0), move(10, 300, 400)), 10);
    expect(Math.hypot(speed?.x ?? 0, speed?.y ?? 0, speed?.z ?? 0)).toBeCloseTo(1.08, 6);
    expect((speed?.x ?? 0) / (speed?.y ?? 1)).toBeCloseTo(400 / 300, 6);
  });

  it('needs a move to say anything', () => {
    expect(releaseSpeed([], 10)).toBeNull();
    expect(releaseSpeed(trail(move(0)), 10)).toBeNull();
    expect(releaseSpeed(trail(move(5), move(5, 8)), 5)).toBeNull();
  });

  it('keeps only the moves that can still count', () => {
    const moves = Array.from({ length: 1000 }, (_, i) => move(i * 8, 1));
    expect(trail(...moves).length).toBeLessThan(15);
  });
});

describe('slowDown', () => {
  it('holds on to the speed, half of it is gone after four seconds', () => {
    expect(slowDown({ x: 0, y: 0.5, z: 0 }, 4000)?.y).toBeCloseTo(0.25, 6);
  });

  it('is the same at any frame rate', () => {
    const run = (frames: number) => {
      let speed = { x: 0.3, y: -0.4, z: 0.1 };
      for (let i = 0; i < frames; i++) speed = slowDown(speed, 2000 / frames) ?? speed;
      return speed;
    };
    expect(run(240).y).toBeCloseTo(run(30).y, 6);
    expect(run(240).x).toBeCloseTo(run(30).x, 6);
  });

  it('stops in the end', () => {
    expect(slowDown({ x: 0, y: 0.0021, z: 0 }, 1000)).toBeNull();
    let speed: ReturnType<typeof slowDown> = { x: 0, y: 1.08, z: 0 };
    let ms = 0;
    while (speed) {
      speed = slowDown(speed, 16);
      ms += 16;
    }
    expect(ms).toBeGreaterThan(30_000);
    expect(ms).toBeLessThan(45_000);
  });
});
