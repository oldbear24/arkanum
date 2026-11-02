import { cs } from '../i18n/cs';
import {
  counts,
  enums,
  ranges,
  templateFor,
  textLimits,
  type ArtFilter,
  type ArtPlacement,
  type ArtworkTransform,
  type CardAbility,
  type CardContent,
  type CardDoc,
  type CardItem,
  type CardLook,
  type CardMeaning,
  type CustomColors,
  type Family,
  type ItemType,
  type Palette,
} from './spec';

type Raw = Record<string, unknown>;

function asObject(value: unknown): Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : {};
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clampNumber(value: unknown, [min, max]: readonly [number, number], fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Limits count characters, the same way the Go hook does, not UTF-16 units. */
function clip(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('') : text;
}

function text(value: unknown, max: number, fallback: string): string {
  if (typeof value === 'string') return clip(value, max);
  if (typeof value === 'number') return clip(String(value), max);
  return fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Anything but a plain colour would end up in the styles of the card, so it has to go. */
function color(value: unknown): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : '';
}

function normalizeColors(raw: Raw): CustomColors {
  return { base: color(raw.base), sky: color(raw.sky), metal: color(raw.metal), text: color(raw.text) };
}

function normalizeFilter(raw: Raw, d: ArtFilter): ArtFilter {
  return {
    brightness: clampNumber(raw.brightness, ranges.artBrightness, d.brightness),
    contrast: clampNumber(raw.contrast, ranges.artContrast, d.contrast),
    saturate: clampNumber(raw.saturate, ranges.artSaturate, d.saturate),
    hue: clampNumber(raw.hue, ranges.artHue, d.hue),
  };
}

function normalizeLook(raw: Raw, family: Family): CardLook {
  const d = templateFor(family).defaults.look;
  const visible = asObject(raw.visible);
  return {
    variant: family,
    art: pick(raw.art, enums.art, d.art),
    frame: pick(raw.frame, enums.frame, d.frame),
    palette: pick(raw.palette, enums.palette, d.palette),
    element: pick(raw.element, enums.element, d.element),
    foil: pick(raw.foil, enums.foil, d.foil),
    foilI: clampNumber(raw.foilI, ranges.foilI, d.foilI),
    surface: pick(raw.surface, enums.surface, d.surface),
    emboss: bool(raw.emboss, d.emboss),
    edge: pick(raw.edge, enums.edge, d.edge),
    thick: clampNumber(raw.thick, ranges.thick, d.thick),
    radius: clampNumber(raw.radius, ranges.radius, d.radius),
    depth: clampNumber(raw.depth, ranges.depth, d.depth),
    font: pick(raw.font, enums.font, d.font),
    titleScale: clampNumber(raw.titleScale, ranges.titleScale, d.titleScale),
    titleCaps: bool(raw.titleCaps, d.titleCaps),
    fullArt: bool(raw.fullArt, d.fullArt),
    artFilter: normalizeFilter(asObject(raw.artFilter), d.artFilter),
    colors: normalizeColors(asObject(raw.colors)),
    backPalette: pick<Palette | ''>(raw.backPalette, enums.palette, d.backPalette),
    backPattern: pick(raw.backPattern, enums.backPattern, d.backPattern),
    visible: {
      art: bool(visible.art, d.visible.art),
      frame: bool(visible.frame, d.visible.frame),
      text: bool(visible.text, d.visible.text),
      foil: bool(visible.foil, d.visible.foil),
    },
  };
}

function normalizeAbilities(raw: unknown, defaults: CardAbility[]): CardAbility[] {
  const list = Array.isArray(raw) ? raw : [];
  return defaults.slice(0, counts.abilities).map((d, i) => {
    const item = asObject(list[i]);
    return {
      name: text(item.name, textLimits.abilityName, d.name),
      power: clampNumber(item.power, ranges.power, d.power),
      text: text(item.text, textLimits.abilityText, d.text),
    };
  });
}

const ITEM_KINDS: Partial<Record<ItemType, readonly string[]>> = {
  symbol: enums.itemSymbol,
  ornament: enums.itemOrnament,
  shape: enums.itemShape,
  stat: enums.itemShape,
};

/** What a new item of a type starts from. Also fills in whatever a stored one misses. */
export function itemDefaults(type: ItemType): Omit<CardItem, 'id' | 'type'> {
  const common = { side: 'face', x: 50, y: 50, rotate: 0, opacity: 100, color: '', hidden: false, text: '', value: '', font: 'cormorant', align: 'center', kind: '', filled: true, ratio: 100, file: '' } as const;
  switch (type) {
    case 'text':
      return { ...common, size: 8, text: cs.workshop.items.defaultText };
    case 'image':
      return { ...common, size: 50 };
    case 'symbol':
      return { ...common, size: 24, kind: 'hvezda' };
    case 'ornament':
      return { ...common, size: 60, kind: 'linka' };
    case 'stat':
      return { ...common, size: 24, kind: 'stit', text: cs.workshop.items.defaultStatLabel, value: '5' };
    case 'shape':
      return { ...common, size: 40, kind: 'kruh' };
  }
}

function normalizeItem(raw: Raw, index: number, taken: Set<string>): CardItem | null {
  if (!enums.itemType.includes(raw.type as ItemType)) return null;
  const type = raw.type as ItemType;
  const d = itemDefaults(type);
  const kinds = ITEM_KINDS[type];

  // The list refers to items by their id, so it has to be there and be unique.
  let id = text(raw.id, textLimits.itemId, '');
  if (!id || taken.has(id)) id = `i${index}`;
  taken.add(id);

  return {
    id,
    type,
    side: pick(raw.side, enums.itemSide, d.side),
    x: clampNumber(raw.x, ranges.itemPosition, d.x),
    y: clampNumber(raw.y, ranges.itemPosition, d.y),
    size: clampNumber(raw.size, ranges.itemSize, d.size),
    rotate: clampNumber(raw.rotate, ranges.itemRotate, d.rotate),
    opacity: clampNumber(raw.opacity, ranges.itemOpacity, d.opacity),
    color: color(raw.color),
    hidden: bool(raw.hidden, d.hidden),
    text: text(raw.text, textLimits.itemText, d.text),
    value: text(raw.value, textLimits.itemValue, d.value),
    font: pick(raw.font, enums.itemFont, d.font),
    align: pick(raw.align, enums.itemAlign, d.align),
    kind: kinds ? pick(raw.kind, kinds, d.kind) : '',
    filled: bool(raw.filled, d.filled),
    ratio: clampNumber(raw.ratio, ranges.itemRatio, d.ratio),
    file: text(raw.file, textLimits.itemFile, d.file),
  };
}

function normalizeItems(raw: unknown): CardItem[] {
  const taken = new Set<string>();
  return (Array.isArray(raw) ? raw : [])
    .filter((item): item is Raw => typeof item === 'object' && item !== null && !Array.isArray(item))
    .map((item, i) => normalizeItem(item, i, taken))
    .filter((item) => item !== null)
    .slice(0, counts.elements);
}

function normalizeContent(raw: Raw, family: Family, look: CardLook): CardContent {
  const d = templateFor(family).defaults.content;
  const fallbackNumeral = family === 'tarot' ? cs.card.arts[look.art].numeral : d.numeral;
  return {
    numeral: text(raw.numeral, textLimits.numeral, fallbackNumeral),
    subtitle: text(raw.subtitle, textLimits.subtitle, d.subtitle),
    cls: text(raw.cls, textLimits.cls, d.cls),
    hp: clampNumber(raw.hp, ranges.hp, d.hp),
    level: clampNumber(raw.level, ranges.level, d.level),
    cost: clampNumber(raw.cost, ranges.cost, d.cost),
    s1: clampNumber(raw.s1, ranges.s1, d.s1),
    s2: clampNumber(raw.s2, ranges.s2, d.s2),
    s3: clampNumber(raw.s3, ranges.s3, d.s3),
    rarity: Math.round(clampNumber(raw.rarity, ranges.rarity, d.rarity)),
    setNo: text(raw.setNo, textLimits.setNo, d.setNo),
    artist: text(raw.artist, textLimits.artist, d.artist),
    abilities: normalizeAbilities(raw.abilities, d.abilities),
    elements: normalizeItems(raw.elements),
  };
}

function normalizeKeywords(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const keyword = clip(item.trim(), textLimits.keyword);
    if (keyword) unique.add(keyword);
  }
  return [...unique].slice(0, counts.keywords);
}

