import { cs } from '../i18n/cs';
import { buildGeometry, type CardGeometry, type WindowBox } from './geometry';
import { enums, figureChoices, ranges, type ArtFilter, type ArtPlacement, type Art, type BackPattern, type CardElement, type CardFont, type CardItem, type CardParts, type CustomColors, type Edge, type Figure, type Foil, type FoilArea, type Frame, type Palette, type SkyPattern, type SkyStyle, type StatLabels, type Surface, type Texture, type TitleEffect, type Variant } from './spec';

// The static half of renderVals() from design/Karta.dc.html: everything that depends
// only on the card parameters. The part that depends on the pointer is in motion.ts.

export interface ArtLayer extends Partial<ArtPlacement> {
  url: string;
  x: number;
  y: number;
  zoom: number;
}

/** An item ready for drawing. An image without a url lost its file and stays out of sight. */
export interface PlacedItem extends CardItem {
  url?: string;
}

/** Parameter names follow design/Karta.dc.html. Values may be missing or invalid. */
export interface CardParams {
  variant?: Variant | string;
  art?: Art | string;
  /** Another illustration than the one of the template, for the families that have a choice. */
  figure?: Figure | string;
  frame?: Frame | string;
  palette?: Palette | string;
  element?: CardElement | string;
  foil?: Foil | string;
  foilI?: number;
  foilArea?: FoilArea | string;
  foilAngle?: number;
  surface?: Surface | string;
  texture?: Texture | string;
  textureI?: number;
  wear?: number;
  emboss?: boolean;
  edge?: Edge | string;
  thick?: number;
  radius?: number;
  depth?: number;
  light?: number;
  /** The width of the lines of the frame in percent. */
  frameWeight?: number;
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
  backPattern?: BackPattern | string;
  /** Own colours on top of the palette. */
  colors?: Partial<CustomColors>;
  /** The illustration fills the whole card and the window has no border of its own. */
  fullArt?: boolean;
  /** The size of the title in percent. */
  titleScale?: number;
  titleCaps?: boolean;
  titleEffect?: TitleEffect | string;
  titleSpacing?: number;
  titleOffset?: number;
  bodyScale?: number;
  artFilter?: Partial<ArtFilter>;
  skyStyle?: SkyStyle | string;
  skyPattern?: SkyPattern | string;
  vignette?: number;
  /** Single parts of the print, all of them are shown unless they are switched off. */
  parts?: Partial<CardParts>;
  /** Own captions of the stats. */
  labels?: Partial<StatLabels>;
  backText?: string;
  /** The back belongs to a deck: whatever a card has of its own on it gives way. */
  uniformBack?: boolean;
  /** The freely placed parts of the card, from the bottom up. */
  items?: PlacedItem[];
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
  ametyst: { base: '#1b1030', sky0: '#3a2263', sky1: '#130a24', g0: '#6a5587', g1: '#c9b3e6', g2: '#f6eeff', ink: '#ece2f7', glow: '#b58cf0', light: false },
  safir: { base: '#0b1730', sky0: '#16325f', sky1: '#081022', g0: '#5c6c8a', g1: '#b7c7de', g2: '#f2f7ff', ink: '#e3ecf8', glow: '#7fb0f0', light: false },
  obsidian: { base: '#101114', sky0: '#272a30', sky1: '#0a0b0d', g0: '#585d66', g1: '#b9bec7', g2: '#f6f8fb', ink: '#e8eaee', glow: '#aab4c4', light: false },
  jantar: { base: '#2a1606', sky0: '#5c3411', sky1: '#1c0e04', g0: '#80521a', g1: '#e8b04c', g2: '#fff0bf', ink: '#f6e4bf', glow: '#f0a03c', light: false },
  ruze: { base: '#2a0f1c', sky0: '#57203a', sky1: '#1c0a13', g0: '#80475a', g1: '#e8a9b8', g2: '#fff0f3', ink: '#f8e4ea', glow: '#f08fb0', light: false },
  tyrkys: { base: '#06211f', sky0: '#0f4a46', sky1: '#041614', g0: '#6a6a36', g1: '#d8c98a', g2: '#fbf6d2', ink: '#e3f2ea', glow: '#56d6c6', light: false },
  popel: { base: '#1c1c1f', sky0: '#3b3c42', sky1: '#131316', g0: '#6b5545', g1: '#c9a58a', g2: '#f7e7da', ink: '#ece7e2', glow: '#c9a58a', light: false },
  mech: { base: '#141c0c', sky0: '#2f3f18', sky1: '#0c1207', g0: '#6e6a2a', g1: '#c9c26a', g2: '#f6f3c0', ink: '#e8e8cb', glow: '#a6c85a', light: false },
  vino: { base: '#240b20', sky0: '#4c1a45', sky1: '#180714', g0: '#7a5a3c', g1: '#dfc08c', g2: '#fff1cf', ink: '#f2e2d9', glow: '#c86a9c', light: false },
  slonovina: { base: '#f3ecdc', sky0: '#fbf7ec', sky1: '#e6dcc4', g0: '#4a3418', g1: '#7a5a28', g2: '#c89a4a', ink: '#43321a', glow: '#c89a4a', light: true },
  zima: { base: '#e6edf4', sky0: '#f5f9fc', sky1: '#cfdce9', g0: '#23384f', g1: '#3f5f80', g2: '#9fc0de', ink: '#27405a', glow: '#7fb0d8', light: true },
  pisek: { base: '#e9d6b4', sky0: '#f4e7cc', sky1: '#d9bf92', g0: '#4e2a14', g1: '#7d4520', g2: '#d08a4c', ink: '#4a2a14', glow: '#d08a4c', light: true },
};

