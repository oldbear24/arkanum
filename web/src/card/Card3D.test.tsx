import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Card3D } from './Card3D';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';
import { LazyCard } from './LazyCard';
import { buildGeometry } from './geometry';
import { hasFoilOverlay } from './motion';
import { itemDefaults } from './normalize';
import type { PlacedItem } from './resolve';
import { enums, type Figure, type ItemType, type Variant } from './spec';

let frames: FrameRequestCallback[] = [];

function flushFrames(time = performance.now()) {
  const pending = frames;
  frames = [];
  act(() => pending.forEach((run) => run(time)));
}

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function sceneOf(container: HTMLElement) {
  const scene = container.querySelector<HTMLElement>('[role="img"]');
  if (!scene) throw new Error('scene not found');
  vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 200 } as DOMRect);
  return scene;
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => {
    frames.push(run);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  stubMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Card3D', () => {
  it('moves through CSS variables without rendering React', () => {
    const onRender = vi.fn();
    const { container } = render(
      <Profiler id="card" onRender={onRender}>
        <Card3D interactive="tilt" foil="duha" />
      </Profiler>,
    );
    const scene = sceneOf(container);
    const rendersAfterMount = onRender.mock.calls.length;
    expect(scene.style.getPropertyValue('--rx')).toBe('0.00deg');

    fireEvent.pointerMove(scene, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(scene, { clientX: 90, clientY: 180 });
    expect(scene.style.getPropertyValue('--rx')).toBe('0.00deg');

    flushFrames();

    expect(scene.style.getPropertyValue('--rx')).toBe('9.60deg');
    expect(scene.style.getPropertyValue('--ry')).toBe('-12.00deg');
    expect(scene.style.getPropertyValue('--gx')).toBe('90%');
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);
  });

  it('coalesces pointer events into one frame', () => {
    const { container } = render(<Card3D interactive="tilt" />);
    const scene = sceneOf(container);
    frames = [];
    for (let i = 0; i < 10; i++) fireEvent.pointerMove(scene, { clientX: i, clientY: i });
    expect(frames).toHaveLength(1);
  });

  it('moves the gold gradient with the pointer', () => {
    const { container } = render(<Card3D interactive="tilt" />);
    const scene = sceneOf(container);
    const gradient = container.querySelector('linearGradient[data-gold]');
    const before = gradient?.getAttribute('x1');

    fireEvent.pointerMove(scene, { clientX: 100, clientY: 0 });
    flushFrames();

    expect(gradient?.getAttribute('x1')).not.toBe(before);
    expect(gradient?.getAttribute('x1')).toBe('70');
    expect(gradient?.getAttribute('x2')).toBe('530');
  });

  it('returns to rest when the pointer leaves', () => {
    const { container } = render(<Card3D interactive="tilt" />);
    const scene = sceneOf(container);
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 200 });
    flushFrames();
    fireEvent.pointerLeave(scene);
    flushFrames();
    expect(scene.style.getPropertyValue('--rx')).toBe('0.00deg');
    expect(scene.style.getPropertyValue('--ry')).toBe('0.00deg');
  });

  const orient = (scene: HTMLElement) => scene.style.getPropertyValue('--orient');

  function dragTo(scene: HTMLElement, moves: { clientX: number; clientY: number; shiftKey?: boolean }[]) {
    moves.forEach((move, i) => {
      fireEvent.pointerMove(scene, { ...move, pointerId: 1 });
      if (i === moves.length - 1) flushFrames();
    });
  }

  it('rotates while dragging, and only then', () => {
    const { container } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    scene.releasePointerCapture = vi.fn();

    fireEvent.pointerMove(scene, { clientX: 50, clientY: 50, pointerId: 1 });
    flushFrames();
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');

    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    dragTo(scene, [{ clientX: 100, clientY: 0 }]);
    expect(scene.setPointerCapture).toHaveBeenCalledWith(1);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 55.00deg)');

    fireEvent.pointerUp(scene, { pointerId: 1 });
    flushFrames();
    expect(scene.releasePointerCapture).toHaveBeenCalledWith(1);

    fireEvent.pointerMove(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    flushFrames();
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 55.00deg)');
  });

  it('has no limit in the vertical direction', () => {
    const { container } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();

    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    dragTo(scene, [{ clientX: 0, clientY: -200 }]);
    expect(orient(scene)).toBe('rotate3d(1.0000, 0.0000, 0.0000, 110.00deg)');
    dragTo(scene, [{ clientX: 0, clientY: -300 }]);
    expect(orient(scene)).toBe('rotate3d(1.0000, 0.0000, 0.0000, 165.00deg)');
  });

  it('turns the card in its plane with the Shift key', () => {
    const { container } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();

    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    dragTo(scene, [{ clientX: 100, clientY: 0, shiftKey: true }]);
    expect(orient(scene)).toBe('rotate3d(0.0000, 0.0000, 1.0000, 55.00deg)');
  });

  it('twists the card with two fingers', () => {
    const { container } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    scene.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerDown(scene, { clientX: 100, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(scene, { clientX: 0, clientY: 100, pointerId: 2 });
    flushFrames();
    expect(orient(scene)).toBe('rotate3d(0.0000, 0.0000, 1.0000, 90.00deg)');

    // The finger that stays goes back to turning the card normally.
    fireEvent.pointerUp(scene, { pointerId: 2 });
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 0, pointerId: 1 });
    flushFrames();
    expect(orient(scene)).not.toBe('rotate3d(0.0000, 0.0000, 1.0000, 90.00deg)');

    fireEvent.pointerUp(scene, { pointerId: 1 });
    const settled = orient(scene);
    fireEvent.pointerMove(scene, { clientX: 500, clientY: 500, pointerId: 1 });
    flushFrames();
    expect(orient(scene)).toBe(settled);
  });

  it('turns by a new turnBy object, once per object', () => {
    const quarter = { y: 90 };
    const { container, rerender } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);

    rerender(<Card3D interactive="drag" turnBy={quarter} />);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 90.00deg)');
    rerender(<Card3D interactive="drag" turnBy={quarter} foil="duha" />);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 90.00deg)');
    rerender(<Card3D interactive="drag" turnBy={{ y: 30 }} foil="duha" />);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 120.00deg)');
  });

  it('keeps parallax following the viewer on a freely turned card', () => {
    const { container, rerender } = render(<Card3D interactive="drag" depth={100} />);
    const scene = sceneOf(container);
    expect(scene.style.getPropertyValue('--pfx')).toBe('0px');

    rerender(<Card3D interactive="drag" depth={100} turnBy={{ y: 30 }} />);
    expect(scene.style.getPropertyValue('--pfx')).toBe('-7px');

    // A turn in the plane of the card changes nothing about where the viewer stands.
    rerender(<Card3D interactive="drag" depth={100} turnBy={{ z: 40 }} />);
    expect(scene.style.getPropertyValue('--pfx')).toBe('-7px');
    expect(scene.style.getPropertyValue('--pfy')).toBe('0px');

    // Tipped forward on top of that, the viewer now looks at it from the other direction too.
    rerender(<Card3D interactive="drag" depth={100} turnBy={{ x: 30 }} />);
    expect(scene.style.getPropertyValue('--pfy')).not.toBe('0px');
  });

  it('straightens from any pose', () => {
    const { container, rerender } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    rerender(<Card3D interactive="drag" turnBy={{ x: 200, y: 70, z: 15 }} />);
    expect(orient(scene)).not.toBe('rotate3d(0, 0, 1, 0deg)');
    rerender(<Card3D interactive="drag" resetKey={1} />);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
  });

  it('ignores the pointer in the none mode', () => {
    const { container } = render(<Card3D interactive="none" />);
    const scene = sceneOf(container);
    frames = [];
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 200 });
    expect(frames).toHaveLength(0);
  });

  it('shows the back when flipped and straightens on a new resetKey', () => {
    const { container, rerender } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(scene, { pointerId: 1 });
    flushFrames();
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 55.00deg)');

    rerender(<Card3D interactive="drag" resetKey={1} />);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
    expect(scene.style.getPropertyValue('--ry')).toBe('0.00deg');

    rerender(<Card3D interactive="drag" resetKey={1} flip />);
    expect(scene.style.getPropertyValue('--ry')).toBe('180.00deg');
    expect(scene.getAttribute('aria-label')).toContain('rubová strana');
  });

  it('spins without rendering React', () => {
    const onRender = vi.fn();
    const { container } = render(
      <Profiler id="card" onRender={onRender}>
        <Card3D spin />
      </Profiler>,
    );
    const scene = sceneOf(container);
    const rendersAfterMount = onRender.mock.calls.length;
    flushFrames();
    flushFrames();
    expect(scene.style.getPropertyValue('--ry')).not.toBe('0.00deg');
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);
  });

  it('turns tilt, spin, drag and the flip animation off for reduced motion', () => {
    stubMatchMedia(true);
    const { container, rerender } = render(<Card3D interactive="tilt" spin />);
    const scene = sceneOf(container);
    const body = scene.children[1] as HTMLElement;
    frames = [];

    fireEvent.pointerMove(scene, { clientX: 100, clientY: 200 });
    expect(frames).toHaveLength(0);
    expect(scene.style.getPropertyValue('--rx')).toBe('0.00deg');
    expect(body.style.transition).toBe('none');

    rerender(<Card3D interactive="drag" flip />);
    expect(scene.style.touchAction).toBe('pan-y');
    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 0, pointerId: 1 });
    expect(frames).toHaveLength(0);
    expect(scene.style.getPropertyValue('--ry')).toBe('180.00deg');
    expect(scene.style.getPropertyValue('--orient')).toBe('rotate3d(0, 0, 1, 0deg)');
    expect(body.style.transition).toBe('none');

    // The buttons next to the card still work, they just jump to the new pose.
    rerender(<Card3D interactive="drag" flip turnBy={{ y: 30 }} />);
    expect(scene.style.getPropertyValue('--orient')).toBe('rotate3d(0.0000, 1.0000, 0.0000, 30.00deg)');
    expect(body.style.transition).toBe('none');
  });

  it('has ten edge layers between the face and the back', () => {
    const { container } = render(<Card3D />);
    const body = sceneOf(container).children[1] as HTMLElement;
    expect(body.children).toHaveLength(12);
    expect(body.style.transformStyle).toBe('preserve-3d');
  });

  it('uses ids unique per card for gradients and clip paths', () => {
    const { container } = render(
      <>
        <Card3D />
        <Card3D />
      </>,
    );
    const ids = [...container.querySelectorAll('linearGradient, radialGradient, clipPath, filter')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9]+$/);
  });
});

