import { normalizeCard } from '../../card/normalize';
import { enums, templateFor, type CardElement, type CardLook, type Family, type Palette } from '../../card/spec';

// The look of a whole card at once. All of it leaves alone what makes the card this one
// card: its family, its illustration and which of its layers and parts it shows.

/** What a style does not mention goes back to these, so that styles do not pile up on each other. */
const NEUTRAL: Partial<CardLook> = {
  foilI: 70,
  foilArea: 'cela',
  foilAngle: 115,
  surface: 'saten',
  texture: 'zadna',
  textureI: 50,
  wear: 0,
  emboss: true,
  frameWeight: 100,
  font: 'cinzel',
  titleCaps: true,
  titleEffect: 'zadny',
  titleSpacing: 0,
  artFilter: { brightness: 100, contrast: 100, saturate: 100, hue: 0, sepia: 0 },
  skyStyle: 'prechod',
  skyPattern: 'zadny',
  vignette: 0,
  colors: { base: '', sky: '', metal: '', text: '', title: '', plaque: '', panel: '', glow: '', edge: '', backBase: '', backMetal: '' },
  backPalette: '',
  backPattern: 'mandala',
};

export interface LookPreset {
  id: 'pulnocni' | 'krvavy' | 'kniha' | 'hvozd' | 'mraz' | 'prach' | 'deco' | 'alchymie' | 'zahrada' | 'noir' | 'hlubina' | 'hranol';
  palette: Palette;
  /** What a beast has instead of a palette. */
  element: CardElement;
  look: Partial<CardLook>;
}

export const LOOK_PRESETS: LookPreset[] = [
  { id: 'pulnocni', palette: 'pulnoc', element: 'mlha', look: { frame: 'secese', foil: 'zlata', edge: 'zlata', skyPattern: 'hvezdy' } },
  { id: 'krvavy', palette: 'krev', element: 'ohen', look: { frame: 'gotika', foil: 'plamen', foilI: 60, edge: 'cervena', font: 'gotika', titleEffect: 'zare', vignette: 45, backPattern: 'slunce' } },
  {
    id: 'kniha',
    palette: 'pergamen',
    element: 'zeme',
    look: { frame: 'baroko', foil: 'zadna', surface: 'mat', texture: 'pergamen', textureI: 70, wear: 45, edge: 'bila', font: 'fondamento', titleCaps: false, artFilter: { brightness: 100, contrast: 95, saturate: 80, hue: 0, sepia: 35 }, backPattern: 'prazdny' },
  },
  { id: 'hvozd', palette: 'mech', element: 'les', look: { frame: 'keltsky', foil: 'perlet', texture: 'platno', textureI: 40, edge: 'zelena', font: 'uncial', titleCaps: false, skyStyle: 'zare', backPattern: 'kosoctverce' } },
  { id: 'mraz', palette: 'zima', element: 'led', look: { frame: 'vitraz', foil: 'ledova', foilArea: 'ilustrace', surface: 'lesk', edge: 'stribrna', font: 'marcellus', skyPattern: 'kruhy', backPattern: 'ruzice' } },
  { id: 'prach', palette: 'ametyst', element: 'stin', look: { frame: 'luna', foil: 'galaxie', edge: 'fialova', font: 'aboreto', skyStyle: 'zare', skyPattern: 'hvezdy', vignette: 30, backPattern: 'mesice' } },
  { id: 'deco', palette: 'obsidian', element: 'blesk', look: { frame: 'deco', foil: 'zlata', surface: 'lesk', edge: 'zlata', font: 'aboreto', frameWeight: 130, skyPattern: 'paprsky', backPattern: 'sachovnice' } },
  { id: 'alchymie', palette: 'jantar', element: 'zeme', look: { frame: 'baroko', foil: 'medena', edge: 'medena', font: 'metamorphous', texture: 'ryhy', textureI: 35, skyPattern: 'kruhy', backPattern: 'slunce' } },
  { id: 'zahrada', palette: 'ruze', element: 'svetlo', look: { frame: 'secese', foil: 'ruzova', edge: 'ruzova', font: 'vibes', titleCaps: false, titleEffect: 'stin', backPattern: 'ruzice' } },
  {
    id: 'noir',
    palette: 'popel',
    element: 'stin',
    look: { frame: 'minimal', foil: 'stribrna', surface: 'mat', edge: 'cerna', font: 'marcellus', frameWeight: 80, vignette: 55, artFilter: { brightness: 95, contrast: 125, saturate: 0, hue: 0, sepia: 0 }, backPattern: 'prazdny' },
  },
  { id: 'hlubina', palette: 'tyrkys', element: 'voda', look: { frame: 'luna', foil: 'vlny', foilI: 50, edge: 'modra', font: 'cormorant', skyStyle: 'opacny', skyPattern: 'vlny', backPattern: 'vlny' } },
  { id: 'hranol', palette: 'safir', element: 'blesk', look: { frame: 'deco', foil: 'hranol', foilArea: 'okraj', edge: 'duha', font: 'marcellus', titleEffect: 'zare', backPattern: 'kosoctverce' } },
];

export function applyPreset(look: CardLook, preset: LookPreset): CardLook {
  return { ...look, ...NEUTRAL, palette: preset.palette, element: preset.element, ...preset.look };
}

function any<T>(list: readonly T[], random: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))]!;
}

function between([min, max]: readonly [number, number], random: () => number): number {
  return Math.round(min + (max - min) * random());
}

/** A whole new look. The ranges are narrower than the limits, the far ends rarely look good. */
export function randomLook(look: CardLook, random: () => number = Math.random): CardLook {
  return {
    ...look,
    ...NEUTRAL,
    palette: any(enums.palette, random),
    element: any(enums.element, random),
    frame: any(enums.frame, random),
    foil: any(enums.foil, random),
    foilI: between([40, 90], random),
    foilArea: any(enums.foilArea, random),
    foilAngle: between([60, 150], random),
    surface: any(enums.surface, random),
    texture: any(enums.texture, random),
    textureI: between([20, 60], random),
    wear: random() < 0.25 ? between([20, 60], random) : 0,
    edge: any(enums.edge, random),
    font: any(enums.font, random),
    titleEffect: any(enums.titleEffect, random),
    skyStyle: any(enums.skyStyle, random),
    skyPattern: any(enums.skyPattern, random),
    vignette: random() < 0.4 ? between([20, 60], random) : 0,
    frameWeight: between([80, 140], random),
    backPattern: any(enums.backPattern, random),
    backPalette: random() < 0.3 ? any(enums.palette, random) : '',
  };
}

/** Back to the template, except for the illustration the card has by now. */
export function resetLook(look: CardLook, family: Family): CardLook {
  return { ...templateFor(family).defaults.look, art: look.art, figure: look.figure };
}

const CLIPBOARD_KEY = 'arkanum.look';

/** Remembers a look in this browser, to carry it over to another card. */
export function copyLook(look: CardLook): boolean {
  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(look));
    return true;
  } catch {
    return false;
  }
}

export function hasCopiedLook(): boolean {
  try {
    return localStorage.getItem(CLIPBOARD_KEY) !== null;
  } catch {
    return false;
  }
}

/** The remembered look on this card. Whatever is stored there goes through the usual checks. */
export function pasteLook(look: CardLook, family: Family): CardLook | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) ?? 'null');
    if (typeof stored !== 'object' || stored === null) return null;
    const pasted = normalizeCard({ family, look: stored }).look;
    return { ...pasted, art: look.art, figure: look.figure, visible: look.visible, parts: look.parts };
  } catch {
    return null;
  }
}
