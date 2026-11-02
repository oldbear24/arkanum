import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Card3D } from './Card3D';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';
import { LazyCard } from './LazyCard';
import { itemDefaults } from './normalize';
import type { PlacedItem } from './resolve';
import { enums, type ItemType } from './spec';

let frames: FrameRequestCallback[] = [];

function flushFrames() {
  const pending = frames;
  frames = [];
  act(() => pending.forEach((run) => run(performance.now())));
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
