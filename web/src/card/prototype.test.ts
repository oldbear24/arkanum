/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGeometry } from './geometry';
import { computeMotion, type MotionMode, type MotionState } from './motion';
import { GOLD, resolveCard, type CardParams } from './resolve';
import { enums, type Variant } from './spec';

// "Přepiš věrně": this runs the real component code from design/Karta.dc.html and
// checks that the port produces the same paths, colours, texts and motion values.

interface PrototypeValues {
  v: Record<string, unknown> & {
    e: Record<string, string>;
    c: Record<string, unknown>;
    g: Record<string, string>;
    a: Record<string, string>;
    b: Record<string, string>;
    t: Record<string, unknown>;
  };
}

interface PrototypeInstance {
  props: Record<string, unknown>;
  state: MotionState;
  cacheKey: string;
  renderVals(): PrototypeValues;
  build(variant: string, frame: string, art: string, element: string, rarity: number, radius: number): {
    g: Record<string, string>;
    a: Record<string, string>;
    b: Record<string, string>;
  };
}

function loadPrototype(): new () => PrototypeInstance {
  const html = readFileSync(resolvePath(process.cwd(), '../design/Karta.dc.html'), 'utf8');
  const script = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!script) throw new Error('Component script not found');

  class DCLogic {
    props: Record<string, unknown> = {};
    state: Record<string, unknown> = {};
    setState() {}
  }
  return new Function('DCLogic', `${script}; return Component;`)(DCLogic);
}

const Prototype = loadPrototype();
const original = new Prototype();

const prototypeVariants = enums.variant.filter((v): v is Exclude<Variant, 'prazdna'> => v !== 'prazdna');

// The values added after the design exist only here, the prototype falls back on its defaults.
const prototypePalettes = enums.palette.filter((palette) => ['pulnoc', 'krev', 'smaragd', 'pergamen'].includes(palette));
const prototypeFoils = enums.foil.filter((foil) => ['zadna', 'zlata', 'duha', 'kosmos'].includes(foil));
const prototypeEdges = enums.edge.filter((edge) => ['zlata', 'cerna', 'bila', 'ram'].includes(edge));

function render(props: Record<string, unknown>, state: Partial<MotionState> = {}) {
  const instance = new Prototype();
  instance.props = props;
  instance.state = { ...instance.state, ...state };
  return instance.renderVals().v;
}

describe('geometry matches the prototype', () => {
  for (const variant of prototypeVariants) {
    it(`${variant}: every frame, artwork, element, rarity and radius`, () => {
      for (const frame of enums.frame) {
        for (const art of enums.art) {
          for (const element of enums.element) {
            for (const rarity of [0, 3, 5]) {
              for (const radius of [0, 8, 14, 30]) {
                const expected = original.build(variant, frame, art, element, rarity, radius);
                const actual = buildGeometry(variant, frame, art, element, rarity, radius);
                expect(actual.g).toEqual(expected.g);
                expect(actual.a).toEqual(expected.a);
                expect(actual.b).toEqual(expected.b);
              }
            }
          }
        }
      }
    });
  }
});