export const EL: Record<CardElement, { c: string; d: string; l: string; n: string }> = {
  mlha: { c: '#5fc4b8', d: '#123634', l: '#c4f3ec', n: cs.card.elements.mlha },
  ohen: { c: '#ee7a45', d: '#3e170b', l: '#ffd9c2', n: cs.card.elements.ohen },
  les: { c: '#7cbf5a', d: '#183012', l: '#dcf3cc', n: cs.card.elements.les },
  blesk: { c: '#e6c548', d: '#352c0b', l: '#fff2be', n: cs.card.elements.blesk },
  stin: { c: '#a58be6', d: '#21183b', l: '#e6dcff', n: cs.card.elements.stin },
  voda: { c: '#4a9fe0', d: '#0f2740', l: '#cfe6fb', n: cs.card.elements.voda },
  led: { c: '#8fdbe8', d: '#14363f', l: '#e4f8fb', n: cs.card.elements.led },
  zeme: { c: '#b58a5a', d: '#2e2012', l: '#efdcc2', n: cs.card.elements.zeme },
  svetlo: { c: '#efe2b0', d: '#37321b', l: '#fffbe6', n: cs.card.elements.svetlo },
  jed: { c: '#b4d23c', d: '#25300c', l: '#ecf9c0', n: cs.card.elements.jed },
};

/** The colours of the edge layers, from a dark outer sheet to a light one in the middle. */
function edgeRamp(dark: string, light: string): string[] {
  return [0, 0.25, 0.5, 0.75, 1, 1, 0.75, 0.5, 0.25, 0].map((t) => mix(dark, light, t));
}

export const EDGE: Record<Exclude<Edge, 'ram'>, string[]> = {
  zlata: ['#6f5424', '#9a7637', '#c49a4f', '#dfbd73', '#f0d796', '#f0d796', '#dfbd73', '#c49a4f', '#9a7637', '#6f5424'],
  cerna: ['#050506', '#0c0c0f', '#141418', '#1b1b20', '#212127', '#212127', '#1b1b20', '#141418', '#0c0c0f', '#050506'],
  bila: ['#b5ad9d', '#c8c0b0', '#d9d2c3', '#e6e0d2', '#efeadf', '#efeadf', '#e6e0d2', '#d9d2c3', '#c8c0b0', '#b5ad9d'],
  stribrna: ['#5b606a', '#7f858f', '#a5abb5', '#c8cdd5', '#e4e7ec', '#e4e7ec', '#c8cdd5', '#a5abb5', '#7f858f', '#5b606a'],
  medena: ['#5f3417', '#84492a', '#a9623a', '#c9814f', '#e3a26f', '#e3a26f', '#c9814f', '#a9623a', '#84492a', '#5f3417'],
  ruzova: edgeRamp('#7a4a45', '#f0c4b8'),
  modra: edgeRamp('#132a55', '#6f9fe0'),
  cervena: edgeRamp('#4a0c12', '#d24a4a'),
  zelena: edgeRamp('#0e3a26', '#4fbf88'),
  fialova: edgeRamp('#2c1650', '#9a74e0'),
  duha: ['#ff5caa', '#ff8a5c', '#ffb84d', '#ffd666', '#a8e86b', '#68ffc4', '#5cd4ff', '#5cb2ff', '#8f8cff', '#c478ff'],
};

