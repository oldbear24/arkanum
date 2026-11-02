import { describe, expect, it } from 'vitest';
import { normalizeCard } from '../../card/normalize';
import { applyTemplate, hasEditedTexts } from './templateSwitch';

describe('applyTemplate', () => {
  it('applies VDEF of the bestie', () => {
    const doc = applyTemplate(normalizeCard({ family: 'tarot' }), 'bestie');
    expect(doc.family).toBe('bestie');
    expect(doc.look.variant).toBe('bestie');
    expect(doc.title).toBe('Bludička');
    expect(doc.content.subtitle).toBe('');
    expect(doc.look.foil).toBe('kosmos');
    expect(doc.look.edge).toBe('cerna');
    expect(doc.content).toMatchObject({ s1: 3, s2: 2 });
    expect(doc.content.abilities.map((a) => [a.name, a.power])).toEqual([['Mámení', 20], ['Bažinné světlo', 50]]);
    expect([doc.formatW, doc.formatH]).toEqual([63, 88]);
  });

  it('applies VDEF of the oracle', () => {
    const doc = applyTemplate(normalizeCard({ family: 'bestie' }), 'orakulum');
    expect(doc.title).toBe('Trpělivost');
    expect(doc.content.subtitle).toBe('Co má vyrůst, nespěchá.');
    expect(doc.look).toMatchObject({ palette: 'pergamen', frame: 'minimal', foil: 'zadna', edge: 'bila' });
    expect(doc.meaning.upright).toContain('Nespěchej');
    expect([doc.formatW, doc.formatH]).toEqual([70, 120]);
  });

  it('applies VDEF of the hero', () => {
    const doc = applyTemplate(normalizeCard({ family: 'tarot' }), 'hrdina');
    expect(doc.title).toBe('Strážkyně brány');
    expect(doc.content).toMatchObject({ s1: 4, s2: 6, s3: 2, subtitle: 'Brána se otevře jen tomu, kdo zná heslo.' });
    expect(doc.content.abilities[0]?.name).toBe('Hradba');
    expect(doc.look).toMatchObject({ foil: 'zlata', edge: 'cerna' });
  });

  it('derives the tarot title and numeral from the current artwork', () => {
    const doc = applyTemplate(normalizeCard({ family: 'bestie', look: { art: 'slunce' } }), 'tarot');
    expect(doc.title).toBe('Slunce');
    expect(doc.content.numeral).toBe('XIX');
    expect(doc.look).toMatchObject({ palette: 'pulnoc', frame: 'secese', foil: 'zlata', edge: 'zlata' });
  });

  it('keeps what the template does not reset', () => {
    const before = normalizeCard({ family: 'tarot', look: { thick: 7, radius: 3, depth: 10, surface: 'lesk', font: 'gotika', emboss: false, element: 'ohen', foilI: 12, visible: { art: false } }, content: { hp: 150, rarity: 5 } });
    const doc = applyTemplate(before, 'bestie');
    expect(doc.look).toMatchObject({ thick: 7, radius: 3, depth: 10, surface: 'lesk', font: 'gotika', emboss: false, element: 'ohen', foilI: 12 });
    expect(doc.look.visible.art).toBe(false);
    expect(doc.content).toMatchObject({ hp: 150, rarity: 5 });
  });

  it('keeps the artwork placement and stays valid', () => {
    const before = normalizeCard({ artworkTransform: { x: 10, y: 20, zoom: 2 } });
    const doc = applyTemplate(before, 'prazdna');
    expect(doc.artworkTransform).toEqual(before.artworkTransform);
    expect(normalizeCard(doc)).toEqual(doc);
  });

  it('does not change the original', () => {
    const before = normalizeCard({});
    const copy = JSON.parse(JSON.stringify(before));
    applyTemplate(before, 'bestie');
    expect(before).toEqual(copy);
  });
});

describe('hasEditedTexts', () => {
  it.each(['tarot', 'orakulum', 'bestie', 'hrdina', 'prazdna'] as const)('is false for untouched %s', (family) => {
    expect(hasEditedTexts(normalizeCard({ family }))).toBe(false);
  });

  it('is false after changing only the look', () => {
    expect(hasEditedTexts(normalizeCard({ look: { foil: 'duha', palette: 'krev' } }))).toBe(false);
  });

  it('follows the artwork on a tarot card', () => {
    expect(hasEditedTexts(normalizeCard({ look: { art: 'mag' } }))).toBe(false);
    expect(hasEditedTexts(normalizeCard({ look: { art: 'mag' }, title: 'Hvězda' }))).toBe(true);
  });

  it.each([
    ['title', { title: 'Moje' }],
    ['numeral', { content: { numeral: 'IX' } }],
    ['meaning', { meaning: { upright: 'Jiný význam' } }],
    ['keywords', { meaning: { keywords: ['nové'] } }],
    ['oracle message', { family: 'orakulum', content: { subtitle: 'Jiný text' } }],
    ['oracle reading', { family: 'orakulum', meaning: { upright: 'Jiný výklad' } }],
    ['creature description', { family: 'bestie', content: { subtitle: 'Jiný popis' } }],
    ['ability', { family: 'bestie', content: { abilities: [{ name: 'Jiná' }] } }],
    ['hero class', { family: 'hrdina', content: { cls: 'Mág' } }],
    ['hero effect', { family: 'hrdina', content: { abilities: [{ name: 'Hradba', text: 'Jiný účinek' }] } }],
    ['blank card text', { family: 'prazdna', content: { subtitle: 'Pozvánka' } }],
  ])('is true after editing the %s', (_name, change) => {
    expect(hasEditedTexts(normalizeCard(change))).toBe(true);
  });

  it('ignores texts the family does not use', () => {
    expect(hasEditedTexts(normalizeCard({ family: 'bestie', meaning: { upright: 'Zbylý text' } }))).toBe(false);
    expect(hasEditedTexts(normalizeCard({ family: 'tarot', content: { subtitle: 'Zbylý text' } }))).toBe(false);
  });

  it('survives a switch with no edits', () => {
    expect(hasEditedTexts(applyTemplate(normalizeCard({}), 'bestie'))).toBe(false);
    expect(hasEditedTexts(applyTemplate(applyTemplate(normalizeCard({}), 'bestie'), 'orakulum'))).toBe(false);
    expect(hasEditedTexts(applyTemplate(applyTemplate(normalizeCard({}), 'orakulum'), 'tarot'))).toBe(false);
  });
});
