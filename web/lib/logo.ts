import { isDirectReviewUrl, parseGoogleInput } from "./google-url";

export const LOGO_MASK = 48;
const LOGO_PREVIEW = 512;
const WORK = 512;
const ALPHA_BG = 28;
const FLOOD_THRESH = 78;
const INK_THRESH = 0.22;

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function containDraw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  size: number,
) {
  ctx.clearRect(0, 0, size, size);
  const iw = img.width || size;
  const ih = img.height || size;
  const scale = Math.min(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
}

function lumAt(data: Uint8ClampedArray, i: number) {
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

function rgbDist(data: Uint8ClampedArray, i: number, r: number, g: number, b: number) {
  return Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
}

function chromaAt(data: Uint8ClampedArray, i: number) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return Math.max(r, g, b) - Math.min(r, g, b);
}

type FloodColor = { r: number; g: number; b: number };

function dominantEdgeColor(data: Uint8ClampedArray, w: number, h: number): FloodColor | null {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  let opaque = 0;
  const visit = (p: number) => {
    const i = p * 4;
    if (data[i + 3] < ALPHA_BG) return;
    opaque += 1;
    const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.n += 1;
      cur.r += data[i];
      cur.g += data[i + 1];
      cur.b += data[i + 2];
    } else {
      buckets.set(key, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  if (opaque < 8) return null;
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const b of buckets.values()) {
    if (!best || b.n > best.n) best = b;
  }
  if (!best || best.n / opaque < 0.38) return null;
  return { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n };
}

function floodBackground(data: Uint8ClampedArray, w: number, h: number, flood: FloodColor | null) {
  const n = w * h;
  const bg = new Uint8Array(n);
  const q = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seed = (p: number) => {
    if (bg[p]) return;
    bg[p] = 1;
    q[tail++] = p;
  };
  const edge = (p: number) => {
    const i = p * 4;
    if (data[i + 3] < ALPHA_BG) {
      seed(p);
      return;
    }
    if (flood && rgbDist(data, i, flood.r, flood.g, flood.b) <= FLOOD_THRESH) seed(p);
  };
  for (let x = 0; x < w; x++) {
    edge(x);
    edge((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    edge(y * w);
    edge(y * w + w - 1);
  }
  while (head < tail) {
    const p = q[head++];
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) tryFlood(p - 1);
    if (x + 1 < w) tryFlood(p + 1);
    if (y > 0) tryFlood(p - w);
    if (y + 1 < h) tryFlood(p + w);
  }
  function tryFlood(np: number) {
    if (bg[np]) return;
    const i = np * 4;
    if (data[i + 3] < ALPHA_BG) {
      seed(np);
      return;
    }
    if (flood && rgbDist(data, i, flood.r, flood.g, flood.b) <= FLOOD_THRESH) seed(np);
  }
  return bg;
}

function dropDarkPlate(
  data: Uint8ClampedArray,
  bg: Uint8Array,
  w: number,
  h: number,
  flood: FloodColor | null,
) {
  const n = w * h;
  let remain = 0;
  let darkN = 0;
  let brightN = 0;
  let dx0 = w;
  let dy0 = h;
  let dx1 = 0;
  let dy1 = 0;
  for (let p = 0; p < n; p++) {
    if (bg[p]) continue;
    const i = p * 4;
    if (flood && rgbDist(data, i, flood.r, flood.g, flood.b) <= FLOOD_THRESH) continue;
    remain += 1;
    const L = lumAt(data, i);
    const x = p % w;
    const y = (p / w) | 0;
    if (L < 62) {
      darkN += 1;
      if (x < dx0) dx0 = x;
      if (y < dy0) dy0 = y;
      if (x > dx1) dx1 = x;
      if (y > dy1) dy1 = y;
    } else if (L > 88 && chromaAt(data, i) > 22) {
      brightN += 1;
    }
  }
  if (remain < 80 || darkN / remain < 0.32 || brightN / remain < 0.05) return false;
  const area = Math.max(1, (dx1 - dx0 + 1) * (dy1 - dy0 + 1));
  return darkN / area > 0.48;
}

/** 0–1: qué tanto se imprime ese píxel en el color de acento. */
export function logoCoverage(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const n = w * h;
  const flood = dominantEdgeColor(data, w, h);
  const bg = floodBackground(data, w, h, flood);
  const plate = dropDarkPlate(data, bg, w, h, flood);
  const cover = new Float32Array(n);
  let ink = 0;
  for (let p = 0; p < n; p++) {
    if (bg[p]) continue;
    const i = p * 4;
    const a = data[i + 3] / 255;
    if (a < 0.08) continue;
    if (flood && rgbDist(data, i, flood.r, flood.g, flood.b) <= FLOOD_THRESH) continue;
    const L = lumAt(data, i);
    if (plate && (L < 78 || chromaAt(data, i) < 18)) continue;
    let strength: number;
    if (flood) {
      strength = Math.min(1, Math.max(0, (rgbDist(data, i, flood.r, flood.g, flood.b) - 18) / 140));
    } else {
      strength = a;
    }
    if (plate) strength = Math.min(1, Math.max(strength, (L - 48) / 110));
    const v = strength * a;
    if (v >= 0.06) {
      cover[p] = v;
      ink += 1;
    }
  }
  if (ink >= 24) return cover;

  let med = 0;
  let opaque = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (data[i + 3] < ALPHA_BG) continue;
    med += lumAt(data, i);
    opaque += 1;
  }
  if (opaque < 8) return cover;
  med /= opaque;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const a = data[i + 3] / 255;
    if (a < 0.12) continue;
    const L = lumAt(data, i);
    const v = (med > 132 ? med - L : L - med) / 90;
    if (v > 0.28) cover[p] = Math.min(1, v) * a;
  }
  return cover;
}

function coverageBox(cover: Float32Array, w: number, h: number, t = INK_THRESH) {
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cover[y * w + x] < t) continue;
      n += 1;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (n < 8) return null;
  return { x0, y0, x1, y1 };
}

