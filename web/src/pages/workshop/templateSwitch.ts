import { cs } from '../../i18n/cs';
import { templateFor, type CardContent, type CardDoc, type CardLook, type CardMeaning, type Family } from '../../card/spec';

// VDEF from design/Dilna.dc.html: which values a template resets when switching to it.
// Everything else (thickness, surface, font, the element…) stays as the user set it.
// The figure goes too, because every family has other illustrations to choose from.
// Tarot also resets its meaning, otherwise a detour over the oracle would leave its text there.
const SWITCH_KEYS: Record<Family, { look: (keyof CardLook)[]; content: (keyof CardContent)[]; meaning: (keyof CardMeaning)[] }> = {
  tarot: { look: ['palette', 'frame', 'foil', 'edge', 'figure'], content: ['subtitle'], meaning: ['upright', 'reversed', 'keywords'] },
  orakulum: { look: ['palette', 'frame', 'foil', 'edge', 'figure'], content: ['subtitle'], meaning: ['upright'] },
  bestie: { look: ['foil', 'edge', 'figure'], content: ['subtitle', 's1', 's2', 'abilities'], meaning: [] },
  hrdina: { look: ['foil', 'edge', 'figure'], content: ['subtitle', 's1', 's2', 's3', 'abilities'], meaning: [] },
  prazdna: { look: ['palette', 'frame', 'foil', 'edge', 'figure'], content: ['subtitle'], meaning: [] },
};

function copyKeys<T extends object>(target: T, source: T, keys: (keyof T)[]): T {
  const result = { ...target };
  for (const key of keys) result[key] = source[key];
  return result;
}

/** Switches a card to another template and applies its default values. */
export function applyTemplate(doc: CardDoc, family: Family): CardDoc {
  const template = templateFor(family);
  const keys = SWITCH_KEYS[family];
  const defaults = template.defaults;
  const art = cs.card.arts[doc.look.art];

  const look = copyKeys(doc.look, defaults.look, keys.look);
  const content = copyKeys(doc.content, defaults.content, keys.content);

  return {
    ...doc,
    family,
    formatW: template.formatW,
    formatH: template.formatH,
    title: family === 'tarot' ? art.name : defaults.title,
    look: { ...look, variant: family },
    content: family === 'tarot' ? { ...content, numeral: art.numeral } : content,
    meaning: copyKeys(doc.meaning, defaults.meaning, keys.meaning),
  };
}

/** The texts a card of this family actually shows or lets the user edit. */
function textsOf(family: Family, content: CardContent, meaning: CardMeaning): unknown[] {
  const abilities = content.abilities.map((ability) => [ability.name, ability.text]);
  switch (family) {
    case 'tarot':
      return [meaning.upright, meaning.reversed, meaning.keywords];
    case 'orakulum':
      return [content.subtitle, meaning.upright];
    case 'bestie':
      return [content.subtitle, abilities];
    case 'hrdina':
      return [content.subtitle, content.cls, abilities[0]];
    case 'prazdna':
      return [content.subtitle];
  }
}

/** True when the user wrote something that switching the template would throw away. */
export function hasEditedTexts(doc: CardDoc): boolean {
  const defaults = templateFor(doc.family).defaults;
  const art = cs.card.arts[doc.look.art];
  const isTarot = doc.family === 'tarot';

  if (doc.title !== (isTarot ? art.name : defaults.title)) return true;
  if (isTarot && doc.content.numeral !== art.numeral) return true;
  return JSON.stringify(textsOf(doc.family, doc.content, doc.meaning)) !== JSON.stringify(textsOf(doc.family, defaults.content, defaults.meaning));
}
