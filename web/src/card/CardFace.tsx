import { memo, type CSSProperties } from 'react';
import { cs } from '../i18n/cs';
import { restingMotion } from './motion';
import type { ArtLayer, CardParams, ResolvedCard } from './resolve';
import { goldPaint, useCardIds, useResolvedCard, type CardIds } from './useResolvedCard';

// Inline styles on purpose. The export serializes this DOM into an SVG image, where
// external stylesheets do not apply, so the face has to carry all of its own styling.

const FILL: CSSProperties = { position: 'absolute', inset: 0 };
const OVERLAY: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const SVG: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' };

const JOST = "'Jost', sans-serif";
const CINZEL = "'Cinzel', serif";
const CORMORANT = "'Cormorant Garamond', serif";

const INK = '#f6ecd2';

const center: CSSProperties = { position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' };

function stat(left: string, width: string, top: string, height: string, fontSize: string, color = INK): CSSProperties {
  return { ...center, left, width, top, height, fontFamily: CINZEL, fontWeight: 700, fontSize, color };
}

const HOLO_IMAGE =
  'linear-gradient(115deg, rgba(255,255,255,0) 18%, rgba(255,92,170,0.75) 30%, rgba(255,214,102,0.75) 40%, rgba(104,255,196,0.75) 50%, rgba(92,178,255,0.75) 60%, rgba(196,120,255,0.75) 70%, rgba(255,255,255,0) 82%)';

const SPARK_IMAGE =
  'radial-gradient(circle, rgba(255,255,255,0.95) 0, rgba(255,255,255,0.95) 0.05em, rgba(255,255,255,0) 0.09em), radial-gradient(circle, rgba(255,226,170,0.9) 0, rgba(255,226,170,0.9) 0.04em, rgba(255,226,170,0) 0.08em), radial-gradient(circle, rgba(180,214,255,0.9) 0, rgba(180,214,255,0.9) 0.045em, rgba(180,214,255,0) 0.085em)';

const holoStyle: CSSProperties = {
  ...OVERLAY,
  backgroundImage: HOLO_IMAGE,
  backgroundSize: '280% 280%',
  backgroundPosition: 'var(--hx) var(--hy)',
  mixBlendMode: 'color-dodge',
  opacity: 'var(--holo-o)',
};

const sparkStyle: CSSProperties = {
  ...OVERLAY,
  backgroundImage: SPARK_IMAGE,
  backgroundSize: '2.7em 3.3em, 3.9em 2.6em, 5.3em 4.4em',
  backgroundPosition: 'var(--sp-pos)',
  mixBlendMode: 'screen',
  opacity: 'var(--sp-o)',
};

const glareStyle: CSSProperties = {
  ...OVERLAY,
  backgroundImage: 'radial-gradient(circle at var(--gx) var(--gy), rgba(255,255,255,var(--ga)) 0%, rgba(255,255,255,0) 58%)',
  mixBlendMode: 'soft-light',
};

/** Cuts of a stack of uploaded layers per the number of layers, bottom first. */
const PARALLAX_VARS: Record<number, [string, string][]> = {
  1: [['--pbx', '--pby']],
  2: [['--pbx', '--pby'], ['--pfx', '--pfy']],
  3: [['--pbx', '--pby'], ['--pmx', '--pmy'], ['--pfx', '--pfy']],
};

/** Parallax shifts an image by up to 14 units, so it has to reach further than the window. */
const ARTWORK_OVERSCAN = 16;

function CustomArt({ card }: { card: ResolvedCard }) {
  const { box, artwork } = card;
  const vars = PARALLAX_VARS[artwork.length] ?? PARALLAX_VARS[3]!;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  return (
    <>
      {artwork.slice(0, 3).map((layer: ArtLayer, i) => {
        const [varX, varY] = vars[i]!;
        const dx = (layer.x / 100) * box.w;
        const dy = (layer.y / 100) * box.h;
        return (
          <g key={i} style={{ transform: `translate(var(${varX}), var(${varY}))` }}>
            <g transform={`translate(${cx + dx} ${cy + dy}) scale(${layer.zoom}) translate(${-cx} ${-cy})`}>
              <image
                href={layer.url}
                x={box.x - ARTWORK_OVERSCAN}
                y={box.y - ARTWORK_OVERSCAN}
                width={box.w + 2 * ARTWORK_OVERSCAN}
                height={box.h + 2 * ARTWORK_OVERSCAN}
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
          </g>
        );
      })}
    </>
  );
}

function BuiltinArt({ card, ids }: { card: ResolvedCard; ids: CardIds }) {
  const { a, c } = card;
  const paint = goldPaint(ids);
  const stroke = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <>
      <g style={{ transform: 'translate(var(--pbx), var(--pby))' }}>
        <path d={a.dots} fill={c.dots} opacity={0.85} />
        <path d={a.thin} {...stroke} stroke={paint(c.thin)} strokeWidth={0.9} opacity={0.8} />
      </g>
      <g style={{ transform: 'translate(var(--pfx), var(--pfy))' }}>
        <path d={a.glow} fill={`url(#${ids.glow})`} />
        <path d={a.under} {...stroke} stroke={paint(c.under)} strokeWidth={1.4} />
        <path d={a.fill} fill={paint(c.fill)} />
        <path d={a.line} {...stroke} stroke={paint(c.line)} strokeWidth={1.5} />
        <path d={a.core} fill="#fffdf2" opacity={0.92} />
        <path d={a.eyes} fill={c.eyes} />
      </g>
    </>
  );
}

