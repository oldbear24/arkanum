import { expect, test, type Page } from '@playwright/test';
import { createCard, settingsTab, signIn, waitSaved } from './helpers';

// A 1 × 1 px PNG, enough for the upload path.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** The file inputs of the settings. The add element grid on the left has one of its own. */
function settingsFile(page: Page) {
  return page.getByRole('complementary', { name: 'Vlastnosti karty' }).locator('input[type="file"]');
}

function addButton(page: Page, name: string) {
  return page.getByRole('complementary', { name: 'Šablona a vrstvy' }).getByRole('button', { name, exact: true });
}

function cardScene(page: Page) {
  return page.getByRole('main', { name: 'Náhled karty' }).getByRole('img').first();
}

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

test('picking an artwork brings its title and numeral in one undo step', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByRole('button', { name: 'XVIII Měsíc' }).click();
  await expect(page.getByRole('button', { name: 'XVIII Měsíc' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: /^Měsíc/ })).toBeVisible();

  await settingsTab(page, 'Text').click();
  await expect(page.getByLabel('Název karty')).toHaveValue('Měsíc');
  await expect(page.getByRole('textbox', { name: 'Číslo arkány' })).toHaveValue('XVIII');

  await page.keyboard.press('Control+z');
  await expect(page.getByLabel('Název karty')).toHaveValue('Hvězda');
  await expect(page.getByRole('textbox', { name: 'Číslo arkány' })).toHaveValue('XVII');
  await settingsTab(page, 'Vzhled').click();
  await expect(page.getByRole('button', { name: 'XVII Hvězda' })).toHaveAttribute('aria-pressed', 'true');
});

test('redo survives the echo of the own save', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await settingsTab(page, 'Materiál').click();
  await page.getByRole('button', { name: 'Duhová' }).click();
  await waitSaved(page);

  await page.getByRole('button', { name: 'Zpět', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Zlatá' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Ukládám' })).toBeVisible();
  await waitSaved(page);
  // Time for the realtime event of that save to come back.
  await page.waitForTimeout(500);

  await expect(page.getByRole('button', { name: 'Znovu', exact: true })).toBeEnabled();
  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByRole('button', { name: 'Duhová' })).toHaveAttribute('aria-pressed', 'true');
});

test('a blank card keeps its format and offers no frames', async ({ page }) => {
  await signIn(page, 'demo');
  await page.goto('/sablony');
  await page.getByRole('button', { name: /^Čtvercová/ }).click();
  await page.getByRole('button', { name: 'Vytvořit prázdnou kartu' }).click();
  await page.waitForURL(/\/dilna\//);

  await expect(page.getByText('70 × 70 mm · vlastní formát')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rám' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Barevná paleta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Význam' })).toHaveCount(0);
  await expect(page.locator('main svg[viewBox="0 0 300 300"]').first()).toBeAttached();
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

  await settingsFile(page).first().setInputFiles({ name: 'ilustrace.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('[role="img"] image')).toHaveCount(1);

  await page.getByLabel('Přiblížení').fill('2');
  await waitSaved(page);
  await expect(page.locator('[role="img"] image').locator('..')).toHaveAttribute('transform', /scale\(2\)/);

  await settingsFile(page).nth(1).setInputFiles({ name: 'vrstva.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'Odebrat obrázek: Pozadí' })).toBeVisible();

  await page.getByRole('button', { name: 'Odebrat obrázek: Pozadí' }).click();
  await page.getByRole('button', { name: 'Odebrat obrázek: Vlastní ilustrace' }).click();
  await expect(page.locator('[role="img"] image')).toHaveCount(0);
});

test('refuses a file that is not an image', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await settingsFile(page).first().setInputFiles({ name: 'text.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
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

test('adds a symbol, moves it on the card and keeps it after a reload', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await addButton(page, 'Symbol').click();
  const item = page.locator('[data-item]');
  await expect(item).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Vlastnosti prvku' })).toBeVisible();

  await page.locator('button[title="Měsíc"]').click();
  await expect(page.locator('button[title="Měsíc"]')).toHaveAttribute('aria-pressed', 'true');

  // Dragging the item moves it and leaves the card as it was.
  const box = await item.boundingBox();
  if (!box) throw new Error('The item has no box');
  const before = await item.evaluate((element) => (element as HTMLElement).style.left);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => item.evaluate((element) => (element as HTMLElement).style.left)).not.toBe(before);
  expect(await cardScene(page).evaluate((element) => (element as HTMLElement).style.getPropertyValue('--orient'))).toBe('rotate3d(0, 0, 1, 0deg)');

  await page.getByLabel('Velikost').fill('40');
  await expect.poll(() => item.evaluate((element) => (element as HTMLElement).style.width)).toBe('40%');
  await waitSaved(page);
  const left = await item.evaluate((element) => (element as HTMLElement).style.left);

  await page.reload();
  await expect(page.locator('[data-item]')).toHaveCount(1);
  expect(await page.locator('[data-item]').evaluate((element) => (element as HTMLElement).style.left)).toBe(left);
  expect(await page.locator('[data-item] path').getAttribute('d')).toContain('A46 46');
});

test('an added text can be edited, undone and removed', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await addButton(page, 'Text').click();
  await page.getByLabel('Text prvku').fill('Znamení');
  await expect(page.locator('[data-item]')).toHaveText('Znamení');
  await page.getByRole('button', { name: 'Kurzíva' }).click();
  await expect(page.locator('[data-item] > div')).toHaveCSS('font-style', 'italic');

  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-item] > div')).toHaveCSS('font-style', 'normal');

  await page.getByRole('button', { name: 'Smazat prvek' }).click();
  await expect(page.locator('[data-item]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Vlastnosti prvku' })).toHaveCount(0);

  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-item]')).toHaveText('Znamení');
  await waitSaved(page);
});

