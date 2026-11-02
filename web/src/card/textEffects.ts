import type { CSSProperties, SVGProps } from 'react';
import { isBright } from './resolve';
import type { TitleEffect } from './spec';

// The looks of a text. All of them are shadows, which the export draws the same way as the
// card on the screen. A text on a curve is SVG, where a shadow has to go through a filter.

const OUTLINE_DIRECTIONS = [
  [1, 0],
  [0.7, 0.7],
  [0, 1],
  [-0.7, 0.7],
  [-1, 0],
  [-0.7, -0.7],
  [0, -1],
  [0.7, -0.7],
] as const;

function outlineOf(color: string): string {
  return isBright(color) ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
}

/** For a plain text. `color` is the colour of the text itself, `glow` the colour of its light. */
export function textEffectStyle(effect: TitleEffect, color: string, glow: string): CSSProperties {
  switch (effect) {
    case 'stin':
      return { textShadow: '0.05em 0.07em 0.12em rgba(0,0,0,0.8)' };
    case 'zare':
      return { textShadow: `0 0 0.18em ${glow}, 0 0 0.5em ${glow}` };
    case 'obrys': {
      const edge = outlineOf(color);
      return { textShadow: OUTLINE_DIRECTIONS.map(([x, y]) => `${(x * 0.05).toFixed(3)}em ${(y * 0.05).toFixed(3)}em 0 ${edge}`).join(', ') };
    }
    case 'ryti':
      return { textShadow: '0 0.05em 0 rgba(255,255,255,0.35), 0 -0.04em 0 rgba(0,0,0,0.6)' };
    case 'zadny':
      return {};
  }
}

/** For a text on a curve. The sizes are in the units of its SVG, which is a percent of the card. */
export function svgTextEffect(effect: TitleEffect, color: string, fontSize: number): { svg: CSSProperties; text: SVGProps<SVGTextElement> } {
  switch (effect) {
    case 'stin':
      return { svg: { filter: 'drop-shadow(0.05em 0.08em 0.1em rgba(0,0,0,0.8))' }, text: {} };
    case 'zare':
      return { svg: { filter: `drop-shadow(0 0 0.25em ${color})` }, text: {} };
    case 'obrys':
      return { svg: {}, text: { stroke: outlineOf(color), strokeWidth: fontSize * 0.08, paintOrder: 'stroke', strokeLinejoin: 'round' } };
    case 'ryti':
      return { svg: { filter: 'drop-shadow(0 0.04em 0 rgba(255,255,255,0.35)) drop-shadow(0 -0.03em 0 rgba(0,0,0,0.6))' }, text: {} };
    case 'zadny':
      return { svg: {}, text: {} };
  }
}
