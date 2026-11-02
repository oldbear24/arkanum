import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeCard } from '../../card/normalize';
import { enums, templateFor, type CardLook } from '../../card/spec';
import { cs } from '../../i18n/cs';
import { figureOptions, partOptions } from './constants';
import { applyPreset, copyLook, hasCopiedLook, LOOK_PRESETS, pasteLook, randomLook, resetLook } from './looks';

/** A look with a bit of everything, to see what a change leaves alone. */
function ownLook(family: 'tarot' | 'bestie' = 'tarot'): CardLook {
  return normalizeCard({
    family,
    look: {
      art: 'vez',
      figure: family === 'bestie' ? 'sova' : '',
      thick: 7,
      radius: 3,
      visible: { art: false },
      parts: { numeral: false },
      colors: { base: '#112233' },
      texture: 'platno',
      vignette: 80,
    },
  }).look;
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('applyPreset', () => {
  it('has a name for every style, and no two styles are the same', () => {
    for (const preset of LOOK_PRESETS) expect(cs.workshop.styles[preset.id]).toBeTruthy();
    expect(new Set(LOOK_PRESETS.map((preset) => preset.id)).size).toBe(LOOK_PRESETS.length);
    expect(new Set(LOOK_PRESETS.map((preset) => JSON.stringify(preset.look))).size).toBe(LOOK_PRESETS.length);
  });

  it.each(LOOK_PRESETS.map((preset) => [preset.id, preset] as const))('stays within the limits with the style %s', (_id, preset) => {
    const look = applyPreset(ownLook(), preset);
    expect(normalizeCard({ family: 'tarot', look }).look).toEqual(look);
  });

  it('leaves alone what makes the card this card', () => {
    const before = ownLook('bestie');
    const look = applyPreset(before, LOOK_PRESETS[1]!);
    expect(look).toMatchObject({ variant: 'bestie', art: 'vez', figure: 'sova', thick: 7, radius: 3 });
    expect(look.visible).toEqual(before.visible);
    expect(look.parts).toEqual(before.parts);
  });

  it('brings a palette and an element along', () => {
    const preset = LOOK_PRESETS[1]!;
    expect(applyPreset(ownLook(), preset)).toMatchObject({ palette: preset.palette, element: preset.element });
  });

  it('does not pile up on what the card had before', () => {
    const look = applyPreset(ownLook(), LOOK_PRESETS.find((preset) => preset.id === 'pulnocni')!);
    expect(look.texture).toBe('zadna');
    expect(look.vignette).toBe(0);
    expect(look.colors.base).toBe('');
  });

  it('does not change the original', () => {
    const before = ownLook();
    const copy = JSON.parse(JSON.stringify(before));
    applyPreset(before, LOOK_PRESETS[0]!);
    expect(before).toEqual(copy);
  });
});

describe('randomLook', () => {
  it('stays within the limits', () => {
    for (let seed = 1; seed < 200; seed++) {
      const look = randomLook(ownLook(), seeded(seed));
      expect(normalizeCard({ family: 'tarot', look }).look).toEqual(look);
    }
  });

  it('leaves alone what makes the card this card', () => {
    const before = ownLook('bestie');
    const look = randomLook(before, seeded(7));
    expect(look).toMatchObject({ variant: 'bestie', art: 'vez', figure: 'sova', thick: 7, radius: 3 });
    expect(look.parts).toEqual(before.parts);
  });

  it('really differs from time to time, and reaches every choice', () => {
    const frames = new Set<string>();
    for (let seed = 1; seed < 400; seed++) frames.add(randomLook(ownLook(), seeded(seed)).frame);
    expect(frames.size).toBe(enums.frame.length);
  });

  it('never puts the script font into capitals', () => {
    const fonts = new Set<string>();
    for (let seed = 1; seed < 400; seed++) {
      const look = randomLook(ownLook(), seeded(seed));
      fonts.add(look.font);
      if (look.font === 'vibes') expect(look.titleCaps).toBe(false);
      else expect(look.titleCaps).toBe(true);
    }
    expect(fonts).toContain('vibes');
  });

  it('copes with the far ends of a random source', () => {
    for (const edge of [0, 0.999999]) {
      const look = randomLook(ownLook(), () => edge);
      expect(normalizeCard({ family: 'tarot', look }).look).toEqual(look);
    }
  });
});

describe('resetLook', () => {
  it('goes back to the template and keeps the illustration', () => {
    const look = resetLook(ownLook('bestie'), 'bestie');
    expect(look).toEqual({ ...templateFor('bestie').defaults.look, art: 'vez', figure: 'sova' });
  });

  it('brings back what the other looks leave alone', () => {
    const before = ownLook();
    expect(before).toMatchObject({ thick: 7, radius: 3, visible: { art: false }, parts: { numeral: false } });
    const look = resetLook(before, 'tarot');
    expect(look).toMatchObject({ thick: 4, radius: 14, visible: { art: true }, parts: { numeral: true } });
  });
});

describe('copying a look', () => {
  it('has nothing to paste at first', () => {
    expect(hasCopiedLook()).toBe(false);
    expect(pasteLook(ownLook(), 'tarot')).toBeNull();
  });

  it('carries a look over to another card and leaves what makes that card itself', () => {
    const source = normalizeCard({ family: 'tarot', look: { palette: 'krev', foil: 'plamen', texture: 'zrno', art: 'mag', parts: { title: false }, visible: { foil: false } } }).look;
    expect(copyLook(source)).toBe(true);
    expect(hasCopiedLook()).toBe(true);

    const target = ownLook('bestie');
    const pasted = pasteLook(target, 'bestie');
    expect(pasted).toMatchObject({ palette: 'krev', foil: 'plamen', texture: 'zrno', variant: 'bestie', art: 'vez', figure: 'sova' });
    expect(pasted?.parts).toEqual(target.parts);
    expect(pasted?.visible).toEqual(target.visible);
  });

  it('checks whatever is stored', () => {
    localStorage.setItem('arkanum.look', JSON.stringify({ palette: 'nesmysl', thick: 999, colors: { base: 'url(x)' } }));
    const pasted = pasteLook(ownLook(), 'tarot');
    expect(pasted).toMatchObject({ palette: 'pulnoc', thick: 8 });
    expect(pasted?.colors.base).toBe('');
  });

  it('survives what is no look at all', () => {
    localStorage.setItem('arkanum.look', '{nope');
    expect(pasteLook(ownLook(), 'tarot')).toBeNull();
    localStorage.setItem('arkanum.look', '12');
    expect(pasteLook(ownLook(), 'tarot')).toBeNull();
  });

  it('survives a browser without the storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(copyLook(ownLook())).toBe(false);
    expect(hasCopiedLook()).toBe(false);
    expect(pasteLook(ownLook(), 'tarot')).toBeNull();
  });
});