describe('Card3D unlocked', () => {
  const orient = (scene: HTMLElement) => scene.style.getPropertyValue('--orient');
  const body = (scene: HTMLElement) => scene.children[1] as HTMLElement;

  /** A pointer event at an exact time, the card takes its speed from these. */
  function pointer(target: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel', time: number, clientX = 0, clientY = 0) {
    const event = createEvent[type](target, { pointerId: 1, clientX, clientY });
    Object.defineProperty(event, 'timeStamp', { value: time });
    fireEvent(target, event);
  }

  /** 40 px in 32 ms, which makes 22° at 0.6875° per millisecond. */
  function flick(scene: HTMLElement) {
    pointer(scene, 'pointerDown', 1000);
    pointer(scene, 'pointerMove', 1016, 20);
    pointer(scene, 'pointerMove', 1032, 40);
    pointer(scene, 'pointerUp', 1032, 40);
  }

  function setup(element = <Card3D interactive="drag" unlocked />) {
    const view = render(element);
    const scene = sceneOf(view.container);
    scene.setPointerCapture = vi.fn();
    scene.releasePointerCapture = vi.fn();
    return { ...view, scene };
  }

  it('goes on turning after a flick, around the same axis', () => {
    const { scene } = setup();
    flick(scene);
    flushFrames(2000);
    // The first frame counts 16 ms: 22° + 11°.
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 33.00deg)');
    flushFrames(2016);
    expect(orient(scene)).toMatch(/^rotate3d\(0\.0000, 1\.0000, 0\.0000, 43\.9\d+deg\)$/);
  });

  it('stays still after a flick when locked', () => {
    const { scene } = setup(<Card3D interactive="drag" />);
    flick(scene);
    flushFrames(2000);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 22.00deg)');
    expect(frames).toHaveLength(0);
  });

  it('turns without rendering React, and without a transition lagging behind', () => {
    const onRender = vi.fn();
    const { scene } = setup(
      <Profiler id="card" onRender={onRender}>
        <Card3D interactive="drag" unlocked />
      </Profiler>,
    );
    const rendersAfterMount = onRender.mock.calls.length;
    flick(scene);
    flushFrames(2000);
    flushFrames(2016);
    expect(body(scene).style.transition).toBe('none');
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);
  });

  it('holds on for a long time, then comes to rest', () => {
    const { scene } = setup();
    flick(scene);
    let time = 2000;
    let frameCount = 0;
    while (frames.length > 0 && frameCount < 5000) {
      time += 16;
      frameCount += 1;
      flushFrames(time);
    }
    // 0.6875° per millisecond down to 0.002° with a half-life of four seconds.
    expect(frameCount * 16).toBeGreaterThan(30_000);
    expect(frameCount * 16).toBeLessThan(36_000);
    expect(body(scene).style.transition).not.toBe('none');
    const rested = orient(scene);
    flushFrames(time + 16);
    expect(orient(scene)).toBe(rested);
  });

  it('runs the same at any frame rate', () => {
    const run = (step: number) => {
      const { scene } = setup();
      flick(scene);
      let time = 2000;
      flushFrames(time);
      for (let at = 0; at < 960; at += step) flushFrames((time += step));
      const out = orient(scene);
      cleanup();
      return parseFloat(out.split(', ')[3] ?? '');
    };
    expect(run(8)).toBeCloseTo(run(32), -1);
  });

  it('stops on a press and stays stopped after a click', () => {
    const { scene } = setup();
    flick(scene);
    flushFrames(2000);
    const caught = orient(scene);

    pointer(scene, 'pointerDown', 2010);
    flushFrames(2016);
    expect(orient(scene)).toBe(caught);

    pointer(scene, 'pointerUp', 2060);
    flushFrames(2100);
    flushFrames(2116);
    expect(orient(scene)).toBe(caught);
    expect(frames).toHaveLength(0);
  });

  it('does not start again from a trembling finger', () => {
    const { scene } = setup();
    pointer(scene, 'pointerDown', 1000);
    pointer(scene, 'pointerMove', 1008, 3);
    pointer(scene, 'pointerUp', 1012, 3);
    flushFrames(1016);
    const held = orient(scene);
    flushFrames(1032);
    expect(orient(scene)).toBe(held);
    expect(frames).toHaveLength(0);
  });

  it('stays where it was let go of after the pointer held still', () => {
    const { scene } = setup();
    pointer(scene, 'pointerDown', 1000);
    pointer(scene, 'pointerMove', 1016, 40);
    pointer(scene, 'pointerMove', 1032, 80);
    pointer(scene, 'pointerUp', 1500, 80);
    flushFrames(1516);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 44.00deg)');
    expect(frames).toHaveLength(0);
  });

  it('does not take off when the browser cancels the pointer', () => {
    const { scene } = setup();
    pointer(scene, 'pointerDown', 1000);
    pointer(scene, 'pointerMove', 1016, 40);
    pointer(scene, 'pointerCancel', 1020, 40);
    flushFrames(1032);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 22.00deg)');
    expect(frames).toHaveLength(0);
  });

  it('flicks in its plane with the Shift key too', () => {
    const { scene } = setup();
    pointer(scene, 'pointerDown', 1000);
    const event = createEvent.pointerMove(scene, { pointerId: 1, clientX: 40, clientY: 0, shiftKey: true });
    Object.defineProperty(event, 'timeStamp', { value: 1016 });
    fireEvent(scene, event);
    pointer(scene, 'pointerUp', 1020, 40);
    flushFrames(1032);
    expect(orient(scene)).toMatch(/^rotate3d\(0\.0000, 0\.0000, 1\.0000, /);
    expect(parseFloat(orient(scene).split(', ')[3] ?? '')).toBeGreaterThan(22);
  });

  it('straightens from a turn and stays straight', () => {
    const { scene, rerender } = setup();
    flick(scene);
    flushFrames(2000);
    rerender(<Card3D interactive="drag" unlocked resetKey={1} />);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
    expect(body(scene).style.transition).not.toBe('none');
    flushFrames(2016);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
  });

  it('turns over from a turn and stays there', () => {
    const { scene, rerender } = setup();
    flick(scene);
    flushFrames(2000);
    rerender(<Card3D interactive="drag" unlocked flip />);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
    flushFrames(2016);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
    expect(scene.style.getPropertyValue('--ry')).toBe('180.00deg');
  });

  it('takes a step of the buttons as the end of the turn', () => {
    const { scene, rerender } = setup();
    flick(scene);
    flushFrames(2000);
    rerender(<Card3D interactive="drag" unlocked turnBy={{ y: 30 }} />);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 63.00deg)');
    expect(body(scene).style.transition).not.toBe('none');
    flushFrames(2016);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 63.00deg)');
  });

  it('stops where it is when locked again', () => {
    const { scene, rerender } = setup();
    flick(scene);
    flushFrames(2000);
    const turned = orient(scene);
    rerender(<Card3D interactive="drag" />);
    expect(body(scene).style.transition).not.toBe('none');
    flushFrames(2016);
    expect(orient(scene)).toBe(turned);
  });

  it('stops for good when it goes away', () => {
    const { scene, unmount } = setup();
    flick(scene);
    flushFrames(2000);
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it('adds up with the spin of the card', () => {
    const { scene } = setup(<Card3D interactive="drag" unlocked spin />);
    flick(scene);
    flushFrames(2000);
    expect(orient(scene)).toBe('rotate3d(0.0000, 1.0000, 0.0000, 33.00deg)');
    expect(scene.style.getPropertyValue('--ry')).not.toBe('0.00deg');
  });

  it('does nothing with reduced motion', () => {
    stubMatchMedia(true);
    const { scene } = setup();
    flick(scene);
    flushFrames(2000);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
    expect(frames).toHaveLength(0);
  });

  it('does not take off after moving an item', () => {
    const symbol: PlacedItem = { ...itemDefaults('symbol'), id: 'a', type: 'symbol', x: 50, y: 50 };
    const editing = { selected: null, onSelect: vi.fn(), onMove: vi.fn() };
    const { scene, container } = setup(<Card3D interactive="drag" unlocked items={[symbol]} editing={editing} />);
    const element = container.querySelector('[data-item="a"]');
    if (!element) throw new Error('item not found');
    pointer(element, 'pointerDown', 1000, 10, 10);
    pointer(scene, 'pointerMove', 1016, 50, 10);
    pointer(scene, 'pointerUp', 1020, 50, 10);
    expect(editing.onMove).toHaveBeenCalled();
    flushFrames(1032);
    expect(orient(scene)).toBe('rotate3d(0, 0, 1, 0deg)');
    expect(frames).toHaveLength(0);
  });

  it('lets an item be grabbed from a card still turning', () => {
    const symbol: PlacedItem = { ...itemDefaults('symbol'), id: 'a', type: 'symbol', x: 50, y: 50 };
    const editing = { selected: null, onSelect: vi.fn(), onMove: vi.fn() };
    const { scene, container } = setup(<Card3D interactive="drag" unlocked items={[symbol]} editing={editing} />);
    flick(scene);
    flushFrames(2000);
    const caught = orient(scene);
    const element = container.querySelector('[data-item="a"]');
    if (!element) throw new Error('item not found');
    pointer(element, 'pointerDown', 2010, 10, 10);
    expect(editing.onSelect).toHaveBeenCalledWith('a');
    flushFrames(2016);
    expect(orient(scene)).toBe(caught);
  });
});

