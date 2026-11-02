import { expect, test } from '@playwright/test';
import { checkA11y, createCard, settingsTab, signIn } from './helpers';

test('public pages have no automatically detectable problems', async ({ page }) => {
  for (const path of ['/', '/sablony', '/prihlaseni', '/registrace', '/obnova-hesla', '/@noctua', '/neexistuje']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await checkA11y(page);
  }
});

test('the workshop has no automatically detectable problems', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  for (const tab of ['Vzhled', 'Materiál', 'Text', 'Význam']) {
    await settingsTab(page, tab).click();
    await checkA11y(page);
  }
});

test('the extra sections and the items have no automatically detectable problems', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByText('Úpravy ilustrace').click();
  await page.getByText('Vlastní barvy').click();
  await page.getByText('Rub karty').click();
  await checkA11y(page);

  for (const name of ['Text', 'Symbol', 'Ornament', 'Statistika', 'Tvar']) {
    await page.getByRole('complementary', { name: 'Šablona a vrstvy' }).getByRole('button', { name, exact: true }).click();
    await checkA11y(page);
  }
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the workshop has no automatically detectable problems', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page, 'Bestie');
    await checkA11y(page);
  });

  test('touch targets in the workshop are at least 44 px', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page, 'Bestie');

    for (const tab of ['Vzhled', 'Materiál', 'Text', 'Hra']) {
      await page.getByRole('region', { name: 'Nastavení karty' }).getByRole('button', { name: tab, exact: true }).click();
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button:not(:disabled), a[href], input:not([type="file"]), textarea, summary'))
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
          })
          .map((element) => `${element.tagName} ${element.getAttribute('aria-label') ?? element.textContent?.slice(0, 20)} ${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)}`),
      );
      expect(small).toEqual([]);
    }
  });

  test('touch targets of the items and the extra sections are at least 44 px', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page);
    const sheet = page.getByRole('region', { name: 'Nastavení karty' });
    const tooSmall = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('button:not(:disabled), a[href], input:not([type="file"]), textarea, summary'))
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
          })
          .map((element) => `${element.tagName} ${element.getAttribute('aria-label') ?? element.textContent?.slice(0, 20)} ${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)}`),
      );

    await page.getByText('Úpravy ilustrace').click();
    await page.getByText('Vlastní barvy').click();
    await page.getByText('Rub karty').click();
    expect(await tooSmall()).toEqual([]);

    await sheet.getByRole('button', { name: 'Prvky', exact: true }).click();
    for (const name of ['Text', 'Symbol', 'Ornament', 'Statistika', 'Tvar']) {
      // The last one, because the tab with the same name comes first.
      await sheet.getByRole('button', { name, exact: true }).last().click();
      expect(await tooSmall()).toEqual([]);
    }
    await checkA11y(page);
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
