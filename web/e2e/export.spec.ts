import { readFileSync } from 'node:fs';
import { expect, test, type Download } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { createCard, signIn, waitSaved } from './helpers';

const MM = 72 / 25.4;

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function bytesOf(download: Download) {
  const path = await download.path();
  return readFileSync(path);
}

test('exports a PNG in double resolution', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PNG/ }).click();
  const download = await pending;

  expect(download.suggestedFilename()).toBe('hvezda.png');
  const size = pngSize(await bytesOf(download));
  expect(size.width).toBe(1200);
  expect(size.height).toBe(Math.round((1200 * 514) / 300));
});

test('the export carries the added items', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page);

  // A red shape in a colour of its own, and an image that has to travel inside of the export.
  await page.getByRole('complementary', { name: 'Šablona a vrstvy' }).getByRole('button', { name: 'Tvar', exact: true }).click();
  await page.getByLabel('Barva', { exact: true }).fill('#ff0000');
  await page.getByLabel('Vodorovně').fill('50');
  await page.getByLabel('Svisle').fill('50');
  await page.getByRole('complementary', { name: 'Šablona a vrstvy' }).locator('input[type="file"]').setInputFiles({
    name: 'erb.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
  });
  await expect(page.locator('[data-item] image')).toHaveCount(1);
  await page.getByLabel('Vodorovně').fill('90');
  await page.getByLabel('Svisle').fill('10');
  await page.getByLabel('Velikost').fill('5');
  await waitSaved(page);

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PNG/ }).click();
  const bytes = await bytesOf(await pending);
  await expect(page.getByRole('alert')).toHaveCount(0);

  const { width, height } = pngSize(bytes);
  const pixel = await page.evaluate(
    async ([data, x, y]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context?.drawImage(image, 0, 0);
      return Array.from(context?.getImageData(Number(x), Number(y), 1, 1).data ?? []);
    },
    [bytes.toString('base64'), width / 2, Math.round(height / 2)] as const,
  );
  expect(pixel[0]).toBeGreaterThan(200);
  expect(pixel[1]).toBeLessThan(90);
  expect(pixel[2]).toBeLessThan(90);
});

test('exports a print PDF with real size, bleed and two pages', async ({ page }) => {
  await signIn(page, 'demo');
  await createCard(page, 'Bestie');

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PDF k tisku/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('bludicka.pdf');

  const pdf = await PDFDocument.load(await bytesOf(download));
  expect(pdf.getPageCount()).toBe(2);
  for (const pdfPage of pdf.getPages()) {
    const trim = pdfPage.getTrimBox();
    const bleed = pdfPage.getBleedBox();
    expect(trim.width / MM).toBeCloseTo(63, 3);
    expect(trim.height / MM).toBeCloseTo(88, 3);
    expect(bleed.width / MM).toBeCloseTo(69, 3);
    expect(bleed.height / MM).toBeCloseTo(94, 3);
  }
});

test('publishing makes the card public with a 600 px preview', async ({ page, request }) => {
  await signIn(page, 'demo');
  const id = await createCard(page);

  await page.getByRole('button', { name: 'Publikovat' }).click();
  await expect(page.getByRole('button', { name: 'Veřejná' })).toBeVisible();

  const record = await (await request.get(`/api/collections/cards/records/${id}`)).json();
  expect(record.visibility).toBe('public');
  expect(record.thumbnail).toMatch(/\.png$/);

  const image = await request.get(`/api/files/${record.collectionId}/${id}/${record.thumbnail}`);
  expect(image.ok()).toBe(true);
  expect(pngSize(Buffer.from(await image.body())).width).toBe(600);
});

test('editing a published card refreshes its preview', async ({ page, request }) => {
  await signIn(page, 'demo');
  const id = await createCard(page);
  await page.getByRole('button', { name: 'Publikovat' }).click();
  await expect(page.getByRole('button', { name: 'Veřejná' })).toBeVisible();

  const before = (await (await request.get(`/api/collections/cards/records/${id}`)).json()).thumbnail;

  await page.getByRole('button', { name: 'Materiál' }).click();
  await page.getByRole('button', { name: 'Duhová' }).click();
  await waitSaved(page);

  await expect
    .poll(async () => (await (await request.get(`/api/collections/cards/records/${id}`)).json()).thumbnail, { timeout: 15_000 })
    .not.toBe(before);
});

test('the gallery shows the preview for cards outside of the viewport', async ({ page }) => {
  await signIn(page, 'demo');
  const id = await createCard(page);
  await page.getByRole('button', { name: 'Publikovat' }).click();
  await expect(page.getByRole('button', { name: 'Veřejná' })).toBeVisible();

  await page.goto(`/?q=Hv%C4%9Bzda`);
  const tile = page.locator('#galerie').getByRole('article').filter({ has: page.locator(`a[href="/karta/${id}"]`) });
  await expect(tile).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  // The hero and the template strip push the gallery out of the rendered area on a short window.
  await page.setViewportSize({ width: 1280, height: 200 });
  await expect(tile.locator('img')).toHaveAttribute('src', /\.png/, { timeout: 10_000 });
});
