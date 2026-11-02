import { enums, figureChoices } from '../../card/spec';
import type { ArtFilter, Art, BackPattern, CardElement, CardFont, CardItem, CardParts, Edge, Family, Figure, Foil, FoilArea, Frame, ItemAlign, ItemBlend, ItemFont, ItemOrnament, ItemShape, ItemSymbol, ItemType, LayerVisibility, Palette, SkyPattern, SkyStyle, Surface, Texture, TitleEffect, Arcana } from '../../card/spec';
import { WIN } from '../../card/geometry';
import { PAL } from '../../card/resolve';
import type { IconName } from '../../components/Icon';
import { cs } from '../../i18n/cs';
import type { TabId } from './context';

const w = cs.workshop;

export const BACK_PATTERNS: { id: BackPattern; label: string }[] = enums.backPattern.map((id) => ({ id, label: w.backPatterns[id] }));

export const SKY_STYLES: { id: SkyStyle; label: string }[] = enums.skyStyle.map((id) => ({ id, label: w.skyStyles[id] }));
export const SKY_PATTERNS: { id: SkyPattern; label: string }[] = enums.skyPattern.map((id) => ({ id, label: w.skyPatterns[id] }));
export const FOIL_AREAS: { id: FoilArea; label: string }[] = enums.foilArea.map((id) => ({ id, label: w.foilAreas[id] }));
export const TEXTURES: { id: Texture; label: string }[] = enums.texture.map((id) => ({ id, label: w.textures[id] }));
export const TITLE_EFFECTS: { id: TitleEffect; label: string }[] = enums.titleEffect.map((id) => ({ id, label: w.titleEffects[id] }));

const f = w.filterPresets;

/** Ready adjustments of the colours of an illustration. */
export const ART_FILTERS: { id: string; label: string; filter: ArtFilter }[] = [
  { id: 'cernobila', label: f.cernobila, filter: { brightness: 100, contrast: 105, saturate: 0, hue: 0, sepia: 0 } },
  { id: 'sepie', label: f.sepie, filter: { brightness: 100, contrast: 95, saturate: 80, hue: 0, sepia: 80 } },
  { id: 'noir', label: f.noir, filter: { brightness: 90, contrast: 140, saturate: 0, hue: 0, sepia: 0 } },
  { id: 'vybledla', label: f.vybledla, filter: { brightness: 110, contrast: 75, saturate: 60, hue: 0, sepia: 15 } },
  { id: 'tepla', label: f.tepla, filter: { brightness: 105, contrast: 100, saturate: 120, hue: -12, sepia: 20 } },
  { id: 'studena', label: f.studena, filter: { brightness: 100, contrast: 105, saturate: 90, hue: 18, sepia: 0 } },
];

/** The other illustrations of a family, with the one of its template first. */
export function figureOptions(family: Family): { id: Figure | ''; label: string }[] {
  const names = w.artNames as Partial<Record<Family, string>>;
  const figures = w.figures as Partial<Record<Figure, string>>;
  const arts = cs.card.arts as Partial<Record<Figure, { name: string }>>;
  const others = figureChoices(family).map((id) => ({ id, label: figures[id] ?? arts[id]?.name ?? id }));
  return others.length > 0 ? [{ id: '', label: names[family] ?? '' }, ...others] : [];
}

const SECOND_TEXT: Partial<Record<Family, string>> = { orakulum: w.message, bestie: w.creatureDescription, hrdina: w.quote, prazdna: w.cardText };

/** The parts of a card that can be switched off one by one, and how each family calls them. */
export function partOptions(family: Family): { id: keyof CardParts; label: string }[] {
  const p = w.parts;
  const second = SECOND_TEXT[family];
  const rows: { id: keyof CardParts; label: string; only?: Family[]; not?: Family[] }[] = [
    { id: 'title', label: p.title },
    { id: 'numeral', label: p.numeral, only: ['tarot'] },
    { id: 'subtitle', label: second ?? '', not: ['tarot'] },
    { id: 'plaque', label: p.plaque, not: ['orakulum', 'prazdna'] },
    { id: 'window', label: p.window },
    { id: 'border', label: p.border },
    { id: 'corners', label: p.corners, not: ['prazdna'] },
    { id: 'ornaments', label: p.ornaments, not: ['hrdina', 'prazdna'] },
    { id: 'rarity', label: p.rarity, only: ['bestie'] },
    { id: 'credit', label: family === 'hrdina' ? p.creditHero : p.credit, only: ['bestie', 'hrdina'] },
  ];
  return rows.filter((row) => (!row.only || row.only.includes(family)) && !row.not?.includes(family));
}

