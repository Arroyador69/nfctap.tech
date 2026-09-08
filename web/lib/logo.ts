export const LOGO_MASK = 48;
const LOGO_PREVIEW = 512;

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

function inkMask(data: Uint8ClampedArray, w: number, h: number) {
  let lumSum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) continue;
    lumSum += data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    n += 1;
  }
  const lightLogo = n > 0 && lumSum / n > 160;
  let mask = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      const lum = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
      const ink = a > 40 && (lightLogo ? lum > 90 : lum < 210);
      mask += ink ? "1" : "0";
    }
  }
  return mask;
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

export function isReviewUrl(value: string) {
  const t = value.trim();
  if (!/^https?:\/\/\S+/i.test(t)) return false;
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
