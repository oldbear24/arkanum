// Limits and defaults shared with the Go hooks. See cardspec/ in the repository root.
import rawSpec from '../../../cardspec/spec.json';
import rawTemplates from '../../../cardspec/templates.json';

export type Variant = 'tarot' | 'bestie' | 'hrdina' | 'orakulum' | 'prazdna';
export type Family = Variant;
export type Art = 'hvezda' | 'mesic' | 'slunce' | 'mag' | 'blazen' | 'knezka' | 'milenci' | 'poustevnik' | 'kolo' | 'spravedlnost' | 'vez' | 'svet';
export type FigureBestie = 'sova' | 'netopyr' | 'had' | 'golem' | 'pavouk';
export type FigureHrdina = 'magie' | 'luk' | 'dyky' | 'kalich' | 'kladivo';
/** The illustration of the cards that do not choose by `art`. An oracle takes the tarot ones. */
export type Figure = Art | FigureBestie | FigureHrdina;
export type Frame = 'secese' | 'deco' | 'gotika' | 'minimal' | 'baroko' | 'vitraz' | 'luna' | 'keltsky';
export type Palette = 'pulnoc' | 'krev' | 'smaragd' | 'pergamen' | 'ametyst' | 'safir' | 'obsidian' | 'jantar' | 'ruze' | 'tyrkys' | 'popel' | 'mech' | 'vino' | 'slonovina' | 'zima' | 'pisek';
export type CardElement = 'mlha' | 'ohen' | 'les' | 'blesk' | 'stin' | 'voda' | 'led' | 'zeme' | 'svetlo' | 'jed';
export type Foil = 'zadna' | 'zlata' | 'duha' | 'kosmos' | 'stribrna' | 'hranol' | 'perlet' | 'ruzova' | 'medena' | 'plamen' | 'ledova' | 'trpytky' | 'vlny' | 'galaxie';
export type FoilArea = 'cela' | 'ilustrace' | 'okraj';
export type Surface = 'mat' | 'saten' | 'lesk' | 'zrcadlo';
export type Texture = 'zadna' | 'platno' | 'ryhy' | 'zrno' | 'kazeta' | 'pergamen';
export type Edge = 'zlata' | 'cerna' | 'bila' | 'ram' | 'stribrna' | 'medena' | 'ruzova' | 'modra' | 'cervena' | 'zelena' | 'fialova' | 'duha';
export type CardFont = 'cinzel' | 'cormorant' | 'aboreto' | 'gotika' | 'marcellus' | 'uncial' | 'fondamento' | 'metamorphous' | 'vibes';
export type TitleEffect = 'zadny' | 'stin' | 'zare' | 'obrys' | 'ryti';
export type SkyStyle = 'prechod' | 'opacny' | 'zare' | 'plna';
export type SkyPattern = 'zadny' | 'hvezdy' | 'paprsky' | 'kruhy' | 'sit' | 'vlny';
export type Arcana = 'velka' | 'mala';
export type Visibility = 'private' | 'unlisted' | 'public';
export type Interactive = 'tilt' | 'drag' | 'none';
export type BackPattern = 'mandala' | 'hvezdy' | 'kosoctverce' | 'slunce' | 'prazdny' | 'ruzice' | 'mesice' | 'vlny' | 'sachovnice';
export type ItemType = 'text' | 'image' | 'symbol' | 'ornament' | 'stat' | 'shape';
export type ItemSide = 'face' | 'back';
export type ItemFont = 'cinzel' | 'cormorant' | 'kurziva' | 'aboreto' | 'gotika' | 'jost' | 'marcellus' | 'uncial' | 'fondamento' | 'metamorphous' | 'vibes';
export type ItemAlign = 'left' | 'center' | 'right';
export type ItemSymbol =
  | 'hvezda' | 'hvezda8' | 'mesic' | 'slunce' | 'oko' | 'srdce' | 'mec' | 'pohar' | 'pentakl' | 'koruna' | 'klic' | 'plamen' | 'kapka' | 'list' | 'blesk' | 'stit'
  | 'hul' | 'uplnek' | 'kniha' | 'presypaci' | 'miska' | 'kompas' | 'pirko' | 'motyl' | 'lebka' | 'kostka' | 'ruze' | 'ouroboros'
  | 'ohen' | 'voda' | 'vzduch' | 'zeme'
  | 'beran' | 'byk' | 'blizenci' | 'rak' | 'lev' | 'panna' | 'vahy' | 'stir' | 'strelec' | 'kozoroh' | 'vodnar' | 'ryby'
  | 'merkur' | 'venuse' | 'mars' | 'jupiter' | 'saturn';
