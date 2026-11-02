import type { Art, CardElement, Frame, Variant } from './spec';

// SVG paths of the frames, illustrations and backs, ported from design/Karta.dc.html.
// geometry.test.ts compares the output with the prototype path by path.

export interface FrameGeometry {
  win: string;
  border: string;
  border2: string;
  plaque: string;
  panel: string;
  acc: string;
  acc2: string;
  corner: string;
  cornerF: string;
  ornS: string;
  ornF: string;
  icoF: string;
  icoS: string;
  sicoF: string;
  sicoS: string;
  rarF: string;
  rarO: string;
}

export interface ArtGeometry {
  glow: string;
  under: string;
  fill: string;
  line: string;
  thin: string;
  dots: string;
  core: string;
  eyes: string;
}

export interface BackGeometry {
  line: string;
  thin: string;
  fill: string;
  dark: string;
}

export interface WindowBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardGeometry {
  g: FrameGeometry;
  a: ArtGeometry;
  b: BackGeometry;
  /** Bounding box of the illustration window, where uploaded artwork gets placed. */
  box: WindowBox;
}

const f = (n: number) => Math.round(n * 10) / 10;

const C = (cx: number, cy: number, r: number) =>
  'M' + f(cx - r) + ' ' + f(cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + f(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + f(-2 * r) + ' 0Z';

const S = (cx: number, cy: number, n: number, r1: number, r2: number, rot?: number) => {
  let d = '';
  const a0 = ((rot === undefined ? -90 : rot) * Math.PI) / 180;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = a0 + (i * Math.PI) / n;
    d += (i === 0 ? 'M' : 'L') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a));
  }
  return d + 'Z';
};

const R = (cx: number, cy: number, n: number, r1: number, r2: number, rot?: number, r3?: number) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (((rot || 0) + (i * 360) / n) * Math.PI) / 180;
    const re = r3 !== undefined && i % 2 === 1 ? r3 : r2;
    d += 'M' + f(cx + r1 * Math.cos(a)) + ' ' + f(cy + r1 * Math.sin(a)) + 'L' + f(cx + re * Math.cos(a)) + ' ' + f(cy + re * Math.sin(a));
  }
  return d;
};

const WR = (cx: number, cy: number, n: number, r1: number, r2: number, rot?: number) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (((rot || 0) + (i * 360) / n) * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const P = (r: number, o: number) => f(cx + ux * r - uy * o) + ' ' + f(cy + uy * r + ux * o);
    const m = (r2 - r1) / 3;
    d += 'M' + P(r1, 0) + 'C' + P(r1 + m, 4.5) + ' ' + P(r1 + 2 * m, -4.5) + ' ' + P(r2, 0);
  }
  return d;
};

const W = (x0: number, x1: number, y: number, amp: number, len: number) => {
  let d = 'M' + x0 + ' ' + y;
  for (let x = x0; x < x1; x += len) {
    d += 'q' + f(len / 4) + ' ' + -amp + ' ' + f(len / 2) + ' 0t' + f(len / 2) + ' 0';
  }
  return d;
};

const D = (x: number, y: number, s: number) =>
  'M' + x + ' ' + f(y - s * 1.5) + 'C' + f(x + s * 0.5) + ' ' + f(y - s * 0.5) + ' ' + f(x + s) + ' ' + f(y - s * 0.1) + ' ' + f(x + s) + ' ' + f(y + s * 0.3) +
  'A' + s + ' ' + s + ' 0 0 1 ' + f(x - s) + ' ' + f(y + s * 0.3) + 'C' + f(x - s) + ' ' + f(y - s * 0.1) + ' ' + f(x - s * 0.5) + ' ' + f(y - s * 0.5) + ' ' + x + ' ' + f(y - s * 1.5) + 'Z';

const RR = (x: number, y: number, w: number, h: number, r: number) =>
  'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) +
  'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) + 'V' + (y + r) +
  'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';