export const VARIANT_OPTIONS: { id: Family; label: string; icon: string }[] = [
  { id: 'tarot', label: cs.family.tarot, icon: 'M7 3H17V21H7ZM12 8L13 11L16 12L13 13L12 16L11 13L8 12L11 11Z' },
  { id: 'bestie', label: cs.family.bestie, icon: 'M12 3C15 6 17 9 16 13C15 16 13 18 12 21C11 18 9 16 8 13C7 9 9 6 12 3Z' },
  { id: 'hrdina', label: cs.family.hrdina, icon: 'M5 4H19V11C19 16 15.5 19 12 21C8.5 19 5 16 5 11Z' },
  { id: 'orakulum', label: cs.family.orakulum, icon: 'M15 4A8 8 0 1 0 20 15A6.5 6.5 0 1 1 15 4Z' },
];

export const BLANK_OPTION = { id: 'prazdna' as Family, label: cs.family.prazdna, icon: 'M6 3H18V21H6Z' };

type LayerGroup = keyof LayerVisibility | 'base';

export interface LayerDef {
  id: string;
  label: string;
  group: LayerGroup;
  tab: TabId;
}

const l = w.layers;

export const LAYERS: Record<Family, LayerDef[]> = {
  tarot: [
    { id: 'lesk', label: l.lesk, group: 'foil', tab: 'material' },
    { id: 'titulek', label: l.titulek, group: 'text', tab: 'text' },
    { id: 'cislo', label: l.cislo, group: 'text', tab: 'text' },
    { id: 'ornamenty', label: l.ornamenty, group: 'frame', tab: 'vzhled' },
    { id: 'ram', label: l.ram, group: 'frame', tab: 'vzhled' },
    { id: 'popredi', label: l.popredi, group: 'art', tab: 'vzhled' },
    { id: 'pozadi', label: l.pozadi, group: 'art', tab: 'vzhled' },
    { id: 'podklad', label: l.podklad, group: 'base', tab: 'vzhled' },
  ],
  orakulum: [
    { id: 'lesk', label: l.lesk, group: 'foil', tab: 'material' },
    { id: 'titulek', label: l.titulek, group: 'text', tab: 'text' },
    { id: 'poselstvi', label: l.poselstvi, group: 'text', tab: 'text' },
    { id: 'ram', label: l.ramOrnamenty, group: 'frame', tab: 'vzhled' },
    { id: 'ilustrace', label: l.ilustrace, group: 'art', tab: 'vzhled' },
    { id: 'podklad', label: l.podklad, group: 'base', tab: 'vzhled' },
  ],
  bestie: [
    { id: 'lesk', label: l.lesk, group: 'foil', tab: 'material' },
    { id: 'statistiky', label: l.statistiky, group: 'text', tab: 'data' },
    { id: 'schopnosti', label: l.schopnosti, group: 'text', tab: 'data' },
    { id: 'jmeno', label: l.jmenoErb, group: 'text', tab: 'text' },
    { id: 'ram', label: l.ram, group: 'frame', tab: 'vzhled' },
    { id: 'bytost', label: l.bytost, group: 'art', tab: 'vzhled' },
    { id: 'bazina', label: l.bazina, group: 'art', tab: 'vzhled' },
    { id: 'podklad', label: l.podklad, group: 'base', tab: 'vzhled' },
  ],
  hrdina: [
    { id: 'lesk', label: l.lesk, group: 'foil', tab: 'material' },
    { id: 'vlastnosti', label: l.vlastnosti, group: 'text', tab: 'data' },
    { id: 'schopnost', label: l.schopnostCitat, group: 'text', tab: 'data' },
    { id: 'jmeno', label: l.jmenoCena, group: 'text', tab: 'text' },
    { id: 'ram', label: l.ram, group: 'frame', tab: 'vzhled' },
    { id: 'ilustrace', label: l.ilustrace, group: 'art', tab: 'vzhled' },
    { id: 'podklad', label: l.podklad, group: 'base', tab: 'vzhled' },
  ],
  prazdna: [
    { id: 'lesk', label: l.lesk, group: 'foil', tab: 'material' },
    { id: 'titulek', label: l.titulek, group: 'text', tab: 'text' },
    { id: 'poselstvi', label: l.textKarty, group: 'text', tab: 'text' },
    { id: 'ram', label: l.ram, group: 'frame', tab: 'vzhled' },
    { id: 'ilustrace', label: l.ilustrace, group: 'art', tab: 'vzhled' },
    { id: 'podklad', label: l.podklad, group: 'base', tab: 'vzhled' },
  ],
};

