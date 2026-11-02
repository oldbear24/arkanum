import { describe, expect, it } from 'vitest';
import { normalizeCard } from './normalize';
import { counts, enums, ranges, templateDefs, textLimits } from './spec';

describe('normalizeCard', () => {
  it('fills everything in from an empty input', () => {
    const card = normalizeCard({});
    expect(card.family).toBe('tarot');
    expect(card.title).toBe('Hvězda');
    expect(card.formatW).toBe(70);
    expect(card.formatH).toBe(120);
    expect(card.look.foil).toBe('zlata');
    expect(card.look.foilI).toBe(70);
    expect(card.look.depth).toBe(60);
    expect(card.look.visible).toEqual({ art: true, frame: true, text: true, foil: true });
    expect(card.content.abilities).toHaveLength(2);
    expect(card.meaning.arcana).toBe('velka');
    expect(card.artworkTransform).toEqual({ x: 0, y: 0, zoom: 1, layers: [] });
  });

  it.each([null, undefined, 42, 'x', []])('survives %j as input', (input) => {
    expect(normalizeCard(input).family).toBe('tarot');
  });

  it.each(templateDefs.map((t) => [t.family, t] as const))('keeps the %s template defaults intact', (family, template) => {
    const card = normalizeCard({ family });
    expect(card.look).toEqual(template.defaults.look);
    expect(card.content).toEqual(template.defaults.content);
    expect(card.meaning).toEqual(template.defaults.meaning);
    expect(card.title).toBe(template.defaults.title);
    expect([card.formatW, card.formatH]).toEqual([template.formatW, template.formatH]);
  });

  it('uses the defaults of VDEF per family', () => {
    expect(normalizeCard({ family: 'orakulum' }).look).toMatchObject({ palette: 'pergamen', frame: 'minimal', foil: 'zadna', edge: 'bila' });
    expect(normalizeCard({ family: 'bestie' }).look).toMatchObject({ foil: 'kosmos', edge: 'cerna' });
    expect(normalizeCard({ family: 'bestie' }).content).toMatchObject({ s1: 3, s2: 2 });
    expect(normalizeCard({ family: 'hrdina' }).content).toMatchObject({ s1: 4, s2: 6, s3: 2 });
    expect(normalizeCard({ family: 'hrdina' }).content.subtitle).toBe('Brána se otevře jen tomu, kdo zná heslo.');
    expect(normalizeCard({ family: 'bestie' }).formatW).toBe(63);
  });

  it('takes the family from look.variant when the field is missing', () => {
    expect(normalizeCard({ look: { variant: 'hrdina' } }).family).toBe('hrdina');
  });

  it('forces look.variant to match the family', () => {
    expect(normalizeCard({ family: 'bestie', look: { variant: 'tarot' } }).look.variant).toBe('bestie');
  });

  it('derives the tarot title and numeral from the artwork', () => {
    const card = normalizeCard({ look: { art: 'mag' } });
    expect(card.title).toBe('Mág');
    expect(card.content.numeral).toBe('I');
  });

  it('keeps an intentionally empty title and text', () => {
    const card = normalizeCard({ title: '', content: { subtitle: '' } });
    expect(card.title).toBe('');
    expect(card.content.subtitle).toBe('');
  });

  it.each(Object.entries(enums).filter(([k]) => !['family', 'variant', 'arcana', 'visibility'].includes(k)))(
    'rejects unknown values of %s',
    (key) => {
      const look = normalizeCard({ look: { [key]: 'nesmysl' } }).look as unknown as Record<string, unknown>;
      const expected = normalizeCard({}).look as unknown as Record<string, unknown>;
      expect(look[key]).toBe(expected[key]);
    },
  );

  it('clamps numbers to the shared ranges', () => {
    const card = normalizeCard({
      formatW: 5,
      formatH: 900,
      look: { foilI: 500, thick: 0, radius: -3, depth: 101 },
      content: { hp: 9999, level: 0, cost: -1, s1: 13, s2: -1, s3: 99, rarity: 9, abilities: [{ power: 999 }, { power: -5 }] },
    });
    expect(card.formatW).toBe(ranges.format[0]);
    expect(card.formatH).toBe(ranges.format[1]);
    expect(card.look).toMatchObject({ foilI: 100, thick: 1, radius: 0, depth: 100 });
    expect(card.content).toMatchObject({ hp: 200, level: 1, cost: 0, s1: 12, s2: 0, s3: 12, rarity: 5 });
    expect(card.content.abilities.map((a) => a.power)).toEqual([200, 0]);
  });

  it('accepts numeric strings and rejects the rest', () => {
    const card = normalizeCard({ look: { thick: '6', radius: 'abc', depth: '' } });
    expect(card.look.thick).toBe(6);
    expect(card.look.radius).toBe(14);
    expect(card.look.depth).toBe(60);
  });

  it('rounds rarity and the format to whole numbers', () => {
    const card = normalizeCard({ formatW: 70.6, content: { rarity: 2.5 } });
    expect(card.formatW).toBe(71);
    expect(card.content.rarity).toBe(3);
  });

  it('shortens texts by characters, not UTF-16 units', () => {
    const emoji = '🂡'.repeat(textLimits.numeral + 5);
    const card = normalizeCard({
      title: 'x'.repeat(100),
      content: { numeral: emoji, cls: 'y'.repeat(100), abilities: [{ name: 'z'.repeat(100), text: 't'.repeat(999) }] },
      meaning: { upright: 'u'.repeat(5000) },
    });
    expect(card.title).toHaveLength(textLimits.title);
    expect(Array.from(card.content.numeral)).toHaveLength(textLimits.numeral);
    expect(card.content.cls).toHaveLength(textLimits.cls);
    expect(card.content.abilities[0]?.name).toHaveLength(textLimits.abilityName);
    expect(card.content.abilities[0]?.text).toHaveLength(textLimits.abilityText);
    expect(card.meaning.upright).toHaveLength(textLimits.upright);
  });

  it('accepts numbers as texts', () => {
    expect(normalizeCard({ title: 42 }).title).toBe('42');
  });

  it('fills in missing abilities and drops the extra ones', () => {
    expect(normalizeCard({ family: 'bestie', content: { abilities: [] } }).content.abilities.map((a) => a.name)).toEqual(['Mámení', 'Bažinné světlo']);
    const many = normalizeCard({ content: { abilities: [{}, {}, {}, {}] } });
    expect(many.content.abilities).toHaveLength(counts.abilities);
    expect(normalizeCard({ content: { abilities: 'x' } }).content.abilities).toHaveLength(counts.abilities);
  });

  it('cleans keywords: trims, dedupes, limits', () => {
    const many = Array.from({ length: 30 }, (_, i) => `slovo${i}`);
    expect(normalizeCard({ meaning: { keywords: [' a ', 'a', '', 7, 'b'] } }).meaning.keywords).toEqual(['a', 'b']);
    expect(normalizeCard({ meaning: { keywords: many } }).meaning.keywords).toHaveLength(counts.keywords);
    expect(normalizeCard({ meaning: { keywords: ['k'.repeat(99)] } }).meaning.keywords[0]).toHaveLength(textLimits.keyword);
    expect(normalizeCard({ meaning: { keywords: 'x' } }).meaning.keywords).toEqual(['naděje', 'inspirace', 'klid']);
  });

  it('keeps only object elements up to the limit', () => {
    const elements = [{ type: 'text' }, 'x', null, [], ...Array.from({ length: 100 }, () => ({ type: 'tvar' }))];
    const card = normalizeCard({ content: { elements } });
    expect(card.content.elements).toHaveLength(counts.elements);
    expect(card.content.elements[0]).toEqual({ type: 'text' });
  });

  it('clamps the artwork transform', () => {
    const card = normalizeCard({
      artworkTransform: { x: 500, y: -500, zoom: 99, layers: [{ x: 10, y: 20, zoom: 2 }, { zoom: 0 }, 'x', {}] },
    });
    expect(card.artworkTransform).toEqual({
      x: 100,
      y: -100,
      zoom: 4,
      layers: [{ x: 10, y: 20, zoom: 2 }, { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 }],
    });
  });

  it('keeps layer visibility flags and ignores junk', () => {
    const card = normalizeCard({ look: { emboss: 'yes', visible: { art: false, frame: 'no' } } });
    expect(card.look.emboss).toBe(true);
    expect(card.look.visible).toEqual({ art: false, frame: true, text: true, foil: true });
  });

  it('is idempotent', () => {
    const once = normalizeCard({ family: 'bestie', title: 'Mlok', look: { thick: 99 }, content: { hp: 1 } });
    expect(normalizeCard(once)).toEqual(once);
  });
});