const HX = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    d += (i ? 'L' : 'M') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a));
  }
  return d + 'Z';
};

const DI = (cx: number, cy: number, r: number) => 'M' + cx + ' ' + (cy - r) + 'L' + (cx + r) + ' ' + cy + 'L' + cx + ' ' + (cy + r) + 'L' + (cx - r) + ' ' + cy + 'Z';

const dots = (list: [number, number][], r?: number) => list.map((q) => C(q[0], q[1], r || 0.9)).join('');

type PartialArt = Partial<ArtGeometry>;

const ART: Record<Art | 'oracle' | 'bestie' | 'hrdina', () => PartialArt> = {
  hvezda: () => ({
    glow: C(150, 176, 80),
    fill: S(150, 176, 8, 44, 13) + ([[82, 114], [222, 110], [62, 200], [240, 204], [98, 262], [204, 266], [150, 288]] as const).map((q) => S(q[0], q[1], 4, 8, 2.3)).join(''),
    line: C(150, 176, 50) + 'M14 322Q92 300 150 310T290 300M228 304C227 296 228 290 230 282M229 293Q219 285 214 289Q221 295 229 293ZM229 287Q238 277 244 281Q238 289 229 287Z',
    thin: R(150, 176, 16, 58, 94, 11.25, 78) + W(10, 292, 340, 3, 24) + W(16, 292, 356, 2.6, 22) + W(10, 292, 372, 2.2, 20) + W(18, 292, 388, 1.8, 18) + W(10, 292, 404, 1.4, 16),
    dots: dots([[60, 92], [110, 88], [196, 86], [248, 98], [46, 150], [256, 150], [120, 228], [184, 232], [72, 250], [236, 250], [52, 284], [262, 280], [128, 122], [178, 124], [90, 160], [214, 160]]),
  }),
  mesic: () => ({
    glow: C(150, 170, 78),
    fill: 'M150 126A44 44 0 0 0 150 214A56 56 0 0 1 150 126Z' + D(100, 238, 4) + D(200, 234, 4) + D(124, 260, 3.4) + D(176, 262, 3.4) + D(150, 248, 4.4),
    line: 'M48 330V252h7v-7h7v7h7v-7h7v7h7v-7h7v7V330M210 330V252h7v-7h7v7h7v-7h7v7h7v-7h7v7V330M136 420C128 398 170 386 156 364C146 348 160 332 152 314M166 420C160 398 188 386 170 364C160 348 168 332 158 314',
    thin: C(150, 170, 44) + R(150, 170, 24, 52, 64, 7.5, 58) + 'M10 314Q150 300 290 314M65 268h8v14h-8ZM227 268h8v14h-8Z' + W(10, 292, 394, 2.4, 22) + W(16, 292, 406, 2, 20) + W(10, 292, 418, 1.6, 18),
    dots: dots([[62, 94], [238, 96], [48, 150], [254, 146], [92, 120], [208, 118], [70, 210], [232, 206], [118, 296], [186, 292]]),
  }),
  slunce: () => ({
    glow: C(150, 178, 86),
    fill: C(150, 178, 30) + C(82, 302, 5.5) + C(150, 296, 6) + C(218, 302, 5.5),
    line: C(150, 178, 40) + R(150, 178, 16, 48, 88, 0) + 'M10 318H290M10 342H290' + S(82, 302, 12, 14, 8.5) + S(150, 296, 12, 15, 9) + S(218, 302, 12, 14, 8.5),
    thin: WR(150, 178, 16, 48, 78, 11.25) + 'M10 330H290M54 318V330M94 318V330M134 318V330M174 318V330M214 318V330M254 318V330M34 330V342M74 330V342M114 330V342M154 330V342M194 330V342M234 330V342M274 330V342' + W(10, 292, 364, 2, 22) + W(16, 292, 380, 1.8, 20) + W(10, 292, 396, 1.6, 18) + W(16, 292, 412, 1.4, 16),
    dots: dots([[58, 96], [242, 96], [46, 250], [256, 250], [90, 262], [212, 262]]),
  }),
  mag: () => ({
    glow: C(150, 150, 74),
    fill: C(150, 131, 4.5) + C(150, 252, 4) + C(210, 259, 2.2) + S(126, 282, 5, 8, 3.2),
    line: 'M150 96C140 84 118 84 118 96C118 108 140 108 150 96C160 84 182 84 182 96C182 108 160 108 150 96ZM150 136V248M54 294H246V302H54ZM64 302V344M236 302V344M80 266H100Q100 280 90 283Q80 280 80 266ZM90 283V292M83 292H97M172 258V292M164 285H180M210 261V292M210 270L204 265M210 279L216 274' + C(126, 282, 10),
    thin: R(150, 131, 12, 10, 28, 0, 20) + [66, 100, 134, 168, 202, 236].map((x) => C(x, 386, 7) + C(x, 386, 3) + 'M' + (x - 14) + ' 400Q' + (x - 7) + ' 392 ' + x + ' 400').join('') + W(10, 292, 414, 1.6, 18),
    dots: dots([[60, 100], [240, 100], [48, 170], [252, 170], [86, 220], [214, 220], [110, 150], [190, 150]]),
  }),
  oracle: () => ({
    glow: C(150, 262, 70),
    fill: 'M150 92A16 16 0 0 0 150 124A20 20 0 0 1 150 92ZM150 336C160 336 164 344 162 350C158 358 142 358 138 350C136 344 140 336 150 336Z' + C(150, 258, 4),
    line: 'M40 318H260M150 336C150 312 150 290 150 264M150 292C136 282 122 284 116 292C126 300 140 300 150 292ZM150 278C164 268 178 270 184 278C174 286 160 286 150 278Z',
    thin: C(150, 300, 42) + C(150, 300, 66) + C(150, 300, 90) + 'M150 356C146 370 140 378 132 388M150 356C154 372 162 380 170 392M150 356V398',
    dots: dots([[70, 110], [230, 104], [96, 150], [206, 146], [60, 200], [242, 196]]),
  }),
  bestie: () => ({
    glow: C(152, 136, 74),
    under: 'M54 174C58.5 174 58.5 190 54 190C49.5 190 49.5 174 54 174ZM236 176C240.5 176 240.5 192 236 192C231.5 192 231.5 176 236 176Z',
    fill: 'M150 88C176 108 186 134 176 154C168 170 140 174 129 161C116 146 122 124 137 111C143 105 148 99 150 88Z',
    line: 'M131 163C111 181 95 175 83 189C75 199 81 211 93 209M46 236Q48 210 54 190M58 236Q58 216 64 202M246 236Q242 212 236 192M258 236Q258 218 262 204',
    thin: 'M10 196C70 186 110 204 150 196S230 186 290 196' + W(10, 292, 210, 1.6, 18) + 'M60 222H96M120 228H170M196 220H238',
    dots: dots([[98, 108], [206, 96], [222, 150], [80, 140], [190, 186], [116, 198], [240, 120]], 1.7),
    core: C(152, 141, 12.5),
    eyes: C(146.5, 141, 2.3) + C(158.5, 141, 2.3),
  }),
  hrdina: () => ({
    glow: C(150, 168, 80),
    under: 'M95 231L203 93L206 90L205 96L99 234ZM96 212L115 228M97 233L89 243M205 231L97 93L94 90L95 96L201 234ZM204 212L185 228M203 233L211 243' + C(87, 245, 3) + C(213, 245, 3),
    fill: 'M124 134H176V168C176 192 162 204 150 212C138 204 124 192 124 168Z',
    line: 'M124 134H176V168C176 192 162 204 150 212C138 204 124 192 124 168Z' + C(150, 154, 7) + 'M150 161V192M150 178H158M150 186H156',
    thin: 'M58 250V156A92 92 0 0 1 242 156V250M78 250V162A72 72 0 0 1 222 162V250M100 112V250M120 98V250M140 92V250M160 92V250M180 98V250M200 112V250M82 140H218M78 196H222M78 226H222',
    dots: dots([[60, 96], [240, 92], [44, 160], [256, 156], [70, 214], [232, 210]], 1.3),
  }),
};