describe('static values match the prototype', () => {
  const samples: CardParams[] = [];
  for (const variant of prototypeVariants) {
    samples.push({ variant });
    for (const palette of prototypePalettes) samples.push({ variant, palette });
    for (const element of enums.element) samples.push({ variant, element });
    for (const foil of prototypeFoils) samples.push({ variant, foil, foilI: 80 });
    for (const edge of prototypeEdges) samples.push({ variant, edge, palette: 'krev' });
    for (const font of enums.font) samples.push({ variant, font, cardTitle: 'Velmi dlouhý název karty' });
    for (const art of enums.art) samples.push({ variant, art });
    samples.push({ variant, thick: 7.5, radius: 22 });
    samples.push({ variant, cardTitle: 'Krátký', subtitle: 'Vlastní podtitul', numeral: 'IX', hp: 90, level: 4, ab1: 'A', ab1p: 10, ab1t: 'B', ab2: 'C', ab2p: 30, ab2t: 'D', s1: 1, s2: 5, s3: 9, cost: 2, cls: 'Mág', author: '@ja', setNo: 'X · 1/2', rarity: 5 });
  }

  it.each(samples.map((sample) => [JSON.stringify(sample), sample] as const))('%s', (_name, params) => {
    const v = render(params as Record<string, unknown>);
    const card = resolveCard(params);

    const goldUrl = /^url\(#k[a-z0-9]+g\)$/;
    const colors = Object.fromEntries(
      Object.entries(v.c).map(([key, value]) => [key, typeof value === 'string' && goldUrl.test(value) ? GOLD : value]),
    );
    expect(card.c).toEqual(colors);

    expect(card.g).toEqual(v.g);
    expect(card.a).toEqual(v.a);
    expect(card.b).toEqual(v.b);
    expect(card.H).toBe(v.H);
    expect(card.ar).toBe(v.ar);
    expect(card.rad).toBe(v.rad);
    expect(card.half).toBe(v.half);
    expect(card.g0).toBe(v.g0);
    expect(card.g1).toBe(v.g1);
    expect(card.g2).toBe(v.g2);
    expect(card.el).toEqual(v.el);
    expect(card.t).toEqual(v.t);
    expect(card.ff).toBe(v.ff);
    expect(card.fw).toBe(v.fw);
    expect(card.showArt).toBe(v.artO === 1);

    for (const key of ['title', 'numeral', 'subtitle', 'nameFs', 'heroFs', 'subFs', 'level', 'hp', 'ab1', 'ab1p', 'ab1t', 'ab2', 'ab2p', 'ab2t', 's1', 's2', 's3', 'cost', 'cls', 'author', 'setNo'] as const) {
      expect(card[key], key).toBe(v[key]);
    }

    card.edges.forEach((edge, i) => {
      expect(edge.color).toBe(v.e[`c${i}`]);
      expect(edge.z).toBe(v.e[`z${i}`]);
    });
    expect(card.ariaBase).toBe(v.aria);
  });
});

describe('motion matches the prototype', () => {
  const states: MotionState[] = [
    { rx: 0, ry: 0, spin: 0, gx: 50, gy: 30, active: false, drag: false },
    { rx: 8, ry: -12, spin: 0, gx: 22, gy: 71, active: true, drag: false },
    { rx: -40, ry: 150, spin: 0, gx: 90, gy: 10, active: true, drag: true },
    { rx: 0, ry: 0, spin: 123.4, gx: 50, gy: 30, active: false, drag: false },
  ];
  const cases: { params: CardParams; mode: MotionMode; flip: boolean; spinning: boolean }[] = [
    { params: { foil: 'duha', foilI: 80 }, mode: 'tilt', flip: false, spinning: false },
    { params: { foil: 'kosmos', foilI: 40, surface: 'lesk', light: 70 }, mode: 'drag', flip: true, spinning: false },
    { params: { variant: 'orakulum', palette: 'pergamen', foil: 'duha', surface: 'mat', depth: 100 }, mode: 'tilt', flip: false, spinning: true },
    { params: { variant: 'bestie', foil: 'zlata', showFoil: false, shadow: false }, mode: 'none', flip: false, spinning: false },
  ];

  it.each(cases.map((c) => [JSON.stringify(c), c] as const))('%s', (_name, c) => {
    for (const state of states) {
      const v = render({ ...c.params, interactive: c.mode, flip: c.flip, spin: c.spinning } as Record<string, unknown>, state);
      const out = computeMotion(resolveCard(c.params), state, { flip: c.flip, mode: c.mode, spinning: c.spinning, reducedMotion: false });
      const value = (name: string) => out.vars[name];

      expect(v.tf).toBe(`translateZ(${value('--lift')}) rotateX(${value('--rx')}) rotateY(${value('--ry')})`.replace(/translateZ\((\d*\.?\d+)em\)/, 'translateZ($1em)'));
      expect(v.tr).toBe(out.transition);
      expect(String(v.gx1)).toBe(out.gx1);
      expect(String(v.gx2)).toBe(out.gx2);
      expect(`${v.pfx}px`).toBe(value('--pfx'));
      expect(`${v.pfy}px`).toBe(value('--pfy'));
      expect(`${v.pbx}px`).toBe(value('--pbx'));
      expect(`${v.pby}px`).toBe(value('--pby'));
      expect(`${v.hx}%`).toBe(value('--hx'));
      expect(`${v.hy}%`).toBe(value('--hy'));
      expect(`${v.gx}%`).toBe(value('--gx'));
      expect(`${v.gy}%`).toBe(value('--gy'));
      expect(`${v.bgx}%`).toBe(value('--bgx'));
      expect(v.ga).toBe(value('--ga'));
      expect(v.holoO).toBe(value('--holo-o'));
      expect(v.spO).toBe(value('--sp-o'));
      expect(v.spPos).toBe(value('--sp-pos'));
      expect(`${v.shX}em`).toBe(value('--shx'));
      expect(v.shS).toBe(value('--shs'));
      expect(String(v.shO)).toBe(value('--sho'));
    }
  });
});
