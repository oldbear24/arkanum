import { expect, test } from '@playwright/test';

test('API is healthy and the app shell loads', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