export const WIN: Record<Frame, string> = {
  secese: 'M34 420L34 190A116 116 0 0 1 266 190L266 420Z',
  gotika: 'M34 420L34 232A170 170 0 0 1 150 70.8A170 170 0 0 1 266 232L266 420Z',
  deco: 'M34 420L34 96L46 96L46 84L58 84L58 72L242 72L242 84L254 84L254 96L266 96L266 420Z',
  minimal: 'M34 420L34 72L266 72L266 420Z',
};

const PLQ: Record<Frame, string> = {
  secese: 'M58 438H242L256 457L242 476H58L44 457Z',
  gotika: 'M64 438H236Q258 457 236 476H64Q42 457 64 438Z',
  deco: 'M50 438H250V476H50Z',
  minimal: 'M84 474H216',
};

const CRN: Record<Frame, [string, string]> = {
  secese: ['M24 74C24 46 46 24 74 24M32 56C32 42 42 32 56 32C50 36 44 42 42 50M74 24C82 18 90 20 94 26M24 74C18 82 20 90 26 94', C(31, 31, 2.4) + 'M94 26Q100 22 104 27Q99 31 94 26ZM26 94Q22 100 27 104Q31 99 26 94Z'],
  gotika: ['M24 70Q24 24 70 24M24 50Q24 24 50 24', C(37, 37, 3.2) + C(46, 31, 2) + C(31, 46, 2)],
  deco: ['M24 64V24H64M30 54V30H54M36 44V36H44', 'M24 24H30V30H24Z'],
  minimal: ['M24 44V24H44', ''],
};

