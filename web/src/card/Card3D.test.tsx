import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Card3D } from './Card3D';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';
import { LazyCard } from './LazyCard';

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

  it('rotates all the way round while dragging, and only then', () => {
    const { container } = render(<Card3D interactive="drag" />);
    const scene = sceneOf(container);
    scene.setPointerCapture = vi.fn();
    scene.releasePointerCapture = vi.fn();

    fireEvent.pointerMove(scene, { clientX: 50, clientY: 50 });
    flushFrames();
    expect(scene.style.getPropertyValue('--ry')).toBe('0.00deg');

    fireEvent.pointerDown(scene, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(scene, { clientX: 1000, clientY: -500 });
    flushFrames();
    expect(scene.setPointerCapture).toHaveBeenCalledWith(1);
    expect(scene.style.getPropertyValue('--ry')).toBe('550.00deg');
    expect(scene.style.getPropertyValue('--rx')).toBe('65.00deg');

    fireEvent.pointerUp(scene, { pointerId: 1 });
    flushFrames();
    expect(scene.releasePointerCapture).toHaveBeenCalledWith(1);

    fireEvent.pointerMove(scene, { clientX: 0, clientY: 0 });
    flushFrames();
    expect(scene.style.getPropertyValue('--ry')).toBe('550.00deg');
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
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 0 });
    fireEvent.pointerUp(scene, { pointerId: 1 });
    flushFrames();
    expect(scene.style.getPropertyValue('--ry')).toBe('55.00deg');

    rerender(<Card3D interactive="drag" resetKey={1} />);
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
    fireEvent.pointerMove(scene, { clientX: 100, clientY: 0 });
    expect(frames).toHaveLength(0);
    expect(scene.style.getPropertyValue('--ry')).toBe('180.00deg');
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