function normalizeMeaning(raw: Raw, family: Family): CardMeaning {
  const d = templateFor(family).defaults.meaning;
  return {
    arcana: pick(raw.arcana, enums.arcana, d.arcana),
    upright: text(raw.upright, textLimits.upright, d.upright),
    reversed: text(raw.reversed, textLimits.reversed, d.reversed),
    keywords: normalizeKeywords(raw.keywords, d.keywords),
  };
}

const NO_PLACEMENT: ArtPlacement = { x: 0, y: 0, zoom: 1, rotate: 0, flipX: false };

function normalizePlacement(raw: Raw): ArtPlacement {
  return {
    x: clampNumber(raw.x, ranges.artOffset, NO_PLACEMENT.x),
    y: clampNumber(raw.y, ranges.artOffset, NO_PLACEMENT.y),
    zoom: clampNumber(raw.zoom, ranges.artZoom, NO_PLACEMENT.zoom),
    rotate: clampNumber(raw.rotate, ranges.artRotate, NO_PLACEMENT.rotate),
    flipX: bool(raw.flipX, NO_PLACEMENT.flipX),
  };
}

function normalizeTransform(raw: Raw): ArtworkTransform {
  const layers = Array.isArray(raw.layers) ? raw.layers : [];
  return {
    ...normalizePlacement(raw),
    layers: layers.slice(0, counts.artworkLayers).map((layer) => normalizePlacement(asObject(layer))),
  };
}

function resolveFamily(raw: Raw, look: Raw): Family {
  if (enums.family.includes(raw.family as Family)) return raw.family as Family;
  return pick(look.variant, enums.family, 'tarot');
}

/**
 * Turns whatever is stored or received into complete card data: unknown values and
 * types fall back to the template defaults, numbers are clamped, texts are shortened.
 * The Go hook enforces the same limits before saving, it just rejects instead of fixing.
 */
export function normalizeCard(input: unknown): CardDoc {
  const raw = asObject(input);
  const rawLook = asObject(raw.look);
  const family = resolveFamily(raw, rawLook);
  const template = templateFor(family);

  const look = normalizeLook(rawLook, family);
  const fallbackTitle = family === 'tarot' ? cs.card.arts[look.art].name : template.defaults.title;

  return {
    title: text(raw.title, textLimits.title, fallbackTitle),
    family,
    formatW: Math.round(clampNumber(raw.formatW, ranges.format, template.formatW)),
    formatH: Math.round(clampNumber(raw.formatH, ranges.format, template.formatH)),
    look,
    content: normalizeContent(asObject(raw.content), family, look),
    meaning: normalizeMeaning(asObject(raw.meaning), family),
    artworkTransform: normalizeTransform(asObject(raw.artworkTransform)),
  };
}