function FaceSvg({ card, ids }: { card: ResolvedCard; ids: CardIds }) {
  const { H, g, c } = card;
  const paint = goldPaint(ids);
  const gold = `url(#${ids.gold})`;
  const rest = restingMotion(card);
  const round = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const mirrors = [
    undefined,
    'translate(300 0) scale(-1 1)',
    `translate(0 ${H}) scale(1 -1)`,
    `translate(300 ${H}) scale(-1 -1)`,
  ];

  return (
    <svg viewBox={`0 0 300 ${H}`} aria-hidden="true" style={SVG}>
      <defs>
        <linearGradient id={ids.gold} data-gold="" gradientUnits="userSpaceOnUse" x1={rest.gx1} y1="0" x2={rest.gx2} y2={H}>
          <stop offset="0" stopColor={card.g0} />
          <stop offset="0.38" stopColor={card.g1} />
          <stop offset="0.5" stopColor={card.g2} />
          <stop offset="0.62" stopColor={card.g1} />
          <stop offset="1" stopColor={card.g0} />
        </linearGradient>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky0} />
          <stop offset="1" stopColor={c.sky1} />
        </linearGradient>
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor={c.glow} stopOpacity="0.6" />
          <stop offset="0.55" stopColor={c.glow} stopOpacity="0.18" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.clip}>
          <path d={g.win} />
        </clipPath>
        <filter id={ids.emb}>
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.4" floodColor="#000000" floodOpacity="0.7" />
        </filter>
      </defs>

      <g clipPath={`url(#${ids.clip})`} opacity={card.showArt ? 1 : 0}>
        <rect x="0" y="0" width="300" height={H} fill={`url(#${ids.sky})`} />
        {card.artwork.length > 0 ? <CustomArt card={card} /> : <BuiltinArt card={card} ids={ids} />}
      </g>

      <g opacity={card.showFrame ? 1 : 0} filter={card.emboss ? `url(#${ids.emb})` : 'none'}>
        <path d={g.panel} fill={c.panelFill} stroke={paint(c.panelStroke)} strokeWidth={0.9} />
        <path d={g.win} fill="none" stroke={gold} strokeWidth={2} />
        <path d={g.border} fill="none" stroke={gold} strokeWidth={1.6} />
        <path d={g.border2} fill="none" stroke={paint(c.border2)} strokeWidth={0.8} />
        <path d={g.plaque} fill={c.plaque} stroke={gold} strokeWidth={1.2} />
        <path d={g.acc} fill={c.acc} stroke={gold} strokeWidth={1.2} />
        <path d={g.acc2} fill={c.acc2} stroke={gold} strokeWidth={1} />
        {mirrors.map((transform, i) => (
          <path key={i} d={g.corner} transform={transform} fill="none" stroke={gold} strokeWidth={1.2} {...round} />
        ))}
        {mirrors.map((transform, i) => (
          <path key={i} d={g.cornerF} transform={transform} fill={gold} />
        ))}
        <path d={g.ornS} fill="none" stroke={gold} strokeWidth={1} strokeLinecap="round" />
        <path d={g.ornF} fill={gold} />
        <path d={g.icoF} fill={c.ico} />
        <path d={g.icoS} fill="none" stroke={c.ico} strokeWidth={1.5} {...round} />
        <path d={g.sicoF} fill={c.sico} />
        <path d={g.sicoS} fill="none" stroke={c.sico} strokeWidth={1.3} {...round} />
        <path d={g.rarF} fill={gold} />
        <path d={g.rarO} fill="none" stroke={gold} strokeWidth={0.8} />
      </g>
    </svg>
  );
}

