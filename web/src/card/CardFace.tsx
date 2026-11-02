import { memo, type CSSProperties } from 'react';
import { cs } from '../i18n/cs';
import { CardItems } from './CardItems';
import { restingMotion } from './motion';
import type { ArtLayer, CardParams, ResolvedCard } from './resolve';
import type { Foil, Texture } from './spec';
import { textEffectStyle } from './textEffects';
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

const holoImage = (angle: number) =>
  `linear-gradient(${angle}deg, rgba(255,255,255,0) 18%, rgba(255,92,170,0.75) 30%, rgba(255,214,102,0.75) 40%, rgba(104,255,196,0.75) 50%, rgba(92,178,255,0.75) 60%, rgba(196,120,255,0.75) 70%, rgba(255,255,255,0) 82%)`;

const SPARK_IMAGE =
  'radial-gradient(circle, rgba(255,255,255,0.95) 0, rgba(255,255,255,0.95) 0.05em, rgba(255,255,255,0) 0.09em), radial-gradient(circle, rgba(255,226,170,0.9) 0, rgba(255,226,170,0.9) 0.04em, rgba(255,226,170,0) 0.08em), radial-gradient(circle, rgba(180,214,255,0.9) 0, rgba(180,214,255,0.9) 0.045em, rgba(180,214,255,0) 0.085em)';

const prismImage = (angle: number) =>
  `repeating-linear-gradient(${angle}deg, rgba(255,92,170,0.7) 0, rgba(255,214,102,0.7) 1.4em, rgba(104,255,196,0.7) 2.8em, rgba(92,178,255,0.7) 4.2em, rgba(196,120,255,0.7) 5.6em, rgba(255,92,170,0.7) 7em)`;

const pearlImage = (angle: number) =>
  `linear-gradient(${angle}deg, rgba(255,255,255,0) 8%, rgba(255,226,240,0.9) 30%, rgba(226,240,255,0.9) 50%, rgba(232,255,240,0.9) 70%, rgba(255,255,255,0) 92%)`;

const fireImage = (angle: number) =>
  `linear-gradient(${angle}deg, rgba(255,255,255,0) 14%, rgba(255,60,30,0.75) 30%, rgba(255,150,40,0.8) 44%, rgba(255,226,120,0.85) 54%, rgba(255,120,30,0.75) 68%, rgba(255,255,255,0) 86%)`;

const iceImage = (angle: number) =>
  `linear-gradient(${angle}deg, rgba(255,255,255,0) 14%, rgba(80,150,255,0.75) 30%, rgba(120,230,255,0.8) 44%, rgba(235,252,255,0.9) 54%, rgba(120,190,255,0.75) 68%, rgba(255,255,255,0) 86%)`;

const RINGS_IMAGE =
  'repeating-radial-gradient(circle at var(--hx) var(--hy), rgba(255,92,170,0.6) 0, rgba(255,214,102,0.6) 1.2em, rgba(104,255,196,0.6) 2.4em, rgba(92,178,255,0.6) 3.6em, rgba(196,120,255,0.6) 4.8em, rgba(255,92,170,0.6) 6em)';

const NEBULA_IMAGE =
  'radial-gradient(ellipse 34% 26% at 32% 34%, rgba(160,90,255,0.85), rgba(160,90,255,0) 100%), radial-gradient(ellipse 30% 22% at 68% 58%, rgba(70,160,255,0.85), rgba(70,160,255,0) 100%), radial-gradient(ellipse 24% 20% at 42% 74%, rgba(255,90,180,0.75), rgba(255,90,180,0) 100%)';

const holoBase: CSSProperties = {
  ...OVERLAY,
  backgroundSize: '280% 280%',
  backgroundPosition: 'var(--hx) var(--hy)',
  mixBlendMode: 'color-dodge',
  opacity: 'var(--holo-o)',
};

