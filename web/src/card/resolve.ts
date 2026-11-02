import { cs } from '../i18n/cs';
import { buildGeometry, type CardGeometry } from './geometry';
import { enums, type ArtPlacement, type Art, type CardElement, type CardFont, type Edge, type Foil, type Frame, type Palette, type Surface, type Variant } from './spec';

// The static half of renderVals() from design/Karta.dc.html: everything that depends
// only on the card parameters. The part that depends on the pointer is in motion.ts.

export interface ArtLayer extends ArtPlacement {
  url: string;
}

/** Parameter names follow design/Karta.dc.html. Values may be missing or invalid. */
export interface CardParams {
  variant?: Variant | string;
  art?: Art | string;
  frame?: Frame | string;
  palette?: Palette | string;
  element?: CardElement | string;
  foil?: Foil | string;
  foilI?: number;
  surface?: Surface | string;
  emboss?: boolean;
  edge?: Edge | string;
  thick?: number;
  radius?: number;
  depth?: number;
  light?: number;
  font?: CardFont | string;
  cardTitle?: string;
  numeral?: string;
  subtitle?: string;
  cls?: string;
  hp?: number | string;
  level?: number | string;
  ab1?: string;
  ab1p?: number | string;
  ab1t?: string;
  ab2?: string;
  ab2p?: number | string;
  ab2t?: string;
  rarity?: number;
  cost?: number | string;
  s1?: number | string;
  s2?: number | string;
  s3?: number | string;
  author?: string;
  setNo?: string;
  showArt?: boolean;
  showFrame?: boolean;
  showText?: boolean;
  showFoil?: boolean;
  shadow?: boolean;
  /** Uploaded artwork from the bottom layer up. Replaces the built-in illustration. */
  artwork?: ArtLayer[];
  /** Real size in mm. Only the blank card uses it, the other variants have a fixed shape. */
  formatW?: number;
  formatH?: number;
  /** Overrides the colours of the back, for decks that share one look. */
  backPalette?: Palette | string;
}

interface PaletteColors {
  base: string;
  sky0: string;
  sky1: string;
  g0: string;
  g1: string;
  g2: string;
  ink: string;
  glow: string;
  light: boolean;
}

export const PAL: Record<Palette, PaletteColors> = {
  pulnoc: { base: '#14112a', sky0: '#241d4d', sky1: '#100d22', g0: '#7d5f28', g1: '#d6b067', g2: '#fff3cf', ink: '#f1e6c8', glow: '#d6b067', light: false },
  krev: { base: '#230a11', sky0: '#43141f', sky1: '#17060b', g0: '#7e5523', g1: '#dca55a', g2: '#ffe9c2', ink: '#f4e0cb', glow: '#e08a5a', light: false },
  smaragd: { base: '#0b1f1b', sky0: '#163a31', sky1: '#081512', g0: '#76612c', g1: '#d3b56f', g2: '#fbf1cc', ink: '#e9e4cb', glow: '#7fd1b6', light: false },
  pergamen: { base: '#ece1c8', sky0: '#f6efde', sky1: '#e0cfab', g0: '#2b1d10', g1: '#4b3520', g2: '#c0913d', ink: '#3b2a19', glow: '#c0913d', light: true },
};

export const EL: Record<CardElement, { c: string; d: string; l: string; n: string }> = {
  mlha: { c: '#5fc4b8', d: '#123634', l: '#c4f3ec', n: cs.card.elements.mlha },
  ohen: { c: '#ee7a45', d: '#3e170b', l: '#ffd9c2', n: cs.card.elements.ohen },
  les: { c: '#7cbf5a', d: '#183012', l: '#dcf3cc', n: cs.card.elements.les },
  blesk: { c: '#e6c548', d: '#352c0b', l: '#fff2be', n: cs.card.elements.blesk },
  stin: { c: '#a58be6', d: '#21183b', l: '#e6dcff', n: cs.card.elements.stin },
};

