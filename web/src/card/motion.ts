import type { Axes } from './momentum';
import type { ResolvedCard } from './resolve';
import { cssRotation, fullPose, NO_TURN, viewAngles, viewDirection, type Quat } from './rotation';

// The pointer dependent half of renderVals() from design/Karta.dc.html. Its output
// goes straight to CSS variables, so that moving a card never re-renders React.

export type MotionMode = 'tilt' | 'drag' | 'none';

export interface MotionState {
  rx: number;
  ry: number;
  spin: number;
  gx: number;
  gy: number;
  active: boolean;
  drag: boolean;
  /** The free rotation of the drag mode. A card that was not turned yet has none. */
  orient?: Quat;
  /** How fast an unlocked card goes on turning on its own, after it was flicked. */
  coast?: Axes;
}

export const REST: Readonly<MotionState> = { rx: 0, ry: 0, spin: 0, gx: 50, gy: 30, active: false, drag: false };

export interface MotionOptions {
  flip: boolean;
  mode: MotionMode;
  spinning: boolean;
  reducedMotion: boolean;
}

export interface MotionOutput {
  vars: Record<string, string>;
  gx1: string;
  gx2: string;
  /** The same sweep of light for the items, whose gradient runs across their own box. */
  mx1: string;
  mx2: string;
  transition: string;
}

const f1 = (n: number) => Math.round(n * 10) / 10;
const em = (n: number) => n.toFixed(3) + 'em';
const RAD = Math.PI / 180;

const MID_LAYER_DEPTH = 9.5;

/** How strong the shimmering foils are at zero and at full intensity. */
const HOLO_STRENGTH: Partial<Record<ResolvedCard['foil'], [number, number]>> = {
  duha: [0.16, 0.44],
  kosmos: [0.08, 0.22],
  hranol: [0.14, 0.4],
  perlet: [0.12, 0.5],
  plamen: [0.14, 0.42],
  ledova: [0.14, 0.42],
  trpytky: [0.06, 0.24],
  vlny: [0.1, 0.34],
  galaxie: [0.18, 0.5],
};

/** The foils with a shimmering layer over the card. The others only change its metal. */
export function hasFoilOverlay(foil: ResolvedCard['foil']): boolean {
  return foil in HOLO_STRENGTH;
}

/** The foils whose sparkles change with the angle of the card. */
const SPARKLING: ReadonlySet<ResolvedCard['foil']> = new Set(['kosmos', 'trpytky', 'galaxie']);

/** How far an item at full depth moves on the card, in em. It matches the illustration. */
const ITEM_FLOAT_EM = 0.875;

const GLARE: Record<ResolvedCard['surface'], number> = { mat: 0.14, saten: 0.34, lesk: 0.62, zrcadlo: 0.9 };

/**
 * The pose of the card itself, for placing things on it. The turn of the flip is included,
 * so the front is what looks at the viewer when the result has no turn in it.
 */
export function posed(s: Readonly<MotionState>, flip: boolean): Quat {
  return fullPose(s.orient, s.rx, s.ry + s.spin + (flip ? 180 : 0));
}

/**
 * The angles that parallax, glare and sparkles follow. Without a free rotation these are
 * the ones of the design. With one they are read off the real pose, so the effects keep
 * reacting to where the viewer stands however the card got there.
 */
function effectAngles(s: Readonly<MotionState>, flip: boolean) {
  if (!s.orient) return s;
  const { yaw, pitch } = viewAngles(posed(s, flip));
  return { rx: pitch, ry: yaw, spin: 0 };
}

export function computeMotion(card: ResolvedCard, s: Readonly<MotionState>, o: MotionOptions): MotionOutput {
  const active = s.active || s.drag;
  const { rx, ry, spin } = effectAngles(s, o.flip);
  const sy = Math.sin((ry + spin) * RAD);
  const sx = Math.sin(rx * RAD);
  const gx = active ? s.gx : Math.max(0, Math.min(100, card.light + 35 * sy));
  const gy = active ? s.gy : 24;
  const rotY = s.ry + s.spin + (o.flip ? 180 : 0);
  const lift = active && o.mode === 'tilt' ? 0.7 : 0;
  const shift = (gx / 100) * 300;
  // An item above the card shows on it where the line from the viewer through the item hits it.
  const view = viewDirection(posed(s, o.flip));

  const holo = HOLO_STRENGTH[card.foil];
  const holoBase = holo ? holo[0] + holo[1] * card.I : 0;
  const holoO = holoBase * (card.c.light ? 0.45 : 1) * (active ? 1 : 0.7) * (card.showFoil ? 1 : 0);
  const spO =
    SPARKLING.has(card.foil) && card.showFoil
      ? (0.3 + 0.6 * card.I) * (0.55 + 0.45 * Math.abs(Math.sin((ry + rx + spin) * RAD * 3)))
      : 0;
  const ga = GLARE[card.surface] * (active ? 1 : 0.55);

  const { depth } = card;
  const px = (n: number) => f1(n) + 'px';

  let transition = 'transform 700ms cubic-bezier(.2,.8,.2,1)';
  if (s.drag || s.coast || o.spinning || o.reducedMotion) transition = 'none';
  else if (active) transition = 'transform 120ms ease-out';

  return {
    transition,
    gx1: String(f1(shift - 230)),
    gx2: String(f1(shift + 230)),
    mx1: (gx / 100 - 0.75).toFixed(3),
    mx2: (gx / 100 + 0.75).toFixed(3),
    vars: {
      '--lift': lift + 'em',
      '--orient': cssRotation(s.orient ?? NO_TURN),
      '--rx': s.rx.toFixed(2) + 'deg',
      '--ry': rotY.toFixed(2) + 'deg',
      '--pfx': px(-sy * 14 * depth),
      '--pfy': px(sx * 14 * depth),
      '--pmx': px(-sy * MID_LAYER_DEPTH * depth),
      '--pmy': px(sx * MID_LAYER_DEPTH * depth),
      '--pbx': px(-sy * 5 * depth),
      '--pby': px(sx * 5 * depth),
      '--ifx': em(-view.x * ITEM_FLOAT_EM),
      '--ibx': em(view.x * ITEM_FLOAT_EM),
      '--ify': em(-view.y * ITEM_FLOAT_EM),
      '--hx': f1(gx) + '%',
      '--hy': f1(gy) + '%',
      '--gx': f1(gx) + '%',
      '--gy': f1(gy) + '%',
      '--bgx': f1(100 - gx) + '%',
      '--ga': ga.toFixed(3),
      '--holo-o': holoO.toFixed(3),
      '--sp-o': spO.toFixed(3),
      '--sp-pos':
        em(ry * 0.05 + spin * 0.02) + ' ' + em(-rx * 0.05) + ', ' +
        em(-ry * 0.03) + ' ' + em(rx * 0.04) + ', ' +
        em(ry * 0.08) + ' ' + em(rx * 0.02),
      '--shx': f1(Math.max(-1.2, Math.min(1.2, -sy * 1.2))) + 'em',
      '--shs': (1 - Math.min(0.45, Math.abs(sy) * 0.5)).toFixed(3),
      '--sho': String(card.shadow ? (active ? 0.85 : 0.65) : 0),
    },
  };
}

/** The values of a card lying still. CardFace and CardBack render with these. */
export function restingMotion(card: ResolvedCard): MotionOutput {
  return computeMotion(card, REST, { flip: false, mode: 'none', spinning: false, reducedMotion: false });
}
