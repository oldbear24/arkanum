import { describe, expect, it } from 'vitest';
import { cssRotation, fullPose, NO_TURN, screenToCard, turn, twistDegrees, viewAngles, viewDirection, type Quat } from './rotation';

/** Where the rotation moves a point, the way CSS would move it. */
function apply([x, y, z, w]: Quat, [px, py, pz]: [number, number, number]): [number, number, number] {
  return [
    (1 - 2 * (y * y + z * z)) * px + 2 * (x * y - w * z) * py + 2 * (x * z + w * y) * pz,
    2 * (x * y + w * z) * px + (1 - 2 * (x * x + z * z)) * py + 2 * (y * z - w * x) * pz,
    2 * (x * z - w * y) * px + 2 * (y * z + w * x) * py + (1 - 2 * (x * x + y * y)) * pz,
  ];
}

function expectPoint(actual: [number, number, number], expected: [number, number, number]) {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 6));
}

describe('viewDirection', () => {
  it('points out of the front at the viewer on a card that faces them', () => {
    const view = viewDirection(NO_TURN);
    expectPoint([view.x, view.y, view.z], [0, 0, 1]);
  });

  it('is the vector that a pose takes to the viewer', () => {
    const pose = turn(turn(NO_TURN, 25, -40, 0), 0, 0, 70);
    const { x, y, z } = viewDirection(pose);
    expectPoint(apply(pose, [x, y, z]), [0, 0, 1]);
  });
});

describe('turn', () => {
  it('matches rotateY and rotateX of CSS', () => {
    // rotateY(90deg) takes the front of the card to the right.
    expectPoint(apply(turn(NO_TURN, 0, 90, 0), [0, 0, 1]), [1, 0, 0]);
    // rotateX(90deg) takes the front of the card up, and y points down on a screen.
    expectPoint(apply(turn(NO_TURN, 90, 0, 0), [0, 0, 1]), [0, -1, 0]);
    // rotateZ(90deg) is clockwise, so the right side ends up at the bottom.
    expectPoint(apply(turn(NO_TURN, 0, 0, 90), [1, 0, 0]), [0, 1, 0]);
  });

  it('follows the pointer even on a card that is upside down', () => {
    const upsideDown = turn(NO_TURN, 180, 0, 0);
    // What faces the viewer now is the back. A turn to the right has to take it to the right.
    const front = apply(upsideDown, [0, 0, -1]);
    expectPoint(front, [0, 0, 1]);
    expectPoint(apply(turn(upsideDown, 0, 90, 0), [0, 0, -1]), [1, 0, 0]);
  });

  it('keeps turning the same way on a card lying flat', () => {
    const flat = turn(NO_TURN, 90, 0, 0);
    // With rotateX and rotateY in a row this would only spin the card like a wheel.
    expectPoint(apply(turn(flat, 0, 90, 0), [0, 0, 1]), apply(flat, [0, 0, 1]));
    expectPoint(apply(turn(flat, 0, 90, 0), [1, 0, 0]), [0, 0, -1]);
  });

  it('has no limit in any direction', () => {
    let pose: Quat = NO_TURN;
    for (let i = 0; i < 72; i++) pose = turn(pose, 5, 0, 0);
    expectPoint(apply(pose, [0, 0, 1]), [0, 0, 1]);
    for (let i = 0; i < 36; i++) pose = turn(pose, 5, 0, 0);
    expectPoint(apply(pose, [0, 0, 1]), [0, 0, -1]);
  });

  it('stays a pure rotation after thousands of small turns', () => {
    let pose: Quat = NO_TURN;
    for (let i = 0; i < 5000; i++) pose = turn(pose, 0.7, -1.3, 0.4);
    expect(Math.hypot(...pose)).toBeCloseTo(1, 10);
  });

  it('does nothing without a move', () => {
    expect(turn(NO_TURN, 0, 0, 0)).toEqual(NO_TURN);
  });
});

describe('cssRotation', () => {
  it('writes no turn as a valid rotation', () => {
    expect(cssRotation(NO_TURN)).toBe('rotate3d(0, 0, 1, 0deg)');
  });

  it('writes the axis and the angle', () => {
    expect(cssRotation(turn(NO_TURN, 0, 55, 0))).toBe('rotate3d(0.0000, 1.0000, 0.0000, 55.00deg)');
    expect(cssRotation(turn(NO_TURN, -30, 0, 0))).toBe('rotate3d(-1.0000, 0.0000, 0.0000, 30.00deg)');
  });

  it('takes the short way round', () => {
    expect(cssRotation(turn(NO_TURN, 0, 220, 0))).toBe('rotate3d(0.0000, -1.0000, 0.0000, 140.00deg)');
  });
});

describe('viewAngles', () => {
  it('reads the same angles the design uses for a simple pose', () => {
    const { yaw, pitch } = viewAngles(fullPose(undefined, 20, 35));
    expect(yaw).toBeCloseTo(35, 6);
    expect(pitch).toBeCloseTo(20, 6);
  });

  it('ignores a turn in the plane of the card, which changes no view', () => {
    const { yaw, pitch } = viewAngles(turn(NO_TURN, 0, 0, 70));
    expect(yaw).toBeCloseTo(0, 6);
    expect(pitch).toBeCloseTo(0, 6);
  });

  it('sees the front from behind on a flipped card', () => {
    expect(Math.abs(viewAngles(fullPose(undefined, 0, 180)).yaw)).toBeCloseTo(180, 6);
  });
});

describe('screenToCard', () => {
  it('is the same move on a straight card', () => {
    const moved = screenToCard(NO_TURN, 10, -4);
    expect(moved?.x).toBeCloseTo(10, 6);
    expect(moved?.y).toBeCloseTo(-4, 6);
  });

  it('follows a card turned in its plane', () => {
    // Clockwise by 90°: the top of the card now points right, so a move right goes to the top.
    const moved = screenToCard(turn(NO_TURN, 0, 0, 90), 10, 0);
    expect(moved?.x).toBeCloseTo(0, 6);
    expect(moved?.y).toBeCloseTo(-10, 6);
  });

  it('stretches a move on a card seen at an angle', () => {
    const moved = screenToCard(turn(NO_TURN, 0, 60, 0), 10, 0);
    expect(moved?.x).toBeCloseTo(20, 6);
  });

  it('gives up on a card seen edge-on', () => {
    expect(screenToCard(turn(NO_TURN, 0, 90, 0), 10, 0)).toBeNull();
  });
});

describe('twistDegrees', () => {
  it('measures a clockwise turn as positive', () => {
    expect(twistDegrees({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90, 6);
  });

  it('does not jump across the half circle', () => {
    expect(twistDegrees({ x: 0, y: 0 }, { x: -10, y: 1 }, { x: -10, y: -1 })).toBeCloseTo(11.42, 1);
  });
});
