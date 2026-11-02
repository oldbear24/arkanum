import { PDFDocument, rgb } from 'pdf-lib';
import type { CardParams } from '../card/resolve';
import { cs } from '../i18n/cs';
import { BLEED_MM, printLayout, printWidthPx, safeFileName, type PrintLayout } from './printLayout';
import { addBleed, canvasToPng, renderCardCanvas, type CardSide } from './rasterize';

const THUMBNAIL_WIDTH = 600;
const PNG_WIDTH = THUMBNAIL_WIDTH * 2;
const MARK_THICKNESS = 0.25;

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The 600 px preview that the gallery shows outside of the viewport. */
export async function renderThumbnail(params: CardParams): Promise<Blob> {
  return canvasToPng(await renderCardCanvas('face', params, THUMBNAIL_WIDTH));
}

export async function exportPng(params: CardParams, name: string): Promise<void> {
  const canvas = await renderCardCanvas('face', params, PNG_WIDTH);
  download(await canvasToPng(canvas), `${safeFileName(name)}.png`);
}

async function addPage(document: PDFDocument, side: CardSide, params: CardParams, layout: PrintLayout, widthPx: number, bleedPx: number) {
  const canvas = addBleed(await renderCardCanvas(side, params, widthPx, { squareCorners: true }), bleedPx);
  const png = await document.embedPng(await (await canvasToPng(canvas)).arrayBuffer());

  const page = document.addPage([layout.page.width, layout.page.height]);
  page.setTrimBox(layout.trim.x, layout.trim.y, layout.trim.width, layout.trim.height);
  page.setBleedBox(layout.bleed.x, layout.bleed.y, layout.bleed.width, layout.bleed.height);
  page.drawImage(png, layout.bleed);
  for (const mark of layout.marks) {
    page.drawLine({ ...mark, thickness: MARK_THICKNESS, color: rgb(0, 0, 0) });
  }
}

/** The print PDF: real size in mm, 3 mm bleed, crop marks, front and back on their own pages. */
export async function exportPdf(params: CardParams, name: string, format: { w: number; h: number }): Promise<void> {
  const layout = printLayout(format.w, format.h);
  const widthPx = printWidthPx(format.w, format.h);
  const bleedPx = Math.round((widthPx * BLEED_MM) / format.w);

  const document = await PDFDocument.create();
  document.setTitle(name);
  document.setCreator(cs.appName);
  document.setProducer(cs.appName);

  await addPage(document, 'face', params, layout, widthPx, bleedPx);
  await addPage(document, 'back', params, layout, widthPx, bleedPx);

  const bytes = await document.save();
  download(new Blob([bytes.slice().buffer], { type: 'application/pdf' }), `${safeFileName(name)}.pdf`);
}