export const EDGE: Record<Exclude<Edge, 'ram'>, string[]> = {
  zlata: ['#6f5424', '#9a7637', '#c49a4f', '#dfbd73', '#f0d796', '#f0d796', '#dfbd73', '#c49a4f', '#9a7637', '#6f5424'],
  cerna: ['#050506', '#0c0c0f', '#141418', '#1b1b20', '#212127', '#212127', '#1b1b20', '#141418', '#0c0c0f', '#050506'],
  bila: ['#b5ad9d', '#c8c0b0', '#d9d2c3', '#e6e0d2', '#efeadf', '#efeadf', '#e6e0d2', '#d9d2c3', '#c8c0b0', '#b5ad9d'],
};

const SHADE = [0.55, 0.4, 0.25, 0.1, 0, 0, 0.1, 0.25, 0.4, 0.55];

const FONTS: Record<CardFont, [string, number, number]> = {
  cinzel: ["'Cinzel', Georgia, serif", 600, 1],
  cormorant: ["'Cormorant Garamond', Georgia, serif", 700, 1.12],
  aboreto: ["'Aboreto', 'Cinzel', Georgia, serif", 400, 0.92],
  gotika: ["'Grenze Gotisch', Georgia, serif", 600, 1.08],
};

/** Placeholder for the gold gradient. Each rendered card swaps it for its own unique id. */
export const GOLD = 'url(#gold)';

export interface CardColors {
  base: string;
  backBase: string;
  sky0: string;
  sky1: string;
  g0: string;
  g1: string;
  g2: string;
  glow: string;
  fill: string;
  line: string;
  thin: string;
  under: string;
  dots: string;
  eyes: string;
  border2: string;
  plaque: string;
  panelFill: string;
  panelStroke: string;
  acc: string;
  acc2: string;
  ico: string;
  sico: string;
  txt: string;
  light: boolean;
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
}

function pick<T extends string>(val: unknown, list: readonly T[], def: T): T {
  return list.includes(val as T) ? (val as T) : def;
}

function num(val: unknown, def: number): number {
  const n = Number(val);
  return val === undefined || val === null || val === '' || isNaN(n) ? def : n;
}

function txt(val: unknown, def: string): string {
  return val === undefined || val === null || val === '' ? def : String(val);
}

function on(val: unknown): boolean {
  return val === undefined || val === null ? true : !!val;
}

const clamp = (min: number, max: number, n: number) => Math.max(min, Math.min(max, n));
const em = (n: number) => n.toFixed(3) + 'em';

export const BLANK_MIN_HEIGHT = 45;

function blankHeight(formatW: number, formatH: number): number {
  return Math.round((300 * formatH) / formatW);
}

function palettes(variant: Variant, palette: Palette, element: CardElement): CardColors {
  const P = PAL[palette];
  const E = EL[element];
  if (variant === 'bestie') {
    return { base: '#15171c', backBase: '#14161b', sky0: E.d, sky1: '#0b0c10', g0: '#6f5626', g1: '#c9a862', g2: '#fff0c6', glow: E.c, fill: E.l, line: E.l, thin: E.c, under: E.l, dots: E.l, eyes: E.d, border2: E.c, plaque: '#15171c', panelFill: '#1c1f26', panelStroke: mix(E.c, '#15171c', 0.45), acc: E.d, acc2: '#1c1f26', ico: E.l, sico: '#d9bb78', txt: '#d9bb78', light: false };
  }
  if (variant === 'hrdina') {
    return { base: '#1a1512', backBase: '#16130f', sky0: '#3b2a1f', sky1: '#120d0a', g0: '#6f5626', g1: '#c9a862', g2: '#fff0c6', glow: '#e0a85a', fill: '#8e2a36', line: GOLD, thin: GOLD, under: GOLD, dots: '#e9c98a', eyes: 'none', border2: '#5d4a33', plaque: '#1a1512', panelFill: '#e9dfc7', panelStroke: GOLD, acc: '#8e2a36', acc2: '#2a211c', ico: 'none', sico: 'none', txt: '#d9bb78', light: false };
  }
  return { base: P.base, backBase: P.base, sky0: P.sky0, sky1: P.sky1, g0: P.g0, g1: P.g1, g2: P.g2, glow: P.glow, fill: GOLD, line: GOLD, thin: GOLD, under: GOLD, dots: P.ink, eyes: 'none', border2: GOLD, plaque: P.base, panelFill: 'none', panelStroke: 'none', acc: 'none', acc2: 'none', ico: 'none', sico: 'none', txt: P.g1, light: P.light };
}