const ORS: Record<Frame, string> = {
  secese: 'M60 44H94M206 44H240',
  gotika: 'M64 44Q80 37 95 44M205 44Q220 37 236 44',
  deco: 'M54 40H95M58 48H95M205 40H246M205 48H242',
  minimal: '',
};

const ORF: Record<Frame, string> = {
  secese: DI(102, 44, 3.4) + DI(198, 44, 3.4) + C(54, 44, 1.6) + C(246, 44, 1.6),
  gotika: DI(102, 44, 3.4) + DI(198, 44, 3.4),
  deco: DI(102, 44, 3.4) + DI(198, 44, 3.4),
  minimal: '',
};

const ICO: Record<CardElement, [string, string]> = {
  mlha: ['', W(142, 157, 26.5, 1.5, 5) + W(142, 157, 32, 1.5, 5) + W(142, 157, 37.5, 1.5, 5)],
  ohen: ['M150 21C156 27 159 31 157 36C156 40 152 43 150 43C146 43 142 40 143 35C144 32 146 31 147 27C149 30 150 32 150 34C152 30 152 26 150 21Z', ''],
  les: ['M141 41C141 29 149 22 159 23C160 33 152 41 141 41Z', ''],
  blesk: ['M152 20L142 34H149L146 44L157 29H150Z', ''],
  stin: ['M154 23A9 9 0 0 0 154 41A12 12 0 0 1 154 23Z', ''],
};

const emptyFrame = (): FrameGeometry => ({
  win: '', border: '', border2: '', plaque: '', panel: '', acc: '', acc2: '', corner: '', cornerF: '', ornS: '', ornF: '', icoF: '', icoS: '', sicoF: '', sicoS: '', rarF: '', rarO: '',
});

const withEmptyArt = (a: PartialArt): ArtGeometry => ({ glow: '', under: '', fill: '', line: '', thin: '', dots: '', core: '', eyes: '', ...a });

