import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnlockSwitch } from './UnlockSwitch';

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('UnlockSwitch', () => {
  it('is a real switch with its state', () => {
    stubMatchMedia(false);
    const onToggle = vi.fn();
    const { rerender } = render(<UnlockSwitch on={false} onToggle={onToggle} className="x" />);
    const toggle = screen.getByRole('switch', { name: 'Odemknout kartu' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<UnlockSwitch on onToggle={onToggle} className="x" />);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('shows the label only when there is room for it', () => {
    stubMatchMedia(false);
    const { rerender } = render(<UnlockSwitch on={false} onToggle={() => undefined} className="x" />);
    expect(screen.getByRole('switch').textContent).toBe('Odemknout');
    rerender(<UnlockSwitch on={false} onToggle={() => undefined} className="x" iconOnly />);
    expect(screen.getByRole('switch').textContent).toBe('');
  });

  it('is not there with reduced motion, a card does not turn then', () => {
    stubMatchMedia(true);
    render(<UnlockSwitch on={false} onToggle={() => undefined} className="x" />);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