describe('Card3D with editable items', () => {
  const item = (id: string, x = 50): PlacedItem => ({ ...itemDefaults('symbol'), id, type: 'symbol', x, y: 50 });

  function setup() {
    const editing = { selected: null, onSelect: vi.fn(), onMove: vi.fn() };
    const { container } = render(<Card3D interactive="drag" items={[item('a')]} editing={editing} />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    scene.releasePointerCapture = vi.fn();
    const element = container.querySelector<HTMLElement>('[data-item="a"]');
    if (!element) throw new Error('item not found');
    return { scene, element, editing };
  }

  it('picks and moves an item instead of turning the card', () => {
    const { scene, element, editing } = setup();
    fireEvent.pointerDown(element, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(editing.onSelect).toHaveBeenCalledWith('a');

    fireEvent.pointerMove(scene, { clientX: 20, clientY: 30, pointerId: 1 });
    flushFrames();
    // The card measures 100 × 200 here, so 10 and 20 px are 10 % of each.
    const [id, dx, dy] = editing.onMove.mock.calls[0] as [string, number, number];
    expect(id).toBe('a');
    expect(dx).toBeCloseTo(10, 6);
    expect(dy).toBeCloseTo(10, 6);
    expect(scene.style.getPropertyValue('--orient')).toBe('rotate3d(0, 0, 1, 0deg)');

    fireEvent.pointerUp(scene, { pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 90, clientY: 90, pointerId: 1 });
    expect(editing.onMove).toHaveBeenCalledTimes(1);
  });

  it('moves an item the right way on a card turned upside down in its plane', () => {
    const editing = { selected: null, onSelect: vi.fn(), onMove: vi.fn() };
    const { container, rerender } = render(<Card3D interactive="drag" items={[item('a')]} editing={editing} />);
    rerender(<Card3D interactive="drag" items={[item('a')]} editing={editing} turnBy={{ z: 180 }} />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    const element = container.querySelector<HTMLElement>('[data-item="a"]');
    if (!element) throw new Error('item not found');
    fireEvent.pointerDown(element, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 20, clientY: 10, pointerId: 1 });
    expect((editing.onMove.mock.calls[0] as number[])[1]).toBeCloseTo(-10, 6);
  });

  it('moves an item on the back in its own direction', () => {
    const editing = { selected: null, onSelect: vi.fn(), onMove: vi.fn() };
    const { container } = render(<Card3D interactive="drag" flip items={[{ ...item('a'), side: 'back' }]} editing={editing} />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    const element = container.querySelector<HTMLElement>('[data-item="a"]');
    if (!element) throw new Error('item not found');
    fireEvent.pointerDown(element, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 20, clientY: 10, pointerId: 1 });
    // Seen straight on, the back reads from left to right just like the front.
    expect((editing.onMove.mock.calls[0] as number[])[1]).toBeCloseTo(10, 6);
  });

  it('still turns the card next to the items', () => {
    const { scene, editing } = setup();
    fireEvent.pointerDown(scene, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 110, clientY: 10, pointerId: 1 });
    flushFrames();
    expect(editing.onMove).not.toHaveBeenCalled();
    expect(scene.style.getPropertyValue('--orient')).toBe('rotate3d(0.0000, 1.0000, 0.0000, 55.00deg)');
    fireEvent.pointerUp(scene, { pointerId: 1 });
    expect(editing.onSelect).not.toHaveBeenCalled();
  });

  it('lets go of the selected item after a click next to it', () => {
    const { scene, editing } = setup();
    fireEvent.pointerDown(scene, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(scene, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(editing.onSelect).toHaveBeenCalledWith(null);
  });

  it('takes the items for artwork without the editing', () => {
    const { container } = render(<Card3D interactive="drag" items={[item('a')]} />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    const element = container.querySelector<HTMLElement>('[data-item="a"]');
    expect(element?.style.pointerEvents).toBe('none');
    fireEvent.pointerDown(scene, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 110, clientY: 10, pointerId: 1 });
    flushFrames();
    expect(scene.style.getPropertyValue('--orient')).toBe('rotate3d(0.0000, 1.0000, 0.0000, 55.00deg)');
  });

  it('lets a locked item be, and turns the card through it', () => {
    const onMove = vi.fn();
    const { container } = render(
      <Card3D interactive="drag" items={[{ ...itemDefaults('symbol'), id: 'a', type: 'symbol', locked: true }]} editing={{ selected: null, onSelect: () => undefined, onMove }} />,
    );
    expect(container.querySelector<HTMLElement>('[data-item="a"]')?.style.pointerEvents).toBe('none');
  });

  it('moves items with reduced motion too, without turning the card', () => {
    stubMatchMedia(true);
    const { scene, element, editing } = setup();
    fireEvent.pointerDown(element, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 20, clientY: 10, pointerId: 1 });
    expect(editing.onMove).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(scene, { pointerId: 1 });
    fireEvent.pointerDown(scene, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 110, clientY: 10, pointerId: 1 });
    expect(scene.style.getPropertyValue('--orient')).toBe('rotate3d(0, 0, 1, 0deg)');
  });
});

describe('free items', () => {
  const place = (type: ItemType, patch: Partial<PlacedItem> = {}): PlacedItem => ({ ...itemDefaults(type), id: type, type, ...patch });

  it('stand on the side they belong to', () => {
    const items = [place('symbol', { id: 'f' }), place('symbol', { id: 'b', side: 'back' })];
    const face = render(<CardFace items={items} />);
    expect(face.container.querySelector('[data-item="f"]')).toBeTruthy();
    expect(face.container.querySelector('[data-item="b"]')).toBeNull();
    cleanup();
    const back = render(<CardBack items={items} />);
    expect(back.container.querySelector('[data-item="b"]')).toBeTruthy();
    expect(back.container.querySelector('[data-item="f"]')).toBeNull();
  });

  it('take their place, size and rotation in units that scale with the card', () => {
    const { container } = render(<CardFace items={[place('symbol', { x: 20, y: 30, size: 25, rotate: 45, opacity: 50 })]} />);
    const element = container.querySelector<HTMLElement>('[data-item]');
    expect(element?.style.left).toBe('20%');
    expect(element?.style.top).toBe('30%');
    expect(element?.style.width).toBe('25%');
    expect(element?.style.transform).toBe('translate(-50%, -50%) rotate(45deg)');
    expect(element?.style.opacity).toBe('0.5');
  });

  it('lie above the print and below the foil', () => {
    const { container } = render(<CardFace foil="duha" items={[place('symbol')]} />);
    const root = container.querySelector('[role="img"]');
    const layers = [...(root?.children ?? [])];
    const items = layers.findIndex((layer) => layer.querySelector('[data-item]'));
    const foil = layers.findIndex((layer) => (layer as HTMLElement).style.mixBlendMode === 'color-dodge');
    const print = layers.findIndex((layer) => layer.tagName.toLowerCase() === 'svg');
    expect(print).toBeLessThan(items);
    expect(items).toBeLessThan(foil);
  });

  it('keep the order of the list', () => {
    const { container } = render(<CardFace items={[place('text', { id: 'dole' }), place('shape', { id: 'nahore' })]} />);
    expect([...container.querySelectorAll<HTMLElement>('[data-item]')].map((element) => element.dataset.item)).toEqual(['dole', 'nahore']);
  });

  it('show a text with its font, colour and alignment', () => {
    render(<CardFace items={[place('text', { text: 'Ahoj\nsvěte', font: 'kurziva', align: 'left', color: '#112233', size: 10 })]} />);
    const text = screen.getByText(/Ahoj/);
    expect(text.style.fontStyle).toBe('italic');
    expect(text.style.textAlign).toBe('left');
    expect(text.style.color).toBe('rgb(17, 34, 51)');
    expect(text.style.fontSize).toBe('1.875em');
    expect(text.style.whiteSpace).toBe('pre-wrap');
  });

  it('take the colour of the card when they have none', () => {
    const { container } = render(<CardFace palette="krev" items={[place('symbol')]} />);
    expect(container.querySelector('[data-item] path')?.getAttribute('fill')).toMatch(/^url\(#k.+m\)$/);
    const metal = container.querySelector('linearGradient[data-metal]');
    expect(metal?.querySelector('stop[offset="0.38"]')?.getAttribute('stop-color')).toBe('#dca55a');
  });

  it('use their own colour when they have one', () => {
    const { container } = render(<CardFace items={[place('symbol', { color: '#123456' })]} />);
    expect(container.querySelector('[data-item] path')?.getAttribute('fill')).toBe('#123456');
  });

  it.each(enums.itemSymbol)('draw the symbol %s', (kind) => {
    const { container } = render(<CardFace items={[place('symbol', { kind })]} />);
    expect(container.querySelector('[data-item] path')?.getAttribute('d')).toBeTruthy();
  });

  it.each(enums.itemOrnament)('draw the ornament %s', (kind) => {
    const { container } = render(<CardFace items={[place('ornament', { kind })]} />);
    expect(container.querySelector('[data-item] path')?.getAttribute('d')).toBeTruthy();
  });

  it.each(enums.itemShape)('draw the shape %s in its proportions, filled or as an outline', (kind) => {
    const { container } = render(<CardFace items={[place('shape', { kind, ratio: 150, filled: false })]} />);
    expect(container.querySelector('[data-item] svg')?.getAttribute('viewBox')).toBe('0 0 100 150');
    const path = container.querySelector('[data-item] path');
    expect(path?.getAttribute('fill')).toBe('none');
    expect(path?.getAttribute('stroke')).toMatch(/^url/);
  });

  it('draw the signs by lines and the other symbols filled or as an outline', () => {
    const sign = render(<CardFace items={[place('symbol', { kind: 'lev', stroke: 5 })]} />);
    const line = sign.container.querySelector('[data-item] path');
    expect(line?.getAttribute('fill')).toBe('none');
    expect(line?.getAttribute('stroke-width')).toBe('12');
    cleanup();
    const { container } = render(<CardFace items={[place('symbol', { kind: 'mesic', filled: false, stroke: 5 })]} />);
    const outline = container.querySelector('[data-item] path');
    expect(outline?.getAttribute('fill')).toBe('none');
    expect(outline?.getAttribute('stroke-width')).toBe('5');
  });

  it('mirror themselves on top of their rotation', () => {
    const { container } = render(<CardFace items={[place('shape', { rotate: 30, flipX: true }), place('symbol', { flipY: true })]} />);
    expect(container.querySelector<HTMLElement>('[data-item="shape"]')?.style.transform).toBe('translate(-50%, -50%) rotate(30deg) scale(-1, 1)');
    expect(container.querySelector<HTMLElement>('[data-item="symbol"]')?.style.transform).toBe('translate(-50%, -50%) rotate(0deg) scale(1, -1)');
  });

  it('float by the variables of their side', () => {
    const { container } = render(<Card3D items={[place('shape', { depth: 50 }), place('symbol', { depth: -100, side: 'back' })]} />);
    expect(container.querySelector<HTMLElement>('[data-item="shape"]')?.style.transform).toBe('translate(calc(var(--ifx) * 0.5), calc(var(--ify) * 0.5)) translate(-50%, -50%) rotate(0deg)');
    expect(container.querySelector<HTMLElement>('[data-item="symbol"]')?.style.transform).toBe('translate(calc(var(--ibx) * -1), calc(var(--ify) * -1)) translate(-50%, -50%) rotate(0deg)');
  });

  it('have no effects until they are asked for', () => {
    const { container } = render(<CardFace items={[place('shape')]} />);
    const box = container.querySelector<HTMLElement>('[data-item]');
    expect(box?.style.filter).toBe('');
    expect(box?.style.mixBlendMode).toBe('');
  });

  it('cast a shadow and blend with the card', () => {
    const { container } = render(<CardFace items={[place('shape', { shadow: 50, blend: 'screen' })]} />);
    const box = container.querySelector<HTMLElement>('[data-item]');
    expect(box?.style.filter).toMatch(/^drop-shadow/);
    expect(box?.style.mixBlendMode).toBe('screen');
  });

  it('show a text with its spacing, line height, capitals and effect', () => {
    const { container } = render(<CardFace items={[place('text', { text: 'Hvězda', spacing: 20, line: 150, caps: true, effect: 'stin' })]} />);
    const text = container.querySelector<HTMLElement>('[data-item] > div');
    expect(text?.style.letterSpacing).toBe('0.2em');
    expect(text?.style.lineHeight).toBe('1.5');
    expect(text?.style.textTransform).toBe('uppercase');
    expect(text?.style.textShadow).not.toBe('');
  });

  it.each([60, -60, 100, -100])('bend a text by %i along a path, on one line', (curve) => {
    const { container } = render(<CardFace items={[place('text', { text: 'První\nDruhý', curve })]} />);
    const box = container.querySelector<HTMLElement>('[data-item]');
    expect(container.querySelector('textPath')?.textContent).toBe('První Druhý');
    expect(box?.style.width).toMatch(/%$/);
    expect(container.querySelector('[data-item] svg')?.getAttribute('viewBox')).not.toContain('NaN');
    const id = container.querySelector('textPath')?.getAttribute('href')?.slice(1);
    const path = container.querySelector(`[id="${id}"]`)?.getAttribute('d') ?? '';
    // The middle of the path is the top of the circle going up, and the bottom going down.
    expect(path).toMatch(curve > 0 ? /^M0 [\d.]+A/ : /^M0 -[\d.]+A/);
    expect(path).toContain(curve > 0 ? ' 0 1 1 ' : ' 0 1 0 ');
  });

  it('keep a straight text as plain text', () => {
    const { container } = render(<CardFace items={[place('text', { curve: 0 })]} />);
    expect(container.querySelector('textPath')).toBeNull();
    expect(container.querySelector<HTMLElement>('[data-item]')?.style.width).toBe('max-content');
  });

  it('cut an image by a shape and draw a line around it', () => {
    const { container } = render(<CardFace items={[place('image', { url: '/a.png', ratio: 80, mask: 'kruh', border: 4 })]} />);
    const image = container.querySelector('[data-item] image');
    const clip = container.querySelector(`[data-item] clipPath`);
    expect(image?.getAttribute('clip-path')).toBe(`url(#${clip?.id})`);
    expect(clip?.id).toMatch(/^[a-zA-Z0-9]+$/);
    expect(container.querySelector('[data-item] svg > path')?.getAttribute('stroke-width')).toBe('4');
  });

  it('show an image as it is without a cut-out', () => {
    const { container } = render(<CardFace items={[place('image', { url: '/a.png' })]} />);
    expect(container.querySelector('[data-item] clipPath')).toBeNull();
    expect(container.querySelector('[data-item] svg > path')).toBeNull();
  });

  it('show the number and label of a stat', () => {
    render(<CardFace items={[place('stat', { value: '7', text: 'Útok' })]} />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Útok')).toBeTruthy();
  });

  it('draw an image, and nothing when it lost its file', () => {
    const { container, rerender } = render(<CardFace items={[place('image', { url: '/a.png', ratio: 50 })]} />);
    expect(container.querySelector('[data-item] image')?.getAttribute('href')).toBe('/a.png');
    expect(container.querySelector('[data-item] svg')?.getAttribute('viewBox')).toBe('0 0 100 50');
    rerender(<CardFace items={[place('image')]} />);
    expect(container.querySelector('[data-item]')).toBeNull();
  });

  it('stay away when hidden', () => {
    const { container } = render(<CardFace items={[place('symbol', { hidden: true })]} />);
    expect(container.querySelector('[data-item]')).toBeNull();
  });
});

describe('look options', () => {
  const stop = (container: HTMLElement) => container.querySelector('linearGradient[data-gold] stop[offset="0.38"]')?.getAttribute('stop-color');
  const faceRoot = (container: HTMLElement) => container.querySelector<HTMLElement>('[role="img"]');

  it.each(enums.frame)('draws the frame %s', (frame) => {
    const { g } = buildGeometry('tarot', frame, 'hvezda', 'mlha', 3, 14);
    for (const path of [g.win, g.plaque, g.corner]) {
      expect(path).toBeTruthy();
      expect(path).not.toContain('NaN');
    }
  });

  it.each(enums.art)('draws the arcana %s', (art) => {
    const { a } = buildGeometry('tarot', 'secese', art, 'mlha', 3, 14);
    expect(a.line).toBeTruthy();
    expect(Object.values(a).join('')).not.toContain('NaN');
  });

  it.each(enums.element)('has an icon for the element %s', (element) => {
    const { g } = buildGeometry('bestie', 'secese', 'hvezda', element, 3, 14);
    expect(g.icoF + g.icoS).toBeTruthy();
  });

  const figureCases: [Variant, Figure][] = [...enums.figureBestie.map((figure): [Variant, Figure] => ['bestie', figure]), ...enums.figureHrdina.map((figure): [Variant, Figure] => ['hrdina', figure]), ...enums.art.map((figure): [Variant, Figure] => ['orakulum', figure])];

  it.each(figureCases)('draws for a card of the family %s the figure %s', (variant, figure) => {
    const own = buildGeometry(variant, 'secese', 'hvezda', 'mlha', 3, 14).a;
    const other = buildGeometry(variant, 'secese', 'hvezda', 'mlha', 3, 14, 514, 'mandala', figure).a;
    expect(other).not.toEqual(own);
    expect(Object.values(other).join('')).not.toContain('NaN');
  });

  it('ignores a figure of another family', () => {
    const line = (figure?: string) => {
      const { container } = render(<CardFace variant="bestie" figure={figure} />);
      const d = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d')).join('|');
      cleanup();
      return d;
    };
    expect(line('kalich')).toBe(line());
    expect(line('sova')).not.toBe(line());
  });

  it('has one back pattern that reads the same upside down', () => {
    const { b } = buildGeometry('tarot', 'secese', 'hvezda', 'mlha', 3, 14, 514, 'sachovnice');
    const squares = [...b.fill.matchAll(/M([\d.]+) ([\d.]+)h/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const size = /h([\d.]+)v([\d.]+)/.exec(b.fill)!;
    for (const [x, y] of squares) {
      const twin = squares.some(([u, v]) => Math.abs(u! + Number(size[1]) + x! - 300) < 0.3 && Math.abs(v! + Number(size[2]) + y! - 514) < 0.3);
      expect(twin).toBe(true);
    }
  });

  it.each(enums.skyPattern.filter((pattern) => pattern !== 'zadny'))('draws the background pattern %s', (skyPattern) => {
    const { sky } = buildGeometry('tarot', 'secese', 'hvezda', 'mlha', 3, 14, 514, 'mandala', '', skyPattern);
    expect(sky.line + sky.fill).toBeTruthy();
    expect(sky.line + sky.fill).not.toContain('NaN');
  });

  it('keeps the sky of a card the same on every render', () => {
    const sky = () => buildGeometry('tarot', 'secese', 'hvezda', 'mlha', 3, 14, 514, 'mandala', '', 'hvezdy').sky.fill;
    expect(sky()).toBe(sky());
  });

  it('draws no pattern by default', () => {
    expect(buildGeometry('tarot', 'secese', 'hvezda', 'mlha', 3, 14).sky).toEqual({ line: '', fill: '' });
  });

  it('turns the background around and takes other forms of it', () => {
    const stops = (container: HTMLElement) => [...container.querySelectorAll('defs linearGradient:not([data-gold]):not([data-metal]) stop')].map((s) => s.getAttribute('stop-color'));
    const usual = render(<CardFace palette="krev" />);
    const [top, bottom] = stops(usual.container);
    cleanup();
    expect(stops(render(<CardFace palette="krev" skyStyle="opacny" />).container)).toEqual([bottom, top]);
    cleanup();
    const glow = render(<CardFace palette="krev" skyStyle="zare" />);
    expect(glow.container.querySelector('defs radialGradient[cy="0.38"]')).toBeTruthy();
    cleanup();
    const flat = render(<CardFace palette="krev" skyStyle="plna" />);
    expect(flat.container.querySelector('[clip-path] rect')?.getAttribute('fill')).toBe(top);
  });

  it('darkens the corners of the illustration only when asked to', () => {
    const plain = render(<CardFace />);
    expect(plain.container.querySelectorAll('[clip-path] > rect')).toHaveLength(0);
    cleanup();
    const { container } = render(<CardFace vignette={40} />);
    const rect = container.querySelector('[clip-path] > rect');
    expect(rect?.getAttribute('opacity')).toBe('0.4');
    expect(rect?.getAttribute('fill')).toMatch(/^url/);
    expect(rect?.getAttribute('width')).toBe('232');
  });

  it('adds sepia to the filter of the illustration', () => {
    const { container } = render(<CardFace artFilter={{ brightness: 100, contrast: 100, saturate: 100, hue: 0, sepia: 100 }} />);
    expect(container.querySelector('filter[filterUnits] feColorMatrix[type="matrix"]')?.getAttribute('values')).toBe('0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0');
  });

  it.each(['ruzova', 'medena'])('replaces the metal of the card with the foil %s', (foil) => {
    const usual = render(<CardFace />);
    const gold = stop(usual.container);
    cleanup();
    const { container } = render(<CardFace foil={foil} />);
    expect(stop(container)).not.toBe(gold);
    expect(Number(faceRoot(container)?.style.getPropertyValue('--holo-o'))).toBe(0);
  });

  it.each(enums.foil.filter((foil) => hasFoilOverlay(foil)))('shimmers with the overlay foil %s', (foil) => {
    const { container } = render(<CardFace foil={foil} foilI={100} />);
    expect(Number(faceRoot(container)?.style.getPropertyValue('--holo-o'))).toBeGreaterThan(0);
  });

  it.each(['kosmos', 'trpytky', 'galaxie'])('sparkles with the foil %s', (foil) => {
    const { container } = render(<CardFace foil={foil} foilI={100} />);
    expect(Number(faceRoot(container)?.style.getPropertyValue('--sp-o'))).toBeGreaterThan(0);
  });

  it('leaves a foil over the whole card without any clipping', () => {
    const { container } = render(<CardFace foil="duha" />);
    expect(container.querySelector('clipPath[clipPathUnits]')).toBeNull();
    expect(container.querySelector<HTMLElement>('[style*="clip-path"]')).toBeNull();
  });

  it.each(['ilustrace', 'okraj'])('limits a foil to the area %s, in the units of its own box', (foilArea) => {
    const { container } = render(<CardFace foil="duha" foilArea={foilArea} />);
    const clip = container.querySelector('clipPath[clipPathUnits="objectBoundingBox"]');
    const path = clip?.querySelector('path');
    expect(path?.getAttribute('transform')).toBe(`scale(${1 / 300} ${1 / 514})`);
    expect(path?.getAttribute('d')?.startsWith('M0 0H300V514H0Z')).toBe(foilArea === 'okraj');
    expect(container.querySelectorAll(`[style*="${clip?.id}"]`)).toHaveLength(2);
  });

  it('has no area of the foil on a full art card', () => {
    const { container } = render(<CardFace foil="duha" foilArea="okraj" fullArt />);
    expect(container.querySelector('clipPath[clipPathUnits]')).toBeNull();
  });

  it('turns the rainbow of a foil', () => {
    const { container } = render(<CardFace foil="duha" foilAngle={30} />);
    expect(container.querySelector<HTMLElement>('[style*="linear-gradient(30deg"]')).toBeTruthy();
  });

  it('shines more with the mirror surface', () => {
    const glare = (surface: string) => {
      const { container } = render(<CardFace surface={surface} />);
      const value = Number(faceRoot(container)?.style.getPropertyValue('--ga'));
      cleanup();
      return value;
    };
    expect(glare('zrcadlo')).toBeGreaterThan(glare('lesk'));
  });

  it.each(enums.texture.filter((texture) => texture !== 'zadna'))('lays the texture %s over both sides', (texture) => {
    const face = render(<CardFace texture={texture} textureI={40} />);
    expect(face.container.querySelector<HTMLElement>(`[data-texture="${texture}"]`)?.style.opacity).toBe('0.4');
    cleanup();
    const back = render(<CardBack texture={texture} />);
    expect(back.container.querySelector(`[data-texture="${texture}"]`)).toBeTruthy();
  });

  it('has no texture or wear by default', () => {
    const { container } = render(<CardFace />);
    expect(container.querySelector('[data-texture]')).toBeNull();
    expect(container.querySelector('[data-wear]')).toBeNull();
  });

  it('wears the edges of the card', () => {
    const { container } = render(<CardFace wear={60} />);
    expect(container.querySelector<HTMLElement>('[data-wear]')?.style.boxShadow).toContain('inset');
  });

  it('keeps the lines of the frame the same by default and changes them on demand', () => {
    const width = (frameWeight?: number) => {
      const { container } = render(<CardFace frameWeight={frameWeight} />);
      const value = container.querySelector('[filter] path[stroke-width="2"], [filter] path[stroke-width="3"]')?.getAttribute('stroke-width');
      cleanup();
      return value;
    };
    expect(width()).toBe('2');
    expect(width(150)).toBe('3');
  });

  it('hides single parts and leaves the others', () => {
    const { container } = render(<CardFace cardTitle="Název" numeral="IX" parts={{ numeral: false, corners: false, plaque: false }} />);
    expect(screen.queryByText('IX')).toBeNull();
    expect(screen.getByText('Název')).toBeTruthy();
    const usual = buildGeometry('tarot', 'secese', 'hvezda', 'mlha', 3, 14).g;
    const paths = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));
    expect(paths).not.toContain(usual.corner);
    expect(paths).not.toContain(usual.plaque);
    expect(paths).toContain(usual.border);
  });

  it('hides the title, the second text, the rarity and the credit of a beast', () => {
    const { container } = render(<CardFace variant="bestie" cardTitle="Mlok" subtitle="Popis" setNo="S1" author="@ja" rarity={3} parts={{ title: false, subtitle: false, rarity: false, credit: false }} />);
    for (const text of ['Mlok', 'Popis', 'S1']) expect(screen.queryByText(text)).toBeNull();
    const usual = buildGeometry('bestie', 'secese', 'hvezda', 'mlha', 3, 14).g;
    expect([...container.querySelectorAll('path')].map((path) => path.getAttribute('d'))).not.toContain(usual.rarF);
  });

  it('gives the title an effect, more spacing and another place', () => {
    render(<CardFace cardTitle="Velmi" titleEffect="zare" titleSpacing={20} titleOffset={-10} />);
    const title = screen.getByText('Velmi');
    expect(title.style.textShadow).not.toBe('');
    expect(parseFloat(title.style.letterSpacing)).toBeCloseTo(0.38, 3);
    expect(title.style.top).toMatch(/^calc\(/);
    cleanup();
    render(<CardFace cardTitle="Velmi" />);
    expect(screen.getByText('Velmi').style.top).toBe('85.2%');
    expect(screen.getByText('Velmi').style.textShadow).toBe('');
  });

  it('keeps a wider title on the card', () => {
    const size = (titleSpacing: number) => {
      render(<CardFace cardTitle="Velmi dlouhý název" titleSpacing={titleSpacing} />);
      const value = parseFloat(screen.getByText('Velmi dlouhý název').style.fontSize);
      cleanup();
      return value;
    };
    expect(size(30)).toBeLessThan(size(0));
  });

  it('colours the title on its own', () => {
    render(<CardFace cardTitle="Velmi" colors={{ title: '#102030', text: '#a0b0c0' }} />);
    expect(screen.getByText('Velmi').style.color).toBe('rgb(16, 32, 48)');
  });

  it('colours the plaque, the panel and the glow', () => {
    const { container } = render(<CardFace variant="bestie" colors={{ plaque: '#102030', panel: '#203040', glow: '#304050' }} />);
    const fills = [...container.querySelectorAll('path')].map((path) => path.getAttribute('fill'));
    expect(fills).toContain('#102030');
    expect(fills).toContain('#203040');
    expect(container.querySelector('radialGradient stop')?.getAttribute('stop-color')).toBe('#304050');
  });

  it('keeps the texts on a panel readable in its own colour', () => {
    render(<CardFace variant="hrdina" ab1="Hradba" colors={{ panel: '#101010' }} subtitle="Citát" />);
    expect(screen.getByText('Citát').style.color).toBe('rgb(207, 199, 178)');
    cleanup();
    render(<CardFace variant="bestie" ab1="Mámení" ab1t="Účinek" colors={{ panel: '#f0f0f0' }} />);
    expect(screen.getByText('Mámení').style.color).toBe('rgb(42, 32, 24)');
    cleanup();
    render(<CardFace variant="hrdina" subtitle="Citát" />);
    expect(screen.getByText('Citát').style.color).toBe('rgb(94, 76, 56)');
  });

  it('scales the other texts', () => {
    render(<CardFace variant="bestie" ab1="Mámení" bodyScale={80} />);
    expect(screen.getByText('Mámení').style.fontSize).toBe('0.464em');
    cleanup();
    render(<CardFace variant="bestie" ab1="Mámení" />);
    expect(screen.getByText('Mámení').style.fontSize).toBe('0.58em');
  });

  it('takes own captions of the stats', () => {
    render(<CardFace variant="hrdina" labels={{ s1: 'ÚTOK', s3: 'MANA' }} />);
    expect(screen.getByText('ÚTOK')).toBeTruthy();
    expect(screen.getByText('OBRANA')).toBeTruthy();
    expect(screen.getByText('MANA')).toBeTruthy();
    cleanup();
    const { container } = render(<CardFace variant="bestie" level={4} labels={{ level: 'LV' }} />);
    expect(container.textContent).toContain('LV 4');
  });

  it('makes the edge of an own colour, from dark to light', () => {
    const { container } = render(<Card3D edge="zlata" colors={{ edge: '#3060c0' }} />);
    const layers = [...container.querySelectorAll<HTMLElement>('[role="img"] > div:nth-child(2) > div')].slice(0, 10);
    expect(layers[4]?.style.background).toBe('rgb(48, 96, 192)');
    expect(layers[0]?.style.background).not.toBe(layers[4]?.style.background);
  });

  it.each(enums.edge)('has the edge %s', (edge) => {
    const { container } = render(<Card3D edge={edge} />);
    const layers = [...container.querySelectorAll<HTMLElement>('[role="img"] > div:nth-child(2) > div')].slice(0, 10);
    expect(layers.every((layer) => layer.style.background)).toBe(true);
  });

  it('colours the back on its own', () => {
    const { container } = render(<CardBack colors={{ backBase: '#102030', backMetal: '#405060' }} />);
    expect(faceRoot(container)?.style.background).toBe('rgb(16, 32, 48)');
    expect(stop(container)).toBe('#405060');
  });

  it('shows the own text on the back of every card, and instead of the brand', () => {
    render(<CardBack backText="Moje sada" />);
    expect(screen.getByText('Moje sada')).toBeTruthy();
    cleanup();
    render(<CardBack variant="bestie" backText="Moje sada" />);
    expect(screen.getByText('Moje sada')).toBeTruthy();
    expect(screen.queryByText('ARKÁNUM')).toBeNull();
    cleanup();
    render(<CardBack variant="bestie" />);
    expect(screen.getByText('ARKÁNUM')).toBeTruthy();
  });

  it('gives way to the back of a deck with everything a card has of its own', () => {
    const own = { colors: { backBase: '#102030', backMetal: '#405060', edge: '#3060c0' }, backText: 'Prozradí', texture: 'platno' };
    const { container } = render(<CardBack {...own} backPalette="krev" uniformBack />);
    expect(faceRoot(container)?.style.background).toBe('rgb(35, 10, 17)');
    expect(screen.queryByText('Prozradí')).toBeNull();
    expect(container.querySelector('[data-texture]')).toBeNull();
    cleanup();
    const card = render(<Card3D {...own} edge="zlata" backPalette="krev" uniformBack />);
    const layers = [...card.container.querySelectorAll<HTMLElement>('[role="img"] > div:nth-child(2) > div')].slice(0, 10);
    expect(layers[4]?.style.background).not.toBe('rgb(48, 96, 192)');
  });

  it('lays custom colours over the palette', () => {
    const { container } = render(<CardFace colors={{ base: '#102030', sky: '#405060', metal: '#708090', text: '#a0b0c0' }} cardTitle="Název" />);
    const root = container.querySelector<HTMLElement>('[role="img"]');
    expect(root?.style.background).toBe('rgb(16, 32, 48)');
    expect(screen.getByText('Název').style.color).toBe('rgb(160, 176, 192)');
    expect(container.querySelector('linearGradient[data-gold] stop[offset="0.38"]')?.getAttribute('stop-color')).toBe('#708090');
    expect(container.querySelector('[clip-path] rect')?.getAttribute('fill')).toMatch(/^url/);
  });

  it('ignores anything but a colour', () => {
    const { container } = render(<CardFace palette="krev" colors={{ base: 'url(#x)', text: 'red' }} />);
    expect(container.querySelector<HTMLElement>('[role="img"]')?.style.background).toBe('rgb(35, 10, 17)');
  });

  it('colours the title of the game cards too', () => {
    render(<CardFace variant="bestie" cardTitle="Mlok" colors={{ text: '#a0b0c0' }} />);
    expect(screen.getByText('Mlok').style.color).toBe('rgb(160, 176, 192)');
  });

  it('turns the metal of the card to silver with the silver foil', () => {
    const { container } = render(<CardFace foil="stribrna" />);
    expect(container.querySelector('linearGradient[data-gold] stop[offset="0.38"]')?.getAttribute('stop-color')).toBe('#b8c0cc');
  });

  it.each(['hranol', 'perlet'])('shimmers with the foil %s', (foil) => {
    const { container } = render(<CardFace foil={foil} foilI={100} />);
    const root = container.querySelector<HTMLElement>('[role="img"]');
    expect(Number(root?.style.getPropertyValue('--holo-o'))).toBeGreaterThan(0);
  });

  it('spreads the illustration over the whole card with the full art', () => {
    const { container } = render(<CardFace fullArt artwork={[{ url: '/a.png', x: 0, y: 0, zoom: 1 }]} />);
    expect(container.querySelector('clipPath path')?.getAttribute('d')).toBe('M0 0H300V514H0Z');
    expect(container.querySelector('image')?.getAttribute('width')).toBe('332');
  });

  it('turns and mirrors uploaded artwork', () => {
    const { container } = render(<CardFace artwork={[{ url: '/a.png', x: 0, y: 0, zoom: 2, rotate: 90, flipX: true }]} />);
    expect(container.querySelector('image')?.parentElement?.getAttribute('transform')).toBe('translate(150 245) rotate(90) scale(-2 2) translate(-150 -245)');
  });

  it('adjusts the colours of the illustration only when asked to', () => {
    const plain = render(<CardFace artFilter={{ brightness: 100, contrast: 100, saturate: 100, hue: 0 }} />);
    expect(plain.container.querySelector('filter[filterUnits]')).toBeNull();
    cleanup();
    const { container } = render(<CardFace artFilter={{ brightness: 120, contrast: 100, saturate: 0, hue: 30 }} />);
    expect(container.querySelector('filter[filterUnits] feColorMatrix[type="saturate"]')?.getAttribute('values')).toBe('0');
    expect(container.querySelector('filter[filterUnits] feColorMatrix[type="hueRotate"]')?.getAttribute('values')).toBe('30');
    expect(container.querySelector('[clip-path] > g')?.getAttribute('filter')).toMatch(/^url/);
  });

  it('scales the title', () => {
    render(<CardFace cardTitle="Velmi" titleScale={150} />);
    const big = parseFloat(screen.getByText('Velmi').style.fontSize);
    cleanup();
    render(<CardFace cardTitle="Velmi" />);
    expect(big).toBeCloseTo(parseFloat(screen.getByText('Velmi').style.fontSize) * 1.5, 2);
  });

  it('leaves the case of the title alone when asked to', () => {
    render(<CardFace cardTitle="Velmi" titleCaps={false} />);
    expect(screen.getByText('Velmi').style.textTransform).toBe('none');
  });

  it.each(enums.backPattern)('draws the back pattern %s for every format', (backPattern) => {
    for (const [variant, formatH] of [['tarot', 120], ['bestie', 88], ['prazdna', 30], ['prazdna', 200]] as const) {
      const { container } = render(<CardBack variant={variant} formatW={70} formatH={formatH} backPattern={backPattern} />);
      const paths = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d') ?? '');
      expect(paths.some((d) => d.length > 0)).toBe(true);
      expect(paths.join('')).not.toContain('NaN');
      cleanup();
    }
  });

  it('hides the brand on the other backs of game cards', () => {
    render(<CardBack variant="bestie" backPattern="hvezdy" />);
    expect(screen.queryByText('ARKÁNUM')).toBeNull();
  });
});

describe('CardFace and CardBack', () => {
  it('render flat without any 3D or pointer handling', () => {
    const { container } = render(<CardFace variant="hrdina" cardTitle="Kovář" />);
    expect(container.innerHTML).not.toContain('preserve-3d');
    expect(screen.getByText('Kovář')).toBeTruthy();
    const root = container.querySelector<HTMLElement>('[role="img"]');
    expect(root?.style.getPropertyValue('--gx')).toBe('30%');
    expect(container.querySelector('linearGradient[data-gold]')?.getAttribute('x1')).toBe('-140');
  });

  it('honour a fixed width for the export', () => {
    const { container } = render(<CardFace widthPx={600} squareCorners />);
    const root = container.querySelector<HTMLElement>('[role="img"]');
    expect(root?.style.fontSize).toBe('32px');
    expect(root?.style.borderRadius).toBe('0px');
  });

  it('show the brand on the back of game cards only', () => {
    const { rerender } = render(<CardBack variant="bestie" />);
    expect(screen.queryByText('ARKÁNUM')).toBeTruthy();
    rerender(<CardBack variant="tarot" />);
    expect(screen.queryByText('ARKÁNUM')).toBeNull();
  });

  it('applies the deck palette to the back', () => {
    const { container } = render(<CardBack variant="bestie" backPalette="krev" />);
    const root = container.querySelector<HTMLElement>('[role="img"]');
    expect(root?.style.background).toBe('rgb(35, 10, 17)');
  });
});

describe('uploaded artwork', () => {
  const layer = (url: string) => ({ url, x: 0, y: 0, zoom: 1 });

  it('replaces the built-in illustration and stays inside the window', () => {
    const { container } = render(<CardFace artwork={[layer('/a.png')]} />);
    const image = container.querySelector('image');
    expect(image?.getAttribute('href')).toBe('/a.png');
    expect(image?.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
    expect(image?.closest('[clip-path]')).toBeTruthy();
    expect(container.querySelectorAll('[clip-path] path')).toHaveLength(0);
  });

  it('applies the position and zoom', () => {
    const { container } = render(<CardFace artwork={[{ url: '/a.png', x: 50, y: -50, zoom: 2 }]} />);
    const placed = container.querySelector('image')?.parentElement;
    expect(placed?.getAttribute('transform')).toBe('translate(266 70) scale(2) translate(-150 -245)');
  });

  it('assigns parallax depths from the background to the foreground', () => {
    const { container } = render(<CardFace artwork={[layer('/a.png'), layer('/b.png'), layer('/c.png')]} />);
    const groups = [...container.querySelectorAll('image')].map((image) => (image.parentElement?.parentElement as unknown as SVGElement).style.transform);
    expect(groups[0]).toContain('--pbx');
    expect(groups[1]).toContain('--pmx');
    expect(groups[2]).toContain('--pfx');
  });

  it('keeps the blank card proportional to its format', () => {
    const { container } = render(<CardFace variant="prazdna" formatW={70} formatH={70} cardTitle="Čtverec" />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 300');
    expect(screen.getByText('Čtverec')).toBeTruthy();
  });
});

describe('LazyCard', () => {
  type Listener = (entries: { isIntersecting: boolean }[]) => void;
  let listener: Listener = () => undefined;

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: Listener) {
          listener = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  it('shows the preview outside of the viewport and the 3D card inside', () => {
    const { container } = render(<LazyCard thumbnail="/thumb.png" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/thumb.png');
    expect(container.innerHTML).not.toContain('preserve-3d');

    act(() => listener([{ isIntersecting: true }]));
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).toContain('preserve-3d');

    act(() => listener([{ isIntersecting: false }]));
    expect(container.querySelector('img')).toBeTruthy();
    expect(container.innerHTML).not.toContain('preserve-3d');
  });

  it('keeps the layout box without a preview', () => {
    const { container } = render(<LazyCard variant="bestie" />);
    const holder = container.firstElementChild as HTMLElement;
    expect(holder.style.aspectRatio).toBe('300 / 419');
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });
});
