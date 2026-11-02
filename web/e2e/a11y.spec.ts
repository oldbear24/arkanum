import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createCard, settingsTab, signIn } from './helpers';

// The card itself is artwork. Its text sits on gradients, foils and images, where an
// automatic contrast check only produces noise, so the check covers everything around it.
async function check(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('[role="img"]')
    .analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
  }));
  expect(summary).toEqual([]);
}

test('public pages have no automatically detectable problems', async ({ page }) => {
  for (const path of ['/', '/sablony', '/prihlaseni', '/registrace', '/obnova-hesla', '/@noctua', '/neexistuje']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await check(page);
  }
});

test('the workshop has no automatically detectable problems', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  for (const tab of ['Vzhled', 'Materiál', 'Text', 'Význam']) {
    await settingsTab(page, tab).click();
    await check(page);
  }
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the workshop has no automatically detectable problems', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page, 'Bestie');
    await check(page);
  });

  test('touch targets in the workshop are at least 44 px', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page, 'Bestie');

    for (const tab of ['Vzhled', 'Materiál', 'Text', 'Hra']) {
      await page.getByRole('region', { name: 'Nastavení karty' }).getByRole('button', { name: tab, exact: true }).click();
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button:not(:disabled), a[href], input:not([type="file"]), textarea'))
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
          })
          .map((element) => `${element.tagName} ${element.getAttribute('aria-label') ?? element.textContent?.slice(0, 20)} ${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)}`),
      );
      expect(small).toEqual([]);
    }
  });
});

test('reduced motion turns the card animations off', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/sablony');
  const scene = page.getByRole('img').first();
  await scene.hover();
  await expect(scene).toHaveAttribute('style', /--rx: 0\.00deg/);
  const body = scene.locator('> div').nth(1);
  await expect(body).toHaveCSS('transition-property', 'none');
  await context.close();
});