function TarotLikeText({ card }: { card: ResolvedCard }) {
  const { c, t } = card;
  return (
    <>
      {card.variant === 'tarot' && (
        <div
          style={{
            ...center,
            left: 0,
            right: 0,
            top: '6.2%',
            height: '4.8%',
            fontFamily: CINZEL,
            fontWeight: 600,
            fontSize: '1.02em',
            letterSpacing: '0.24em',
            paddingLeft: '0.24em',
            color: c.txt,
          }}
        >
          {card.numeral}
        </div>
      )}
      <div
        style={{
          ...center,
          left: '12%',
          right: '12%',
          top: t.top,
          height: t.h,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          fontFamily: card.ff,
          fontWeight: card.fw,
          fontSize: `${t.fs}em`,
          letterSpacing: `${t.ls}em`,
          paddingLeft: `${t.ls}em`,
          color: c.txt,
        }}
      >
        {card.title}
      </div>
      {card.variant === 'orakulum' && (
        <div
          style={{
            ...center,
            left: '8%',
            right: '8%',
            top: '91.6%',
            height: '3.6%',
            whiteSpace: 'nowrap',
            fontFamily: CORMORANT,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: `${card.subFs}em`,
            color: c.txt,
          }}
        >
          {card.subtitle}
        </div>
      )}
    </>
  );
}

function BestieAbility({ top, powerTop, name, text, power }: { top: string; powerTop: string; name: string; text: string; power: string }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '11%',
          width: '66%',
          top,
          height: '8.1%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '0.1em',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontFamily: JOST, fontWeight: 600, fontSize: '0.58em', color: INK, whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontFamily: CORMORANT, fontWeight: 500, fontSize: '0.54em', lineHeight: 1.15, color: '#cfc7b2' }}>{text}</div>
      </div>
      <div style={stat('81%', '7.4%', powerTop, '5.3%', '0.6em')}>{power}</div>
    </>
  );
}

function BestieText({ card }: { card: ResolvedCard }) {
  const { c } = card;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '8.7%',
          top: '5.4%',
          height: '4.4%',
          display: 'flex',
          alignItems: 'center',
          fontFamily: JOST,
          fontWeight: 600,
          fontSize: '0.54em',
          letterSpacing: '0.1em',
          color: c.txt,
        }}
      >
        {cs.card.level} {card.level}
      </div>
      <div
        style={{
          ...center,
          left: '12%',
          right: '12%',
          top: '53.9%',
          height: '7.6%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textTransform: 'uppercase',
          fontFamily: card.ff,
          fontWeight: card.fw,
          fontSize: `${card.nameFs}em`,
          letterSpacing: '0.12em',
          paddingLeft: '0.12em',
          color: INK,
        }}
      >
        {card.title}
      </div>
      <div
        style={{
          ...center,
          left: '10%',
          right: '10%',
          top: '62.1%',
          height: '3.8%',
          whiteSpace: 'nowrap',
          fontFamily: CORMORANT,
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: '0.62em',
          color: card.el.l,
        }}
      >
        {card.subtitle}
      </div>
      <BestieAbility top="67.8%" powerTop="69%" name={card.ab1} text={card.ab1t} power={card.ab1p} />
      <BestieAbility top="77.3%" powerTop="78.5%" name={card.ab2} text={card.ab2t} power={card.ab2p} />
      <div style={stat('19.3%', '15%', '87.8%', '5.3%', '0.66em')}>{card.hp}</div>
      <div style={stat('46.3%', '15%', '87.8%', '5.3%', '0.66em')}>{card.s1}</div>
      <div style={stat('73.3%', '15%', '87.8%', '5.3%', '0.66em')}>{card.s2}</div>
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          top: '94.4%',
          height: '2.6%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: JOST,
          fontWeight: 500,
          fontSize: '0.36em',
          letterSpacing: '0.06em',
          color: '#a29b8a',
        }}
      >
        <span>
          {cs.card.illustrator} {card.author}
        </span>
        <span>{card.setNo}</span>
      </div>
    </>
  );
}