export const LAYER_ICONS: Record<LayerGroup, IconName> = {
  foil: 'sparkle',
  text: 'text',
  frame: 'frame',
  art: 'image',
  base: 'layers',
};

export const ADD_ELEMENTS: { type: ItemType; label: string; icon: IconName }[] = [
  { type: 'text', label: w.addElements.text, icon: 'text' },
  { type: 'image', label: w.addElements.image, icon: 'image' },
  { type: 'symbol', label: w.addElements.symbol, icon: 'symbol' },
  { type: 'ornament', label: w.addElements.ornament, icon: 'ornament' },
  { type: 'stat', label: w.addElements.stat, icon: 'stats' },
  { type: 'shape', label: w.addElements.shape, icon: 'shape' },
];

export const ITEM_ICONS: Record<ItemType, IconName> = {
  text: 'text',
  image: 'image',
  symbol: 'symbol',
  ornament: 'ornament',
  stat: 'stats',
  shape: 'shape',
};

const i = w.items;

const symbolOptions = (ids: ItemSymbol[]) => ids.map((id) => ({ id, label: i.symbols[id] }));

/** The symbols in groups, there are too many of them to look through at once. */
export const SYMBOL_GROUPS: { title: string; options: { id: ItemSymbol; label: string }[] }[] = [
  { title: i.symbolGroups.zaklad, options: symbolOptions(['hvezda', 'hvezda8', 'mesic', 'uplnek', 'slunce', 'oko', 'srdce', 'koruna', 'plamen', 'kapka', 'list', 'blesk', 'stit', 'ruze', 'motyl', 'pirko']) },
  { title: i.symbolGroups.predmety, options: symbolOptions(['mec', 'pohar', 'pentakl', 'hul', 'klic', 'kniha', 'presypaci', 'miska', 'kompas', 'kostka', 'lebka', 'ouroboros']) },
  { title: i.symbolGroups.zivly, options: symbolOptions(['ohen', 'voda', 'vzduch', 'zeme']) },
  { title: i.symbolGroups.zverokruh, options: symbolOptions(['beran', 'byk', 'blizenci', 'rak', 'lev', 'panna', 'vahy', 'stir', 'strelec', 'kozoroh', 'vodnar', 'ryby']) },
  { title: i.symbolGroups.planety, options: symbolOptions(['merkur', 'venuse', 'mars', 'jupiter', 'saturn']) },
];

export const ITEM_ORNAMENTS = enums.itemOrnament.map((id) => ({ id, label: i.ornaments[id] }));
export const ITEM_SHAPES = enums.itemShape.map((id) => ({ id, label: i.shapes[id] }));

export const ITEM_FONTS: { id: ItemFont; label: string; family: string; weight: number; italic?: boolean }[] = [
  { id: 'cinzel', label: i.fonts.cinzel, family: "'Cinzel', Georgia, serif", weight: 600 },
  { id: 'cormorant', label: i.fonts.cormorant, family: "'Cormorant Garamond', Georgia, serif", weight: 600 },
  { id: 'kurziva', label: i.fonts.kurziva, family: "'Cormorant Garamond', Georgia, serif", weight: 600, italic: true },
  { id: 'aboreto', label: i.fonts.aboreto, family: "'Aboreto', Georgia, serif", weight: 400 },
  { id: 'gotika', label: i.fonts.gotika, family: "'Grenze Gotisch', Georgia, serif", weight: 600 },
  { id: 'jost', label: i.fonts.jost, family: "'Jost', system-ui, sans-serif", weight: 500 },
  { id: 'marcellus', label: i.fonts.marcellus, family: "'Marcellus', Georgia, serif", weight: 400 },
  { id: 'uncial', label: i.fonts.uncial, family: "'Uncial Antiqua', Georgia, serif", weight: 400 },
  { id: 'fondamento', label: i.fonts.fondamento, family: "'Fondamento', Georgia, serif", weight: 400 },
  { id: 'metamorphous', label: i.fonts.metamorphous, family: "'Metamorphous', Georgia, serif", weight: 400 },
  { id: 'vibes', label: i.fonts.vibes, family: "'Great Vibes', Georgia, cursive", weight: 400 },
];

export const ITEM_BLENDS: { id: ItemBlend; label: string }[] = enums.itemBlend.map((id) => ({ id, label: i.blends[id] }));

