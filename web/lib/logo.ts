export const LOGO_MASK = 48;
const LOGO_PREVIEW = 512;

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function containDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
) {
  ctx.clearRect(0, 0, size, size);
  const scale = Math.min(size / img.width, size / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
}

function sampleLum(data: Uint8ClampedArray, i: number) {
  return data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
}

/** Tinta = la marca. El fondo blanco de un JPG no se imprime. */
function isInk(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, bg: number, hasAlpha: boolean) {
  const i = (y * w + x) * 4;
  const a = data[i + 3];
  if (a < 40) return false;
  const lum = sampleLum(data, i);
  if (hasAlpha) {
    if (bg > 150) return lum < 200;
    return lum > 70;
  }
  return bg > 140 ? lum < bg - 28 : lum > bg + 28;
}

function logoBackground(data: Uint8ClampedArray, w: number, h: number) {
  let transparent = 0;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  let bg = 0;
  let bgN = 0;
  for (const p of corners) {
    const i = p * 4;
    if (data[i + 3] < 40) {
      transparent += 1;
      continue;
    }
    bg += sampleLum(data, i);
    bgN += 1;
  }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) transparent += 1;
  }
  const hasAlpha = transparent / (w * h) > 0.08;
  if (bgN === 0) bg = hasAlpha ? 0 : 255;
  else bg /= bgN;
  return { bg, hasAlpha };
}

function inkMask(data: Uint8ClampedArray, w: number, h: number) {
  const { bg, hasAlpha } = logoBackground(data, w, h);
  let mask = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      mask += isInk(data, w, h, x, y, bg, hasAlpha) ? "1" : "0";
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
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const o = off.getContext("2d");
  if (!o) return off;
  const iw = img.width || size;
  const ih = img.height || size;
  const scale = Math.min(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  o.clearRect(0, 0, size, size);
  o.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
  const data = o.getImageData(0, 0, size, size);
  const { bg, hasAlpha } = logoBackground(data.data, size, size);
  const [cr, cg, cb] = hexRgb(color);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const ink = isInk(data.data, size, size, x, y, bg, hasAlpha);
      data.data[i] = cr;
      data.data[i + 1] = cg;
      data.data[i + 2] = cb;
      data.data[i + 3] = ink ? Math.max(data.data[i + 3], 230) : 0;
    }
  }
  o.putImageData(data, 0, 0);
  return off;
}

export function prepareLogo(file: File): Promise<{ dataUrl: string; mask: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = LOGO_PREVIEW;
      canvas.height = LOGO_PREVIEW;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo leer el logo"));
        return;
      }
      containDraw(ctx, img, LOGO_PREVIEW);

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = LOGO_MASK;
      maskCanvas.height = LOGO_MASK;
      const mx = maskCanvas.getContext("2d");
      if (!mx) {
        reject(new Error("No se pudo leer el logo"));
        return;
      }
      containDraw(mx, img, LOGO_MASK);
      const mask = inkMask(mx.getImageData(0, 0, LOGO_MASK, LOGO_MASK).data, LOGO_MASK, LOGO_MASK);
      resolve({ dataUrl: canvas.toDataURL("image/png"), mask });
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
  return /g\.page|google\.|goo\.gl|maps\.app/i.test(t);
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