/** The shimmering layer of a foil. The ones that only change the metal never show it. */
function holoLayer(foil: Foil, angle: number): CSSProperties {
  switch (foil) {
    case 'hranol':
      return { ...holoBase, backgroundImage: prismImage(angle), backgroundSize: '160% 160%' };
    case 'perlet':
    case 'trpytky':
      return { ...holoBase, backgroundImage: pearlImage(angle), backgroundSize: '220% 220%', mixBlendMode: 'soft-light' };
    case 'plamen':
      return { ...holoBase, backgroundImage: fireImage(angle), backgroundSize: '240% 240%' };
    case 'ledova':
      return { ...holoBase, backgroundImage: iceImage(angle), backgroundSize: '240% 240%' };
    case 'vlny':
      return { ...holoBase, backgroundImage: RINGS_IMAGE, backgroundSize: '100% 100%', backgroundPosition: '0 0' };
    case 'galaxie':
      return { ...holoBase, backgroundImage: NEBULA_IMAGE, backgroundSize: '170% 170%', mixBlendMode: 'screen' };
    default:
      return { ...holoBase, backgroundImage: holoImage(angle) };
  }
}

const TEXTURES: Record<Exclude<Texture, 'zadna'>, CSSProperties> = {
  platno: {
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0, rgba(255,255,255,0.22) 0.11em, rgba(0,0,0,0.22) 0.11em, rgba(0,0,0,0.22) 0.22em), repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0, rgba(255,255,255,0.22) 0.11em, rgba(0,0,0,0.22) 0.11em, rgba(0,0,0,0.22) 0.22em)',
    mixBlendMode: 'overlay',
  },
  ryhy: {
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 0.14em, rgba(0,0,0,0.28) 0.14em, rgba(0,0,0,0.28) 0.34em)',
    mixBlendMode: 'overlay',
  },
  zrno: {
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 0, rgba(255,255,255,0) 0.07em), radial-gradient(circle, rgba(0,0,0,0.8) 0, rgba(0,0,0,0) 0.08em)',
    backgroundSize: '0.23em 0.29em, 0.31em 0.21em',
    mixBlendMode: 'overlay',
  },
  kazeta: {
    backgroundImage:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.34) 0, rgba(255,255,255,0.34) 0.09em, rgba(0,0,0,0.2) 0.09em, rgba(0,0,0,0.2) 0.18em, rgba(0,0,0,0) 0.18em, rgba(0,0,0,0) 0.72em), repeating-linear-gradient(-45deg, rgba(255,255,255,0.34) 0, rgba(255,255,255,0.34) 0.09em, rgba(0,0,0,0.2) 0.09em, rgba(0,0,0,0.2) 0.18em, rgba(0,0,0,0) 0.18em, rgba(0,0,0,0) 0.72em)',
    mixBlendMode: 'overlay',
  },
  pergamen: {
    backgroundImage:
      'radial-gradient(ellipse 45% 30% at 22% 28%, rgba(120,80,30,0.55), rgba(120,80,30,0) 100%), radial-gradient(ellipse 40% 26% at 78% 18%, rgba(90,60,25,0.45), rgba(90,60,25,0) 100%), radial-gradient(ellipse 50% 34% at 66% 76%, rgba(120,80,30,0.5), rgba(120,80,30,0) 100%), radial-gradient(ellipse 30% 24% at 18% 82%, rgba(80,50,20,0.45), rgba(80,50,20,0) 100%)',
    mixBlendMode: 'multiply',
  },
};

/** What the card is made of. It lies over the print on both sides, under the foil of the face. */
export function MaterialLayers({ card }: { card: ResolvedCard }) {
  return (
    <>
      {card.texture !== 'zadna' && <div aria-hidden="true" data-texture={card.texture} style={{ ...OVERLAY, ...TEXTURES[card.texture], opacity: card.textureI }} />}
      {card.wear > 0 && (
        <div
          aria-hidden="true"
          data-wear=""
          style={{
            ...OVERLAY,
            borderRadius: card.rad,
            boxShadow: `inset 0 0 ${(0.5 + card.wear * 1.6).toFixed(2)}em rgba(38,22,8,${(0.25 + card.wear * 0.6).toFixed(2)}), inset 0 0 ${(0.08 + card.wear * 0.2).toFixed(2)}em rgba(38,22,8,${(0.2 + card.wear * 0.6).toFixed(2)})`,
          }}
        />
      )}
    </>
  );
}