export const ITEM_ALIGNS: { id: ItemAlign; label: string }[] = enums.itemAlign.map((id) => ({ id, label: i.aligns[id] }));

/** How the lists call an item. A text goes by its own first words. */
export function itemName(item: CardItem): string {
  switch (item.type) {
    case 'text':
      return item.text.trim().split('\n')[0] || i.names.text;
    case 'stat':
      return [item.text, item.value].filter(Boolean).join(' ') || i.names.stat;
    case 'symbol':
      return i.symbols[item.kind as ItemSymbol] ?? i.names.symbol;
    case 'ornament':
      return i.ornaments[item.kind as ItemOrnament] ?? i.names.ornament;
    case 'shape':
      return i.shapes[item.kind as ItemShape] ?? i.names.shape;
    case 'image':
      return i.names.image;
  }
}

export const ARTS: { id: Art; label: string; numeral: string }[] = enums.art.map((id) => ({
  id,
  label: cs.card.arts[id].name,
  numeral: cs.card.arts[id].numeral,
}));

export const FRAMES: { id: Frame; label: string; short: string; win: string }[] = [
  { id: 'secese', label: w.frames.secese, short: w.frames.secese, win: WIN.secese },
  { id: 'deco', label: w.frames.deco, short: w.frames.decoShort, win: WIN.deco },
  { id: 'gotika', label: w.frames.gotika, short: w.frames.gotika, win: WIN.gotika },
  { id: 'minimal', label: w.frames.minimal, short: w.frames.minimal, win: WIN.minimal },
  { id: 'baroko', label: w.frames.baroko, short: w.frames.baroko, win: WIN.baroko },
  { id: 'vitraz', label: w.frames.vitraz, short: w.frames.vitraz, win: WIN.vitraz },
  { id: 'luna', label: w.frames.luna, short: w.frames.luna, win: WIN.luna },
  { id: 'keltsky', label: w.frames.keltsky, short: w.frames.keltsky, win: WIN.keltsky },
];

export const PALETTES: { id: Palette; label: string; base: string; gold: string }[] = [
  { id: 'pulnoc', label: w.palettes.pulnoc, base: PAL.pulnoc.base, gold: '#d6b067' },
  { id: 'krev', label: w.palettes.krev, base: PAL.krev.base, gold: '#dca55a' },
  { id: 'smaragd', label: w.palettes.smaragd, base: PAL.smaragd.base, gold: '#d3b56f' },
  { id: 'pergamen', label: w.palettes.pergamen, base: PAL.pergamen.base, gold: '#4b3520' },
  { id: 'ametyst', label: w.palettes.ametyst, base: PAL.ametyst.base, gold: PAL.ametyst.g1 },
  { id: 'safir', label: w.palettes.safir, base: PAL.safir.base, gold: PAL.safir.g1 },
  { id: 'obsidian', label: w.palettes.obsidian, base: PAL.obsidian.base, gold: PAL.obsidian.g1 },
  { id: 'jantar', label: w.palettes.jantar, base: PAL.jantar.base, gold: PAL.jantar.g1 },
  { id: 'ruze', label: w.palettes.ruze, base: PAL.ruze.base, gold: PAL.ruze.g1 },
  { id: 'tyrkys', label: w.palettes.tyrkys, base: PAL.tyrkys.base, gold: PAL.tyrkys.g1 },
  { id: 'popel', label: w.palettes.popel, base: PAL.popel.base, gold: PAL.popel.g1 },
  { id: 'mech', label: w.palettes.mech, base: PAL.mech.base, gold: PAL.mech.g1 },
  { id: 'vino', label: w.palettes.vino, base: PAL.vino.base, gold: PAL.vino.g1 },
  { id: 'slonovina', label: w.palettes.slonovina, base: PAL.slonovina.base, gold: PAL.slonovina.g1 },
  { id: 'zima', label: w.palettes.zima, base: PAL.zima.base, gold: PAL.zima.g1 },
  { id: 'pisek', label: w.palettes.pisek, base: PAL.pisek.base, gold: PAL.pisek.g1 },
];

