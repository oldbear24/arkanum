// Limits and defaults shared with the Go hooks. See cardspec/ in the repository root.
import rawSpec from '../../../cardspec/spec.json';
import rawTemplates from '../../../cardspec/templates.json';

export type Variant = 'tarot' | 'bestie' | 'hrdina' | 'orakulum' | 'prazdna';
export type Family = Variant;
export type Art = 'hvezda' | 'mesic' | 'slunce' | 'mag';
export type Frame = 'secese' | 'deco' | 'gotika' | 'minimal';
export type Palette = 'pulnoc' | 'krev' | 'smaragd' | 'pergamen' | 'ametyst' | 'safir' | 'obsidian' | 'jantar';
export type CardElement = 'mlha' | 'ohen' | 'les' | 'blesk' | 'stin';
export type Foil = 'zadna' | 'zlata' | 'duha' | 'kosmos' | 'stribrna' | 'hranol' | 'perlet';
export type Surface = 'mat' | 'saten' | 'lesk';
export type Edge = 'zlata' | 'cerna' | 'bila' | 'ram' | 'stribrna' | 'medena';
export type CardFont = 'cinzel' | 'cormorant' | 'aboreto' | 'gotika';
export type Arcana = 'velka' | 'mala';
export type Visibility = 'private' | 'unlisted' | 'public';
export type Interactive = 'tilt' | 'drag' | 'none';
export type BackPattern = 'mandala' | 'hvezdy' | 'kosoctverce' | 'slunce' | 'prazdny';
export type ItemType = 'text' | 'image' | 'symbol' | 'ornament' | 'stat' | 'shape';
export type ItemSide = 'face' | 'back';
export type ItemFont = 'cinzel' | 'cormorant' | 'kurziva' | 'aboreto' | 'gotika' | 'jost';
export type ItemAlign = 'left' | 'center' | 'right';
export type ItemSymbol = 'hvezda' | 'hvezda8' | 'mesic' | 'slunce' | 'oko' | 'srdce' | 'mec' | 'pohar' | 'pentakl' | 'koruna' | 'klic' | 'plamen' | 'kapka' | 'list' | 'blesk' | 'stit';
export type ItemOrnament = 'linka' | 'vlnka' | 'roh' | 'vavrin' | 'paprsky' | 'oblouk' | 'hvezdy' | 'ramecek';
export type ItemShape = 'kruh' | 'ctverec' | 'zaobleny' | 'kosoctverec' | 'sestiuhelnik' | 'stit' | 'oblouk';

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
  backPattern: BackPattern[];
  itemType: ItemType[];
  itemSide: ItemSide[];
  itemFont: ItemFont[];
  itemAlign: ItemAlign[];
  itemSymbol: ItemSymbol[];
  itemOrnament: ItemOrnament[];
  itemShape: ItemShape[];
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

/** The own colours of a card on top of its palette. An empty one keeps the palette colour. */
export interface CustomColors {
  base: string;
  sky: string;
  metal: string;
  text: string;
}

/** Colour adjustments of the illustration, in percent and for the hue in degrees. */
export interface ArtFilter {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
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
  titleScale: number;
  titleCaps: boolean;
  fullArt: boolean;
  artFilter: ArtFilter;
  colors: CustomColors;
  /** Empty means the same palette as the front. */
  backPalette: Palette | '';
  backPattern: BackPattern;
  visible: LayerVisibility;
}

export interface CardAbility {
  name: string;
  power: number;
  text: string;
}

/**
 * A freely placed part of a card, from content.elements. It goes by "item" in the code,
 * because an element already means mist or fire on a card. Which of the keys matter
 * depends on the type, the others keep their defaults.
 */
export interface CardItem {
  id: string;
  type: ItemType;
  side: ItemSide;
  /** The centre, in percent of the width and height of the card. */
  x: number;
  y: number;
  /** The width in percent of the card width. For a text, the size of its font. */
  size: number;
  rotate: number;
  opacity: number;
  /** Empty means the colour of the card, so that it follows the palette. */
  color: string;
  hidden: boolean;
  /** The text itself, or the label of a stat. */
  text: string;
  /** The number of a stat. */
  value: string;
  font: ItemFont;
  align: ItemAlign;
  /** Which symbol, ornament or shape it is. */
  kind: string;
  filled: boolean;
  /** The height in percent of the width, for shapes and images. */
  ratio: number;
  /** The name of an image in the itemImages field of the record. */
  file: string;
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
  /** The name after "Il." on the card, instead of the handle of the owner. */
  artist: string;
  abilities: CardAbility[];
  elements: CardItem[];
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
  rotate: number;
  flipX: boolean;
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