const sparkStyle: CSSProperties = {
  ...OVERLAY,
  backgroundImage: SPARK_IMAGE,
  backgroundSize: '2.7em 3.3em, 3.9em 2.6em, 5.3em 4.4em',
  backgroundPosition: 'var(--sp-pos)',
  mixBlendMode: 'screen',
  opacity: 'var(--sp-o)',
};

const glitterStyle: CSSProperties = { ...sparkStyle, backgroundSize: '0.97em 1.31em, 1.43em 1.07em, 1.83em 1.57em' };

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
  const { artBox: box, artwork } = card;
  const vars = PARALLAX_VARS[artwork.length] ?? PARALLAX_VARS[3]!;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  return (
    <>
      {artwork.slice(0, 3).map((layer: ArtLayer, i) => {
        const [varX, varY] = vars[i]!;
        const dx = (layer.x / 100) * box.w;
        const dy = (layer.y / 100) * box.h;
        const rotation = layer.rotate ? ` rotate(${layer.rotate})` : '';
        const scale = layer.flipX ? `${-layer.zoom} ${layer.zoom}` : `${layer.zoom}`;
        return (
          <g key={i} style={{ transform: `translate(var(${varX}), var(${varY}))` }}>
            <g transform={`translate(${cx + dx} ${cy + dy})${rotation} scale(${scale}) translate(${-cx} ${-cy})`}>
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

function ArtFilterDefs({ card, id }: { card: ResolvedCard; id: string }) {
  const { artFilter: filter, H } = card;
  if (!filter) return null;
  const brightness = String(filter.brightness / 100);
  const s = filter.sepia / 100;
  const contrast = filter.contrast / 100;
  const slope = String(contrast);
  const intercept = String((1 - contrast) / 2);
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x="0" y="0" width="300" height={H} colorInterpolationFilters="sRGB">
      <feColorMatrix type="hueRotate" values={String(filter.hue)} />
      <feColorMatrix type="saturate" values={String(filter.saturate / 100)} />
      {s > 0 && (
        <feColorMatrix
          type="matrix"
          values={[
            [1 - 0.607 * s, 0.769 * s, 0.189 * s],
            [0.349 * s, 1 - 0.314 * s, 0.168 * s],
            [0.272 * s, 0.534 * s, 1 - 0.869 * s],
          ]
            .map((row) => `${row.map((n) => n.toFixed(3)).join(' ')} 0 0`)
            .concat('0 0 0 1 0')
            .join(' ')}
        />
      )}
      <feComponentTransfer>
        <feFuncR type="linear" slope={brightness} />
        <feFuncG type="linear" slope={brightness} />
        <feFuncB type="linear" slope={brightness} />
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR type="linear" slope={slope} intercept={intercept} />
        <feFuncG type="linear" slope={slope} intercept={intercept} />
        <feFuncB type="linear" slope={slope} intercept={intercept} />
      </feComponentTransfer>
    </filter>
  );
}

/** The background of the illustration, under the art and under its uploaded image. */
function SkyDefs({ card, id }: { card: ResolvedCard; id: string }) {
  const { c, skyStyle } = card;
  if (skyStyle === 'zare') {
    return (
      <radialGradient id={id} cx="0.5" cy="0.38" r="0.7">
        <stop offset="0" stopColor={c.sky0} />
        <stop offset="1" stopColor={c.sky1} />
      </radialGradient>
    );
  }
  const reverse = skyStyle === 'opacny';
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={reverse ? c.sky1 : c.sky0} />
      <stop offset="1" stopColor={reverse ? c.sky0 : c.sky1} />
    </linearGradient>
  );
}

function FaceSvg({ card, ids }: { card: ResolvedCard; ids: CardIds }) {
  const { H, g, c, parts, frameWeight, artBox } = card;
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
        <linearGradient id={ids.metal} data-metal="" x1={rest.mx1} y1="0" x2={rest.mx2} y2="1">
          <stop offset="0" stopColor={card.g0} />
          <stop offset="0.38" stopColor={card.g1} />
          <stop offset="0.5" stopColor={card.g2} />
          <stop offset="0.62" stopColor={card.g1} />
          <stop offset="1" stopColor={card.g0} />
        </linearGradient>
        <SkyDefs card={card} id={ids.sky} />
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor={c.glow} stopOpacity="0.6" />
          <stop offset="0.55" stopColor={c.glow} stopOpacity="0.18" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.clip}>
          <path d={card.fullArt ? `M0 0H300V${H}H0Z` : g.win} />
        </clipPath>
        {card.foilArea !== 'cela' && (
          <clipPath id={ids.foil} clipPathUnits="objectBoundingBox">
            <path d={card.foilArea === 'ilustrace' ? g.win : `M0 0H300V${H}H0Z${g.win}`} clipRule="evenodd" transform={`scale(${1 / 300} ${1 / H})`} />
          </clipPath>
        )}
        {card.vignette > 0 && (
          <radialGradient id={ids.vignette} cx="0.5" cy="0.5" r="0.72">
            <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.95" />
          </radialGradient>
        )}
        <ArtFilterDefs card={card} id={ids.filter} />
        <filter id={ids.emb}>
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.4" floodColor="#000000" floodOpacity="0.7" />
        </filter>
      </defs>

      <g clipPath={`url(#${ids.clip})`} opacity={card.showArt ? 1 : 0}>
        <g filter={card.artFilter ? `url(#${ids.filter})` : undefined}>
          <rect x="0" y="0" width="300" height={H} fill={card.skyStyle === 'plna' ? c.sky0 : `url(#${ids.sky})`} />
          {(card.sky.line || card.sky.fill) && (
            <g style={{ transform: 'translate(var(--pbx), var(--pby))' }}>
              {card.sky.line && <path d={card.sky.line} fill="none" stroke={paint(c.thin)} strokeWidth={0.7} opacity={0.5} />}
              {card.sky.fill && <path d={card.sky.fill} fill={c.dots} opacity={0.8} />}
            </g>
          )}
          {card.artwork.length > 0 ? <CustomArt card={card} /> : <BuiltinArt card={card} ids={ids} />}
        </g>
        {card.vignette > 0 && <rect x={artBox.x} y={artBox.y} width={artBox.w} height={artBox.h} fill={`url(#${ids.vignette})`} opacity={card.vignette} />}
      </g>

      <g opacity={card.showFrame ? 1 : 0} filter={card.emboss ? `url(#${ids.emb})` : 'none'}>
        <path d={g.panel} fill={c.panelFill} stroke={paint(c.panelStroke)} strokeWidth={0.9} />
        {!card.fullArt && parts.window && <path d={g.win} fill="none" stroke={gold} strokeWidth={2 * frameWeight} />}
        {parts.border && (
          <>
            <path d={g.border} fill="none" stroke={gold} strokeWidth={1.6 * frameWeight} />
            <path d={g.border2} fill="none" stroke={paint(c.border2)} strokeWidth={0.8 * frameWeight} />
          </>
        )}
        {parts.plaque && <path d={g.plaque} fill={c.plaque} stroke={gold} strokeWidth={1.2 * frameWeight} />}
        <path d={g.acc} fill={c.acc} stroke={gold} strokeWidth={1.2} />
        <path d={g.acc2} fill={c.acc2} stroke={gold} strokeWidth={1} />
        {parts.corners &&
          mirrors.map((transform, i) => (
            <path key={i} d={g.corner} transform={transform} fill="none" stroke={gold} strokeWidth={1.2 * frameWeight} {...round} />
          ))}
        {parts.corners &&
          mirrors.map((transform, i) => (
            <path key={i} d={g.cornerF} transform={transform} fill={gold} />
          ))}
        {parts.ornaments && (
          <>
            <path d={g.ornS} fill="none" stroke={gold} strokeWidth={1 * frameWeight} strokeLinecap="round" />
            <path d={g.ornF} fill={gold} />
          </>
        )}
        <path d={g.icoF} fill={c.ico} />
        <path d={g.icoS} fill="none" stroke={c.ico} strokeWidth={1.5} {...round} />
        <path d={g.sicoF} fill={c.sico} />
        <path d={g.sicoS} fill="none" stroke={c.sico} strokeWidth={1.3} {...round} />
        {parts.rarity && (
          <>
            <path d={g.rarF} fill={gold} />
            <path d={g.rarO} fill="none" stroke={gold} strokeWidth={0.8} />
          </>
        )}
      </g>
    </svg>
  );
}

/** What the title has in common on all the cards. Its own place, size and spacing come on top. */
function titleLook(card: ResolvedCard): CSSProperties {
  return {
    textTransform: card.titleCaps ? 'uppercase' : 'none',
    fontFamily: card.ff,
    fontWeight: card.fw,
    color: card.titleColor,
    ...textEffectStyle(card.titleEffect, card.titleColor, card.c.glow),
  };
}

function titleTop(card: ResolvedCard, top: string): string {
  return card.titleOffset ? `calc(${top} + ${card.titleOffset}%)` : top;
}

/** The size of a text other than the title. */
function bodySize(card: ResolvedCard, size: number): string {
  return `${card.bodyScale === 1 ? size : (size * card.bodyScale).toFixed(3)}em`;
}

function TarotLikeText({ card }: { card: ResolvedCard }) {
  const { c, t, parts } = card;
  return (
    <>
      {card.variant === 'tarot' && parts.numeral && (
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
      {parts.title && (
        <div
          style={{
            ...center,
            left: '12%',
            right: '12%',
            top: titleTop(card, t.top),
            height: t.h,
            whiteSpace: 'nowrap',
            fontSize: `${t.fs}em`,
            letterSpacing: `${t.ls}em`,
            paddingLeft: `${t.ls}em`,
            ...titleLook(card),
          }}
        >
          {card.title}
        </div>
      )}
      {card.variant === 'orakulum' && parts.subtitle && (
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
            fontSize: bodySize(card, Number(card.subFs)),
            color: c.txt,
          }}
        >
          {card.subtitle}
        </div>
      )}
    </>
  );
}

function BestieAbility({ card, top, powerTop, name, text, power }: { card: ResolvedCard; top: string; powerTop: string; name: string; text: string; power: string }) {
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
        <div style={{ fontFamily: JOST, fontWeight: 600, fontSize: bodySize(card, 0.58), color: card.panelInk.strong, whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontFamily: CORMORANT, fontWeight: 500, fontSize: bodySize(card, 0.54), lineHeight: 1.15, color: card.panelInk.soft }}>{text}</div>
      </div>
      <div style={stat('81%', '7.4%', powerTop, '5.3%', '0.6em')}>{power}</div>
    </>
  );
}