function defaultTexts(variant: Variant, art: Art, elementName: string) {
  const d = cs.card.defaults;
  const title: Record<Variant, string> = { tarot: cs.card.arts[art].name, orakulum: d.titleOrakulum, bestie: d.titleBestie, hrdina: d.titleHrdina, prazdna: d.titleBlank };
  const subtitle: Record<Variant, string> = { tarot: '', orakulum: d.subtitleOrakulum, bestie: d.subtitleBestie + elementName, hrdina: d.subtitleHrdina, prazdna: '' };
  return { title: title[variant], subtitle: subtitle[variant] };
}

const geometryCache = new Map<string, CardGeometry>();
const GEOMETRY_CACHE_LIMIT = 256;

/** SVG paths are memoized by the parameters they depend on. Many cards share them. */
function cachedGeometry(variant: Variant, frame: Frame, art: Art, element: CardElement, rarity: number, radius: number, H: number): CardGeometry {
  const key = [variant, frame, art, element, rarity, radius, H].join('|');
  let geometry = geometryCache.get(key);
  if (!geometry) {
    if (geometryCache.size >= GEOMETRY_CACHE_LIMIT) geometryCache.clear();
    geometry = buildGeometry(variant, frame, art, element, rarity, radius, H);
    geometryCache.set(key, geometry);
  }
  return geometry;
}

export type ResolvedCard = ReturnType<typeof resolveCard>;

