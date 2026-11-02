import type { ResolvedCard } from './resolve';

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
  transition: string;
}

const f1 = (n: number) => Math.round(n * 10) / 10;
const em = (n: number) => n.toFixed(3) + 'em';
const RAD = Math.PI / 180;

const MID_LAYER_DEPTH = 9.5;

export function computeMotion(card: ResolvedCard, s: Readonly<MotionState>, o: MotionOptions): MotionOutput {
  const active = s.active || s.drag;
  const sy = Math.sin((s.ry + s.spin) * RAD);
  const sx = Math.sin(s.rx * RAD);
  const gx = active ? s.gx : Math.max(0, Math.min(100, card.light + 35 * sy));
  const gy = active ? s.gy : 24;
  const rotY = s.ry + s.spin + (o.flip ? 180 : 0);
  const lift = active && o.mode === 'tilt' ? 0.7 : 0;
  const shift = (gx / 100) * 300;

  const holoBase = card.foil === 'duha' ? 0.16 + 0.44 * card.I : card.foil === 'kosmos' ? 0.08 + 0.22 * card.I : 0;
  const holoO = holoBase * (card.c.light ? 0.45 : 1) * (active ? 1 : 0.7) * (card.showFoil ? 1 : 0);
  const spO =
    card.foil === 'kosmos' && card.showFoil
      ? (0.3 + 0.6 * card.I) * (0.55 + 0.45 * Math.abs(Math.sin((s.ry + s.rx + s.spin) * RAD * 3)))
      : 0;
  const ga = (card.surface === 'mat' ? 0.14 : card.surface === 'lesk' ? 0.62 : 0.34) * (active ? 1 : 0.55);

  const { depth } = card;
  const px = (n: number) => f1(n) + 'px';

  let transition = 'transform 700ms cubic-bezier(.2,.8,.2,1)';
  if (s.drag || o.spinning || o.reducedMotion) transition = 'none';
  else if (active) transition = 'transform 120ms ease-out';

  return {
    transition,
    gx1: String(f1(shift - 230)),
    gx2: String(f1(shift + 230)),
    vars: {
      '--lift': lift + 'em',
      '--rx': s.rx.toFixed(2) + 'deg',
      '--ry': rotY.toFixed(2) + 'deg',
      '--pfx': px(-sy * 14 * depth),
      '--pfy': px(sx * 14 * depth),
      '--pmx': px(-sy * MID_LAYER_DEPTH * depth),
      '--pmy': px(sx * MID_LAYER_DEPTH * depth),
      '--pbx': px(-sy * 5 * depth),
      '--pby': px(sx * 5 * depth),
      '--hx': f1(gx) + '%',
      '--hy': f1(gy) + '%',
      '--gx': f1(gx) + '%',
      '--gy': f1(gy) + '%',
      '--bgx': f1(100 - gx) + '%',
      '--ga': ga.toFixed(3),
      '--holo-o': holoO.toFixed(3),
      '--sp-o': spO.toFixed(3),
      '--sp-pos':
        em(s.ry * 0.05 + s.spin * 0.02) + ' ' + em(-s.rx * 0.05) + ', ' +
        em(-s.ry * 0.03) + ' ' + em(s.rx * 0.04) + ', ' +
        em(s.ry * 0.08) + ' ' + em(s.rx * 0.02),
      '--shx': f1(Math.max(-1.2, Math.min(1.2, -sy * 1.2))) + 'em',
      '--shs': (1 - Math.min(0.45, Math.abs(Math.sin(rotY * RAD)) * 0.5)).toFixed(3),
      '--sho': String(card.shadow ? (active ? 0.85 : 0.65) : 0),
    },
  };
}

/** The values of a card lying still. CardFace and CardBack render with these. */
export function restingMotion(card: ResolvedCard): MotionOutput {
  return computeMotion(card, REST, { flip: false, mode: 'none', spinning: false, reducedMotion: false });
}
