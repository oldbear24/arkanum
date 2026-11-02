// An unlocked card goes on turning after a flick, like a wheel on a good bearing. All of this
// runs around the axes of the screen, the same ones `turn` takes, so the card keeps the axis
// it was flicked around whatever its pose is by then.

/** A turn in degrees around the axes of the screen, or a speed in degrees per millisecond. */
export interface Axes {
  x: number;
  y: number;
  z: number;
}

/** One move of a drag and when it happened. */
export interface DragMove extends Axes {
  at: number;
}

/** Only the last moments of a drag tell how fast the card was going. */
const WINDOW_MS = 80;
/** A pointer that held still for this long has stopped the card. Slow phones send moves about every 60 ms. */
const PAUSE_MS = 100;
/** Anything slower only places the card, which then stays where it was let go of. */
const MIN_SPEED = 0.03;
/** Three turns a second. Much faster and the eye sees only a flicker. */
const MAX_SPEED = 1.08;
/** The card holds on to its momentum: it takes four seconds to lose half of the speed. */
const HALF_LIFE_MS = 4000;
/** Slower than this, the card looks like it stands still anyway. */
const STOP_SPEED = 0.002;

const speedOf = ({ x, y, z }: Axes) => Math.hypot(x, y, z);
const scaled = ({ x, y, z }: Axes, by: number): Axes => ({ x: x * by, y: y * by, z: z * by });

/** Adds a move to the ones that still count. The oldest one only tells when the next one began. */
export function recordMove(moves: readonly DragMove[], move: DragMove): DragMove[] {
  const last = moves[moves.length - 1];
  if (last && move.at - last.at > PAUSE_MS) return [move];
  const kept = [...moves, move];
  while (kept.length > 2 && move.at - kept[1]!.at > WINDOW_MS) kept.shift();
  return kept;
}

/**
 * The speed of a card let go of at the given time. Null when it should stay where it is.
 * The time up to the release counts too, so a pointer slowing to a stop leaves little speed.
 */
export function releaseSpeed(moves: readonly DragMove[], at: number): Axes | null {
  const [first, ...rest] = moves;
  const last = rest[rest.length - 1];
  if (!first || !last || at - last.at > PAUSE_MS || at <= first.at) return null;

  const turned = rest.reduce((sum, move) => ({ x: sum.x + move.x, y: sum.y + move.y, z: sum.z + move.z }), { x: 0, y: 0, z: 0 });
  const speed = scaled(turned, 1 / (at - first.at));
  const size = speedOf(speed);
  if (size < MIN_SPEED) return null;
  return size > MAX_SPEED ? scaled(speed, MAX_SPEED / size) : speed;
}

/** The speed some milliseconds later, the same at any frame rate. Null when the card came to rest. */
export function slowDown(speed: Axes, ms: number): Axes | null {
  const slower = scaled(speed, 0.5 ** (ms / HALF_LIFE_MS));
  return speedOf(slower) < STOP_SPEED ? null : slower;
}
