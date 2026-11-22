/**
 * Prepares an uploaded logo for printing on bills. Pure pixel maths on RGBA data, so it runs
 * the same in the browser (canvas) and in scripts.
 *
 * Logos usually arrive as a square with a flat background and lots of padding. When all four
 * corners share one opaque colour, that colour is made transparent (with a soft ramp so
 * anti-aliased edges stay smooth), then the image is cropped to what's left.
 */
export type Rgba = { data: Uint8ClampedArray; width: number; height: number };
export type Crop = { x: number; y: number; width: number; height: number };

const NEAR = 18; // colour distance still treated as background
const FAR = 70; // distance from which a pixel is fully kept

export function knockOutBackground({ data, width, height }: Rgba): boolean {
  const at = (x: number, y: number) => (y * width + x) * 4;
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
  if (corners.some((i) => data[i + 3] < 250)) return false; // already transparent
  const [r, g, b] = [0, 1, 2].map((c) => corners.reduce((s, i) => s + data[i + c], 0) / 4);
  const dist = (i: number) => Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b);
  if (corners.some((i) => dist(i) > NEAR)) return false; // busy background, leave it alone
  for (let i = 0; i < data.length; i += 4) {
    const d = dist(i);
    if (d >= FAR) continue;
    data[i + 3] = d <= NEAR ? 0 : Math.round((data[i + 3] * (d - NEAR)) / (FAR - NEAR));
  }
  return true;
}

/** The smallest box holding every visible pixel, with a little breathing room. */
export function visibleBounds({ data, width, height }: Rgba): Crop {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { x: 0, y: 0, width, height };
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  const x = Math.max(0, x0 - pad);
  const y = Math.max(0, y0 - pad);
  return { x, y, width: Math.min(width, x1 + pad + 1) - x, height: Math.min(height, y1 + pad + 1) - y };
}

/** Largest size within the box that keeps the aspect ratio and never upscales. */
export function fitWithin(w: number, h: number, maxW: number, maxH: number) {
  const k = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

export const LOGO_BOX = { width: 640, height: 320 };
export const LOGO_MAX_CHARS = 200_000;
