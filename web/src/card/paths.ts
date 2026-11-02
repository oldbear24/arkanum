// Building blocks of SVG paths, ported from design/Karta.dc.html. Everything that gets
// drawn on a card is put together from these.

export const f = (n: number) => Math.round(n * 10) / 10;

export const C = (cx: number, cy: number, r: number) =>
  'M' + f(cx - r) + ' ' + f(cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + f(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + f(-2 * r) + ' 0Z';

export const S = (cx: number, cy: number, n: number, r1: number, r2: number, rot?: number) => {
  let d = '';
  const a0 = ((rot === undefined ? -90 : rot) * Math.PI) / 180;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = a0 + (i * Math.PI) / n;
    d += (i === 0 ? 'M' : 'L') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a));
  }
  return d + 'Z';
};

export const R = (cx: number, cy: number, n: number, r1: number, r2: number, rot?: number, r3?: number) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (((rot || 0) + (i * 360) / n) * Math.PI) / 180;
    const re = r3 !== undefined && i % 2 === 1 ? r3 : r2;
    d += 'M' + f(cx + r1 * Math.cos(a)) + ' ' + f(cy + r1 * Math.sin(a)) + 'L' + f(cx + re * Math.cos(a)) + ' ' + f(cy + re * Math.sin(a));
  }
  return d;
};

export const WR = (cx: number, cy: number, n: number, r1: number, r2: number, rot?: number) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (((rot || 0) + (i * 360) / n) * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const P = (r: number, o: number) => f(cx + ux * r - uy * o) + ' ' + f(cy + uy * r + ux * o);
    const m = (r2 - r1) / 3;
    d += 'M' + P(r1, 0) + 'C' + P(r1 + m, 4.5) + ' ' + P(r1 + 2 * m, -4.5) + ' ' + P(r2, 0);
  }
  return d;
};

export const W = (x0: number, x1: number, y: number, amp: number, len: number) => {
  let d = 'M' + x0 + ' ' + y;
  for (let x = x0; x < x1; x += len) {
    d += 'q' + f(len / 4) + ' ' + -amp + ' ' + f(len / 2) + ' 0t' + f(len / 2) + ' 0';
  }
  return d;
};

export const D = (x: number, y: number, s: number) =>
  'M' + x + ' ' + f(y - s * 1.5) + 'C' + f(x + s * 0.5) + ' ' + f(y - s * 0.5) + ' ' + f(x + s) + ' ' + f(y - s * 0.1) + ' ' + f(x + s) + ' ' + f(y + s * 0.3) +
  'A' + s + ' ' + s + ' 0 0 1 ' + f(x - s) + ' ' + f(y + s * 0.3) + 'C' + f(x - s) + ' ' + f(y - s * 0.1) + ' ' + f(x - s * 0.5) + ' ' + f(y - s * 0.5) + ' ' + x + ' ' + f(y - s * 1.5) + 'Z';

export const RR = (x: number, y: number, w: number, h: number, r: number) =>
  'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) +
  'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) + 'V' + (y + r) +
  'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';

export const HX = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    d += (i ? 'L' : 'M') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a));
  }
  return d + 'Z';
};

export const DI = (cx: number, cy: number, r: number) => 'M' + cx + ' ' + (cy - r) + 'L' + (cx + r) + ' ' + cy + 'L' + cx + ' ' + (cy + r) + 'L' + (cx - r) + ' ' + cy + 'Z';

export const dots = (list: [number, number][], r?: number) => list.map((q) => C(q[0], q[1], r || 0.9)).join('');
