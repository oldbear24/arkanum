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

test('the switch unlocks the card, which then keeps turning until it is locked again', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  const scene = cardScene(page);
  const orient = () => scene.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--orient'));
  const unlock = page.getByRole('switch', { name: 'Odemknout kartu' });
  const box = await scene.boundingBox();
  if (!box) throw new Error('The card has no box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const flick = async () => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y, { steps: 6 });
    await page.mouse.up();
  };

  // Locked by default, a flick leaves the card where it was let go of.
  await expect(unlock).toHaveAttribute('aria-checked', 'false');
  await flick();
  const held = 'rotate3d(0.0000, 1.0000, 0.0000, 66.00deg)';
  await expect.poll(orient).toBe(held);
  await page.waitForTimeout(100);
  expect(await orient()).toBe(held);

  await unlock.click();
  await expect(unlock).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Odemknutá karta se po puštění točí dál.')).toBeVisible();
  await flick();
  const first = await orient();
  await expect.poll(orient).not.toBe(first);

  await unlock.click();
  await expect(unlock).toHaveAttribute('aria-checked', 'false');
  const stopped = await orient();
  await page.waitForTimeout(100);
  expect(await orient()).toBe(stopped);
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

test('a ready style changes the whole look in one step back', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByText('Hotové styly').click();
  await page.getByRole('button', { name: 'Krvavý měsíc' }).click();
  await waitSaved(page);

  await settingsTab(page, 'Materiál').click();
  await expect(page.getByRole('button', { name: 'Plamen' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Červená' })).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Control+z');
  await expect(page.getByRole('button', { name: 'Zlatá' }).first()).toHaveAttribute('aria-pressed', 'true');
  await waitSaved(page);
});

test('every random look gets through the checks of the server', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByText('Hotové styly').click();
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Náhodný vzhled' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Ukládám' })).toBeVisible();
    await waitSaved(page);
  }

  await page.getByRole('button', { name: 'Výchozí vzhled šablony' }).click();
  await waitSaved(page);
  await settingsTab(page, 'Materiál').click();
  await expect(page.getByRole('button', { name: 'Zlatá' }).first()).toHaveAttribute('aria-pressed', 'true');
});

test('a look carries over to another card, whose own illustration stays', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByText('Hotové styly').click();
  await page.getByRole('button', { name: 'Hvězdný prach' }).click();
  await page.getByRole('button', { name: 'Kopírovat vzhled' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'zkopírovaný' })).toBeVisible();
  await waitSaved(page);

  await createCard(page, 'Bestie');
  await page.getByText('Hotové styly').click();
  await page.getByRole('button', { name: 'Vložit vzhled' }).click();
  await waitSaved(page);
  await settingsTab(page, 'Materiál').click();
  await expect(page.getByRole('button', { name: 'Galaxie' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Bestie · Stín')).toBeVisible();
});

test('the material options reach the card and survive a reload', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  const card = page.getByRole('main', { name: 'Náhled karty' });

  await settingsTab(page, 'Materiál').click();
  await page.getByRole('button', { name: 'Duhová' }).click();
  await page.getByRole('button', { name: 'Ilustrace', exact: true }).click();
  await expect(card.locator('clipPath[clipPathUnits="objectBoundingBox"]')).toHaveCount(1);
  await page.getByLabel('Směr fólie').fill('40');
  await expect(card.locator('[style*="linear-gradient(40deg"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Zrcadlo' }).click();
  await page.getByText('Textura a opotřebení').click();
  await page.getByRole('button', { name: 'Plátno' }).click();
  await expect(card.locator('[data-texture="platno"]')).toHaveCount(2);
  await page.getByLabel('Opotřebení okrajů').fill('50');
  await expect(card.locator('[data-wear]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Duha', exact: true }).click();
  await page.getByLabel('Vlastní barva ořízky').fill('#3060c0');
  await expect(cardScene(page).locator('> div').nth(1).locator('> div').nth(4)).toHaveCSS('background-color', 'rgb(48, 96, 192)');
  await waitSaved(page);

  await page.reload();
  await settingsTab(page, 'Materiál').click();
  await expect(page.getByRole('button', { name: 'Duhová' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Ilustrace', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Zrcadlo' })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('[data-texture="platno"]')).toHaveCount(2);
});

