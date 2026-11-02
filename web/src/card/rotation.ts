// The free rotation of a card. Two angles in a row cannot do it: with rotateX and rotateY,
// a horizontal drag runs backwards once the card is upside down, and on a card lying flat
// it spins the card like a wheel. A quaternion has no such poses, every turn happens around
// the axes of the screen.

/** x, y, z, w. The axes are those of CSS: x to the right, y down, z towards the viewer. */
export type Quat = readonly [number, number, number, number];

export const NO_TURN: Quat = [0, 0, 0, 1];

const RAD = Math.PI / 180;

function around(x: number, y: number, z: number, degrees: number): Quat {
  const length = Math.hypot(x, y, z);
  if (!length) return NO_TURN;
  const half = (degrees * RAD) / 2;
  const s = Math.sin(half) / length;
  return [x * s, y * s, z * s, Math.cos(half)];
}

/** The rotation b followed by the rotation a. */
function compose(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function normalized(q: Quat): Quat {
  const length = Math.hypot(...q);
  return length ? [q[0] / length, q[1] / length, q[2] / length, q[3] / length] : NO_TURN;
}

/** Turns a pose further around the axes of the screen, whatever the pose is. In degrees. */
export function turn(pose: Quat, byX: number, byY: number, byZ: number): Quat {
  return normalized(compose(around(byX, byY, byZ, Math.hypot(byX, byY, byZ)), pose));
}

/** The whole pose of a card: its free rotation, then the tilt, then the own turn around its long axis. */
export function fullPose(orient: Quat | undefined, rx: number, ry: number): Quat {
  return compose(compose(orient ?? NO_TURN, around(1, 0, 0, rx)), around(0, 1, 0, ry));
}

export function cssRotation(pose: Quat): string {
  const [x, y, z, w] = pose;
  const sine = Math.hypot(x, y, z);
  if (sine < 1e-6) return 'rotate3d(0, 0, 1, 0deg)';
  // The same rotation has two quaternions. This one never takes the long way round.
  const sign = w < 0 ? -1 : 1;
  // Rounded first, because a tiny negative number would print as -0.0000.
  const axis = (n: number) => (Math.round(((n * sign) / sine) * 1e4) / 1e4 + 0).toFixed(4);
  return `rotate3d(${axis(x)}, ${axis(y)}, ${axis(z)}, ${((2 * Math.atan2(sine, w * sign)) / RAD).toFixed(2)}deg)`;
}

/** The unit vector towards the viewer in the axes of the card. */
export function viewDirection(pose: Quat): { x: number; y: number; z: number } {
  const [x, y, z, w] = pose;
  return { x: 2 * (x * z - w * y), y: 2 * (y * z + w * x), z: 1 - 2 * (x * x + y * y) };
}

/**
 * Where the viewer stands as seen from the card, in degrees: yaw towards its sides and
 * pitch towards its top and bottom. Both are 0 when looking straight at the front.
 */
export function viewAngles(pose: Quat): { yaw: number; pitch: number } {
  const view = viewDirection(pose);
  return {
    yaw: Math.atan2(-view.x, view.z) / RAD,
    pitch: Math.asin(Math.max(-1, Math.min(1, view.y))) / RAD,
  };
}

/**
 * Turns a move on the screen into a move in the plane of the card. Returns null when the
 * card is too close to edge-on for the move to mean anything.
 */
export function screenToCard(pose: Quat, dx: number, dy: number): { x: number; y: number } | null {
  const [x, y, z, w] = pose;
  const xx = 1 - 2 * (y * y + z * z);
  const xy = 2 * (x * y + w * z);
  const yx = 2 * (x * y - w * z);
  const yy = 1 - 2 * (x * x + z * z);
  const determinant = xx * yy - yx * xy;
  if (Math.abs(determinant) < 0.2) return null;
  return { x: (dx * yy - dy * yx) / determinant, y: (dy * xx - dx * xy) / determinant };
}

/** How far the line from a fixed point to a moving one turned, in degrees. Clockwise is positive. */
export function twistDegrees(fixed: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }): number {
  const before = Math.atan2(from.y - fixed.y, from.x - fixed.x);
  const after = Math.atan2(to.y - fixed.y, to.x - fixed.x);
  const degrees = (after - before) / RAD;
  return degrees > 180 ? degrees - 360 : degrees < -180 ? degrees + 360 : degrees;
}