function BestieText({ card }: { card: ResolvedCard }) {
  const { c, parts } = card;
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
        {card.labels.level} {card.level}
      </div>
      {parts.title && (
        <div
          style={{
            ...center,
            left: '12%',
            right: '12%',
            top: titleTop(card, '53.9%'),
            height: '7.6%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            fontSize: `${card.nameFs}em`,
            letterSpacing: `${0.12 + card.titleSpacing}em`,
            paddingLeft: `${0.12 + card.titleSpacing}em`,
            ...titleLook(card),
          }}
        >
          {card.title}
        </div>
      )}
      {parts.subtitle && (
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
            fontSize: bodySize(card, 0.62),
            color: card.el.l,
          }}
        >
          {card.subtitle}
        </div>
      )}
      <BestieAbility card={card} top="67.8%" powerTop="69%" name={card.ab1} text={card.ab1t} power={card.ab1p} />
      <BestieAbility card={card} top="77.3%" powerTop="78.5%" name={card.ab2} text={card.ab2t} power={card.ab2p} />
      <div style={stat('19.3%', '15%', '87.8%', '5.3%', '0.66em')}>{card.hp}</div>
      <div style={stat('46.3%', '15%', '87.8%', '5.3%', '0.66em')}>{card.s1}</div>
      <div style={stat('73.3%', '15%', '87.8%', '5.3%', '0.66em')}>{card.s2}</div>
      {parts.credit && (
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
      )}
    </>
  );
}