test('the look options reach the card and survive a reload', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  const card = page.getByRole('main', { name: 'Náhled karty' });

  await page.getByRole('button', { name: 'XVI Věž' }).click();
  await expect(page.getByRole('img', { name: /^Věž/ })).toBeVisible();
  await page.getByRole('button', { name: 'Baroko' }).click();
  await page.getByRole('button', { name: 'Slonovina' }).click();

  await page.getByText('Úpravy ilustrace').click();
  await page.getByRole('button', { name: 'Stará fotka' }).click();
  await expect(card.locator('filter[filterUnits] feColorMatrix[type="matrix"]')).toHaveCount(1);
  await page.getByLabel('Ztmavení rohů').fill('60');

  await page.getByText('Pozadí okna').click();
  await page.getByRole('button', { name: 'Záře' }).click();
  await page.getByRole('button', { name: 'Hvězdné nebe' }).click();

  await page.getByText('Části karty').click();
  await expect(cardScene(page)).toContainText('XVI');
  await page.getByRole('switch', { name: 'Číslo arkány' }).click();
  await expect(cardScene(page)).not.toContainText('XVI');
  await page.getByLabel('Síla linek').fill('150');
  await waitSaved(page);

  await page.reload();
  await expect(page.getByRole('button', { name: 'XVI Věž' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Baroko' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Slonovina' })).toHaveAttribute('aria-pressed', 'true');
  await expect(cardScene(page)).not.toContainText('XVI');
  await page.getByText('Pozadí okna').click();
  await expect(page.getByRole('button', { name: 'Hvězdné nebe' })).toHaveAttribute('aria-pressed', 'true');
});

test('the back takes its own colours and text', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await page.getByText('Rub karty').click();
  await page.getByRole('button', { name: 'Šachovnice' }).click();
  await expect(page.getByRole('main', { name: 'Náhled karty' }).getByRole('button', { name: 'Rub' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Text na rubu').fill('Moje sada');
  await expect(cardScene(page)).toContainText('Moje sada');
  await page.getByLabel('Podklad rubu').fill('#113355');
  await expect(cardScene(page).locator('> div').nth(1).locator('> div').nth(11)).toHaveCSS('background-color', 'rgb(17, 51, 85)');
  await waitSaved(page);

  await page.reload();
  await page.getByText('Rub karty').click();
  await expect(page.getByLabel('Text na rubu')).toHaveValue('Moje sada');
});

test('the title takes its effect, spacing and place', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await settingsTab(page, 'Text').click();
  await page.getByRole('button', { name: /Great Vibes/ }).click();
  await expect(page.getByRole('switch', { name: /Velká písmena/ })).toHaveAttribute('aria-checked', 'false');
  const title = cardScene(page).getByText('Hvězda', { exact: true });
  await expect(title).toHaveCSS('font-family', /Great Vibes/);

  await page.getByText('Úprava nadpisu').click();
  await page.getByRole('button', { name: 'Záře' }).click();
  await expect(title).not.toHaveCSS('text-shadow', 'none');
  const before = await title.boundingBox();
  await page.getByLabel('Posun nahoru a dolů').fill('-30');
  await expect.poll(async () => (await title.boundingBox())?.y).toBeLessThan((before?.y ?? 0) - 20);
  await waitSaved(page);
});

test('the fonts of a card have the Czech letters and load from this server', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);
  const foreign: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) foreign.push(request.url());
  });

  await settingsTab(page, 'Text').click();
  await page.getByRole('button', { name: /Uncial Antiqua/ }).click();
  await page.getByLabel('Název karty').fill('Žluťoučký kůň');
  await expect.poll(() => page.evaluate(() => document.fonts.check("20px 'Uncial Antiqua'", 'ď'))).toBe(true);
  await expect(page.getByRole('button', { name: /Uncial Antiqua/ })).toHaveAttribute('aria-pressed', 'true');
  expect(foreign).toEqual([]);
  await waitSaved(page);
});

