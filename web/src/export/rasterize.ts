import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { CardBack } from '../card/CardBack';
import { CardFace } from '../card/CardFace';
import { resolveCard, type CardParams } from '../card/resolve';

// A canvas cannot draw HTML, but it can draw an SVG image, and an SVG can carry HTML in
// a foreignObject. That image lives in its own document without access to anything
// outside, so fonts and artwork have to travel inside of it as data URLs.

export type CardSide = 'face' | 'back';

interface FontFaceSource {
  family: string;
  weight: string;
  style: string;
  url: string;
  unicodeRange: string;
}

function readFontFaces(): FontFaceSource[] {
  const faces: FontFaceSource[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // A stylesheet from another origin. All of ours are local.
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const src = /url\(["']?([^"')]+)/.exec(rule.style.getPropertyValue('src'));
      if (!src?.[1]) continue;
      faces.push({
        family: rule.style.getPropertyValue('font-family').replace(/["']/g, ''),
        weight: rule.style.getPropertyValue('font-weight') || '400',
        style: rule.style.getPropertyValue('font-style') || 'normal',
        url: new URL(src[1], sheet.href ?? window.location.href).href,
        unicodeRange: rule.style.getPropertyValue('unicode-range'),
      });
    }
  }
  return faces;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Cannot read the file'));
    reader.readAsDataURL(blob);
  });
}

const dataUrls = new Map<string, Promise<string>>();

/** Fonts repeat from card to card, so every file gets downloaded and encoded only once. */
function cachedDataUrl(url: string): Promise<string> {
  let result = dataUrls.get(url);
  if (!result) {
    result = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Cannot load ${url}`);
      return response.blob().then(blobToDataUrl);
    });
    result.catch(() => dataUrls.delete(url));
    dataUrls.set(url, result);
  }
  return result;
}

/** The families and weights the rendered card really uses. */
function usedFonts(root: Element): Set<string> {
  const used = new Set<string>();
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    const hasText = Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    if (!hasText) continue;
    const style = getComputedStyle(element);
    const family = style.fontFamily.split(',')[0]?.replace(/["']/g, '').trim();
    used.add(`${family}|${style.fontWeight}|${style.fontStyle}`);
  }
  return used;
}

async function fontFaceCss(root: Element): Promise<string> {
  const used = usedFonts(root);
  const faces = readFontFaces().filter((face) => used.has(`${face.family}|${face.weight}|${face.style}`));
  const rules = await Promise.all(
    faces.map(async (face) => {
      const data = await cachedDataUrl(face.url);
      return `@font-face{font-family:'${face.family}';font-weight:${face.weight};font-style:${face.style};src:url(${data}) format('woff2');${face.unicodeRange ? `unicode-range:${face.unicodeRange};` : ''}}`;
    }),
  );
  return rules.join('');
}

async function inlineImages(root: Element) {
  await Promise.all(
    Array.from(root.querySelectorAll('image')).map(async (image) => {
      const href = image.getAttribute('href');
      if (!href || href.startsWith('data:')) return;
      const response = await fetch(new URL(href, window.location.href));
      if (!response.ok) throw new Error(`Cannot load ${href}`);
      image.setAttribute('href', await blobToDataUrl(await response.blob()));
    }),
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The card image cannot be drawn'));
    image.src = url;
  });
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

const WEBKIT_REDRAWS = 3;

/** Draws one side of a card into a canvas of exactly the given pixel width. */
export async function renderCardCanvas(side: CardSide, params: CardParams, width: number, options: { squareCorners?: boolean } = {}): Promise<HTMLCanvasElement> {
  const card = resolveCard(params);
  const height = Math.round((width * card.H) / 300);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    const component = side === 'face' ? CardFace : CardBack;
    flushSync(() => root.render(createElement(component, { ...params, widthPx: width, squareCorners: options.squareCorners })));
    await document.fonts.ready;

    const fonts = await fontFaceCss(host);
    const copy = host.cloneNode(true) as HTMLElement;
    copy.removeAttribute('style');
    await inlineImages(copy);

    const markup = new XMLSerializer().serializeToString(copy);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><style>${fonts}</style></defs>` +
      `<foreignObject x="0" y="0" width="${width}" height="${height}">${markup}</foreignObject></svg>`;

    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas available');

    // WebKit paints a foreignObject before its fonts and images are ready.
    // Drawing the same image again once they are is its known workaround.
    const redraws = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent) ? WEBKIT_REDRAWS : 1;
    for (let i = 0; i < redraws; i++) {
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      if (i < redraws - 1) await nextFrame();
    }
    return canvas;
  } finally {
    root.unmount();
    host.remove();
  }
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Cannot encode the image'))), 'image/png');
  });
}

/**
 * Adds a bleed by stretching the outermost pixels outwards. The foil overlays make the
 * edge colour vary along the card, so a plain colour band would show a seam when the
 * cutter drifts.
 */
export function addBleed(source: HTMLCanvasElement, bleed: number): HTMLCanvasElement {
  const { width: w, height: h } = source;
  const canvas = document.createElement('canvas');
  canvas.width = w + 2 * bleed;
  canvas.height = h + 2 * bleed;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas available');

  const strip = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => context.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);

  strip(0, 0, 1, h, 0, bleed, bleed, h);
  strip(w - 1, 0, 1, h, w + bleed, bleed, bleed, h);
  strip(0, 0, w, 1, bleed, 0, w, bleed);
  strip(0, h - 1, w, 1, bleed, h + bleed, w, bleed);
  strip(0, 0, 1, 1, 0, 0, bleed, bleed);
  strip(w - 1, 0, 1, 1, w + bleed, 0, bleed, bleed);
  strip(0, h - 1, 1, 1, 0, h + bleed, bleed, bleed);
  strip(w - 1, h - 1, 1, 1, w + bleed, h + bleed, bleed, bleed);
  context.drawImage(source, bleed, bleed);
  return canvas;
}
