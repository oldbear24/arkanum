import { memo, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { cs } from '../i18n/cs';
import { BackLayers } from './CardBack';
import { FaceLayers } from './CardFace';
import { computeMotion, REST, type MotionMode, type MotionOptions, type MotionState } from './motion';
import type { CardParams, ResolvedCard } from './resolve';
import type { Interactive } from './spec';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useResolvedCard } from './useResolvedCard';

export interface Card3DProps extends CardParams {
  flip?: boolean;
  spin?: boolean;
  interactive?: Interactive;
  resetKey?: number | string;
  className?: string;
  style?: CSSProperties;
}

const SPIN_DEGREES_PER_MS = 0.036;

const containerStyle: CSSProperties = { width: '100%', containerType: 'inline-size' };

const shadowStyle: CSSProperties = {
  position: 'absolute',
  left: '12%',
  right: '12%',
  bottom: '-6%',
  height: '10%',
  borderRadius: '50%',
  background: 'radial-gradient(closest-side, rgba(0,0,0,0.65), rgba(0,0,0,0))',
  transform: 'translateX(var(--shx)) scaleX(var(--shs))',
  opacity: 'var(--sho)',
};

const bodyStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  transformStyle: 'preserve-3d',
  transform: 'translateZ(var(--lift)) rotateX(var(--rx)) rotateY(var(--ry))',
};

function resolveMode(interactive: Interactive | undefined, reducedMotion: boolean): MotionMode {
  if (reducedMotion) return 'none';
  return interactive === 'drag' || interactive === 'none' ? interactive : 'tilt';
}

/**
 * The real 3D card: edge layers between a face and a back. Pointer input goes through
 * requestAnimationFrame straight into CSS variables on the scene element, so React
 * renders only when the card parameters change.
 */
export const Card3D = memo(function Card3D({ flip = false, spin = false, interactive, resetKey, className, style, ...params }: Card3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const mode = resolveMode(interactive, reducedMotion);
  const spinning = spin && !reducedMotion;
  const card = useResolvedCard(params);

  const sceneRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const motion = useRef<MotionState>({ ...REST });
  const dragStart = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const frame = useRef(0);
  const latest = useRef<{ card: ResolvedCard; options: MotionOptions }>({
    card,
    options: { flip, mode, spinning, reducedMotion },
  });

  const write = useCallback(() => {
    const scene = sceneRef.current;
    const body = bodyRef.current;
    if (!scene || !body) return;

    const { card: current, options } = latest.current;
    const out = computeMotion(current, motion.current, options);
    for (const [name, value] of Object.entries(out.vars)) {
      scene.style.setProperty(name, value);
    }
    body.style.transition = out.transition;
    scene.style.cursor = options.mode === 'drag' ? (motion.current.drag ? 'grabbing' : 'grab') : 'default';

    // Gradient coordinates are plain attributes, CSS variables cannot reach them.
    scene.querySelectorAll('linearGradient[data-gold]').forEach((gradient) => {
      gradient.setAttribute('x1', out.gx1);
      gradient.setAttribute('x2', out.gx2);
    });
  }, []);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      write();
    });
  }, [write]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Turning the card over or pressing "straighten" clears the rotation.
  const previous = useRef({ flip, resetKey });
  useLayoutEffect(() => {
    if (previous.current.flip !== flip || previous.current.resetKey !== resetKey) {
      motion.current = { ...motion.current, rx: 0, ry: 0, spin: 0 };
      previous.current = { flip, resetKey };
    }
  }, [flip, resetKey]);

  // Runs after every render, which only happens when the parameters change.
  useLayoutEffect(() => {
    latest.current = { card, options: { flip, mode, spinning, reducedMotion } };
    write();
  });

  useEffect(() => {
    if (!spinning) return undefined;
    let id = 0;
    let last = 0;
    const tick = (time: number) => {
      const dt = last ? Math.min(64, time - last) : 16;
      last = time;
      if (!motion.current.drag) {
        motion.current.spin = (motion.current.spin + dt * SPIN_DEGREES_PER_MS) % 360;
        write();
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [spinning, write]);

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode === 'none') return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const m = motion.current;
    m.gx = px * 100;
    m.gy = py * 100;
    m.active = true;

    if (mode === 'drag') {
      const start = dragStart.current;
      if (m.drag && start) {
        m.ry = start.ry + (e.clientX - start.x) * 0.55;
        m.rx = Math.max(-65, Math.min(65, start.rx - (e.clientY - start.y) * 0.4));
      }
    } else {
      m.rx = (py - 0.5) * 24;
      m.ry = (0.5 - px) * 30;
    }
    schedule();
  };

  const onPointerLeave = () => {
    const m = motion.current;
    if (mode === 'drag') {
      if (!m.drag) m.active = false;
    } else {
      m.rx = 0;
      m.ry = 0;
      m.active = false;
    }
    schedule();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'drag') return;
    const m = motion.current;
    dragStart.current = { x: e.clientX, y: e.clientY, rx: m.rx, ry: m.ry };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer may be gone already. Dragging still works while it stays over the card.
    }
    m.drag = true;
    m.active = true;
    schedule();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const m = motion.current;
    if (!m.drag) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Nothing to release.
    }
    dragStart.current = null;
    m.drag = false;
    m.active = false;
    schedule();
  };

  const sceneStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: card.ar,
    perspective: 'calc(100cqw * 3.4)',
    touchAction: mode === 'drag' ? 'none' : 'pan-y',
    fontSize: 'calc(100cqw / 18.75)',
    lineHeight: 'normal',
    userSelect: 'none',
  };

  const faceBase: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: card.rad,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  };

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <div
        ref={sceneRef}
        role="img"
        aria-label={card.ariaBase + (flip ? cs.card.backSide : '')}
        style={sceneStyle}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div aria-hidden="true" style={shadowStyle} />
        <div ref={bodyRef} style={bodyStyle}>
          {card.edges.map((edge, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: card.rad,
                background: edge.color,
                transform: `translateZ(${edge.z})`,
              }}
            />
          ))}
          <div style={{ ...faceBase, transform: `translateZ(${card.half})`, background: card.c.base }}>
            <FaceLayers card={card} />
          </div>
          <div style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${card.half})`, background: card.back.base }}>
            <BackLayers card={card} />
          </div>
        </div>
      </div>
    </div>
  );
});
