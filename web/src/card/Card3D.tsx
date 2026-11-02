import { memo, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { cs } from '../i18n/cs';
import { BackLayers } from './CardBack';
import { FaceLayers } from './CardFace';
import { computeMotion, posed, REST, type MotionMode, type MotionOptions, type MotionState } from './motion';
import type { CardParams, ResolvedCard } from './resolve';
import { fullPose, NO_TURN, screenToCard, turn, twistDegrees } from './rotation';
import type { Interactive } from './spec';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useResolvedCard } from './useResolvedCard';

/** One more turn around the axes of the screen, in degrees. */
export interface CardTurn {
  x?: number;
  y?: number;
  z?: number;
}

/** Lets the pointer pick and move the free items on the card. */
export interface ItemEditing {
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** The move in percent of the card size. */
  onMove: (id: string, dx: number, dy: number) => void;
}

export interface Card3DProps extends CardParams {
  flip?: boolean;
  spin?: boolean;
  interactive?: Interactive;
  resetKey?: number | string;
  /** Every new object turns the card once more. For the buttons next to it. */
  turnBy?: CardTurn;
  editing?: ItemEditing;
  className?: string;
  style?: CSSProperties;
}

const SPIN_DEGREES_PER_MS = 0.036;
const DRAG_DEGREES_PER_PX = 0.55;
/** A press that moved less than this is a click, not a drag. */
const CLICK_SLOP_PX = 4;

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
  transform: 'translateZ(var(--lift)) var(--orient) rotateX(var(--rx)) rotateY(var(--ry))',
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
export const Card3D = memo(function Card3D({ flip = false, spin = false, interactive, resetKey, turnBy, editing, className, style, ...params }: Card3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const mode = resolveMode(interactive, reducedMotion);
  const spinning = spin && !reducedMotion;
  const card = useResolvedCard(params);

  const sceneRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const motion = useRef<MotionState>({ ...REST });
  /** The fingers or the mouse on the card, each with where it was last. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const movingItem = useRef<{ id: string; back: boolean } | null>(null);
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
    scene.querySelectorAll('linearGradient[data-metal]').forEach((gradient) => {
      gradient.setAttribute('x1', out.mx1);
      gradient.setAttribute('x2', out.mx2);
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
  const previous = useRef({ flip, resetKey, turnBy });
  useLayoutEffect(() => {
    const before = previous.current;
    if (before.flip !== flip || before.resetKey !== resetKey) {
      motion.current = { ...motion.current, rx: 0, ry: 0, spin: 0, orient: undefined };
    }
    if (turnBy && before.turnBy !== turnBy) {
      motion.current.orient = turn(motion.current.orient ?? NO_TURN, turnBy.x ?? 0, turnBy.y ?? 0, turnBy.z ?? 0);
    }
    previous.current = { flip, resetKey, turnBy };
  }, [flip, resetKey, turnBy]);

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

  /** An item follows the pointer on a turned card as well, in the plane of its own side. */
  const moveItem = (item: { id: string; back: boolean }, dx: number, dy: number, box: DOMRect) => {
    const pose = posed(motion.current, flip);
    const onCard = screenToCard(item.back ? fullPose(pose, 0, 180) : pose, dx, dy);
    if (onCard) editing?.onMove(item.id, (onCard.x / box.width) * 100, (onCard.y / box.height) * 100);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode === 'none' && !movingItem.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const m = motion.current;
    m.gx = px * 100;
    m.gy = py * 100;
    m.active = true;

    if (mode === 'drag' || movingItem.current) {
      const from = pointers.current.get(e.pointerId);
      if (m.drag && from) {
        const to = { x: e.clientX, y: e.clientY };
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        moved.current += Math.hypot(dx, dy);
        pointers.current.set(e.pointerId, to);

        const item = movingItem.current;
        if (item) {
          moveItem(item, dx, dy, r);
        } else {
          const other = [...pointers.current].find(([id]) => id !== e.pointerId)?.[1];
          const pose = m.orient ?? NO_TURN;
          // Two fingers twist the card in its plane, the Shift key does the same for a mouse.
          if (other) m.orient = turn(pose, 0, 0, twistDegrees(other, from, to));
          else if (e.shiftKey) m.orient = turn(pose, 0, 0, dx * DRAG_DEGREES_PER_PX);
          else m.orient = turn(pose, -dy * DRAG_DEGREES_PER_PX, dx * DRAG_DEGREES_PER_PX, 0);
        }
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
    // The first finger or a mouse starts anew, whatever a lost pointer may have left behind.
    if (e.isPrimary) pointers.current.clear();
    // Moving an item is no motion of the card, so it works with reduced motion as well.
    const hit = editing && pointers.current.size === 0 ? (e.target as Element).closest?.<HTMLElement>('[data-item]') : null;
    if (mode !== 'drag' && !hit) return;
    const m = motion.current;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;

    if (hit?.dataset.item) {
      movingItem.current = { id: hit.dataset.item, back: hit.dataset.side === 'back' };
      editing?.onSelect(hit.dataset.item);
    }
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
    pointers.current.delete(e.pointerId);
    // A finger stays on the card, it keeps turning it from where it is now.
    if (pointers.current.size > 0) return;

    // A click next to all items lets go of the selected one.
    if (editing && !movingItem.current && moved.current < CLICK_SLOP_PX) editing.onSelect(null);
    movingItem.current = null;
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
    WebkitBackfaceVisibility: 'hidden',
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
            <FaceLayers card={card} editable={Boolean(editing)} selected={editing?.selected ?? null} />
          </div>
          <div style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${card.half})`, background: card.back.base }}>
            <BackLayers card={card} editable={Boolean(editing)} selected={editing?.selected ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
});
