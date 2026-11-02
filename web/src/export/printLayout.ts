// Page geometry of the print PDF, in points, with the origin in the bottom left corner.

export const BLEED_MM = 3;
const MARK_LENGTH_MM = 5;
/** The marks start at the edge of the bleed, so they never get printed onto the card. */
const MARGIN_MM = BLEED_MM + MARK_LENGTH_MM + 2;
const POINTS_PER_MM = 72 / 25.4;

export const PRINT_DPI = 450;
export const MAX_CANVAS_SIDE = 4096;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface PrintLayout {
  page: { width: number; height: number };
  trim: Box;
  bleed: Box;
  marks: MarkLine[];
}

const pt = (mm: number) => mm * POINTS_PER_MM;

export function printLayout(widthMm: number, heightMm: number): PrintLayout {
  const trim = { x: pt(MARGIN_MM), y: pt(MARGIN_MM), width: pt(widthMm), height: pt(heightMm) };
  const offset = pt(BLEED_MM);
  const length = pt(MARK_LENGTH_MM);
  const right = trim.x + trim.width;
  const top = trim.y + trim.height;

  const marks: MarkLine[] = [];
  for (const y of [trim.y, top]) {
    marks.push({ start: { x: trim.x - offset - length, y }, end: { x: trim.x - offset, y } });
    marks.push({ start: { x: right + offset, y }, end: { x: right + offset + length, y } });
  }
  for (const x of [trim.x, right]) {
    marks.push({ start: { x, y: trim.y - offset - length }, end: { x, y: trim.y - offset } });
    marks.push({ start: { x, y: top + offset }, end: { x, y: top + offset + length } });
  }

  return {
    page: { width: pt(widthMm + 2 * MARGIN_MM), height: pt(heightMm + 2 * MARGIN_MM) },
    trim,
    bleed: { x: trim.x - offset, y: trim.y - offset, width: trim.width + 2 * offset, height: trim.height + 2 * offset },
    marks,
  };
}

/** Pixel width of the raster for printing, limited so that phones can still allocate it. */
export function printWidthPx(widthMm: number, heightMm: number): number {
  const scale = Math.min(PRINT_DPI / 25.4, MAX_CANVAS_SIDE / Math.max(widthMm, heightMm));
  return Math.round(widthMm * scale);
}

export function safeFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'karta';
}
