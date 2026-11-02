import { describe, expect, it } from 'vitest';
import { safeNext, signInPath } from './auth';
import { gallerySortExpression } from './cards';
import { resolveFormat } from './format';

describe('resolveFormat', () => {
  it('uses the preset sizes', () => {
    expect(resolveFormat('tarot', 'vyska', 0, 0)).toMatchObject({ w: 70, h: 120, label: '70 × 120 mm', custom: false });
    expect(resolveFormat('tcg', 'vyska', 0, 0)).toMatchObject({ w: 63, h: 88 });
    expect(resolveFormat('mini', 'vyska', 0, 0)).toMatchObject({ w: 44, h: 68 });
    expect(resolveFormat('ctverec', 'sirka', 0, 0)).toMatchObject({ w: 70, h: 70 });
  });

  it('swaps the sides for the orientation', () => {
    expect(resolveFormat('tarot', 'sirka', 0, 0)).toMatchObject({ w: 120, h: 70, ratio: '120 / 70' });
    expect(resolveFormat('vlastni', 'vyska', 150, 100, )).toMatchObject({ w: 100, h: 150 });
  });

  it('limits a custom size to 30–200 mm and survives junk', () => {
    expect(resolveFormat('vlastni', 'vyska', 5, 900)).toMatchObject({ w: 30, h: 200, custom: true });
    expect(resolveFormat('vlastni', 'vyska', '', 'x')).toMatchObject({ w: 80, h: 125 });
    expect(resolveFormat('vlastni', 'vyska', '70.6', '90')).toMatchObject({ w: 71, h: 90 });
  });

  it('caps the preview width', () => {
    expect(resolveFormat('tarot', 'vyska', 0, 0).previewWidth).toBe(140);
    expect(resolveFormat('vlastni', 'sirka', 200, 30).previewWidth).toBe(340);
  });
});

describe('safeNext', () => {
  it('accepts paths of this site', () => {
    expect(safeNext('/dilna/abc?x=1')).toBe('/dilna/abc?x=1');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined])('rejects %s', (value) => {
    expect(safeNext(value, '/fallback')).toBe('/fallback');
  });

  it('builds the sign-in link', () => {
    expect(signInPath('/karta/a?b=1')).toBe('/prihlaseni?next=%2Fkarta%2Fa%3Fb%3D1');
    expect(signInPath()).toBe('/prihlaseni');
  });
});

describe('gallery queries', () => {
  it('sorts by the columns from the brief', () => {
    expect(gallerySortExpression('nove')).toBe('-created');
    expect(gallerySortExpression('oblibene')).toBe('-likesCount,-created');
  });
});