/** Window bounding boxes for placing uploaded artwork. The arch tops come from WIN. */
const WINDOW_BOX: Record<'tarot' | 'bestie' | 'hrdina', WindowBox> = {
  tarot: { x: 34, y: 70, w: 232, h: 350 },
  bestie: { x: 22, y: 52, w: 256, h: 184 },
  hrdina: { x: 22, y: 70, w: 256, h: 180 },
};

export function buildGeometry(variant: Variant, frame: Frame, art: Art, element: CardElement, rarity: number, radius: number, blankHeight = 514): CardGeometry {
  if (variant === 'prazdna') return buildBlank(blankHeight, radius);

  const tcg = variant === 'bestie' || variant === 'hrdina';
  const br = Math.max(3, radius - 6);
  const br2 = Math.max(2, radius - 10);
  const g = emptyFrame();
  const backTcg: BackGeometry = {
    line: RR(8, 8, 284, 403, br) + RR(16, 16, 268, 387, br2) + C(150, 190, 58) + C(150, 190, 66),
    thin: R(150, 190, 32, 72, 86, 0) + C(150, 190, 94) + RR(26, 26, 248, 367, 4),
    fill: S(150, 190, 8, 46, 18) + DI(40, 40, 5) + DI(260, 40, 5) + DI(40, 379, 5) + DI(260, 379, 5),
    dark: C(150, 190, 9),
  };

  let a: PartialArt;
  let b: BackGeometry;
  let box: WindowBox;

  if (!tcg) {
    g.win = WIN[frame];
    g.border = RR(12, 12, 276, 490, br);
    g.border2 = RR(18, 18, 264, 478, br2);
    g.plaque = variant === 'orakulum' ? '' : PLQ[frame];
    g.corner = CRN[frame][0];
    g.cornerF = CRN[frame][1];
    if (variant === 'orakulum') {
      g.ornS = 'M98 466H140M160 466H202M126 44H140M160 44H174';
      g.ornF = S(150, 44, 4, 6.5, 2) + DI(150, 466, 3);
    } else {
      g.ornS = ORS[frame];
      g.ornF = ORF[frame];
    }
    a = variant === 'orakulum' ? ART.oracle() : ART[art]();
    let ring = '';
    for (let i = 0; i < 12; i++) {
      const an = ((15 + i * 30) * Math.PI) / 180;
      ring += S(150 + 78 * Math.cos(an), 257 + 78 * Math.sin(an), 4, 5, 1.6);
    }
    b = {
      line: RR(12, 12, 276, 490, br) + RR(18, 18, 264, 478, br2) + C(150, 257, 64) + C(150, 257, 104),
      thin: RR(30, 30, 240, 454, 3) + C(150, 257, 36) + C(150, 257, 92) + R(150, 257, 24, 18, 30, 0, 25) + R(150, 257, 12, 108, 124, 15) + R(150, 257, 12, 68, 88, 0),
      fill: C(150, 257, 11) + ring + 'M136 128A14 14 0 0 0 164 128A18 18 0 0 1 136 128ZM136 386A14 14 0 0 1 164 386A18 18 0 0 0 136 386Z' + S(44, 44, 4, 8, 2.4) + S(256, 44, 4, 8, 2.4) + S(44, 470, 4, 8, 2.4) + S(256, 470, 4, 8, 2.4),
      dark: '',
    };
    box = WINDOW_BOX.tarot;
  } else if (variant === 'bestie') {
    g.win = 'M34 52H266L278 64V224L266 236H34L22 224V64Z';
    g.border = RR(8, 8, 284, 403, br);
    g.border2 = RR(14, 14, 272, 391, br2);
    g.plaque = 'M40 226H260L270 242L260 258H40L30 242Z';
    g.panel = RR(22, 280, 256, 80, 6);
    g.acc = C(150, 32, 16) + DI(254, 300, 11) + DI(254, 340, 11);
    g.acc2 = RR(34, 368, 70, 22, 11) + RR(115, 368, 70, 22, 11) + RR(196, 368, 70, 22, 11);
    g.corner = 'M18 36V18H36';
    g.ornS = 'M84 32H130M170 32H216M34 320H266';
    g.icoF = ICO[element][0];
    g.icoS = ICO[element][1];
    g.sicoF = 'M50 384C44.5 380 44 375.5 46.5 374.5C48.2 373.8 49.4 375 50 376.2C50.6 375 51.8 373.8 53.5 374.5C56 375.5 55.5 380 50 384Z';
    g.sicoS = 'M127 383L136 374M127 379L131 383M125.5 384.5L127 383M207 373.5H217V378.5C217 381.5 214.5 383.5 212 384.5C209.5 383.5 207 381.5 207 378.5Z';
    let rf = '';
    let ro = '';
    for (let i = 0; i < 5; i++) {
      const stp = S(222 + i * 10, 32, 5, 4.4, 1.8);
      if (i < rarity) rf += stp;
      else ro += stp;
    }
    g.rarF = rf;
    g.rarO = ro;
    a = ART.bestie();
    b = backTcg;
    box = WINDOW_BOX.bestie;
  } else {
    g.win = 'M30 70H270L278 78V242L270 250H30L22 242V78Z';
    g.border = RR(8, 8, 284, 403, br);
    g.border2 = RR(14, 14, 272, 391, br2);
    g.plaque = 'M22 24H222L230 38.5L222 53H22Z';
    g.panel = RR(22, 262, 256, 94, 4);
    g.acc = HX(256, 38, 17);
    g.acc2 = HX(100, 382, 15) + HX(150, 382, 15) + HX(200, 382, 15);
    g.corner = 'M18 36V18H36';
    a = ART.hrdina();
    b = backTcg;
    box = WINDOW_BOX.hrdina;
  }

  return { g, a: withEmptyArt(a), b, box };
}