test('a beast chooses another illustration and a caption', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page, 'Bestie');
  const paths = () => cardScene(page).locator('svg path').evaluateAll((list) => list.map((path) => path.getAttribute('d')).join('|'));

  const before = await paths();
  await page.getByRole('button', { name: 'Sova' }).click();
  await expect.poll(paths).not.toBe(before);
  await page.getByRole('button', { name: 'Led', exact: true }).click();
  await expect(page.getByText('Bestie · Led')).toBeVisible();

  await settingsTab(page, 'Hra').click();
  await page.getByText('Vlastní popisky').click();
  await page.getByLabel('Popisek úrovně').fill('LV');
  await expect(cardScene(page)).toContainText('LV 2');
  await waitSaved(page);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Sova' })).toHaveAttribute('aria-pressed', 'true');
  await expect(cardScene(page)).toContainText('LV 2');

  // Another family has other illustrations to choose from, so it starts with its own.
  await page.getByRole('button', { name: 'Hrdina' }).click();
  await expect(page.getByRole('button', { name: 'Strážkyně brány' })).toHaveAttribute('aria-pressed', 'true');
  await waitSaved(page);
});

test('an oracle takes a tarot illustration, and a hero its own captions and panel', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page, 'Orákulum');
  await page.getByRole('button', { name: 'Svět', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Svět', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await waitSaved(page);

  await createCard(page, 'Hrdina');
  await settingsTab(page, 'Hra').click();
  await page.getByText('Vlastní popisky').click();
  await page.getByLabel('Popisek síly').fill('ÚTOK');
  await expect(cardScene(page)).toContainText('ÚTOK');
  await waitSaved(page);

  await settingsTab(page, 'Vzhled').click();
  await page.getByText('Vlastní barvy').click();
  await page.getByLabel('Panel s texty').fill('#101010');
  await expect(cardScene(page).getByText('Brána se otevře')).toHaveCSS('color', 'rgb(207, 199, 178)');
  await waitSaved(page);
});