export type ItemOrnament = 'linka' | 'vlnka' | 'roh' | 'vavrin' | 'paprsky' | 'oblouk' | 'hvezdy' | 'ramecek' | 'faze' | 'ruzice' | 'svitek' | 'kridla' | 'girlanda' | 'hrot' | 'uzel';
export type ItemShape = 'kruh' | 'ctverec' | 'zaobleny' | 'kosoctverec' | 'sestiuhelnik' | 'stit' | 'oblouk' | 'hvezda' | 'trojuhelnik' | 'osmiuhelnik' | 'ctyrlist' | 'stuha' | 'plaketa';
export type ItemBlend = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export interface Enums {
  family: Family[];
  variant: Variant[];
  art: Art[];
  figureBestie: FigureBestie[];
  figureHrdina: FigureHrdina[];
  frame: Frame[];
  palette: Palette[];
  element: CardElement[];
  foil: Foil[];
  foilArea: FoilArea[];
  surface: Surface[];
  texture: Texture[];
  edge: Edge[];
  font: CardFont[];
  titleEffect: TitleEffect[];
  skyStyle: SkyStyle[];
  skyPattern: SkyPattern[];
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
  itemBlend: ItemBlend[];
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

/** Single parts of the print. A layer hidden as a whole hides them all, whatever they say here. */
export interface CardParts {
  title: boolean;
  numeral: boolean;
  /** The second text of a card: a message, a description or a quote. */
  subtitle: boolean;
  plaque: boolean;
  window: boolean;
  border: boolean;
  corners: boolean;
  ornaments: boolean;
  rarity: boolean;
  /** The illustrator and the number in the set. */
  credit: boolean;
}

/** The own colours of a card on top of its palette. An empty one keeps the palette colour. */
export interface CustomColors {
  base: string;
  sky: string;
  metal: string;
  text: string;
  title: string;
  plaque: string;
  /** The panel with the texts of a game card. */
  panel: string;
  glow: string;
  edge: string;
  backBase: string;
  backMetal: string;
}

/** Colour adjustments of the illustration, in percent and for the hue in degrees. */
export interface ArtFilter {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  sepia: number;
}

export interface CardLook {
  variant: Variant;
  art: Art;
  /** Empty means the illustration of the template. See figureChoices(). */
  figure: Figure | '';
  frame: Frame;
  palette: Palette;
  element: CardElement;
  foil: Foil;
  foilI: number;
  /** Which part of the card an overlay foil covers. A full art card has it everywhere. */
  foilArea: FoilArea;
  /** The direction of the rainbow of an overlay foil, in degrees. */
  foilAngle: number;
  surface: Surface;
  texture: Texture;
  textureI: number;
  /** How worn the edges of the card look. */
  wear: number;
  emboss: boolean;
  edge: Edge;
  thick: number;
  radius: number;
  depth: number;
  /** The width of the lines of the frame in percent. */
  frameWeight: number;
  font: CardFont;
  titleScale: number;
  titleCaps: boolean;
  titleEffect: TitleEffect;
  /** Added to the letter spacing of the title, in hundredths of its font size. */
  titleSpacing: number;
  /** Moves the title up or down, in percent of the height of the card. */
  titleOffset: number;
  /** The size of the other texts in percent. */
  bodyScale: number;
  fullArt: boolean;
  artFilter: ArtFilter;
  /** The background behind the illustration. */
  skyStyle: SkyStyle;
  skyPattern: SkyPattern;
  /** How much the corners of the illustration darken. */
  vignette: number;
  colors: CustomColors;
  /** Empty means the same palette as the front. */
  backPalette: Palette | '';
  backPattern: BackPattern;
  visible: LayerVisibility;
  parts: CardParts;
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
  flipX: boolean;
  flipY: boolean;
  /** Floats above the card when positive and sinks into it when negative, as the card turns. */
  depth: number;
  shadow: number;
  blend: ItemBlend;
  /** Stays where it is when dragging over it, which turns the card instead. */
  locked: boolean;
  /** Added to the letter spacing of a text, in hundredths of its font size. */
  spacing: number;
  /** The line height of a text in percent. */
  line: number;
  caps: boolean;
  effect: TitleEffect;
  /** Bends a text upwards when positive and downwards when negative, on one line. */
  curve: number;
  /** The width of an outline, in percent of the width of the item. */
  stroke: number;
  /** A shape that an image gets cut out by. */
  mask: ItemShape | '';
  /** The width of a line around an image, in percent of its width. */
  border: number;
}

export interface StatLabels {
  level: string;
  s1: string;
  s2: string;
  s3: string;
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
  backText: string;
  /** Own captions of the stats. An empty one keeps the caption of the template. */
  labels: StatLabels;
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

/** Which other illustrations a family can take instead of the one of its template. */
export function figureChoices(family: Family): readonly Figure[] {
  switch (family) {
    case 'orakulum':
      return enums.art;
    case 'bestie':
      return enums.figureBestie;
    case 'hrdina':
      return enums.figureHrdina;
    default:
      return [];
  }
}

export function templateFor(family: Family): TemplateDef {
  const found = templateDefs.find((t) => t.family === family);
  if (!found) throw new Error(`Missing template for ${family}`);
  return found;
}