export const ELEMENTS: { id: CardElement; label: string; color: string }[] = [
  { id: 'mlha', label: cs.card.elements.mlha, color: '#5fc4b8' },
  { id: 'ohen', label: cs.card.elements.ohen, color: '#ee7a45' },
  { id: 'les', label: cs.card.elements.les, color: '#7cbf5a' },
  { id: 'blesk', label: cs.card.elements.blesk, color: '#e6c548' },
  { id: 'stin', label: cs.card.elements.stin, color: '#a58be6' },
  { id: 'voda', label: cs.card.elements.voda, color: '#4a9fe0' },
  { id: 'led', label: cs.card.elements.led, color: '#8fdbe8' },
  { id: 'zeme', label: cs.card.elements.zeme, color: '#b58a5a' },
  { id: 'svetlo', label: cs.card.elements.svetlo, color: '#efe2b0' },
  { id: 'jed', label: cs.card.elements.jed, color: '#b4d23c' },
];

export const FOILS: { id: Foil; label: string; short: string; swatch: string }[] = [
  { id: 'zadna', label: w.foils.zadna, short: w.foils.zadnaShort, swatch: 'linear-gradient(135deg, #2b2650, #2b2650)' },
  { id: 'zlata', label: w.foils.zlata, short: w.foils.zlata, swatch: 'linear-gradient(135deg, #7d5f28 0%, #f3dca0 48%, #8f6c2f 100%)' },
  { id: 'duha', label: w.foils.duha, short: w.foils.duha, swatch: 'linear-gradient(135deg, #ff7ab6 0%, #ffd36b 30%, #6bffc8 55%, #6bb6ff 78%, #c08bff 100%)' },
  {
    id: 'kosmos',
    label: w.foils.kosmos,
    short: w.foils.kosmosShort,
    swatch:
      'radial-gradient(circle at 30% 35%, #ffffff 0, #ffffff 1px, rgba(255,255,255,0) 2px), radial-gradient(circle at 70% 60%, #ffe2aa 0, #ffe2aa 1px, rgba(255,255,255,0) 2px), radial-gradient(circle at 45% 80%, #b4d6ff 0, #b4d6ff 1px, rgba(255,255,255,0) 2px), linear-gradient(135deg, #1b1740, #3a2a6a)',
  },
  { id: 'stribrna', label: w.foils.stribrna, short: w.foils.stribrna, swatch: 'linear-gradient(135deg, #5d6470 0%, #f7f9fc 48%, #6f7682 100%)' },
  { id: 'hranol', label: w.foils.hranol, short: w.foils.hranol, swatch: 'repeating-linear-gradient(115deg, #ff5caa 0, #ffd666 5px, #68ffc4 10px, #5cb2ff 15px, #c478ff 20px, #ff5caa 25px)' },
  { id: 'perlet', label: w.foils.perlet, short: w.foils.perlet, swatch: 'linear-gradient(135deg, #f4dfe8 0%, #e2f0ff 50%, #e8ffef 100%)' },
  { id: 'ruzova', label: w.foils.ruzova, short: w.foils.ruzovaShort, swatch: 'linear-gradient(135deg, #7d4f4a 0%, #fff1ec 48%, #8f5a54 100%)' },
  { id: 'medena', label: w.foils.medena, short: w.foils.medena, swatch: 'linear-gradient(135deg, #6a3518 0%, #ffe3c8 48%, #7d4322 100%)' },
  { id: 'plamen', label: w.foils.plamen, short: w.foils.plamen, swatch: 'linear-gradient(135deg, #ff3c1e 0%, #ff9628 45%, #ffe278 75%, #ff781e 100%)' },
  { id: 'ledova', label: w.foils.ledova, short: w.foils.ledova, swatch: 'linear-gradient(135deg, #5096ff 0%, #78e6ff 45%, #ebfcff 75%, #78beff 100%)' },
  {
    id: 'trpytky',
    label: w.foils.trpytky,
    short: w.foils.trpytky,
    swatch:
      'radial-gradient(circle at 25% 30%, #ffffff 0, #ffffff 1px, rgba(255,255,255,0) 2px), radial-gradient(circle at 60% 25%, #ffe2aa 0, #ffe2aa 1px, rgba(255,255,255,0) 2px), radial-gradient(circle at 75% 65%, #ffffff 0, #ffffff 1px, rgba(255,255,255,0) 2px), radial-gradient(circle at 35% 72%, #b4d6ff 0, #b4d6ff 1px, rgba(255,255,255,0) 2px), linear-gradient(135deg, #4a4668, #2b2650)',
  },
  { id: 'vlny', label: w.foils.vlny, short: w.foils.vlny, swatch: 'repeating-radial-gradient(circle at 30% 30%, #ff5caa 0, #ffd666 4px, #68ffc4 8px, #5cb2ff 12px, #ff5caa 16px)' },
  { id: 'galaxie', label: w.foils.galaxie, short: w.foils.galaxie, swatch: 'radial-gradient(circle at 30% 35%, #a05aff 0, rgba(160,90,255,0) 55%), radial-gradient(circle at 72% 60%, #46a0ff 0, rgba(70,160,255,0) 55%), linear-gradient(135deg, #15102e, #241a4a)' },
];

