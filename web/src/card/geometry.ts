import { BEAST_ART, HERO_ART, skyPaths, TAROT_ART, type SkyPaths } from './extraArt';
import { C, D, DI, dots, f, HX, R, RR, S, W, WR } from './paths';
import type { Art, BackPattern, CardElement, Figure, FigureBestie, FigureHrdina, Frame, SkyPattern, Variant } from './spec';

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
  /** The pattern on the background of the illustration, over the whole card. */
  sky: SkyPaths;
}

type PartialArt = Partial<ArtGeometry>;

const ART: Record<Art | 'oracle' | 'bestie' | 'hrdina', () => PartialArt> = {
  ...TAROT_ART,
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
  baroko: 'M34 420L34 152C34 124 54 114 78 106C108 96 134 88 150 68C166 88 192 96 222 106C246 114 266 124 266 152L266 420Z',
  vitraz: 'M34 420L34 204C34 172 44 152 62 142C62 110 84 92 112 92C120 78 134 70 150 70C166 70 180 78 188 92C216 92 238 110 238 142C256 152 266 172 266 204L266 420Z',
  luna: 'M34 420L34 132C34 98 60 72 92 72C108 72 122 78 132 90C138 98 144 102 150 102C156 102 162 98 168 90C178 78 192 72 208 72C240 72 266 98 266 132L266 420Z',
  keltsky: 'M34 420L34 110Q34 72 72 72L228 72Q266 72 266 110L266 420Z',
};

const PLQ: Record<Frame, string> = {
  secese: 'M58 438H242L256 457L242 476H58L44 457Z',
  gotika: 'M64 438H236Q258 457 236 476H64Q42 457 64 438Z',
  deco: 'M50 438H250V476H50Z',
  minimal: 'M84 474H216',
  baroko: 'M64 438H236C248 438 256 446 262 457C256 468 248 476 236 476H64C52 476 44 468 38 457C44 446 52 438 64 438Z',
  vitraz: 'M56 438H244L256 450V464L244 476H56L44 464V450Z',
  luna: 'M70 438H230A19 19 0 0 1 230 476H70A19 19 0 0 1 70 438Z',
  keltsky: 'M62 438Q150 430 238 438Q258 457 238 476Q150 484 62 476Q42 457 62 438Z',
};

const CRN: Record<Frame, [string, string]> = {
  secese: ['M24 74C24 46 46 24 74 24M32 56C32 42 42 32 56 32C50 36 44 42 42 50M74 24C82 18 90 20 94 26M24 74C18 82 20 90 26 94', C(31, 31, 2.4) + 'M94 26Q100 22 104 27Q99 31 94 26ZM26 94Q22 100 27 104Q31 99 26 94Z'],
  gotika: ['M24 70Q24 24 70 24M24 50Q24 24 50 24', C(37, 37, 3.2) + C(46, 31, 2) + C(31, 46, 2)],
  deco: ['M24 64V24H64M30 54V30H54M36 44V36H44', 'M24 24H30V30H24Z'],
  minimal: ['M24 44V24H44', ''],
  baroko: ['M24 82C24 50 50 24 82 24M24 82C30 74 38 72 44 76C48 80 46 86 40 86M82 24C74 30 72 38 76 44C80 48 86 46 86 40M34 34C44 38 50 46 52 56', C(34, 34, 2.6) + C(40, 86, 1.6) + C(86, 40, 1.6)],
  vitraz: ['M24 62V24H62M24 46H46V24', C(35, 35, 4.4) + DI(62, 24, 2.6) + DI(24, 62, 2.6)],
  luna: ['M24 66C24 42 42 24 66 24', 'M34 30A12 12 0 1 0 50 46A9.6 9.6 0 1 1 34 30Z' + C(66, 24, 1.8) + C(24, 66, 1.8)],
  keltsky: ['M24 74V44A20 20 0 0 1 44 24H74M24 52H34M52 24V34' + C(44, 44, 10), C(44, 44, 3.2) + DI(74, 24, 2.6) + DI(24, 74, 2.6)],
};

