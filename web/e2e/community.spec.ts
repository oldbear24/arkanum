import { expect, test, type Page } from '@playwright/test';
import { createCard, signIn } from './helpers';

function galleryCard(page: Page, title: string) {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

test('the gallery filters, sorts and loads more while scrolling', async ({ page }) => {
  await page.goto('/');
  const gallery = page.locator('#galerie');
  await expect(gallery.getByRole('article').first()).toBeVisible();
  await expect(gallery.getByRole('article').first()).toContainText('Hvězda');
  await expect(gallery.getByRole('article')).toHaveCount(24);

  await gallery.getByRole('button', { name: 'Nejoblíbenější' }).click();
  await expect(gallery.getByRole('article').first()).toContainText('Bludička');

  await gallery.getByRole('button', { name: 'Hrdinové' }).click();
  await expect(gallery.getByRole('article').first()).toContainText('Strážkyně brány');
  for (const text of await gallery.getByRole('article').allInnerTexts()) expect(text).toContain('Hrdina');

  await gallery.getByRole('button', { name: 'Vše' }).click();
  await expect(gallery.getByRole('article')).toHaveCount(24);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => gallery.getByRole('article').count()).toBeGreaterThan(24);
});

test('search finds a card by its title', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hledat karty' }).click();
  await page.getByLabel('Hledat karty').fill('Slunce');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/q=Slunce/);
  await expect(page.locator('#galerie').getByRole('article')).toHaveCount(1);
});

test('only cards in the viewport run live 3D', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#galerie').getByRole('article')).toHaveCount(24);
  const bodies = page.locator('#galerie [style*="preserve-3d"]');
  await expect.poll(() => bodies.count()).toBeLessThan(24);
});