function sampleCover(cover: Float32Array, w: number, h: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) {
    const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
    return cover[yi * w + xi];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = cover[y0 * w + x0];
  const b = cover[y0 * w + x0 + 1];
  const c = cover[(y0 + 1) * w + x0];
  const d = cover[(y0 + 1) * w + x0 + 1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

function rasterLogo(img: CanvasImageSource & { width: number; height: number }, size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  containDraw(ctx, img, size);
  return ctx.getImageData(0, 0, size, size);
}

function paintCover(
  cover: Float32Array,
  srcW: number,
  srcH: number,
  size: number,
  color: string,
): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const o = off.getContext("2d");
  if (!o) return off;
  const box = coverageBox(cover, srcW, srcH);
  const out = o.createImageData(size, size);
  const [cr, cg, cb] = hexRgb(color);
  if (!box) {
    o.putImageData(out, 0, 0);
    return off;
  }
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const inner = size * 0.84;
  const sc = Math.min(inner / bw, inner / bh);
  const dw = bw * sc;
  const dh = bh * sc;
  const ox = (size - dw) / 2;
  const oy = (size - dh) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = box.x0 + (x - ox) / sc;
      const sy = box.y0 + (y - oy) / sc;
      if (sx < box.x0 - 0.5 || sy < box.y0 - 0.5 || sx > box.x1 + 0.5 || sy > box.y1 + 0.5) continue;
      const a = sampleCover(cover, srcW, srcH, sx, sy);
      if (a < 0.04) continue;
      const i = (y * size + x) * 4;
      out.data[i] = cr;
      out.data[i + 1] = cg;
      out.data[i + 2] = cb;
      out.data[i + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  o.putImageData(out, 0, 0);
  return off;
}

function maskFromCover(cover: Float32Array, srcW: number, srcH: number, n: number) {
  const box = coverageBox(cover, srcW, srcH);
  let mask = "";
  if (!box) {
    for (let i = 0; i < n * n; i++) mask += "0";
    return mask;
  }
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const inner = n * 0.84;
  const sc = Math.min(inner / bw, inner / bh);
  const dw = bw * sc;
  const dh = bh * sc;
  const ox = (n - dw) / 2;
  const oy = (n - dh) / 2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const sx = box.x0 + (x - ox) / sc;
      const sy = box.y0 + (y - oy) / sc;
      const a = sampleCover(cover, srcW, srcH, sx, sy);
      mask += a >= 0.4 ? "1" : "0";
    }
  }
  return mask;
}