test('a text bends on a curve, floats above the card and can be locked', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await addButton(page, 'Text').click();
  const item = page.locator('[data-item]');
  await page.getByText('Úprava textu').click();
  await page.getByLabel('Ohyb textu').fill('60');
  await expect(item.locator('textPath')).toHaveText('Nový text');
  await page.getByRole('switch', { name: 'Velká písmena' }).click();
  await expect(item.locator('textPath')).toHaveText('NOVÝ TEXT');
  const box = await item.boundingBox();
  expect(box?.width).toBeGreaterThan(10);

  await page.getByText('Vzhled prvku').click();
  await page.getByLabel('Výška nad kartou').fill('100');
  await expect.poll(() => item.evaluate((element) => (element as HTMLElement).style.transform)).toContain('var(--ifx)');
  await page.getByLabel('Stín', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Převrátit zleva doprava' }).click();
  await expect.poll(() => item.evaluate((element) => (element as HTMLElement).style.transform)).toContain('scale(-1, 1)');
  await page.getByRole('button', { name: 'Zesvětlit' }).click();
  await expect(item).toHaveCSS('mix-blend-mode', 'screen');

  // A locked item lets the pointer through to the card, which turns instead.
  await page.getByRole('switch', { name: /Zamknout polohu/ }).click();
  await waitSaved(page);
  const left = await item.evaluate((element) => (element as HTMLElement).style.left);
  const place = await item.boundingBox();
  if (!place) throw new Error('The item has no box');
  await page.mouse.move(place.x + place.width / 2, place.y + place.height / 2);
  await page.mouse.down();
  await page.mouse.move(place.x + place.width / 2 + 60, place.y + place.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(await item.evaluate((element) => (element as HTMLElement).style.left)).toBe(left);
  await expect.poll(() => cardScene(page).evaluate((element) => (element as HTMLElement).style.getPropertyValue('--orient'))).not.toBe('rotate3d(0, 0, 1, 0deg)');

  await page.reload();
  await expect(page.locator('[data-item] textPath')).toHaveText('NOVÝ TEXT');
});

test('a sign of the zodiac and a cut-out image go on the card', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  await addButton(page, 'Symbol').click();
  await page.locator('button[title="Lev"]').click();
  await expect(page.locator('[data-item] path').first()).toHaveAttribute('fill', 'none');
  await page.getByLabel('Šířka čar').fill('6');
  await expect(page.locator('[data-item] path').first()).toHaveAttribute('stroke-width', /^14.[34]/);
  await page.getByRole('button', { name: 'Na střed zleva doprava' }).click();

  await page.getByRole('complementary', { name: 'Šablona a vrstvy' }).locator('input[type="file"]').setInputFiles({ name: 'erb.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('[data-item] image')).toHaveCount(1);
  await page.locator('button[title="Kruh"]').click();
  await expect(page.locator('[data-item] clipPath')).toHaveCount(1);
  await page.getByLabel('Rámeček okolo obrázku').fill('5');
  await expect(page.locator('[data-item] svg > path[stroke-width="5"]')).toHaveCount(1);
  await waitSaved(page);

  await page.reload();
  await expect(page.locator('[data-item] clipPath')).toHaveCount(1);
});

test('a blank card picks a common format with one click', async ({ page }) => {
  await signIn(page, 'demo');
  await page.goto('/sablony');
  await page.getByRole('button', { name: /^Čtvercová/ }).click();
  await page.getByRole('button', { name: 'Vytvořit prázdnou kartu' }).click();
  await page.waitForURL(/\/dilna\//);

  await settingsTab(page, 'Materiál').click();
  await page.getByRole('button', { name: 'Mini', exact: true }).click();
  await expect(page.getByText('44 × 68 mm · vlastní formát')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mini', exact: true })).toHaveAttribute('aria-pressed', 'true');
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

  test('the switch stands next to the card and the row under it stays in one line', async ({ page }) => {
    await signIn(page, 'demo');
    await createCard(page, 'Bestie');

    const unlock = page.getByRole('switch', { name: 'Odemknout kartu' });
    await unlock.click();
    await expect(unlock).toHaveAttribute('aria-checked', 'true');

    const scene = page.getByRole('img').first();
    const [toggleBox, cardBox, undoBox, redoBox] = await Promise.all([unlock.boundingBox(), scene.boundingBox(), page.getByRole('button', { name: 'Zpět' }).boundingBox(), page.getByRole('button', { name: 'Znovu' }).boundingBox()]);
    expect(toggleBox?.x).toBeGreaterThanOrEqual((cardBox?.x ?? 0) + (cardBox?.width ?? 0));
    expect(undoBox?.y).toBe(redoBox?.y);
  });

  test.describe('with a finger', () => {
    test.use({ hasTouch: true });

    test('a flick keeps an unlocked card turning and a tap stops it', async ({ page, context }) => {
      await signIn(page, 'demo');
      await createCard(page);
      const unlock = page.getByRole('switch', { name: 'Odemknout kartu' });
      await unlock.tap();
      await expect(unlock).toHaveAttribute('aria-checked', 'true');

      const scene = page.getByRole('img').first();
      const orient = () => scene.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--orient'));
      const box = await scene.boundingBox();
      if (!box) throw new Error('The card has no box');
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const cdp = await context.newCDPSession(page);
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', touchPoints: { x: number; y: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });

      await touch('touchStart', [{ x, y }]);
      for (let i = 1; i <= 6; i++) await touch('touchMove', [{ x: x + i * 15, y }]);
      await touch('touchEnd', []);
      const first = await orient();
      await expect.poll(orient).not.toBe(first);

      await touch('touchStart', [{ x, y }]);
      await touch('touchEnd', []);
      const stopped = await orient();
      await page.waitForTimeout(100);
      expect(await orient()).toBe(stopped);
    });
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
