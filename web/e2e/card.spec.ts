import { expect, test, type Locator, type Page } from '@playwright/test';

function scene(page: Page) {
  return page.getByRole('img').first();
}

function variable(locator: Locator, name: string) {
  return locator.evaluate((element, property) => (element as HTMLElement).style.getPropertyValue(property), name);
}

async function open(page: Page, query: string) {
  await page.goto(`/dev/karty?solo=1&${query}`);
  await expect(scene(page)).toBeVisible();
  const box = await scene(page).boundingBox();
  if (!box) throw new Error('The card has no box');
  return box;
}

test('tilt follows the pointer and returns', async ({ page }) => {
  const box = await open(page, 'interactive=tilt');
  const card = scene(page);

  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await expect.poll(() => variable(card, '--ry')).toBe('-12.00deg');
  expect(await variable(card, '--rx')).toBe('-9.60deg');

  await page.mouse.move(0, box.y + box.height + 40);
  await expect.poll(() => variable(card, '--ry')).toBe('0.00deg');
});

test('dragging rotates all the way round and keeps the angle', async ({ page }) => {
  const box = await open(page, 'interactive=drag');
  const card = scene(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 5 });
  await expect.poll(() => variable(card, '--ry')).toBe('55.00deg');

  // The pointer capture keeps it going outside of the card.
  await page.mouse.move(x + 400, y, { steps: 5 });
  await expect.poll(() => variable(card, '--ry')).toBe('220.00deg');
  await page.mouse.up();

  await page.mouse.move(x, y + 10);
  await page.waitForTimeout(100);
  expect(await variable(card, '--ry')).toBe('220.00deg');
});

test('the card really is 3D: the front faces away when rotated', async ({ page }) => {
  await open(page, 'interactive=none&flip=true');
  const body = scene(page).locator('> div').nth(1);
  await expect(body).toHaveCSS('transform-style', 'preserve-3d');
  await expect.poll(() => variable(scene(page), '--ry')).toBe('180.00deg');
  const faces = body.locator('> div');
  await expect(faces).toHaveCount(12);
  await expect(faces.nth(10)).toHaveCSS('backface-visibility', 'hidden');
  await expect(faces.nth(11)).toHaveCSS('backface-visibility', 'hidden');
});

test('spinning turns the card and stops', async ({ page }) => {
  await open(page, 'spin=true');
  const card = scene(page);
  const first = await variable(card, '--ry');
  await expect.poll(() => variable(card, '--ry')).not.toBe(first);
});