const SHADE = [0.55, 0.4, 0.25, 0.1, 0, 0, 0.1, 0.25, 0.4, 0.55];

const FONTS: Record<CardFont, [string, number, number]> = {
  cinzel: ["'Cinzel', Georgia, serif", 600, 1],
  cormorant: ["'Cormorant Garamond', Georgia, serif", 700, 1.12],
  aboreto: ["'Aboreto', 'Cinzel', Georgia, serif", 400, 0.92],
  gotika: ["'Grenze Gotisch', Georgia, serif", 600, 1.08],
  marcellus: ["'Marcellus', Georgia, serif", 400, 1.02],
  uncial: ["'Uncial Antiqua', Georgia, serif", 400, 0.9],
  fondamento: ["'Fondamento', Georgia, serif", 400, 1.04],
  metamorphous: ["'Metamorphous', Georgia, serif", 400, 0.86],
  vibes: ["'Great Vibes', Georgia, cursive", 400, 1.3],
};

/** These foils replace the metal of the palette, in a darker shade on a light card. */
const METAL_FOILS: Partial<Record<Foil, { dark: Record<'g0' | 'g1' | 'g2', string>; light: Record<'g0' | 'g1' | 'g2', string> }>> = {
  stribrna: { dark: { g0: '#5d6470', g1: '#b8c0cc', g2: '#f7f9fc' }, light: { g0: '#3f444d', g1: '#6b727d', g2: '#c9ced6' } },
  ruzova: { dark: { g0: '#7d4f4a', g1: '#e6b0a4', g2: '#fff1ec' }, light: { g0: '#5a2e2a', g1: '#8f5048', g2: '#e0a89a' } },
  medena: { dark: { g0: '#6a3518', g1: '#d08a54', g2: '#ffe3c8' }, light: { g0: '#4a2410', g1: '#8a4f26', g2: '#d9985f' } },
};

