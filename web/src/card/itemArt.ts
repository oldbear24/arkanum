import { C, DI, R, RR, S } from './geometry';
import type { ItemOrnament, ItemShape, ItemSymbol } from './spec';

// The drawings of the freely placed items. All of them are drawn for this project.
// Symbols sit on a 100 × 100 grid. Their paths use the even-odd rule, so a circle inside
// a shape cuts a hole into it.

export const SYMBOLS: Record<ItemSymbol, string> = {
  hvezda: S(50, 52, 5, 48, 19),
  hvezda8: S(50, 50, 8, 48, 18),
  mesic: 'M66 6A46 46 0 1 0 66 94A38 38 0 1 1 66 6Z',
  slunce: S(50, 50, 12, 48, 32) + C(50, 50, 22),
  oko: 'M3 50C20 22 34 14 50 14C66 14 80 22 97 50C80 78 66 86 50 86C34 86 20 78 3 50Z' + C(50, 50, 25) + C(50, 50, 13),
  srdce: 'M50 90C20 66 5 48 5 30C5 16 16 8 28 8C38 8 46 14 50 25C54 14 62 8 72 8C84 8 95 16 95 30C95 48 80 66 50 90Z',
  mec: 'M50 2L57 14V62H43V14ZM26 62H74V71H26ZM45 71H55V86H45Z' + C(50, 92, 7),
  pohar: 'M22 6H78C79 34 68 50 55 54V80H72V92H28V80H45V54C32 50 21 34 22 6Z',
  pentakl: C(50, 50, 48) + C(50, 50, 40) + S(50, 51, 5, 38, 15),
  koruna: 'M9 76L3 24L27 46L50 10L73 46L97 24L91 76ZM10 82H90V92H10Z',
  klic: C(50, 24, 22) + C(50, 24, 11) + 'M44 45H56V96H44ZM56 68H72V77H56ZM56 84H66V93H56Z',
  plamen: 'M52 3C60 25 84 40 84 66C84 85 68 97 50 97C32 97 16 85 16 66C16 52 26 42 33 30C35 41 40 46 46 48C43 33 44 18 52 3Z',
  kapka: 'M50 3C62 28 84 45 84 65A34 34 0 1 1 16 65C16 45 38 28 50 3Z',
  list: 'M12 90C5 44 38 8 92 8C95 58 60 92 22 88C34 66 48 50 66 34C46 46 28 64 18 92Z',
  blesk: 'M60 2L16 56H45L36 98L84 38H54Z',
  stit: 'M12 8H88V48C88 72 70 86 50 97C30 86 12 72 12 48Z',
};

export interface OrnamentArt {
  w: number;
  h: number;
  /** Lines. They need to reach out in both directions, a gradient cannot paint a flat box. */
  line?: string;
  fill?: string;
}

/** Two branches that rise from the bottom of a circle and nearly meet at its top. */
function laurel(): OrnamentArt {
  const point = (x: number, y: number) => x.toFixed(1) + ' ' + y.toFixed(1);
  let fill = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const angle = ((166 - i * 15) * Math.PI) / 180;
      const x = 60 + side * 46 * Math.sin(angle);
      const y = 60 - 46 * Math.cos(angle);
      // The direction up the branch, leaning outwards so that the leaves stand off it.
      const ux = -side * Math.cos(angle) + 0.5 * side * Math.sin(angle);
      const uy = -Math.sin(angle) - 0.5 * Math.cos(angle);
      const length = Math.hypot(ux, uy);
      const dx = (15 * ux) / length;
      const dy = (15 * uy) / length;
      fill +=
        'M' + point(x, y) +
        'Q' + point(x + dx / 2 - dy * 0.3, y + dy / 2 + dx * 0.3) + ' ' + point(x + dx, y + dy) +
        'Q' + point(x + dx / 2 + dy * 0.3, y + dy / 2 - dx * 0.3) + ' ' + point(x, y) + 'Z';
    }
  }
  return { w: 120, h: 120, line: 'M60 106A46 46 0 0 0 82.3 19.8M60 106A46 46 0 0 1 37.7 19.8', fill };
}

