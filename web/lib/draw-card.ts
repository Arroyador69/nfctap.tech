import { ACCENT_HEX, BODY_COLORS, BRAND } from "./catalog";
import { drawGoogleG } from "./google-g";
import type { CardDesign } from "./types";

export const CARD_W = 750;
export const CARD_H = 1200;
/** Mismo hueco que la G impresa (~34 mm en la placa de 76 mm). */
export const MARK_SIZE = 200;

export function drawCardFace(
  ctx: CanvasRenderingContext2D,
  design: CardDesign,
  logo?: HTMLImageElement | null,
) {
  const w = CARD_W;
  const h = CARD_H;
  const generic = design.kind !== "personalizada";
  const body = BODY_COLORS.find((c) => c.id === design.bodyColor)?.hex ?? "#171513";
  const accent = ACCENT_HEX[design.accentColor] ?? ACCENT_HEX.amarillo;
  const light = design.bodyColor === "blanco";
  const muted = light ? "rgba(28,25,21,0.55)" : "rgba(246,241,231,0.62)";
  const r = 42;

  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = body;
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    star(ctx, w / 2 + (i - 2) * 78, 168, 22, accent);
  }

  if (generic) {
    drawGoogleG(ctx, w / 2, 455, MARK_SIZE, accent);
  } else if (logo) {
    drawAccentLogo(ctx, logo, w / 2, 455, MARK_SIZE, accent);
  } else {
    ctx.beginPath();
    ctx.arc(w / 2, 455, MARK_SIZE / 2, 0, Math.PI * 2);
    ctx.strokeStyle = muted;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.font = "600 22px Outfit, Arial, sans-serif";
    ctx.fillText("LOGO", w / 2, 460);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  const name = !generic ? design.line1.trim() : "";
  if (name) {
    ctx.font = "700 36px Outfit, Arial, sans-serif";
    wrap(ctx, name.toUpperCase(), w / 2, 600, w - 110, 40);
  }
  ctx.font = "700 64px Outfit, Arial, sans-serif";
  ctx.fillText("TAP", w / 2, name ? 700 : 700);
  ctx.font = "600 42px Outfit, Arial, sans-serif";
  ctx.fillText("RESEÑA", w / 2, name ? 760 : 760);

  ctx.fillStyle = muted;
  ctx.font = "500 18px Outfit, Arial, sans-serif";
  ctx.fillText(BRAND.domain, w / 2, h - 70);
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Logo a un color (el acento). Oscuro o tinta = filamento; el fondo se come. */
function drawAccentLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const o = off.getContext("2d");
  if (!o) return;
  const scale = Math.min(size / img.width, size / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  o.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
  const data = o.getImageData(0, 0, size, size);
  let lumSum = 0;
  let n = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] < 40) continue;
    lumSum += data.data[i] * 0.3 + data.data[i + 1] * 0.59 + data.data[i + 2] * 0.11;
    n += 1;
  }
  const lightLogo = n > 0 && lumSum / n > 160;
  const [cr, cg, cb] = hexRgb(color);
  for (let i = 0; i < data.data.length; i += 4) {
    const a = data.data[i + 3];
    const lum = data.data[i] * 0.3 + data.data[i + 1] * 0.59 + data.data[i + 2] * 0.11;
    const ink = a > 40 && (lightLogo ? lum > 90 : lum < 210);
    data.data[i] = cr;
    data.data[i + 1] = cg;
    data.data[i + 2] = cb;
    data.data[i + 3] = ink ? Math.max(a, 220) : 0;
  }
  o.putImageData(data, 0, 0);
  ctx.drawImage(off, cx - size / 2, cy - size / 2);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.4;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