function HrdinaText({ card }: { card: ResolvedCard }) {
  const { c, parts, panelInk } = card;
  return (
    <>
      {parts.title && (
        <div
          style={{
            position: 'absolute',
            left: '10%',
            width: '62%',
            top: titleTop(card, '5.7%'),
            height: '6.9%',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            fontSize: `${card.heroFs}em`,
            letterSpacing: `${0.06 + card.titleSpacing}em`,
            ...titleLook(card),
          }}
        >
          {card.title}
        </div>
      )}
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
        {parts.credit && <span>{card.setNo}</span>}
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
          color: panelInk.strong,
        }}
      >
        <p style={{ margin: 0, fontFamily: CORMORANT, fontWeight: 500, fontSize: bodySize(card, 0.64), lineHeight: 1.2 }}>
          <strong style={{ fontWeight: 700 }}>{card.ab1}.</strong> {card.ab1t}
        </p>
        {parts.subtitle && (
          <p
            style={{
              margin: 0,
              paddingTop: '0.4em',
              borderTop: `1px solid ${panelInk.rule}`,
              fontFamily: CORMORANT,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: bodySize(card, 0.56),
              lineHeight: 1.2,
              color: panelInk.soft,
            }}
          >
            {card.subtitle}
          </p>
        )}
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
        <span>{card.labels.s1}</span>
        <span>{card.labels.s2}</span>
        <span>{card.labels.s3}</span>
      </div>
    </>
  );
}

