import { useId, type CSSProperties } from 'react';
import { ORNAMENTS, shapePath, SYMBOL_LINES, SYMBOLS } from './itemArt';
import type { PlacedItem } from './resolve';
import type { ItemFont, ItemOrnament, ItemSide, ItemSymbol } from './spec';
import { svgTextEffect, textEffectStyle } from './textEffects';

// Inline styles for the same reason as in CardFace: the export serializes this DOM.

/** The colours an item takes from its side of the card when it has none of its own. */
export interface ItemInk {
  base: string;
  text: string;
  metal: string;
}

const LAYER: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const ART: CSSProperties = { display: 'block', width: '100%', height: 'auto', overflow: 'visible' };

/** The card measures 18.75 em across, so one percent of its width is this many em. */
const EM_PER_PERCENT = 0.1875;

/** A sign drawn by lines, on its grid of 100 units, against the outline of the same value. */
const SIGN_LINE_SCALE = 2.4;

/** The most a text can bend, in radians. Short of a full circle, whose ends would meet. */
const MOST_BEND = 5.6;

const ITEM_FONTS: Record<ItemFont, CSSProperties> = {
  cinzel: { fontFamily: "'Cinzel', serif", fontWeight: 600 },
  cormorant: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 },
  kurziva: { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600 },
  aboreto: { fontFamily: "'Aboreto', serif", fontWeight: 400 },
  gotika: { fontFamily: "'Grenze Gotisch', serif", fontWeight: 600 },
  jost: { fontFamily: "'Jost', sans-serif", fontWeight: 500 },
  marcellus: { fontFamily: "'Marcellus', serif", fontWeight: 400 },
  uncial: { fontFamily: "'Uncial Antiqua', serif", fontWeight: 400 },
  fondamento: { fontFamily: "'Fondamento', serif", fontWeight: 400 },
  metamorphous: { fontFamily: "'Metamorphous', serif", fontWeight: 400 },
  vibes: { fontFamily: "'Great Vibes', cursive", fontWeight: 400 },
};

function boxStyle(item: PlacedItem, editable: boolean, selected: boolean): CSSProperties {
  const depth = item.depth / 100;
  const float = depth ? `translate(calc(var(${item.side === 'back' ? '--ibx' : '--ifx'}) * ${depth}), calc(var(--ify) * ${depth})) ` : '';
  const flip = item.flipX || item.flipY ? ` scale(${item.flipX ? -1 : 1}, ${item.flipY ? -1 : 1})` : '';
  const movable = editable && !item.locked;
  return {
    position: 'absolute',
    left: `${item.x}%`,
    top: `${item.y}%`,
    transform: `${float}translate(-50%, -50%) rotate(${item.rotate}deg)${flip}`,
    opacity: item.opacity / 100,
    pointerEvents: movable ? 'auto' : 'none',
    cursor: movable ? 'move' : undefined,
    ...(item.blend !== 'normal' ? { mixBlendMode: item.blend } : null),
    ...(item.shadow ? { filter: `drop-shadow(0 ${(0.02 + item.shadow * 0.0025).toFixed(3)}em ${(0.04 + item.shadow * 0.004).toFixed(3)}em rgba(0,0,0,${(0.3 + item.shadow * 0.006).toFixed(2)}))` } : null),
    ...(selected ? { outline: '0.07em dashed #f6dfa8', outlineOffset: '0.14em', boxShadow: '0 0 0 0.05em rgba(0,0,0,0.65)' } : null),
  };
}

function TextItem({ item, ink }: { item: PlacedItem; ink: ItemInk }) {
  const color = item.color || ink.text;
  return (
    <div
      style={{
        ...ITEM_FONTS[item.font],
        width: 'max-content',
        // Its own em is the size in percent of the card, so this is 92 % of the card.
        maxWidth: `${92 / item.size}em`,
        fontSize: `${item.size * EM_PER_PERCENT}em`,
        lineHeight: item.line / 100,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        textAlign: item.align,
        color,
        ...(item.spacing ? { letterSpacing: `${item.spacing / 100}em` } : null),
        ...(item.caps ? { textTransform: 'uppercase' } : null),
        ...textEffectStyle(item.effect, color, color),
      }}
    >
      {item.text}
    </div>
  );
}

/**
 * Where a text on a curve lies, in percent of the card around the centre of its circle.
 * The width of the letters is an estimate, an SVG cannot measure them up front. The curve
 * runs the whole way round, so that a longer text only reaches further along it.
 */
export function curvedTextBox(item: Pick<PlacedItem, 'text' | 'caps' | 'size' | 'spacing' | 'curve'>) {
  const line = (item.caps ? item.text.toUpperCase() : item.text).replace(/\s*\n\s*/g, ' ');
  const width = Math.max(1, Array.from(line).length) * item.size * (0.56 + item.spacing / 100);
  const bend = (Math.abs(item.curve) / 100) * MOST_BEND;
  const radius = width / bend;
  const half = Math.min(Math.PI, bend / 2);
  const rise = item.size * 0.85;
  const fall = item.size * 0.3;
  const up = item.curve > 0;
  const outer = up ? radius + rise : radius + fall;
  const across = half >= Math.PI / 2 ? outer : outer * Math.sin(half);
  const top = up ? -(radius + rise) : radius * Math.cos(half) - rise;
  const bottom = up ? -radius * Math.cos(half) + fall : radius + fall;
  return { line, up, radius, x: -across, y: top, w: across * 2, h: bottom - top };
}