/** Geometry of the blank card, not part of the prototype. It adapts to any aspect ratio. */
function buildBlank(H: number, radius: number): CardGeometry {
  const br = Math.max(3, radius - 6);
  const br2 = Math.max(2, radius - 10);
  const m1 = Math.min(12, H * 0.06);
  const m2 = m1 + Math.min(6, H * 0.03);
  const m3 = Math.min(30, H * 0.14);
  const m4 = m3 + Math.min(4, H * 0.02);
  const band = Math.max(20, Math.min(56, H * 0.16));
  const box: WindowBox = { x: m4, y: m4, w: 300 - 2 * m4, h: Math.max(4, H - 2 * m4 - band) };
  const cy = f(box.y + box.h / 2);
  const reach = Math.min(58, box.h * 0.42);
  const cx = 150;

  const g = emptyFrame();
  g.win = 'M' + f(box.x) + ' ' + f(box.y) + 'H' + f(box.x + box.w) + 'V' + f(box.y + box.h) + 'H' + f(box.x) + 'Z';
  g.border = RR(f(m1), f(m1), f(300 - 2 * m1), f(H - 2 * m1), br);
  g.border2 = RR(f(m2), f(m2), f(300 - 2 * m2), f(H - 2 * m2), br2);

  const backCy = f(H / 2);
  const backReach = Math.min(64, H * 0.3);
  const b: BackGeometry = {
    line: RR(f(m1), f(m1), f(300 - 2 * m1), f(H - 2 * m1), br) + RR(f(m2), f(m2), f(300 - 2 * m2), f(H - 2 * m2), br2) + C(cx, backCy, f(backReach)) + C(cx, backCy, f(backReach * 1.15)),
    thin: R(cx, backCy, 32, f(backReach * 1.25), f(backReach * 1.5), 0),
    fill: S(cx, backCy, 8, f(backReach * 0.8), f(backReach * 0.3)),
    dark: C(cx, backCy, f(backReach * 0.15)),
  };

  return {
    g,
    a: withEmptyArt({ glow: C(cx, cy, f(reach * 1.4)) }),
    b,
    box,
  };
}