const ORS: Record<Frame, string> = {
  secese: 'M60 44H94M206 44H240',
  gotika: 'M64 44Q80 37 95 44M205 44Q220 37 236 44',
  deco: 'M54 40H95M58 48H95M205 40H246M205 48H242',
  minimal: '',
  baroko: 'M58 44C68 37 82 37 94 44M206 44C218 37 232 37 242 44',
  vitraz: 'M58 40H95M58 48H95M205 40H242M205 48H242',
  luna: 'M62 44H96M204 44H238',
  keltsky: 'M60 44C70 36 76 52 86 44C90 41 92 42 95 44M205 44C208 42 210 41 214 44C224 52 230 36 240 44',
};

const ORF: Record<Frame, string> = {
  secese: DI(102, 44, 3.4) + DI(198, 44, 3.4) + C(54, 44, 1.6) + C(246, 44, 1.6),
  gotika: DI(102, 44, 3.4) + DI(198, 44, 3.4),
  deco: DI(102, 44, 3.4) + DI(198, 44, 3.4),
  minimal: '',
  baroko: DI(102, 44, 3.4) + DI(198, 44, 3.4) + C(52, 44, 1.6) + C(248, 44, 1.6),
  vitraz: C(102, 44, 3) + C(198, 44, 3),
  luna: 'M106 36A8 8 0 1 0 106 52A10 10 0 0 1 106 36Z' + 'M194 36A8 8 0 1 1 194 52A10 10 0 0 0 194 36Z' + C(150, 84, 8.5),
  keltsky: DI(102, 44, 3.4) + DI(198, 44, 3.4),
};

const ICO: Record<CardElement, [string, string]> = {
  mlha: ['', W(142, 157, 26.5, 1.5, 5) + W(142, 157, 32, 1.5, 5) + W(142, 157, 37.5, 1.5, 5)],
  ohen: ['M150 21C156 27 159 31 157 36C156 40 152 43 150 43C146 43 142 40 143 35C144 32 146 31 147 27C149 30 150 32 150 34C152 30 152 26 150 21Z', ''],
  les: ['M141 41C141 29 149 22 159 23C160 33 152 41 141 41Z', ''],
  blesk: ['M152 20L142 34H149L146 44L157 29H150Z', ''],
  stin: ['M154 23A9 9 0 0 0 154 41A12 12 0 0 1 154 23Z', ''],
  voda: [D(150, 33, 7), ''],
  led: ['', R(150, 32, 6, 0, 11, 30) + R(150, 32, 6, 6, 9, 0)],
  zeme: ['M139 41L147 25L152 34L155 29L162 41Z', ''],
  svetlo: [C(150, 32, 5), R(150, 32, 8, 8, 12, 0)],
  jed: ['M147 21H153V27L159 38C160 41 158 43 155 43H145C142 43 140 41 141 38L147 27Z', ''],
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

export function buildGeometry(variant: Variant, frame: Frame, art: Art, element: CardElement, rarity: number, radius: number, blankHeight = 514, backPattern: BackPattern = 'mandala', figure: Figure | '' = '', skyPattern: SkyPattern = 'zadny'): CardGeometry {
  const geometry = variant === 'prazdna' ? buildBlank(blankHeight, radius) : buildFixed(variant, frame, art, element, rarity, radius, figure);
  const H = variant === 'prazdna' ? blankHeight : variant === 'bestie' || variant === 'hrdina' ? 419 : 514;
  const sky = skyPaths(skyPattern, H);
  if (backPattern === 'mandala') return { ...geometry, sky };
  return { ...geometry, sky, b: buildBack(backPattern, H, radius) };
}

function buildFixed(variant: Variant, frame: Frame, art: Art, element: CardElement, rarity: number, radius: number, figure: Figure | ''): Omit<CardGeometry, 'sky'> {
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
    a = variant === 'orakulum' ? (figure ? ART[figure as Art]() : ART.oracle()) : ART[art]();
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
    a = figure ? BEAST_ART[figure as FigureBestie]() : ART.bestie();
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
    a = figure ? HERO_ART[figure as FigureHrdina]() : ART.hrdina();
    b = backTcg;
    box = WINDOW_BOX.hrdina;
  }

  return { g, a: withEmptyArt(a), b, box };
}

