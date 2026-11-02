import { ranges } from '../card/spec';

export type FormatKey = 'tarot' | 'tcg' | 'mini' | 'ctverec' | 'vlastni';
export type Orientation = 'vyska' | 'sirka';

export const FORMATS: { key: FormatKey; w: number; h: number }[] = [
  { key: 'tarot', w: 70, h: 120 },
  { key: 'tcg', w: 63, h: 88 },
  { key: 'mini', w: 44, h: 68 },
  { key: 'ctverec', w: 70, h: 70 },
  { key: 'vlastni', w: 0, h: 0 },
];

export interface ResolvedFormat {
  custom: boolean;
  w: number;
  h: number;
  /** CSS aspect-ratio value. */
  ratio: string;
  /** Width of the ratio preview in pixels. */
  previewWidth: number;
  label: string;
}

function clampSize(value: string | number, fallback: number): number {
  const [min, max] = ranges.format;
  return Math.round(Math.max(min, Math.min(max, Number(value) || fallback)));
}

/** The size of a blank card from the format picker, ported from the design of /sablony. */
export function resolveFormat(key: FormatKey, orientation: Orientation, customW: string | number, customH: string | number): ResolvedFormat {
  const current = FORMATS.find((f) => f.key === key) ?? FORMATS[0]!;
  const custom = current.key === 'vlastni';
  let w = custom ? clampSize(customW, 80) : current.w;
  let h = custom ? clampSize(customH, 125) : current.h;
  if ((orientation === 'sirka' && w < h) || (orientation === 'vyska' && w > h)) {
    [w, h] = [h, w];
  }
  return {
    custom,
    w,
    h,
    ratio: `${w} / ${h}`,
    previewWidth: Math.round(Math.min(340, (240 * w) / h)),
    label: `${w} × ${h} mm`,
  };
}
