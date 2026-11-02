import { memo, type CSSProperties } from 'react';
import { cs } from '../i18n/cs';
import { CardItems } from './CardItems';
import { flatContainerStyle, flatRootStyle, type FlatCardProps } from './CardFace';
import { restingMotion } from './motion';
import type { ResolvedCard } from './resolve';
import { useCardIds, useResolvedCard } from './useResolvedCard';

const SVG: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' };

const glareStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: 'radial-gradient(circle at var(--bgx) var(--gy), rgba(255,255,255,var(--ga)) 0%, rgba(255,255,255,0) 58%)',
  mixBlendMode: 'soft-light',
};

/** The back's SVG and glare. The motion comes in through CSS variables. */
export const BackLayers = memo(function BackLayers({ card, editable = false, selected = null }: { card: ResolvedCard; editable?: boolean; selected?: string | null }) {
  const ids = useCardIds();
  const gold = `url(#${ids.gold})`;
  const rest = restingMotion(card);
  const { b, back, H } = card;

  return (
    <>
      <svg viewBox={`0 0 300 ${H}`} aria-hidden="true" style={SVG}>
        <defs>
          <linearGradient id={ids.gold} data-gold="" gradientUnits="userSpaceOnUse" x1={rest.gx1} y1="0" x2={rest.gx2} y2={H}>
            <stop offset="0" stopColor={back.g0} />
            <stop offset="0.38" stopColor={back.g1} />
            <stop offset="0.5" stopColor={back.g2} />
            <stop offset="0.62" stopColor={back.g1} />
            <stop offset="1" stopColor={back.g0} />
          </linearGradient>
          <linearGradient id={ids.metal} data-metal="" x1={rest.mx1} y1="0" x2={rest.mx2} y2="1">
            <stop offset="0" stopColor={back.g0} />
            <stop offset="0.38" stopColor={back.g1} />
            <stop offset="0.5" stopColor={back.g2} />
            <stop offset="0.62" stopColor={back.g1} />
            <stop offset="1" stopColor={back.g0} />
          </linearGradient>
        </defs>
        <path d={b.thin} fill="none" stroke={gold} strokeWidth={0.9} opacity={0.75} />
        <path d={b.line} fill="none" stroke={gold} strokeWidth={1.5} />
        <path d={b.fill} fill={gold} />
        <path d={b.dark} fill={back.base} />
      </svg>
      {card.tcg && card.backPattern === 'mandala' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '70%',
            height: '5%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            fontSize: '0.95em',
            letterSpacing: '0.32em',
            paddingLeft: '0.32em',
            color: back.txt,
          }}
        >
          {cs.card.brand}
        </div>
      )}
      <CardItems items={card.items} side="back" ink={{ base: back.base, text: back.txt, metal: `url(#${ids.metal})` }} editable={editable} selected={selected} />
      <div aria-hidden="true" style={glareStyle} />
    </>
  );
});

/** The flat card back without any 3D, for thumbnails and the export. */
export function CardBack({ widthPx, squareCorners, className, style, ...params }: FlatCardProps) {
  const card = useResolvedCard(params);
  return (
    <div className={className} style={flatContainerStyle(widthPx, style)}>
      <div role="img" aria-label={card.ariaBase + cs.card.backSide} style={flatRootStyle(card, widthPx, squareCorners, card.back.base)}>
        <BackLayers card={card} />
      </div>
    </div>
  );
}
