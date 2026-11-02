import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(cleanup);

it('renders the landing page', () => {
  vi.stubGlobal('scrollTo', () => undefined);
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vytvoř vlastní arkána');
  expect(screen.getByRole('link', { name: 'Arkánum – úvod' })).toBeTruthy();
  vi.unstubAllGlobals();
});
