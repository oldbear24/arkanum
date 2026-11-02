import { enums } from '../../card/spec';
import type { Art, BackPattern, CardElement, CardFont, CardItem, Edge, Family, Foil, Frame, ItemAlign, ItemFont, ItemOrnament, ItemShape, ItemSymbol, ItemType, LayerVisibility, Palette, Surface, Arcana } from '../../card/spec';
import { WIN } from '../../card/geometry';
import { PAL } from '../../card/resolve';
import type { IconName } from '../../components/Icon';
import { cs } from '../../i18n/cs';
import type { TabId } from './context';

const w = cs.workshop;

export const BACK_PATTERNS: { id: BackPattern; label: string }[] = enums.backPattern.map((id) => ({ id, label: w.backPatterns[id] }));

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

export const ITEM_SYMBOLS = enums.itemSymbol.map((id) => ({ id, label: i.symbols[id] }));
export const ITEM_ORNAMENTS = enums.itemOrnament.map((id) => ({ id, label: i.ornaments[id] }));
export const ITEM_SHAPES = enums.itemShape.map((id) => ({ id, label: i.shapes[id] }));

export const ITEM_FONTS: { id: ItemFont; label: string; family: string; weight: number; italic?: boolean }[] = [
  { id: 'cinzel', label: i.fonts.cinzel, family: "'Cinzel', Georgia, serif", weight: 600 },
  { id: 'cormorant', label: i.fonts.cormorant, family: "'Cormorant Garamond', Georgia, serif", weight: 600 },
  { id: 'kurziva', label: i.fonts.kurziva, family: "'Cormorant Garamond', Georgia, serif", weight: 600, italic: true },
  { id: 'aboreto', label: i.fonts.aboreto, family: "'Aboreto', Georgia, serif", weight: 400 },
  { id: 'gotika', label: i.fonts.gotika, family: "'Grenze Gotisch', Georgia, serif", weight: 600 },
  { id: 'jost', label: i.fonts.jost, family: "'Jost', system-ui, sans-serif", weight: 500 },
];

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

export const ARTS: { id: Art; label: string; numeral: string }[] = (['hvezda', 'mesic', 'slunce', 'mag'] as const).map((id) => ({
  id,
  label: cs.card.arts[id].name,
  numeral: cs.card.arts[id].numeral,
}));

export const FRAMES: { id: Frame; label: string; short: string; win: string }[] = [
  { id: 'secese', label: w.frames.secese, short: w.frames.secese, win: WIN.secese },
  { id: 'deco', label: w.frames.deco, short: w.frames.decoShort, win: WIN.deco },
  { id: 'gotika', label: w.frames.gotika, short: w.frames.gotika, win: WIN.gotika },
  { id: 'minimal', label: w.frames.minimal, short: w.frames.minimal, win: WIN.minimal },
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
];

export const ELEMENTS: { id: CardElement; label: string; color: string }[] = [
  { id: 'mlha', label: cs.card.elements.mlha, color: '#5fc4b8' },
  { id: 'ohen', label: cs.card.elements.ohen, color: '#ee7a45' },
  { id: 'les', label: cs.card.elements.les, color: '#7cbf5a' },
  { id: 'blesk', label: cs.card.elements.blesk, color: '#e6c548' },
  { id: 'stin', label: cs.card.elements.stin, color: '#a58be6' },
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
];

export const SURFACES: { id: Surface; label: string }[] = [
  { id: 'mat', label: w.surfaces.mat },
  { id: 'saten', label: w.surfaces.saten },
  { id: 'lesk', label: w.surfaces.lesk },
];

export const EDGES: { id: Edge; label: string; short: string; swatch?: string }[] = [
  { id: 'zlata', label: w.edges.zlata, short: w.edges.zlata, swatch: 'linear-gradient(90deg, #8a6a2f, #f0d796, #8a6a2f)' },
  { id: 'cerna', label: w.edges.cerna, short: w.edges.cerna, swatch: '#141416' },
  { id: 'bila', label: w.edges.bila, short: w.edges.bila, swatch: '#ece6d8' },
  { id: 'ram', label: w.edges.ram, short: w.edges.ramShort },
  { id: 'stribrna', label: w.edges.stribrna, short: w.edges.stribrna, swatch: 'linear-gradient(90deg, #7f858f, #e4e7ec, #7f858f)' },
  { id: 'medena', label: w.edges.medena, short: w.edges.medena, swatch: 'linear-gradient(90deg, #84492a, #e3a26f, #84492a)' },
];

export const FONTS: { id: CardFont; label: string; family: string; weight: number }[] = [
  { id: 'cinzel', label: w.fonts.cinzel, family: "'Cinzel', Georgia, serif", weight: 600 },
  { id: 'cormorant', label: w.fonts.cormorant, family: "'Cormorant Garamond', Georgia, serif", weight: 700 },
  { id: 'aboreto', label: w.fonts.aboreto, family: "'Aboreto', Georgia, serif", weight: 400 },
  { id: 'gotika', label: w.fonts.gotika, family: "'Grenze Gotisch', Georgia, serif", weight: 600 },
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
