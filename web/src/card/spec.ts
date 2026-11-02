// Limits and defaults shared with the Go hooks. See cardspec/ in the repository root.
import rawSpec from '../../../cardspec/spec.json';
import rawTemplates from '../../../cardspec/templates.json';

export type Variant = 'tarot' | 'bestie' | 'hrdina' | 'orakulum' | 'prazdna';
export type Family = Variant;
export type Art = 'hvezda' | 'mesic' | 'slunce' | 'mag';
export type Frame = 'secese' | 'deco' | 'gotika' | 'minimal';
export type Palette = 'pulnoc' | 'krev' | 'smaragd' | 'pergamen';
export type CardElement = 'mlha' | 'ohen' | 'les' | 'blesk' | 'stin';
export type Foil = 'zadna' | 'zlata' | 'duha' | 'kosmos';
export type Surface = 'mat' | 'saten' | 'lesk';
export type Edge = 'zlata' | 'cerna' | 'bila' | 'ram';
export type CardFont = 'cinzel' | 'cormorant' | 'aboreto' | 'gotika';
export type Arcana = 'velka' | 'mala';
export type Visibility = 'private' | 'unlisted' | 'public';
export type Interactive = 'tilt' | 'drag' | 'none';

export interface Enums {
  family: Family[];
  variant: Variant[];
  art: Art[];
  frame: Frame[];
  palette: Palette[];
  element: CardElement[];
  foil: Foil[];
  surface: Surface[];
  edge: Edge[];
  font: CardFont[];
  arcana: Arcana[];
  visibility: Visibility[];
}

export const enums = rawSpec.enums as Enums;
export const ranges = rawSpec.ranges as Record<keyof typeof rawSpec.ranges, [number, number]>;
export const textLimits = rawSpec.text;
export const counts = rawSpec.counts;

export interface LayerVisibility {
  art: boolean;
  frame: boolean;
  text: boolean;
  foil: boolean;
}

export interface CardLook {
  variant: Variant;
  art: Art;
  frame: Frame;
  palette: Palette;
  element: CardElement;
  foil: Foil;
  foilI: number;
  surface: Surface;
  emboss: boolean;
  edge: Edge;
  thick: number;
  radius: number;
  depth: number;
  font: CardFont;
  visible: LayerVisibility;
}

export interface CardAbility {
  name: string;
  power: number;
  text: string;
}

export interface CardContent {
  numeral: string;
  subtitle: string;
  cls: string;
  hp: number;
  level: number;
  cost: number;
  s1: number;
  s2: number;
  s3: number;
  rarity: number;
  setNo: string;
  abilities: CardAbility[];
  elements: Record<string, unknown>[];
}

export interface CardMeaning {
  arcana: Arcana;
  upright: string;
  reversed: string;
  keywords: string[];
}

export interface ArtPlacement {
  x: number;
  y: number;
  zoom: number;
}

export interface ArtworkTransform extends ArtPlacement {
  layers: ArtPlacement[];
}

/** The editable data of a card, always complete and within limits after normalizeCard(). */
export interface CardDoc {
  title: string;
  family: Family;
  formatW: number;
  formatH: number;
  look: CardLook;
  content: CardContent;
  meaning: CardMeaning;
  artworkTransform: ArtworkTransform;
}

export interface TemplateDefaults {
  title: string;
  look: CardLook;
  content: CardContent;
  meaning: CardMeaning;
}

export interface TemplateDef {
  slug: string;
  name: string;
  family: Family;
  formatW: number;
  formatH: number;
  defaults: TemplateDefaults;
}

export const templateDefs = rawTemplates as TemplateDef[];

export function templateFor(family: Family): TemplateDef {
  const found = templateDefs.find((t) => t.family === family);
  if (!found) throw new Error(`Missing template for ${family}`);
  return found;
}
