import { expect, test } from '@playwright/test';
import { createCard, settingsTab, signIn, waitSaved } from './helpers';

// A 1 × 1 px PNG, enough for the upload path.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('a guest is sent to sign in and comes back to the card', async ({ page }) => {
  await page.goto('/dilna/neexistuje');
  await expect(page).toHaveURL(/\/prihlaseni\?next=/);
});

test('edits autosave, survive a reload and can be undone', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await settingsTab(page, 'Text').click();
  const title = page.getByLabel('Název karty');
  await expect(title).toHaveValue('Hvězda');

  await title.fill('Moje hvězda');
  await expect(page.getByRole('status').filter({ hasText: 'Ukládám' })).toBeVisible();
  await waitSaved(page);

  await page.reload();
  await settingsTab(page, 'Text').click();
  await expect(page.getByLabel('Název karty')).toHaveValue('Moje hvězda');

  await settingsTab(page, 'Materiál').click();
  await page.getByRole('button', { name: 'Duhová' }).click();
  await expect(page.getByRole('button', { name: 'Duhová' })).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Control+z');
  await expect(page.getByRole('button', { name: 'Zlatá' }).first()).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByRole('button', { name: 'Duhová' })).toHaveAttribute('aria-pressed', 'true');
  await waitSaved(page);
});

test('switching a template asks first when the texts were edited', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  // Untouched texts switch right away.
  await page.getByRole('button', { name: 'Bestie' }).click();
  await expect(page.getByText('Bestie · Mlha')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await settingsTab(page, 'Text').click();
  await page.getByLabel('Název karty').fill('Můj mlok');

  await page.getByRole('button', { name: 'Hrdina' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Zrušit' }).click();
  await expect(page.getByLabel('Název karty')).toHaveValue('Můj mlok');

  await page.getByRole('button', { name: 'Hrdina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Přepnout šablonu' }).click();
  await expect(page.getByLabel('Název karty')).toHaveValue('Strážkyně brány');
  await waitSaved(page);
});

test('uploads artwork, positions it and removes it', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.locator('input[type="file"]').first().setInputFiles({ name: 'ilustrace.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('[role="img"] image')).toHaveCount(1);

  await page.getByLabel('Přiblížení').fill('2');
  await waitSaved(page);
  await expect(page.locator('[role="img"] image').locator('..')).toHaveAttribute('transform', /scale\(2\)/);

  await page.locator('input[type="file"]').nth(1).setInputFiles({ name: 'vrstva.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'Odebrat obrázek: Pozadí' })).toBeVisible();

  await page.getByRole('button', { name: 'Odebrat obrázek: Pozadí' }).click();
  await page.getByRole('button', { name: 'Odebrat obrázek: Vlastní ilustrace' }).click();
  await expect(page.locator('[role="img"] image')).toHaveCount(0);
});

test('refuses a file that is not an image', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.locator('input[type="file"]').first().setInputFiles({ name: 'text.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
  await expect(page.getByRole('alert')).toContainText('PNG, JPEG a WebP');
});

test('co-authors see each other and each other\'s changes live', async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const editorContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const editor = await editorContext.newPage();

  await signIn(owner, 'noctua');
  await signIn(editor, 'demo');

  await owner.goto('/@noctua');
  await owner.getByRole('link', { name: 'Společná práce' }).first().click();
  await owner.waitForURL(/\/karta\//);
  const cardId = owner.url().split('/').pop();

  await owner.goto(`/dilna/${cardId}`);
  await editor.goto(`/dilna/${cardId}`);

  // Who else is editing shows up in the header.
  await expect(owner.getByText('Kartu právě upravuje také @demo')).toBeAttached({ timeout: 25_000 });
  await expect(editor.getByText('Kartu právě upravuje také @noctua')).toBeAttached({ timeout: 25_000 });

  await settingsTab(owner, 'Text').click();
  await settingsTab(editor, 'Text').click();

  await owner.getByLabel('Název karty').fill('Od majitele');
  await expect(editor.getByLabel('Název karty')).toHaveValue('Od majitele', { timeout: 10_000 });

  await editor.getByLabel('Název karty').fill('Od spoluautora');
  await expect(owner.getByLabel('Název karty')).toHaveValue('Od spoluautora', { timeout: 10_000 });

  // A co-author cannot publish.
  await expect(editor.getByRole('button', { name: 'Publikovat' })).toHaveCount(0);
  await expect(owner.getByRole('button', { name: 'Publikovat' })).toBeVisible();

  await ownerContext.close();
  await editorContext.close();
});

test('shares a card and adds a co-author', async ({ page }) => {
  await signIn(page, 'demo');
  const id = await createCard(page);

  await page.getByRole('button', { name: 'Sdílet' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Odkaz na kartu')).toHaveValue(new RegExp(`/karta/${id}$`));

  await dialog.getByLabel('Kdokoli s odkazem').check();
  await expect(dialog.getByText('Kartu uvidí každý s odkazem')).toBeVisible();

  await dialog.getByLabel('Přezdívka spoluautora').fill('@nikdo_takovy');
  await dialog.getByRole('button', { name: 'Přidat' }).click();
  await expect(dialog.getByRole('alert')).toContainText('neznáme');

  await dialog.getByLabel('Přezdívka spoluautora').fill('lada');
  await dialog.getByRole('button', { name: 'Přidat' }).click();
  await expect(dialog.getByText('@lada')).toBeVisible();

  await dialog.getByRole('button', { name: 'Odebrat spoluautora lada' }).click();
  await expect(dialog.getByText('@lada')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('settings live in the bottom sheet', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page);

    await expect(page.getByRole('region', { name: 'Nastavení karty' })).toBeVisible();
    await expect(page.getByRole('complementary')).toHaveCount(0);

    await page.getByRole('button', { name: 'Materiál' }).click();
    await page.getByRole('button', { name: 'Kosmos' }).click();
    await expect(page.getByRole('button', { name: 'Kosmos' })).toHaveAttribute('aria-pressed', 'true');
    await waitSaved(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
