import { C, DI, R, RR, S } from './paths';
import type { ItemOrnament, ItemShape, ItemSymbol } from './spec';

// The drawings of the freely placed items. All of them are drawn for this project.
// Symbols sit on a 100 × 100 grid. Their paths use the even-odd rule, so a circle inside
// a shape cuts a hole into it.

/** A rosette of petals around a hole. */
function rosette(): string {
  let d = C(50, 50, 9);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const point = (r: number, side: number) => (50 + r * Math.cos(a) - side * Math.sin(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a) + side * Math.cos(a)).toFixed(1);
    d += 'M' + point(14, 0) + 'C' + point(24, 16) + ' ' + point(44, 12) + ' ' + point(47, 0) + 'C' + point(44, -12) + ' ' + point(24, -16) + ' ' + point(14, 0) + 'Z';
  }
  return d;
}

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
  hul: C(50, 8, 7) + 'M44 16H56V98H44ZM56 26C68 16 78 18 86 26C78 36 66 38 56 34ZM44 46C32 36 22 38 14 46C22 56 34 58 44 54Z',
  uplnek: C(50, 50, 47) + C(50, 50, 36) + C(50, 50, 16),
  kniha: 'M47 26C38 15 22 12 5 16V84C22 80 38 83 47 93ZM53 26C62 15 78 12 95 16V84C78 80 62 83 53 93Z',
  presypaci: 'M16 3H84V13H78C78 33 64 42 56 50C64 58 78 67 78 87H84V97H16V87H22C22 67 36 58 44 50C36 42 22 33 22 13H16ZM33 13C33 27 44 37 50 42C56 37 67 27 67 13ZM50 60C44 65 35 74 33 87H67C65 74 56 65 50 60Z',
  miska: 'M47 8H53V19H47ZM47 26H53V84H47ZM26 84H74V93H26ZM10 19H90V26H10ZM4 56H38C38 68 30 73 21 73C12 73 4 68 4 56ZM62 56H96C96 68 88 73 79 73C70 73 62 68 62 56ZM19 26H23L36 56H32L21 32L10 56H6ZM77 26H81L94 56H90L79 32L68 56H64Z',
  kompas: C(50, 50, 48) + C(50, 50, 42) + S(50, 50, 4, 38, 7) + C(50, 50, 3),
  pirko: 'M86 4C54 8 26 30 22 62L10 94L18 97L30 72C60 70 84 44 86 4ZM34 60L72 18L38 64Z',
  motyl: 'M46 40C38 18 18 8 8 16C0 24 8 46 28 50C12 54 12 74 24 82C36 88 42 70 46 56ZM54 40C62 18 82 8 92 16C100 24 92 46 72 50C88 54 88 74 76 82C64 88 58 70 54 56ZM48 30H52V76H48Z',
  lebka: 'M50 5C26 5 9 23 9 46C9 60 17 70 28 75V92H72V75C83 70 91 60 91 46C91 23 74 5 50 5Z' + C(33, 47, 12) + C(67, 47, 12) + 'M50 60L57 72H43ZM39 80H44V92H39ZM56 80H61V92H56Z',
  kostka: RR(6, 6, 88, 88, 14) + C(29, 29, 8) + C(71, 29, 8) + C(50, 50, 8) + C(29, 71, 8) + C(71, 71, 8),
  ruze: rosette(),
  ouroboros: 'M24 4L54 11L34 28Z',
  ohen: '',
  voda: '',
  vzduch: '',
  zeme: '',
  beran: '',
  byk: '',
  blizenci: '',
  rak: '',
  lev: '',
  panna: '',
  vahy: '',
  stir: '',
  strelec: '',
  kozoroh: '',
  vodnar: '',
  ryby: '',
  merkur: '',
  venuse: '',
  mars: '',
  jupiter: '',
  saturn: '',
};

