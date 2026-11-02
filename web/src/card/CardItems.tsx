import type { CSSProperties } from 'react';
import { ORNAMENTS, shapePath, SYMBOLS } from './itemArt';
import type { PlacedItem } from './resolve';
import type { ItemFont, ItemOrnament, ItemSide, ItemSymbol } from './spec';

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

const OUTLINE = 3;

const ITEM_FONTS: Record<ItemFont, CSSProperties> = {
  cinzel: { fontFamily: "'Cinzel', serif", fontWeight: 600 },
  cormorant: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 },
  kurziva: { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600 },
  aboreto: { fontFamily: "'Aboreto', serif", fontWeight: 400 },
  gotika: { fontFamily: "'Grenze Gotisch', serif", fontWeight: 600 },
  jost: { fontFamily: "'Jost', sans-serif", fontWeight: 500 },
};

function boxStyle(item: PlacedItem, editable: boolean, selected: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: `${item.x}%`,
    top: `${item.y}%`,
    transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
    opacity: item.opacity / 100,
    pointerEvents: editable ? 'auto' : 'none',
    cursor: editable ? 'move' : undefined,
    ...(selected ? { outline: '0.07em dashed #f6dfa8', outlineOffset: '0.14em', boxShadow: '0 0 0 0.05em rgba(0,0,0,0.65)' } : null),
  };
}

function TextItem({ item, ink }: { item: PlacedItem; ink: ItemInk }) {
  return (
    <div
      style={{
        ...ITEM_FONTS[item.font],
        width: 'max-content',
        // Its own em is the size in percent of the card, so this is 92 % of the card.
        maxWidth: `${92 / item.size}em`,
        fontSize: `${item.size * EM_PER_PERCENT}em`,
        lineHeight: 1.15,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        textAlign: item.align,
        color: item.color || ink.text,
      }}
    >
      {item.text}
    </div>
  );
}

function SymbolItem({ item, paint }: { item: PlacedItem; paint: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={ART}>
      <path d={SYMBOLS[item.kind as ItemSymbol]} fill={paint} fillRule="evenodd" />
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
      <path d={shapePath(item.kind, item.ratio)} fill={item.filled ? paint : 'none'} stroke={item.filled ? 'none' : paint} strokeWidth={OUTLINE} strokeLinejoin="round" />
    </svg>
  );
}

function ImageItem({ item }: { item: PlacedItem }) {
  return (
    <svg viewBox={`0 0 100 ${item.ratio}`} aria-hidden="true" style={ART}>
      <image href={item.url} x="0" y="0" width="100" height={item.ratio} preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

function StatItem({ item, ink, paint }: { item: PlacedItem; ink: ItemInk; paint: string }) {
  const unit = item.size * EM_PER_PERCENT;
  return (
    <>
      <svg viewBox="0 0 100 100" aria-hidden="true" style={ART}>
        <path d={shapePath(item.kind, 100)} fill={ink.base} stroke={paint} strokeWidth={OUTLINE} strokeLinejoin="round" />
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

/** The freely placed items of one side of the card, above its print and below its foil. */
export function CardItems({ items, side, ink, editable, selected }: CardItemsProps) {
  const shown = items.filter((item) => item.side === side && !item.hidden && (item.type !== 'image' || item.url));
  if (shown.length === 0) return null;

  return (
    <div style={LAYER}>
      {shown.map((item) => {
        const paint = item.color || ink.metal;
        // A text is as wide as it needs to be, everything else takes its width from the size.
        const width = item.type === 'text' ? 'max-content' : `${item.size}%`;
        return (
          <div key={item.id} data-item={item.id} data-side={item.side} style={{ ...boxStyle(item, editable, item.id === selected), width }}>
            {item.type === 'text' && <TextItem item={item} ink={ink} />}
            {item.type === 'symbol' && <SymbolItem item={item} paint={paint} />}
            {item.type === 'ornament' && <OrnamentItem item={item} paint={paint} />}
            {item.type === 'shape' && <ShapeItem item={item} paint={paint} />}
            {item.type === 'image' && <ImageItem item={item} />}
            {item.type === 'stat' && <StatItem item={item} ink={ink} paint={paint} />}
          </div>
        );
      })}
    </div>
  );
}