export function resolveCard(p: CardParams) {
  const variant = pick(p.variant, enums.variant, 'tarot');
  const tcg = variant === 'bestie' || variant === 'hrdina';
  const blank = variant === 'prazdna';

  const formatW = clamp(1, 1000, num(p.formatW, 70));
  const formatH = clamp(1, 1000, num(p.formatH, 120));
  const H = blank ? Math.max(BLANK_MIN_HEIGHT, blankHeight(formatW, formatH)) : tcg ? 419 : 514;

  const art = pick(p.art, enums.art, 'hvezda');
  const frame = pick(p.frame, enums.frame, variant === 'orakulum' || blank ? 'minimal' : 'secese');
  const palette = pick(p.palette, enums.palette, variant === 'orakulum' ? 'pergamen' : 'pulnoc');
  const element = pick(p.element, enums.element, 'mlha');
  const foil = pick(p.foil, enums.foil, 'zlata');
  const surface = pick(p.surface, enums.surface, 'saten');
  const edge = pick(p.edge, enums.edge, tcg ? 'cerna' : variant === 'orakulum' ? 'bila' : blank ? 'ram' : 'zlata');
  const rarity = clamp(0, 5, Math.round(num(p.rarity, 3)));
  const radius = clamp(0, 30, num(p.radius, 14));
  const thick = clamp(0.5, 10, num(p.thick, 4));
  const I = clamp(0, 100, num(p.foilI, 65)) / 100;
  const depth = clamp(0, 100, num(p.depth, 55)) / 100;
  const light = clamp(0, 100, num(p.light, 30));
  const showArt = on(p.showArt);
  const showFrame = on(p.showFrame);
  const showText = on(p.showText);
  const showFoil = on(p.showFoil);
  const emboss = on(p.emboss);
  const shadow = on(p.shadow);

  const geometry = cachedGeometry(variant, frame, art, element, rarity, radius, H);

  const E = EL[element];
  const c = palettes(variant, palette, element);
  const hl = foil === 'zadna' ? 0.12 : foil === 'zlata' ? 0.55 + 0.45 * I : 0.3 + 0.3 * I;

  const backPalette = enums.palette.includes(p.backPalette as Palette) ? PAL[p.backPalette as Palette] : null;
  const back = backPalette
    ? { base: backPalette.base, g0: backPalette.g0, g1: backPalette.g1, g2: mix(backPalette.g1, backPalette.g2, hl), txt: backPalette.g1 }
    : { base: c.backBase, g0: c.g0, g1: c.g1, g2: mix(c.g1, c.g2, hl), txt: c.txt };

  const half = thick / 32;
  const edgeColors = edge === 'ram' ? SHADE.map((t) => mix(c.base, '#000000', t)) : EDGE[edge];
  const edges = edgeColors.map((color, i) => ({
    color,
    z: (-half * 0.94 + i * ((half * 1.88) / 9)).toFixed(3) + 'em',
  }));

  const defaults = defaultTexts(variant, art, E.n);
  const title = txt(p.cardTitle, defaults.title);
  const subtitle = txt(p.subtitle, defaults.subtitle);

  const F = FONTS[p.font as CardFont] || FONTS.cinzel;
  const len = Math.max(1, title.length);
  const tLs = len > 10 ? 0.08 : 0.18;
  const tFs = Math.min(1.14 * F[2], 12.4 / (len * (0.74 + tLs)));
  const nameFs = Math.min(1.0 * F[2], 11.2 / (len * 0.86));
  const heroFs = Math.min(0.92 * F[2], 11 / (len * 0.78));
  const subFs = Math.min(0.66, 14 / (Math.max(1, subtitle.length) * 0.42));

  const d = cs.card.defaults;
  const isHrdina = variant === 'hrdina';

  return {
    variant,
    tcg,
    blank,
    H,
    frame,
    palette,
    element,
    foil,
    surface,
    edge,
    rarity,
    radius,
    I,
    depth,
    light,
    thick,
    showArt,
    showFrame,
    showText,
    showFoil,
    emboss,
    shadow,
    hl,
    ar: '300 / ' + H,
    rad: em(radius / 16),
    half: em(half),
    edges,
    c,
    back,
    g: geometry.g,
    a: geometry.a,
    b: geometry.b,
    box: geometry.box,
    artwork: p.artwork ?? [],
    g0: c.g0,
    g1: c.g1,
    g2: mix(c.g1, c.g2, hl),
    el: E,
    title,
    numeral: txt(p.numeral, cs.card.arts[art].numeral),
    subtitle,
    ff: F[0],
    fw: F[1],
    t: {
      top: variant === 'orakulum' ? '83.6%' : '85.2%',
      h: variant === 'orakulum' ? '5.6%' : '7.4%',
      fs: tFs.toFixed(3),
      ls: tLs,
    },
    nameFs: nameFs.toFixed(3),
    heroFs: heroFs.toFixed(3),
    subFs: subFs.toFixed(3),
    level: txt(p.level, '2'),
    hp: txt(p.hp, '70'),
    ab1: txt(p.ab1, isHrdina ? d.ability1Hrdina : d.ability1Bestie),
    ab1p: txt(p.ab1p, '20'),
    ab1t: txt(p.ab1t, isHrdina ? d.ability1TextHrdina : d.ability1TextBestie),
    ab2: txt(p.ab2, d.ability2),
    ab2p: txt(p.ab2p, '50'),
    ab2t: txt(p.ab2t, d.ability2Text),
    s1: txt(p.s1, isHrdina ? '4' : '3'),
    s2: txt(p.s2, isHrdina ? '6' : '2'),
    s3: txt(p.s3, '2'),
    cost: txt(p.cost, '5'),
    cls: txt(p.cls, d.cls),
    author: txt(p.author, d.author),
    setNo: txt(p.setNo, isHrdina ? d.setNoHrdina : d.setNoBestie),
    ariaBase: title + ' – ' + cs.card.kind[variant],
  };
}