/** The texts of the panel of a game card, on a dark and on a light panel. */
const PANEL_INK = {
  light: { strong: '#2a2018', soft: '#5e4c38', rule: 'rgba(42,32,24,0.25)' },
  dark: { strong: '#f6ecd2', soft: '#cfc7b2', rule: 'rgba(246,236,210,0.25)' },
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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function isColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export function isBright(color: string): boolean {
  const n = parseInt(color.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140;
}

function withFoilMetal(c: CardColors, foil: Foil, tcg: boolean): CardColors {
  const metals = METAL_FOILS[foil];
  if (!metals) return c;
  const metal = c.light ? metals.light : metals.dark;
  return { ...c, ...metal, txt: tcg || c.light ? c.txt : metal.g1 };
}

/** Lays the own colours over those of the palette. Whatever is left empty stays as it is. */
function withCustomColors(c: CardColors, custom: Partial<CustomColors> | undefined, variant: Variant): CardColors {
  if (!custom) return c;
  const out = { ...c };
  if (isColor(custom.base)) {
    out.base = custom.base;
    out.backBase = custom.base;
    out.plaque = custom.base;
    out.light = isBright(custom.base);
    if (variant === 'bestie') out.panelFill = mix(custom.base, '#ffffff', 0.05);
    if (variant === 'bestie' || variant === 'hrdina') out.acc2 = mix(custom.base, '#ffffff', 0.05);
  }
  if (isColor(custom.sky)) {
    out.sky0 = custom.sky;
    out.sky1 = mix(custom.sky, '#000000', 0.55);
  }
  if (isColor(custom.metal)) {
    out.g0 = mix(custom.metal, '#000000', 0.45);
    out.g1 = custom.metal;
    out.g2 = mix(custom.metal, '#ffffff', 0.75);
    out.glow = custom.metal;
    out.txt = custom.metal;
    if (variant === 'bestie') out.sico = custom.metal;
  }
  if (isColor(custom.text)) out.txt = custom.text;
  if (isColor(custom.plaque)) out.plaque = custom.plaque;
  if (isColor(custom.panel)) out.panelFill = custom.panel;
  if (isColor(custom.glow)) out.glow = custom.glow;
  return out;
}

function resolveFilter(raw: Partial<ArtFilter> | undefined): ArtFilter | null {
  if (!raw) return null;
  const filter: ArtFilter = {
    brightness: clamp(ranges.artBrightness[0], ranges.artBrightness[1], num(raw.brightness, 100)),
    contrast: clamp(ranges.artContrast[0], ranges.artContrast[1], num(raw.contrast, 100)),
    saturate: clamp(ranges.artSaturate[0], ranges.artSaturate[1], num(raw.saturate, 100)),
    hue: clamp(ranges.artHue[0], ranges.artHue[1], num(raw.hue, 0)),
    sepia: clamp(ranges.artSepia[0], ranges.artSepia[1], num(raw.sepia, 0)),
  };
  // A filter costs on every frame of a moving card, so a card without one has none at all.
  return filter.brightness === 100 && filter.contrast === 100 && filter.saturate === 100 && filter.hue === 0 && filter.sepia === 0 ? null : filter;
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
function cachedGeometry(variant: Variant, frame: Frame, art: Art, element: CardElement, rarity: number, radius: number, H: number, backPattern: BackPattern, figure: Figure | '', skyPattern: SkyPattern): CardGeometry {
  const key = [variant, frame, art, element, rarity, radius, H, backPattern, figure, skyPattern].join('|');
  let geometry = geometryCache.get(key);
  if (!geometry) {
    if (geometryCache.size >= GEOMETRY_CACHE_LIMIT) geometryCache.clear();
    geometry = buildGeometry(variant, frame, art, element, rarity, radius, H, backPattern, figure, skyPattern);
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
  const figure = pick<Figure | ''>(p.figure, figureChoices(variant), '');
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
  const backPattern = pick(p.backPattern, enums.backPattern, 'mandala');
  const fullArt = p.fullArt === true;
  const titleScale = clamp(ranges.titleScale[0], ranges.titleScale[1], num(p.titleScale, 100)) / 100;
  const titleSpacing = clamp(ranges.titleSpacing[0], ranges.titleSpacing[1], num(p.titleSpacing, 0)) / 100;
  const skyPattern = pick(p.skyPattern, enums.skyPattern, 'zadny');
  const uniformBack = p.uniformBack === true;

  const geometry = cachedGeometry(variant, frame, art, element, rarity, radius, H, backPattern, figure, skyPattern);

  const E = EL[element];
  const paletteColors = palettes(variant, palette, element);
  const c = withCustomColors(withFoilMetal(paletteColors, foil, tcg), p.colors, variant);
  const hl = foil === 'zadna' ? 0.12 : foil === 'zlata' || METAL_FOILS[foil] ? 0.55 + 0.45 * I : 0.3 + 0.3 * I;

  const backPalette = enums.palette.includes(p.backPalette as Palette) ? PAL[p.backPalette as Palette] : null;
  const back = backPalette
    ? { base: backPalette.base, g0: backPalette.g0, g1: backPalette.g1, g2: mix(backPalette.g1, backPalette.g2, hl), txt: backPalette.g1 }
    : { base: c.backBase, g0: c.g0, g1: c.g1, g2: mix(c.g1, c.g2, hl), txt: c.txt };
  if (!uniformBack && isColor(p.colors?.backBase)) back.base = p.colors.backBase;
  if (!uniformBack && isColor(p.colors?.backMetal)) {
    back.g0 = mix(p.colors.backMetal, '#000000', 0.45);
    back.g1 = p.colors.backMetal;
    back.g2 = mix(p.colors.backMetal, mix(p.colors.backMetal, '#ffffff', 0.75), hl);
    back.txt = p.colors.backMetal;
  }

  const half = thick / 32;
  const ownEdge = !uniformBack && isColor(p.colors?.edge) ? p.colors.edge : null;
  const edgeColors = ownEdge ? SHADE.map((t) => mix(ownEdge, '#000000', t)) : edge === 'ram' ? SHADE.map((t) => mix(c.base, '#000000', t)) : EDGE[edge];
  const edges = edgeColors.map((color, i) => ({
    color,
    z: (-half * 0.94 + i * ((half * 1.88) / 9)).toFixed(3) + 'em',
  }));

  const defaults = defaultTexts(variant, art, E.n);
  const title = txt(p.cardTitle, defaults.title);
  const subtitle = txt(p.subtitle, defaults.subtitle);

  const F = FONTS[p.font as CardFont] || FONTS.cinzel;
  const len = Math.max(1, title.length);
  const tLs = (len > 10 ? 0.08 : 0.18) + titleSpacing;
  const tFs = Math.min(1.14 * F[2], 12.4 / (len * (0.74 + tLs))) * titleScale;
  const nameFs = Math.min(1.0 * F[2], 11.2 / (len * (0.86 + titleSpacing))) * titleScale;
  const heroFs = Math.min(0.92 * F[2], 11 / (len * (0.78 + titleSpacing))) * titleScale;
  const subFs = Math.min(0.66, 14 / (Math.max(1, subtitle.length) * 0.42));

  const d = cs.card.defaults;
  const isHrdina = variant === 'hrdina';
  const artBox: WindowBox = fullArt ? { x: 0, y: 0, w: 300, h: H } : geometry.box;
  const panelIsLight = isColor(p.colors?.panel) ? isBright(p.colors.panel) : isHrdina;
  const ownTitle = isColor(p.colors?.title) ? p.colors.title : null;
  const parts = p.parts;

  return {
    variant,
    tcg,
    blank,
    H,
    frame,
    palette,
    element,
    foil,
    /** A full art card has no window that the foil could stop at. */
    foilArea: fullArt ? ('cela' as const) : pick(p.foilArea, enums.foilArea, 'cela'),
    foilAngle: clamp(ranges.foilAngle[0], ranges.foilAngle[1], num(p.foilAngle, 115)),
    surface,
    texture: pick(p.texture, enums.texture, 'zadna'),
    textureI: clamp(ranges.textureI[0], ranges.textureI[1], num(p.textureI, 50)) / 100,
    wear: clamp(ranges.wear[0], ranges.wear[1], num(p.wear, 0)) / 100,
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
    artBox,
    fullArt,
    backPattern,
    uniformBack,
    /** The own text on the back. A deck has none, and the brand of a game card keeps its place. */
    backText: uniformBack ? '' : txt(p.backText, ''),
    titleCaps: on(p.titleCaps),
    titleEffect: pick(p.titleEffect, enums.titleEffect, 'zadny'),
    titleOffset: clamp(ranges.titleOffset[0], ranges.titleOffset[1], num(p.titleOffset, 0)),
    titleSpacing,
    bodyScale: clamp(ranges.bodyScale[0], ranges.bodyScale[1], num(p.bodyScale, 100)) / 100,
    frameWeight: clamp(ranges.frameWeight[0], ranges.frameWeight[1], num(p.frameWeight, 100)) / 100,
    artFilter: resolveFilter(p.artFilter),
    skyStyle: pick(p.skyStyle, enums.skyStyle, 'prechod'),
    sky: geometry.sky,
    vignette: clamp(ranges.vignette[0], ranges.vignette[1], num(p.vignette, 0)) / 100,
    parts: {
      title: on(parts?.title),
      numeral: on(parts?.numeral),
      subtitle: on(parts?.subtitle),
      plaque: on(parts?.plaque),
      window: on(parts?.window),
      border: on(parts?.border),
      corners: on(parts?.corners),
      ornaments: on(parts?.ornaments),
      rarity: on(parts?.rarity),
      credit: on(parts?.credit),
    },
    /** The title colour of the game cards is not the colour of their other texts. */
    titleColor: ownTitle ?? (tcg ? (isColor(p.colors?.text) ? p.colors.text : '#f6ecd2') : c.txt),
    panelInk: panelIsLight ? PANEL_INK.light : PANEL_INK.dark,
    labels: {
      level: txt(p.labels?.level, cs.card.level),
      s1: txt(p.labels?.s1, cs.card.statStrength),
      s2: txt(p.labels?.s2, cs.card.statDefense),
      s3: txt(p.labels?.s3, cs.card.statMagic),
    },
    artwork: p.artwork ?? [],
    items: p.items ?? [],
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