function HrdinaText({ card }: { card: ResolvedCard }) {
  const { c } = card;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '10%',
          width: '62%',
          top: '5.7%',
          height: '6.9%',
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textTransform: 'uppercase',
          fontFamily: card.ff,
          fontWeight: card.fw,
          fontSize: `${card.heroFs}em`,
          letterSpacing: '0.06em',
          color: INK,
        }}
      >
        {card.title}
      </div>
      <div style={stat('79.7%', '11.3%', '5%', '8.1%', '1.1em', '#fff3da')}>{card.cost}</div>
      <div
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          top: '13.6%',
          height: '2.6%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1em',
          fontFamily: JOST,
          fontWeight: 600,
          fontSize: '0.4em',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: c.txt,
        }}
      >
        <span>{card.cls}</span>
        <span>{card.setNo}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          top: '63.4%',
          height: '21.4%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '0.3em',
          overflow: 'hidden',
          color: '#2a2018',
        }}
      >
        <p style={{ margin: 0, fontFamily: CORMORANT, fontWeight: 500, fontSize: '0.64em', lineHeight: 1.2 }}>
          <strong style={{ fontWeight: 700 }}>{card.ab1}.</strong> {card.ab1t}
        </p>
        <p
          style={{
            margin: 0,
            paddingTop: '0.4em',
            borderTop: '1px solid rgba(42,32,24,0.25)',
            fontFamily: CORMORANT,
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '0.56em',
            lineHeight: 1.2,
            color: '#5e4c38',
          }}
        >
          {card.subtitle}
        </p>
      </div>
      <div style={stat('28.3%', '10%', '88.3%', '5.7%', '0.72em')}>{card.s1}</div>
      <div style={stat('45%', '10%', '88.3%', '5.7%', '0.72em')}>{card.s2}</div>
      <div style={stat('61.7%', '10%', '88.3%', '5.7%', '0.72em')}>{card.s3}</div>
      <div
        style={{
          position: 'absolute',
          left: '25%',
          right: '25%',
          top: '95.3%',
          height: '2.4%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          alignItems: 'center',
          textAlign: 'center',
          fontFamily: JOST,
          fontWeight: 600,
          fontSize: '0.32em',
          letterSpacing: '0.12em',
          color: c.txt,
        }}
      >
        <span>{cs.card.statStrength}</span>
        <span>{cs.card.statDefense}</span>
        <span>{cs.card.statMagic}</span>
      </div>
    </>
  );
}

function BlankText({ card }: { card: ResolvedCard }) {
  const { box, H, c, t } = card;
  const windowEnd = box.y + box.h;
  const percent = (n: number) => `${(n / H) * 100}%`;

  return (
    <>
      <div
        style={{
          ...center,
          left: '10%',
          right: '10%',
          top: percent(box.y),
          height: percent(box.h),
          textAlign: 'center',
          fontFamily: CORMORANT,
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: `${Number(card.subFs) * 1.2}em`,
          lineHeight: 1.2,
          color: c.txt,
        }}
      >
        {card.subtitle}
      </div>
      <div
        style={{
          ...center,
          left: '10%',
          right: '10%',
          top: percent(windowEnd),
          height: percent(H - windowEnd - box.y),
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          fontFamily: card.ff,
          fontWeight: card.fw,
          fontSize: `${t.fs}em`,
          letterSpacing: `${t.ls}em`,
          paddingLeft: `${t.ls}em`,
          color: c.txt,
        }}
      >
        {card.title}
      </div>
    </>
  );
}

/** The SVG, the text and the foil overlays. The motion comes in through CSS variables. */
export const FaceLayers = memo(function FaceLayers({ card }: { card: ResolvedCard }) {
  const ids = useCardIds();
  return (
    <>
      <FaceSvg card={card} ids={ids} />
      <div style={{ ...FILL, pointerEvents: 'none', opacity: card.showText ? 1 : 0 }}>
        {card.tcg ? null : card.blank ? <BlankText card={card} /> : <TarotLikeText card={card} />}
        {card.variant === 'bestie' && <BestieText card={card} />}
        {card.variant === 'hrdina' && <HrdinaText card={card} />}
      </div>
      <div aria-hidden="true" style={holoStyle} />
      <div aria-hidden="true" style={sparkStyle} />
      <div aria-hidden="true" style={glareStyle} />
    </>
  );
});

export interface FlatCardProps extends CardParams {
  /** Fixed pixel width, used for the export. Without it, the card fills its container. */
  widthPx?: number;
  /** Square corners and no clipping radius, used for print output with bleed. */
  squareCorners?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function flatRootStyle(card: ResolvedCard, widthPx: number | undefined, squareCorners: boolean | undefined, background: string): CSSProperties {
  return {
    position: 'relative',
    width: '100%',
    aspectRatio: card.ar,
    overflow: 'hidden',
    borderRadius: squareCorners ? 0 : card.rad,
    background,
    fontSize: widthPx ? `${widthPx / 18.75}px` : 'calc(100cqw / 18.75)',
    fontFamily: "'Jost', system-ui, sans-serif",
    lineHeight: 'normal',
    userSelect: 'none',
    ...(restingMotion(card).vars as CSSProperties),
  };
}

export function flatContainerStyle(widthPx: number | undefined, style: CSSProperties | undefined): CSSProperties {
  return { width: widthPx ?? '100%', containerType: 'inline-size', ...style };
}

/** The flat card face without any 3D, for thumbnails and the export. */
export function CardFace({ widthPx, squareCorners, className, style, ...params }: FlatCardProps) {
  const card = useResolvedCard(params);
  return (
    <div className={className} style={flatContainerStyle(widthPx, style)}>
      <div role="img" aria-label={card.ariaBase} style={flatRootStyle(card, widthPx, squareCorners, card.c.base)}>
        <FaceLayers card={card} />
      </div>
    </div>
  );
}