/**
 * The other backs of a card, not part of the prototype. All of them read the same when
 * turned upside down, so that the back of a tarot card gives nothing away.
 */
function buildBack(pattern: Exclude<BackPattern, 'mandala'>, H: number, radius: number): BackGeometry {
  const br = Math.max(3, radius - 6);
  const br2 = Math.max(2, radius - 10);
  const m1 = f(Math.min(12, H * 0.06));
  const m2 = f(m1 + Math.min(6, H * 0.03));
  const border = RR(m1, m1, f(300 - 2 * m1), f(H - 2 * m1), br) + RR(m2, m2, f(300 - 2 * m2), f(H - 2 * m2), br2);
  const cx = 150;
  const cy = f(H / 2);
  const reach = Math.min(100, H * 0.28);

  if (pattern === 'prazdny') return { line: border, thin: '', fill: '', dark: '' };

  if (pattern === 'slunce') {
    return {
      line: border + C(cx, cy, f(reach * 0.46)),
      thin: R(cx, cy, 32, f(reach * 0.56), f(reach), 0, f(reach * 0.78)) + C(cx, cy, f(reach * 1.1)),
      fill: S(cx, cy, 16, f(reach * 0.4), f(reach * 0.24)) + S(44, 44, 4, 8, 2.4) + S(256, 44, 4, 8, 2.4) + S(44, f(H - 44), 4, 8, 2.4) + S(256, f(H - 44), 4, 8, 2.4),
      dark: C(cx, cy, f(reach * 0.12)),
    };
  }

  const corners = S(44, 44, 4, 8, 2.4) + S(256, 44, 4, 8, 2.4) + S(44, f(H - 44), 4, 8, 2.4) + S(256, f(H - 44), 4, 8, 2.4);

  if (pattern === 'ruzice') {
    let thin = '';
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const tipX = cx + reach * Math.cos(a);
      const tipY = cy + reach * Math.sin(a);
      const midX = cx + (reach / 2) * Math.cos(a);
      const midY = cy + (reach / 2) * Math.sin(a);
      const nx = -Math.sin(a) * reach * 0.2;
      const ny = Math.cos(a) * reach * 0.2;
      thin += 'M' + cx + ' ' + cy + 'Q' + f(midX + nx) + ' ' + f(midY + ny) + ' ' + f(tipX) + ' ' + f(tipY) + 'Q' + f(midX - nx) + ' ' + f(midY - ny) + ' ' + cx + ' ' + cy + 'Z';
    }
    return {
      line: border + C(cx, cy, f(reach * 1.08)) + C(cx, cy, f(reach * 0.24)),
      thin,
      fill: S(cx, cy, 8, f(reach * 0.2), f(reach * 0.08)) + corners,
      dark: C(cx, cy, f(reach * 0.05)),
    };
  }

  if (pattern === 'mesice') {
    // Horns up above the middle and horns down below it, so that it turns over into itself.
    const up = (y: number, r: number) => 'M' + f(cx - r) + ' ' + f(y) + 'A' + r + ' ' + r + ' 0 0 0 ' + f(cx + r) + ' ' + f(y) + 'A' + f(r * 1.35) + ' ' + f(r * 1.35) + ' 0 0 1 ' + f(cx - r) + ' ' + f(y) + 'Z';
    const down = (y: number, r: number) => 'M' + f(cx + r) + ' ' + f(y) + 'A' + r + ' ' + r + ' 0 0 0 ' + f(cx - r) + ' ' + f(y) + 'A' + f(r * 1.35) + ' ' + f(r * 1.35) + ' 0 0 1 ' + f(cx + r) + ' ' + f(y) + 'Z';
    const r1 = f(reach * 0.3);
    const r2 = f(reach * 0.2);
    const far = reach * 1.32;
    const fits = cy - far - r2 > m2 + 6;
    return {
      line: border + C(cx, cy, f(reach * 0.42)),
      thin: R(cx, cy, 24, f(reach * 0.48), f(reach * 0.62), 0, f(reach * 0.55)) + 'M' + cx + ' ' + f(m2 + 8) + 'V' + f(H - m2 - 8),
      fill: C(cx, cy, f(reach * 0.26)) + up(f(cy - reach * 0.86), r1) + down(f(cy + reach * 0.86), r1) + (fits ? up(f(cy - far), r2) + down(f(cy + far), r2) : '') + corners,
      dark: '',
    };
  }

  const inset = m2 + 12;
  const usable = H - 2 * inset;

  if (pattern === 'vlny') {
    const count = Math.floor((300 - 2 * m2 - 8) / 20);
    const startX = f(cx - count * 10);
    let thin = '';
    for (let y = inset; y <= H - inset + 0.01; y += 16) thin += W(startX, startX + count * 20 - 1, f(y), 3.2, 20);
    return { line: border + C(cx, cy, f(reach * 0.3)), thin, fill: DI(cx, cy, f(reach * 0.2)), dark: '' };
  }

  if (pattern === 'sachovnice') {
    // An odd number of rows and columns leaves the same square in all four corners.
    const columns = 7;
    const stepX = (300 - 2 * inset) / columns;
    const rawRows = Math.max(1, Math.round(usable / stepX));
    const rows = rawRows % 2 === 1 ? rawRows : rawRows + 1;
    const stepY = usable / rows;
    let fill = '';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if ((row + col) % 2 === 0) fill += 'M' + f(inset + col * stepX) + ' ' + f(inset + row * stepY) + 'h' + f(stepX) + 'v' + f(stepY) + 'h' + f(-stepX) + 'Z';
      }
    }
    return { line: border + RR(f(inset), f(inset), f(300 - 2 * inset), f(usable), 2), thin: '', fill, dark: '' };
  }

  if (pattern === 'kosoctverce') {
    // A lattice clipped to the frame by construction, every line ends on its border.
    const stepX = 39;
    const stepY = Math.max(16, usable / Math.max(1, Math.round(usable / 58)));
    let thin = '';
    let fill = '';
    for (let row = 0; inset + row * stepY <= H - inset + 0.01; row++) {
      for (let col = 0; col <= 6; col++) {
        const x = f(33 + col * stepX);
        const y = f(inset + row * stepY);
        if (row % 2 === col % 2) fill += DI(x, y, 3.4);
        if (col < 6 && inset + (row + 1) * stepY <= H - inset + 0.01) {
          const x2 = f(x + stepX);
          const y2 = f(y + stepY);
          thin += row % 2 === col % 2 ? 'M' + x + ' ' + y + 'L' + x2 + ' ' + y2 : 'M' + x + ' ' + y2 + 'L' + x2 + ' ' + y;
        }
      }
    }
    return { line: border, thin, fill, dark: '' };
  }

  // Stars in staggered rows, centred on the card.
  const rows = Math.max(1, Math.floor(usable / 34));
  const stepY = usable / rows;
  let fill = '';
  for (let row = 0; row <= rows; row++) {
    const odd = row % 2 === 1;
    for (let col = 0; col < (odd ? 5 : 6); col++) {
      fill += S(f((odd ? 66 : 45) + col * 42), f(inset + row * stepY), odd ? 8 : 4, odd ? 6 : 7, odd ? 2.4 : 2);
    }
  }
  return { line: border, thin: '', fill, dark: '' };
}

/** Geometry of the blank card, not part of the prototype. It adapts to any aspect ratio. */
function buildBlank(H: number, radius: number): Omit<CardGeometry, 'sky'> {
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
