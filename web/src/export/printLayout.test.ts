import { describe, expect, it } from 'vitest';
import { BLEED_MM, MAX_CANVAS_SIDE, PRINT_DPI, printLayout, printWidthPx, safeFileName } from './printLayout';

const MM = 72 / 25.4;

describe('printLayout', () => {
  const layout = printLayout(70, 120);

  it('keeps the real size of the card', () => {
    expect(layout.trim.width / MM).toBeCloseTo(70, 6);
    expect(layout.trim.height / MM).toBeCloseTo(120, 6);
  });

  it('adds a 3 mm bleed on every side', () => {
    expect(BLEED_MM).toBe(3);
    expect((layout.trim.x - layout.bleed.x) / MM).toBeCloseTo(3, 6);
    expect((layout.trim.y - layout.bleed.y) / MM).toBeCloseTo(3, 6);
    expect(layout.bleed.width / MM).toBeCloseTo(76, 6);
    expect(layout.bleed.height / MM).toBeCloseTo(126, 6);
  });

  it('centres the card on the page, with room for the marks', () => {
    expect(layout.trim.x).toBeCloseTo(layout.page.width - layout.trim.x - layout.trim.width, 6);
    expect(layout.trim.y).toBeCloseTo(layout.page.height - layout.trim.y - layout.trim.height, 6);
    for (const { start, end } of layout.marks) {
      for (const point of [start, end]) {
        expect(point.x).toBeGreaterThan(0);
        expect(point.y).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(layout.page.width);
        expect(point.y).toBeLessThan(layout.page.height);
      }
    }
  });

  it('draws two marks per corner, all outside of the bleed', () => {
    expect(layout.marks).toHaveLength(8);
    const { bleed } = layout;
    for (const { start, end } of layout.marks) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const inside = midX > bleed.x && midX < bleed.x + bleed.width && midY > bleed.y && midY < bleed.y + bleed.height;
      expect(inside).toBe(false);
    }
  });

  it('lines the marks up with the trim edges', () => {
    const horizontal = layout.marks.filter((mark) => mark.start.y === mark.end.y);
    const vertical = layout.marks.filter((mark) => mark.start.x === mark.end.x);
    expect(horizontal).toHaveLength(4);
    expect(vertical).toHaveLength(4);
    expect(new Set(horizontal.map((mark) => mark.start.y))).toEqual(new Set([layout.trim.y, layout.trim.y + layout.trim.height]));
    expect(new Set(vertical.map((mark) => mark.start.x))).toEqual(new Set([layout.trim.x, layout.trim.x + layout.trim.width]));
  });
});

describe('printWidthPx', () => {
  it('uses the print resolution', () => {
    expect(printWidthPx(70, 120)).toBe(Math.round((70 * PRINT_DPI) / 25.4));
  });

  it('limits huge formats', () => {
    expect(printWidthPx(200, 200)).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    const tall = printWidthPx(100, 200);
    expect(tall * 2).toBeLessThanOrEqual(MAX_CANVAS_SIDE + 1);
  });
});

describe('safeFileName', () => {
  it.each([
    ['Strážkyně brány', 'strazkyne-brany'],
    ['  Hvězda!  ', 'hvezda'],
    ['XVII / Měsíc', 'xvii-mesic'],
    ['', 'karta'],
    ['★★★', 'karta'],
  ])('%s', (name, expected) => {
    expect(safeFileName(name)).toBe(expected);
  });
});