test('items can go on the back, and each side only shows its own', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByRole('button', { name: 'Rub', exact: true }).click();
  await addButton(page, 'Ornament').click();
  await expect(page.locator('[data-item]')).toHaveAttribute('data-side', 'back');
  await expect(page.getByRole('button', { name: 'Rub', exact: true }).last()).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('main', { name: 'Náhled karty' }).getByRole('button', { name: 'Přední strana' }).click();
  await page.getByRole('list').first().getByRole('button', { name: 'Linka', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Náhled karty' }).getByRole('button', { name: 'Rub' })).toHaveAttribute('aria-pressed', 'true');
  await waitSaved(page);
});

test('a stat, a shape and a duplicate go on the card in their order', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await addButton(page, 'Tvar').click();
  await addButton(page, 'Statistika').click();
  await page.getByLabel('Hodnota').fill('12');
  await page.getByLabel('Popisek').fill('Moc');
  await expect(page.locator('[data-item]').last()).toContainText('12');
  await expect(page.locator('[data-item]').last()).toContainText('Moc');

  await page.getByRole('button', { name: 'Posunout dozadu' }).click();
  await expect(page.locator('[data-item]').first()).toContainText('12');

  await page.getByRole('button', { name: 'Duplikovat' }).click();
  await expect(page.locator('[data-item]')).toHaveCount(3);
  await waitSaved(page);

  await page.reload();
  await expect(page.locator('[data-item]')).toHaveCount(3);
});

