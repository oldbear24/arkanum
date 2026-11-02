import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'arkanum-dev';

// The card itself is artwork. Its text sits on gradients, foils and images, where an
// automatic contrast check only produces noise, so the check covers everything around it.
export async function checkA11y(page: Page) {
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

export async function signIn(page: Page, handle: string) {
  await page.goto('/prihlaseni');
  await page.getByLabel('E-mail').fill(`${handle}@arkanum.example`);
  await page.getByLabel('Heslo').fill(PASSWORD);
  await page.getByRole('button', { name: 'Přihlásit se' }).click();
  await expect(page.getByRole('button', { name: 'Můj účet' })).toBeVisible();
}

/** Creates a card from a template through the UI and returns its id. */
export async function createCard(page: Page, family = 'Tarot'): Promise<string> {
  await page.goto('/sablony');
  const article = page.getByRole('article').filter({ has: page.getByRole('heading', { name: family, exact: true }) });
  await article.getByRole('button', { name: 'Použít šablonu' }).click();
  await page.waitForURL(/\/dilna\/[a-z0-9]+$/);
  return page.url().split('/').pop() ?? '';
}

export async function waitSaved(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Uloženo' })).toBeVisible({ timeout: 10_000 });
}

/** A tab of the settings panel. "Text" alone would also match the add element button. */
export function settingsTab(page: Page, name: string) {
  return page.getByRole('complementary', { name: 'Vlastnosti karty' }).getByRole('button', { name, exact: true });
}