describe('figureOptions', () => {
  it('starts with the illustration of the template', () => {
    expect(figureOptions('bestie')[0]).toEqual({ id: '', label: 'Bludička' });
    expect(figureOptions('hrdina')[0]).toEqual({ id: '', label: 'Strážkyně brány' });
    expect(figureOptions('orakulum')[0]).toEqual({ id: '', label: 'Klíčící semínko' });
  });

  it('has a name for every illustration', () => {
    for (const family of ['bestie', 'hrdina', 'orakulum'] as const) {
      for (const option of figureOptions(family)) expect(option.label).toBeTruthy();
    }
    expect(figureOptions('orakulum').map((option) => option.label)).toContain('Věž');
  });

  it('offers nothing where the art is picked another way', () => {
    expect(figureOptions('tarot')).toEqual([]);
    expect(figureOptions('prazdna')).toEqual([]);
  });
});

describe('partOptions', () => {
  it.each(enums.family)('names every part of a card of the family %s', (family) => {
    const options = partOptions(family);
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) expect(option.label).toBeTruthy();
  });

  it('offers only what a family has', () => {
    const ids = (family: 'tarot' | 'bestie' | 'hrdina' | 'orakulum' | 'prazdna') => partOptions(family).map((option) => option.id);
    expect(ids('tarot')).toContain('numeral');
    expect(ids('tarot')).not.toContain('subtitle');
    expect(ids('bestie')).toContain('rarity');
    expect(ids('hrdina')).not.toContain('rarity');
    expect(ids('hrdina')).toContain('credit');
    expect(ids('orakulum')).toContain('subtitle');
    expect(ids('orakulum')).not.toContain('plaque');
    expect(ids('prazdna')).toEqual(['title', 'subtitle', 'window', 'border']);
  });
});
