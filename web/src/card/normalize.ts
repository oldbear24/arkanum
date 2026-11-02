import { cs } from '../i18n/cs';
import {
  counts,
  enums,
  ranges,
  templateFor,
  textLimits,
  type ArtPlacement,
  type ArtworkTransform,
  type CardAbility,
  type CardContent,
  type CardDoc,
  type CardLook,
  type CardMeaning,
  type Family,
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
    abilities: normalizeAbilities(raw.abilities, d.abilities),
    elements: (Array.isArray(raw.elements) ? raw.elements : [])
      .filter((item): item is Raw => typeof item === 'object' && item !== null && !Array.isArray(item))
      .slice(0, counts.elements),
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

const NO_PLACEMENT: ArtPlacement = { x: 0, y: 0, zoom: 1 };

function normalizePlacement(raw: Raw): ArtPlacement {
  return {
    x: clampNumber(raw.x, ranges.artOffset, NO_PLACEMENT.x),
    y: clampNumber(raw.y, ranges.artOffset, NO_PLACEMENT.y),
    zoom: clampNumber(raw.zoom, ranges.artZoom, NO_PLACEMENT.zoom),
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