function CurvedText({ item, ink }: { item: PlacedItem; ink: ItemInk }) {
  const id = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const color = item.color || ink.text;
  const { line, up, radius: r, x, y, w, h } = curvedTextBox(item);
  // Clockwise from the bottom or anticlockwise from the top, so that the middle of the
  // path is where the text belongs and the letters stand on it the right way up.
  const path = up ? `M0 ${r}A${r} ${r} 0 1 1 0 ${-r}A${r} ${r} 0 1 1 0 ${r}` : `M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r} ${r} 0 1 0 0 ${-r}`;
  const effect = svgTextEffect(item.effect, color, item.size);
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" style={{ ...ART, ...effect.svg }}>
      <defs>
        <path id={id} d={path} />
      </defs>
      <text textAnchor="middle" fontSize={item.size} fill={color} {...effect.text} style={{ ...ITEM_FONTS[item.font], ...(item.spacing ? { letterSpacing: `${item.spacing / 100}em` } : null) }}>
        <textPath href={`#${id}`} startOffset="50%">
          {line}
        </textPath>
      </text>
    </svg>
  );
}

function SymbolItem({ item, paint }: { item: PlacedItem; paint: string }) {
  const kind = item.kind as ItemSymbol;
  const shape = SYMBOLS[kind];
  const lines = SYMBOL_LINES[kind];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={ART}>
      {shape && <path d={shape} fill={item.filled ? paint : 'none'} stroke={item.filled ? 'none' : paint} strokeWidth={item.stroke} strokeLinejoin="round" fillRule="evenodd" />}
      {lines && <path d={lines} fill="none" stroke={paint} strokeWidth={item.stroke * SIGN_LINE_SCALE} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function OrnamentItem({ item, paint }: { item: PlacedItem; paint: string }) {
  const art = ORNAMENTS[item.kind as ItemOrnament];
  return (
    <svg viewBox={`0 0 ${art.w} ${art.h}`} aria-hidden="true" style={ART}>
      {art.line && <path d={art.line} fill="none" stroke={paint} strokeWidth={art.w / 90} strokeLinecap="round" strokeLinejoin="round" />}
      {art.fill && <path d={art.fill} fill={paint} />}
    </svg>
  );
}

function ShapeItem({ item, paint }: { item: PlacedItem; paint: string }) {
  return (
    <svg viewBox={`0 0 100 ${item.ratio}`} aria-hidden="true" style={ART}>
      <path d={shapePath(item.kind, item.ratio)} fill={item.filled ? paint : 'none'} stroke={item.filled ? 'none' : paint} strokeWidth={item.stroke} strokeLinejoin="round" />
    </svg>
  );
}

function ImageItem({ item, paint }: { item: PlacedItem; paint: string }) {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const outline = item.mask ? shapePath(item.mask, item.ratio) : `M0 0H100V${item.ratio}H0Z`;
  return (
    <svg viewBox={`0 0 100 ${item.ratio}`} aria-hidden="true" style={ART}>
      {item.mask && (
        <defs>
          <clipPath id={id}>
            <path d={outline} />
          </clipPath>
        </defs>
      )}
      {/* The box has the proportions of the file until someone changes them to cut it. */}
      <image href={item.url} x="0" y="0" width="100" height={item.ratio} preserveAspectRatio="xMidYMid slice" clipPath={item.mask ? `url(#${id})` : undefined} />
      {item.border > 0 && <path d={outline} fill="none" stroke={paint} strokeWidth={item.border} strokeLinejoin="round" />}
    </svg>
  );
}

function StatItem({ item, ink, paint }: { item: PlacedItem; ink: ItemInk; paint: string }) {
  const unit = item.size * EM_PER_PERCENT;
  return (
    <>
      <svg viewBox="0 0 100 100" aria-hidden="true" style={ART}>
        <path d={shapePath(item.kind, 100)} fill={ink.base} stroke={paint} strokeWidth={item.stroke} strokeLinejoin="round" />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: item.color || ink.text,
        }}
      >
        <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: `${unit * 0.4}em`, lineHeight: 1 }}>{item.value}</span>
        {item.text && <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: `${unit * 0.13}em`, letterSpacing: '0.06em', lineHeight: 1.2, textTransform: 'uppercase' }}>{item.text}</span>}
      </div>
    </>
  );
}

interface CardItemsProps {
  items: PlacedItem[];
  side: ItemSide;
  ink: ItemInk;
  editable: boolean;
  selected: string | null;
}

/** A text is as wide as it needs to be, everything else takes its width from the size. */
function itemWidth(item: PlacedItem): string {
  if (item.type !== 'text') return `${item.size}%`;
  return item.curve ? `${curvedTextBox(item).w}%` : 'max-content';
}

/** The freely placed items of one side of the card, above its print and below its foil. */
export function CardItems({ items, side, ink, editable, selected }: CardItemsProps) {
  const shown = items.filter((item) => item.side === side && !item.hidden && (item.type !== 'image' || item.url));
  if (shown.length === 0) return null;

  return (
    <div style={LAYER}>
      {shown.map((item) => {
        const paint = item.color || ink.metal;
        return (
          <div key={item.id} data-item={item.id} data-side={item.side} style={{ ...boxStyle(item, editable, item.id === selected), width: itemWidth(item) }}>
            {item.type === 'text' && (item.curve ? <CurvedText item={item} ink={ink} /> : <TextItem item={item} ink={ink} />)}
            {item.type === 'symbol' && <SymbolItem item={item} paint={paint} />}
            {item.type === 'ornament' && <OrnamentItem item={item} paint={paint} />}
            {item.type === 'shape' && <ShapeItem item={item} paint={paint} />}
            {item.type === 'image' && <ImageItem item={item} paint={paint} />}
            {item.type === 'stat' && <StatItem item={item} ink={ink} paint={paint} />}
          </div>
        );
      })}
    </div>
  );
}