test('a guest sees the private cards of nobody', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#galerie').getByRole('article').first()).toBeVisible();
  await expect(galleryCard(page, 'Rozpracovaná karta')).toHaveCount(0);
  await page.goto('/@demo');
  await expect(page.getByRole('heading', { name: 'Pozvánka' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rozpracovaná karta' })).toHaveCount(0);
});

test('the heart sends a guest to sign in', async ({ page }) => {
  await page.goto('/');
  await galleryCard(page, 'Hvězda').getByRole('button', { name: /Přidat do oblíbených/ }).click();
  await expect(page).toHaveURL(/\/prihlaseni\?next=/);
});

test('the heart works right away and survives a reload', async ({ page }) => {
  // Everybody else already likes this card in the seed data.
  await signIn(page, 'vrana');
  await page.goto('/');
  const heart = galleryCard(page, 'Hvězda').getByRole('button', { name: /oblíbených/ });
  await expect(heart).toHaveAttribute('aria-pressed', 'false');

  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(galleryCard(page, 'Hvězda').getByRole('button', { name: /oblíbených/ })).toHaveAttribute('aria-pressed', 'true');

  await galleryCard(page, 'Hvězda').getByRole('button', { name: /oblíbených/ }).click();
  await expect(galleryCard(page, 'Hvězda').getByRole('button', { name: /oblíbených/ })).toHaveAttribute('aria-pressed', 'false');
});

test('the card detail shows its data and counts likes', async ({ page }) => {
  await signIn(page, 'vrana');
  await page.goto('/');
  await galleryCard(page, 'Měsíc').getByRole('link', { name: 'Měsíc', exact: true }).click();
  await page.waitForURL(/\/karta\//);

  await expect(page.getByRole('heading', { level: 1, name: 'Měsíc' })).toBeVisible();
  await expect(page.getByRole('link', { name: '@noctua' })).toBeVisible();

  const like = page.getByRole('button', { name: /Líbí se mi/ });
  const before = Number((await like.innerText()).replace(/\D/g, ''));
  await like.click();
  await expect(like).toContainText(String(before + 1));
  await page.reload();
  await expect(page.getByRole('button', { name: /Líbí se mi/ })).toContainText(String(before + 1));

  // Only the owner gets the export and delete actions.
  await expect(page.getByRole('button', { name: 'Smazat kartu' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Upravit' })).toHaveCount(0);
});

test('a private card stays hidden from others', async ({ page, browser }) => {
  await signIn(page, 'demo');
  const id = await createCard(page);

  await page.goto(`/karta/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hvězda');

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(`/karta/${id}`);
  await expect(guestPage.getByRole('heading', { name: 'Tady nic není' })).toBeVisible();
  await guest.close();
});

test('remix copies a card and keeps the link to the original', async ({ page }) => {
  await signIn(page, 'alchymista');
  await page.goto('/');
  await galleryCard(page, 'Hvězda').getByRole('link', { name: 'Hvězda', exact: true }).click();
  await page.waitForURL(/\/karta\//);

  await page.getByRole('button', { name: 'Remixovat' }).click();
  await page.waitForURL(/\/dilna\//);
  const id = page.url().split('/').pop();

  await page.goto(`/karta/${id}`);
  await expect(page.getByRole('link', { name: 'Hvězda' })).toBeVisible();
  await expect(page.getByText('Remix karty')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Upravit' })).toBeVisible();
  await expect(page.getByText('Soukromá')).toBeVisible();
});

test('a deck collects cards in order and has one back', async ({ page }) => {
  await signIn(page, 'kovarna');
  await page.goto('/');
  await galleryCard(page, 'Slunce').getByRole('link', { name: 'Slunce', exact: true }).click();
  await page.waitForURL(/\/karta\//);

  await page.getByRole('button', { name: 'Přidat do balíčku' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Název nového balíčku').fill('Sluneční sada');
  await dialog.getByRole('button', { name: 'Vytvořit a přidat' }).click();
  await expect(dialog.getByRole('button', { name: 'Odebrat z balíčku Sluneční sada' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Zavřít' }).click();

  await page.goto('/');
  await galleryCard(page, 'Bludička').getByRole('link', { name: 'Bludička', exact: true }).click();
  await page.waitForURL(/\/karta\//);
  await page.getByRole('button', { name: 'Přidat do balíčku' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Přidat do balíčku Sluneční sada' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Odebrat z balíčku Sluneční sada' })).toBeVisible();

  await page.goto('/@kovarna');
  await page.getByRole('link', { name: 'Sluneční sada' }).click();
  await page.waitForURL(/\/balicky\//);

  const tiles = page.getByRole('article');
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(0)).toContainText('Slunce');

  await page.getByRole('button', { name: 'Posunout dopředu: Bludička' }).click();
  await expect(tiles.nth(0)).toContainText('Bludička');
  await page.reload();
  await expect(page.getByRole('article').nth(0)).toContainText('Bludička');

  await page.getByRole('button', { name: 'Krev' }).click();
  await expect(page.getByRole('button', { name: 'Krev' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Ruby' }).click();
  await expect(page.getByRole('button', { name: 'Ruby' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Odebrat z balíčku: Slunce' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);

  await page.getByRole('button', { name: 'Upravit balíček' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Smazat balíček' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Smazat balíček' }).click();
  await expect(page).toHaveURL(/@kovarna/);
  await expect(page.getByRole('link', { name: 'Sluneční sada' })).toHaveCount(0);
});

test('registration creates an account with a profile', async ({ page }) => {
  await page.goto('/registrace');
  await page.getByLabel('Přezdívka').fill('nova_tvurkyne');
  await page.getByLabel('Jméno (nepovinné)').fill('Nová Tvůrkyně');
  await page.getByLabel('E-mail').fill('nova@example.com');
  await page.getByLabel('Heslo', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Heslo znovu').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Vytvořit účet' }).click();

  await expect(page.getByRole('button', { name: 'Můj účet' })).toBeVisible();
  await page.goto('/@nova_tvurkyne');
  await expect(page.getByRole('heading', { name: 'Nová Tvůrkyně' })).toBeVisible();
  await expect(page.getByText('e-mail zatím není ověřený')).toBeVisible();
});

test('registration explains a taken handle', async ({ page }) => {
  await page.goto('/registrace');
  await page.getByLabel('Přezdívka').fill('noctua');
  await page.getByLabel('E-mail').fill('jina@example.com');
  await page.getByLabel('Heslo', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Heslo znovu').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Vytvořit účet' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
});

test('a wrong password is explained', async ({ page }) => {
  await page.goto('/prihlaseni');
  await page.getByLabel('E-mail').fill('demo@arkanum.example');
  await page.getByLabel('Heslo').fill('spatne-heslo');
  await page.getByRole('button', { name: 'Přihlásit se' }).click();
  await expect(page.getByRole('alert')).toContainText('Nesprávný e-mail nebo heslo');
});

test('an unknown address shows the not found page', async ({ page }) => {
  await page.goto('/neexistuje');
  await expect(page.getByRole('heading', { name: 'Tady nic není' })).toBeVisible();
  await page.goto('/@nikdo_takovy');
  await expect(page.getByRole('heading', { name: 'Tady nic není' })).toBeVisible();
});