function BlankText({ card }: { card: ResolvedCard }) {
  const { box, H, c, t, parts } = card;
  const windowEnd = box.y + box.h;
  const percent = (n: number) => `${(n / H) * 100}%`;

  return (
    <>
      {parts.subtitle && (
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
            fontSize: bodySize(card, Number(card.subFs) * 1.2),
            lineHeight: 1.2,
            color: c.txt,
          }}
        >
          {card.subtitle}
        </div>
      )}
      {parts.title && (
        <div
          style={{
            ...center,
            left: '10%',
            right: '10%',
            top: titleTop(card, percent(windowEnd)),
            height: percent(H - windowEnd - box.y),
            whiteSpace: 'nowrap',
            fontSize: `${t.fs}em`,
            letterSpacing: `${t.ls}em`,
            paddingLeft: `${t.ls}em`,
            ...titleLook(card),
          }}
        >
          {card.title}
        </div>
      )}
    </>
  );
}

/** The SVG, the text and the foil overlays. The motion comes in through CSS variables. */
export const FaceLayers = memo(function FaceLayers({ card, editable = false, selected = null }: { card: ResolvedCard; editable?: boolean; selected?: string | null }) {
  const ids = useCardIds();
  // Directly on the layers. As a wrapper around them it would cut them off from the card below.
  const clipPath = card.foilArea === 'cela' ? undefined : `url(#${ids.foil})`;
  return (
    <>
      <FaceSvg card={card} ids={ids} />
      <div style={{ ...FILL, pointerEvents: 'none', opacity: card.showText ? 1 : 0 }}>
        {card.tcg ? null : card.blank ? <BlankText card={card} /> : <TarotLikeText card={card} />}
        {card.variant === 'bestie' && <BestieText card={card} />}
        {card.variant === 'hrdina' && <HrdinaText card={card} />}
      </div>
      <CardItems items={card.items} side="face" ink={{ base: card.c.base, text: card.c.txt, metal: `url(#${ids.metal})` }} editable={editable} selected={selected} />
      <MaterialLayers card={card} />
      <div aria-hidden="true" style={{ ...holoLayer(card.foil, card.foilAngle), clipPath }} />
      <div aria-hidden="true" style={{ ...(card.foil === 'trpytky' ? glitterStyle : sparkStyle), clipPath }} />
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