export const ORNAMENTS: Record<ItemOrnament, OrnamentArt> = {
  linka: {
    w: 200,
    h: 24,
    fill: 'M6 11H82V13H6ZM118 11H194V13H118Z' + DI(100, 12, 10) + DI(86, 12, 3.5) + DI(114, 12, 3.5) + DI(6, 12, 3) + DI(194, 12, 3),
  },
  vlnka: {
    w: 200,
    h: 44,
    line: 'M100 22C84 6 64 4 46 14C36 20 22 20 12 10M100 22C116 6 136 4 154 14C164 20 178 20 188 10M100 22C86 36 70 38 56 30M100 22C114 36 130 38 144 30',
    fill: DI(100, 22, 6) + C(12, 10, 2.6) + C(188, 10, 2.6) + C(56, 30, 2.2) + C(144, 30, 2.2),
  },
  roh: {
    w: 100,
    h: 100,
    line: 'M4 70C4 34 34 4 70 4M14 54C14 32 32 14 54 14M70 4C78 0 86 2 92 8M4 70C0 78 2 86 8 92M24 24C34 26 42 34 44 44',
    fill: C(10, 10, 3.4) + DI(95, 10, 4) + DI(10, 95, 4) + C(46, 46, 3) + DI(62, 14, 2.6) + DI(14, 62, 2.6),
  },
  vavrin: laurel(),
  paprsky: {
    w: 100,
    h: 100,
    line: R(50, 50, 24, 20, 48, 7.5, 38) + C(50, 50, 16),
    fill: C(50, 50, 7),
  },
  oblouk: {
    w: 200,
    h: 112,
    line: 'M6 108V100A94 92 0 0 1 194 100V108M20 108V100A80 78 0 0 1 180 100V108',
    fill: S(100, 26, 4, 8, 2.4) + DI(6, 108, 3) + DI(194, 108, 3) + DI(20, 108, 3) + DI(180, 108, 3),
  },
  hvezdy: {
    w: 200,
    h: 32,
    fill: S(100, 16, 5, 14, 5.6) + S(66, 16, 5, 10, 4) + S(134, 16, 5, 10, 4) + S(38, 16, 5, 7, 2.8) + S(162, 16, 5, 7, 2.8) + S(16, 16, 4, 5, 1.6) + S(184, 16, 4, 5, 1.6),
  },
  ramecek: {
    w: 100,
    h: 140,
    line: RR(3, 3, 94, 134, 7) + RR(9, 9, 82, 122, 3),
    fill: DI(50, 3, 3.4) + DI(50, 137, 3.4) + DI(3, 70, 3.4) + DI(97, 70, 3.4),
  },
};

function f(n: number) {
  return Math.round(n * 10) / 10;
}

/** A shape drawn for its real proportions, so that its outline keeps one width all round. */
export function shapePath(kind: string, height: number): string {
  const w = 100;
  const h = height;
  const shape = kind as ItemShape;
  switch (shape) {
    case 'ctverec':
      return `M0 0H${w}V${h}H0Z`;
    case 'zaobleny':
      return RR(0, 0, w, h, f(Math.min(w, h) * 0.16));
    case 'kosoctverec':
      return `M50 0L100 ${f(h / 2)}L50 ${h}L0 ${f(h / 2)}Z`;
    case 'sestiuhelnik':
      return `M50 0L100 ${f(h * 0.25)}V${f(h * 0.75)}L50 ${h}L0 ${f(h * 0.75)}V${f(h * 0.25)}Z`;
    case 'stit':
      return `M0 0H100V${f(h * 0.5)}C100 ${f(h * 0.74)} 72 ${f(h * 0.9)} 50 ${h}C28 ${f(h * 0.9)} 0 ${f(h * 0.74)} 0 ${f(h * 0.5)}Z`;
    case 'oblouk': {
      const top = Math.min(50, h);
      return `M0 ${h}V${top}A50 ${top} 0 0 1 100 ${top}V${h}Z`;
    }
    case 'kruh':
    default:
      return `M0 ${f(h / 2)}A50 ${f(h / 2)} 0 1 1 100 ${f(h / 2)}A50 ${f(h / 2)} 0 1 1 0 ${f(h / 2)}Z`;
  }
}