/** The signs are lines by nature, so these are drawn by a stroke and not filled. */
export const SYMBOL_LINES: Partial<Record<ItemSymbol, string>> = {
  ouroboros: 'M58 14A39 39 0 1 1 28 17',
  ohen: 'M50 10L92 86H8Z',
  voda: 'M8 14H92L50 90Z',
  vzduch: 'M50 10L92 86H8ZM20 56H80',
  zeme: 'M8 14H92L50 90ZM20 44H80',
  beran: 'M50 92V38C50 20 38 10 26 12C14 14 10 28 20 36M50 38C50 20 62 10 74 12C86 14 90 28 80 36',
  byk: C(50, 64, 26) + 'M14 8C20 30 34 38 50 38C66 38 80 30 86 8',
  blizenci: 'M18 10C38 20 62 20 82 10M18 90C38 80 62 80 82 90M36 18V82M64 18V82',
  rak: C(28, 36, 13) + 'M15 34C28 8 68 8 90 28' + C(72, 64, 13) + 'M85 66C72 92 32 92 10 72',
  lev: C(30, 56, 14) + 'M40 46C30 28 34 8 54 8C76 8 80 30 70 52C62 70 62 88 78 92C84 93 90 90 92 84',
  panna: 'M10 14C18 14 22 20 22 28V76M22 28C26 16 44 14 44 30V76M44 30C48 16 66 14 66 30V72C66 84 74 92 84 94M66 44C76 34 92 38 90 52C88 66 72 78 58 86',
  vahy: 'M10 88H90M10 68H34C26 60 24 50 26 42C30 26 40 20 50 20C60 20 70 26 74 42C76 50 74 60 66 68H90',
  stir: 'M8 14C16 14 20 20 20 28V76M20 28C24 16 42 14 42 30V76M42 30C46 16 64 14 64 30V78C64 88 72 92 92 86M80 74L92 86L78 94',
  strelec: 'M14 86L86 14M50 14H86V50M24 46L54 76',
  kozoroh: 'M10 14C20 14 26 22 26 32V70M26 34C32 18 52 16 54 34V68C54 82 46 92 34 92M54 62C60 50 84 50 86 66C88 82 68 88 56 72',
  vodnar: 'M8 42L24 28L40 42L56 28L72 42L92 28M8 72L24 58L40 72L56 58L72 72L92 58',
  ryby: 'M22 8C40 30 40 70 22 92M78 8C60 30 60 70 78 92M14 50H86',
  merkur: C(50, 46, 20) + 'M50 66V94M36 80H64M28 8C32 22 40 26 50 26C60 26 68 22 72 8',
  venuse: C(50, 34, 26) + 'M50 60V94M32 78H68',
  mars: C(40, 60, 28) + 'M60 40L90 10M64 10H90V36',
  jupiter: 'M14 30C16 14 34 8 44 18C54 30 44 54 18 64H88M66 14V92',
  saturn: 'M30 8V30M18 18H46M30 30C36 20 56 18 66 30C76 44 56 58 52 72C50 82 58 92 72 86',
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

/** A hanging branch with its leaves in pairs. */
function garland(): OrnamentArt {
  const point = (x: number, y: number) => x.toFixed(1) + ' ' + y.toFixed(1);
  let fill = '';
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const x = 8 + 184 * t;
    const y = 12 + 44 * t * (1 - t);
    for (const side of [-1, 1]) {
      const tipX = x + 7 * side;
      const tipY = y - 10 * side;
      fill += 'M' + point(x, y) + 'Q' + point(x + 6 * side, y - 2 * side) + ' ' + point(tipX, tipY) + 'Q' + point(x + 1 * side, y - 7 * side) + ' ' + point(x, y) + 'Z';
    }
  }
  return { w: 200, h: 44, line: 'M8 12Q100 56 192 12', fill };
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
  faze: {
    w: 200,
    h: 40,
    fill: 'M34 8A12 12 0 1 0 34 32A16 16 0 0 1 34 8Z' + 'M68 7A13 13 0 0 0 68 33Z' + C(100, 20, 15) + 'M132 7A13 13 0 0 1 132 33Z' + 'M166 8A12 12 0 1 1 166 32A16 16 0 0 0 166 8Z',
  },
  ruzice: {
    w: 100,
    h: 100,
    line: C(50, 50, 46) + C(50, 50, 39) + R(50, 50, 16, 39, 46, 0),
    fill: S(50, 50, 8, 34, 9),
  },
  svitek: {
    w: 200,
    h: 60,
    line: 'M30 10H170V46H30ZM30 10C20 4 8 6 6 16V52C8 44 20 42 30 46M170 10C180 4 192 6 194 16V52C192 44 180 42 170 46M6 16C14 12 22 14 30 22M194 16C186 12 178 14 170 22',
  },
  kridla: {
    w: 200,
    h: 70,
    line: 'M100 42C80 20 50 8 6 10C18 22 30 24 44 26C32 30 24 32 14 30C26 42 42 44 58 40C48 46 40 50 30 48C44 58 70 58 100 42ZM100 42C120 20 150 8 194 10C182 22 170 24 156 26C168 30 176 32 186 30C174 42 158 44 142 40C152 46 160 50 170 48C156 58 130 58 100 42Z',
    fill: DI(100, 46, 7),
  },
  girlanda: garland(),
  hrot: {
    w: 200,
    h: 24,
    fill: 'M6 12L30 5V10H90V14H30V19ZM194 12L170 5V10H110V14H170V19Z' + DI(100, 12, 7),
  },
  uzel: {
    w: 100,
    h: 100,
    line: 'M50 20C70 0 100 30 80 50C100 70 70 100 50 80C30 100 0 70 20 50C0 30 30 0 50 20Z' + C(50, 50, 15),
    fill: DI(50, 50, 5) + C(50, 12, 2.4) + C(50, 88, 2.4) + C(12, 50, 2.4) + C(88, 50, 2.4),
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
    case 'hvezda': {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1 : 0.42;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        d += (i ? 'L' : 'M') + f(50 + 50 * r * Math.cos(a)) + ' ' + f(h * (0.525 + 0.525 * r * Math.sin(a)));
      }
      return d + 'Z';
    }
    case 'trojuhelnik':
      return `M50 0L100 ${h}H0Z`;
    case 'osmiuhelnik':
      return `M30 0H70L100 ${f(h * 0.3)}V${f(h * 0.7)}L70 ${h}H30L0 ${f(h * 0.7)}V${f(h * 0.3)}Z`;
    case 'ctyrlist': {
      const r = f(h / 4);
      return `M25 ${r}A25 ${r} 0 0 1 75 ${r}A25 ${r} 0 0 1 75 ${f(h - r)}A25 ${r} 0 0 1 25 ${f(h - r)}A25 ${r} 0 0 1 25 ${r}Z`;
    }
    case 'stuha':
      return `M0 0H100L88 ${f(h / 2)}L100 ${h}H0L12 ${f(h / 2)}Z`;
    case 'plaketa': {
      const r = f(Math.min(14, h / 3));
      return `M${r} 0H${100 - r}A${r} ${r} 0 0 0 100 ${r}V${f(h - r)}A${r} ${r} 0 0 0 ${100 - r} ${h}H${r}A${r} ${r} 0 0 0 0 ${f(h - r)}V${r}A${r} ${r} 0 0 0 ${r} 0Z`;
    }
    case 'kruh':
    default:
      return `M0 ${f(h / 2)}A50 ${f(h / 2)} 0 1 1 100 ${f(h / 2)}A50 ${f(h / 2)} 0 1 1 0 ${f(h / 2)}Z`;
  }
}