export const SURFACES: { id: Surface; label: string }[] = [
  { id: 'mat', label: w.surfaces.mat },
  { id: 'saten', label: w.surfaces.saten },
  { id: 'lesk', label: w.surfaces.lesk },
  { id: 'zrcadlo', label: w.surfaces.zrcadlo },
];

export const EDGES: { id: Edge; label: string; short: string; swatch?: string }[] = [
  { id: 'zlata', label: w.edges.zlata, short: w.edges.zlata, swatch: 'linear-gradient(90deg, #8a6a2f, #f0d796, #8a6a2f)' },
  { id: 'cerna', label: w.edges.cerna, short: w.edges.cerna, swatch: '#141416' },
  { id: 'bila', label: w.edges.bila, short: w.edges.bila, swatch: '#ece6d8' },
  { id: 'ram', label: w.edges.ram, short: w.edges.ramShort },
  { id: 'stribrna', label: w.edges.stribrna, short: w.edges.stribrna, swatch: 'linear-gradient(90deg, #7f858f, #e4e7ec, #7f858f)' },
  { id: 'medena', label: w.edges.medena, short: w.edges.medena, swatch: 'linear-gradient(90deg, #84492a, #e3a26f, #84492a)' },
  { id: 'ruzova', label: w.edges.ruzova, short: w.edges.ruzova, swatch: 'linear-gradient(90deg, #a56f68, #f0c4b8, #a56f68)' },
  { id: 'modra', label: w.edges.modra, short: w.edges.modra, swatch: 'linear-gradient(90deg, #2c4f8c, #6f9fe0, #2c4f8c)' },
  { id: 'cervena', label: w.edges.cervena, short: w.edges.cervena, swatch: 'linear-gradient(90deg, #7f1f26, #d24a4a, #7f1f26)' },
  { id: 'zelena', label: w.edges.zelena, short: w.edges.zelena, swatch: 'linear-gradient(90deg, #1f6a48, #4fbf88, #1f6a48)' },
  { id: 'fialova', label: w.edges.fialova, short: w.edges.fialova, swatch: 'linear-gradient(90deg, #4f3288, #9a74e0, #4f3288)' },
  { id: 'duha', label: w.edges.duha, short: w.edges.duha, swatch: 'linear-gradient(180deg, #ff5caa, #ffd666, #68ffc4, #5cb2ff, #c478ff)' },
];

export const FONTS: { id: CardFont; label: string; family: string; weight: number }[] = [
  { id: 'cinzel', label: w.fonts.cinzel, family: "'Cinzel', Georgia, serif", weight: 600 },
  { id: 'cormorant', label: w.fonts.cormorant, family: "'Cormorant Garamond', Georgia, serif", weight: 700 },
  { id: 'aboreto', label: w.fonts.aboreto, family: "'Aboreto', Georgia, serif", weight: 400 },
  { id: 'gotika', label: w.fonts.gotika, family: "'Grenze Gotisch', Georgia, serif", weight: 600 },
  { id: 'marcellus', label: w.fonts.marcellus, family: "'Marcellus', Georgia, serif", weight: 400 },
  { id: 'uncial', label: w.fonts.uncial, family: "'Uncial Antiqua', Georgia, serif", weight: 400 },
  { id: 'fondamento', label: w.fonts.fondamento, family: "'Fondamento', Georgia, serif", weight: 400 },
  { id: 'metamorphous', label: w.fonts.metamorphous, family: "'Metamorphous', Georgia, serif", weight: 400 },
  { id: 'vibes', label: w.fonts.vibes, family: "'Great Vibes', Georgia, cursive", weight: 400 },
];

export const ARCANAS: { id: Arcana; label: string }[] = [
  { id: 'velka', label: w.arcanas.velka },
  { id: 'mala', label: w.arcanas.mala },
];

export function dataTabLabel(family: Family): string | null {
  if (family === 'tarot') return w.tabs.vyznam;
  if (family === 'orakulum') return w.tabs.vyklad;
  if (family === 'bestie' || family === 'hrdina') return w.tabs.hra;
  return null;
}

export function millimetres(value: number, digits: number): string {
  return `${value.toFixed(digits).replace('.', ',')} mm`;
}