/** Logo a un color de acento (el PLA). Sirve para el 2D y para la textura 3D. */
export function paintAccentLogo(
  img: CanvasImageSource & { width: number; height: number },
  size: number,
  color: string,
): HTMLCanvasElement {
  const work = Math.max(WORK, Math.min(768, Math.round(size) * 2));
  const raster = rasterLogo(img, work);
  if (!raster) {
    const empty = document.createElement("canvas");
    empty.width = size;
    empty.height = size;
    return empty;
  }
  const cover = logoCoverage(raster.data, work, work);
  return paintCover(cover, work, work, Math.max(8, Math.round(size)), color);
}

export function prepareLogo(file: File): Promise<{ dataUrl: string; mask: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const raster = rasterLogo(img, WORK);
      if (!raster) {
        reject(new Error("No se pudo leer el logo"));
        return;
      }
      const cover = logoCoverage(raster.data, WORK, WORK);
      const stamp = paintCover(cover, WORK, WORK, LOGO_PREVIEW, "#ffffff");
      const mask = maskFromCover(cover, WORK, WORK, LOGO_MASK);
      resolve({ dataUrl: stamp.toDataURL("image/png"), mask });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("El archivo no es una imagen válida"));
    };
    img.src = url;
  });
}

export function resizeLogo(file: File) {
  return prepareLogo(file).then((r) => r.dataUrl);
}

export function isHttpUrl(value: string) {
  return /^https?:\/\/\S+/i.test(value.trim());
}

export function isReviewUrl(value: string) {
  const t = value.trim();
  if (!isHttpUrl(t)) return false;
  return isDirectReviewUrl(t) || /g\.page\/r\//i.test(t);
}

export function isWhatsAppTarget(value: string) {
  const t = value.trim();
  if (!t) return false;
  if (isHttpUrl(t)) return /wa\.me|whatsapp\.com/i.test(t);
  const digits = t.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function isInstagramTarget(value: string) {
  const t = value.trim();
  if (!t) return false;
  if (isHttpUrl(t)) return /instagram\.com|instagr\.am/i.test(t);
  return /^@?[a-z0-9._]{1,30}$/i.test(t);
}

export function normalizeWhatsAppUrl(value: string) {
  const t = value.trim();
  if (isHttpUrl(t)) return t;
  let digits = t.replace(/\D/g, "");
  if (digits.length === 9) digits = `34${digits}`;
  return `https://wa.me/${digits}`;
}

export function normalizeInstagramUrl(value: string) {
  const t = value.trim();
  if (isHttpUrl(t)) return t;
  const handle = t.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

export function nfcUrlOk(model: string, value: string) {
  if (model === "google" || model === "personalizada") return isReviewUrl(value) || (model === "personalizada" && isHttpUrl(value));
  if (model === "whatsapp") return isWhatsAppTarget(value);
  if (model === "instagram") return isInstagramTarget(value);
  return isHttpUrl(value);
}

export function normalizeNfcUrl(model: string, value: string) {
  const t = value.trim();
  if (model === "whatsapp") return normalizeWhatsAppUrl(t);
  if (model === "instagram") return normalizeInstagramUrl(t);
  if (model === "google") {
    const parsed = parseGoogleInput(t);
    if (parsed?.directReview) return parsed.reviewUrl;
  }
  return t;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPhone(value: string) {
  return value.replace(/\D/g, "").length >= 9;
}

export function isPostalCode(value: string) {
  return /^\d{5}$/.test(value.trim());
}