test('an image item uploads, survives a reload and a remix, and goes away with its file', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByRole('complementary', { name: 'Šablona a vrstvy' }).locator('input[type="file"]').setInputFiles({ name: 'erb.png', mimeType: 'image/png', buffer: PNG });
  const image = page.locator('[data-item] image');
  await expect(image).toHaveCount(1);
  await waitSaved(page);

  await page.reload();
  await expect(image).toHaveCount(1);
  const original = await image.getAttribute('href');

  const id = page.url().split('/').pop();
  await page.goto(`/karta/${id}`);
  await page.getByRole('button', { name: 'Remixovat' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dilna/') && !url.pathname.endsWith(id ?? ''));
  await expect(image).toHaveCount(1);
  const copied = await image.getAttribute('href');
  expect(copied).not.toBe(original);
  expect((await page.request.get(copied ?? '')).ok()).toBe(true);

  await settingsTab(page, 'Prvky').click();
  await page.getByRole('complementary', { name: 'Vlastnosti karty' }).getByRole('button', { name: 'Obrázek', exact: true }).click();
  await page.getByRole('button', { name: 'Smazat prvek' }).click();
  await expect(image).toHaveCount(0);
  await waitSaved(page);
  await expect.poll(async () => (await page.request.get(copied ?? '')).status()).toBe(404);
});

test('colours, the back and the title can be set and undone', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  const scene = cardScene(page);

  await page.getByText('Vlastní barvy').click();
  await page.getByLabel('Podklad', { exact: true }).fill('#113355');
  await expect(scene.locator('> div').nth(1).locator('> div').nth(10)).toHaveCSS('background-color', 'rgb(17, 51, 85)');
  await page.getByRole('button', { name: 'Vrátit výchozí barvu: Podklad' }).click();
  await expect(scene.locator('> div').nth(1).locator('> div').nth(10)).not.toHaveCSS('background-color', 'rgb(17, 51, 85)');

  await page.getByText('Rub karty').click();
  await page.getByRole('button', { name: 'Hvězdy', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Náhled karty' }).getByRole('button', { name: 'Rub' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Barvy rubu: Krev' }).click();
  await expect(page.getByRole('button', { name: 'Barvy rubu: Krev' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByText('Úpravy ilustrace').click();
  await page.getByRole('switch', { name: /Ilustrace přes celou kartu/ }).click();
  await expect(page.locator('main clipPath path').first()).toHaveAttribute('d', 'M0 0H300V514H0Z');

  await settingsTab(page, 'Text').click();
  await page.getByLabel('Velikost nadpisu').fill('120');
  await page.getByRole('switch', { name: /Velká písmena/ }).click();
  await waitSaved(page);

  await page.reload();
  await settingsTab(page, 'Text').click();
  await expect(page.getByLabel('Velikost nadpisu')).toHaveValue('120');
  await expect(page.getByRole('switch', { name: /Velká písmena/ })).toHaveAttribute('aria-checked', 'false');
  await settingsTab(page, 'Vzhled').click();
  await page.getByText('Rub karty').click();
  await expect(page.getByRole('button', { name: 'Barvy rubu: Krev' })).toHaveAttribute('aria-pressed', 'true');
});

test('the buttons turn the card in steps and straighten it', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  const scene = cardScene(page);
  const orient = () => scene.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--orient'));

  await page.getByRole('button', { name: 'Otočit doprava' }).click();
  await expect.poll(orient).toBe('rotate3d(0.0000, 1.0000, 0.0000, 30.00deg)');
  await page.getByRole('button', { name: 'Otočit doleva' }).click();
  await expect.poll(orient).toBe('rotate3d(0, 0, 1, 0deg)');
  await page.getByRole('button', { name: 'Natočit po směru hodinových ručiček' }).click();
  await expect.poll(orient).toBe('rotate3d(0.0000, 0.0000, 1.0000, 30.00deg)');

  await page.getByRole('button', { name: 'Vyrovnat' }).click();
  await expect.poll(orient).toBe('rotate3d(0, 0, 1, 0deg)');
});

test('the card stays in view while the settings scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, 'demo');
  await createCard(page);
  await page.getByText('Úpravy ilustrace').click();
  await page.getByText('Vlastní barvy').click();
  await page.getByText('Rub karty').click();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const box = await cardScene(page).boundingBox();
  if (!box) throw new Error('The card has no box');
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(1000);
});

test('a blank card can change its format in the workshop', async ({ page }) => {
  await signIn(page, 'demo');
  await page.goto('/sablony');
  await page.getByRole('button', { name: /^Čtvercová/ }).click();
  await page.getByRole('button', { name: 'Vytvořit prázdnou kartu' }).click();
  await page.waitForURL(/\/dilna\//);

  await settingsTab(page, 'Materiál').click();
  await page.getByLabel('Výška karty').fill('120');
  await expect(page.getByText('70 × 120 mm · vlastní formát')).toBeVisible();
  await page.getByRole('button', { name: 'Prohodit šířku a výšku' }).click();
  await expect(page.getByText('120 × 70 mm · vlastní formát')).toBeVisible();
  await waitSaved(page);
});

test('the fields of a game card reach the card', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page, 'Bestie');

  await settingsTab(page, 'Hra').click();
  await page.getByLabel('Číslo v sadě').fill('Sada 7/9');
  await page.getByLabel('Ilustrátor').fill('Anna Malířka');
  await expect(cardScene(page)).toContainText('Sada 7/9');
  await expect(cardScene(page)).toContainText('Anna Malířka');
  await waitSaved(page);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('items are added in their tab, and the controls still fit', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page);

    await page.getByRole('button', { name: 'Prvky' }).click();
    await page.getByRole('region', { name: 'Nastavení karty' }).getByRole('button', { name: 'Symbol', exact: true }).click();
    await expect(page.locator('[data-item]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Vyrovnat kartu' })).toBeVisible();
    await waitSaved(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

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
