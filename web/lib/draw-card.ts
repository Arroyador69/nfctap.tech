import { ACCENT_HEX, BODY_COLORS, BRAND } from "./catalog";
import type { CardDesign } from "./types";

export const CARD_W = 750;
export const CARD_H = 1200;

export function drawCardFace(
  ctx: CanvasRenderingContext2D,
  design: CardDesign,
  logo?: HTMLImageElement | null,
) {
  const w = CARD_W;
  const h = CARD_H;
  const body = BODY_COLORS.find((c) => c.id === design.bodyColor)?.hex ?? "#171513";
  const light = design.bodyColor === "blanco";
  const ink = light ? "#1c1915" : "#f6f1e7";
  const muted = light ? "rgba(28,25,21,0.55)" : "rgba(246,241,231,0.62)";
  const accent = ACCENT_HEX[design.accentColor] ?? ACCENT_HEX.oro;
  const r = 42;

  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.fillStyle = light ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, 8);

  const starY = design.template === "minimal" ? 168 : 150;
  for (let i = 0; i < 5; i++) {
    star(ctx, w / 2 + (i - 2) * 78, starY, 22, accent);
  }

  const logoY = design.template === "barra" ? 340 : 390;
  if (logo) {
    const s = 168;
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, logoY, s / 2 + 8, 0, Math.PI * 2);
    ctx.clip();
    grayscale(ctx, logo, w / 2 - s / 2, logoY - s / 2, s, s, light);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(w / 2, logoY, 74, 0, Math.PI * 2);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.stroke();
    star(ctx, w / 2, logoY, 36, accent);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = "700 54px Outfit, Arial, sans-serif";
  ctx.fillText((design.line1 || "TU NEGOCIO").toUpperCase(), w / 2, 640);

  ctx.fillStyle = muted;
  ctx.font = "500 28px Outfit, Arial, sans-serif";
  const sub =
    design.template === "minimal"
      ? (design.line2 || "TOCA Y OPINA").toUpperCase()
      : (design.line2 || "TOCA PARA DEJAR TU RESEÑA").toUpperCase();
  wrap(ctx, sub, w / 2, 710, w - 120, 36);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 40, 820);
  ctx.lineTo(w / 2 + 40, 820);
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = "600 22px Outfit, Arial, sans-serif";
  ctx.fillText("ACERCA EL MÓVIL", w / 2, 900);

  ctx.fillStyle = muted;
  ctx.font = "500 18px Outfit, Arial, sans-serif";
  ctx.fillText(BRAND.domain, w / 2, h - 70);
}

function grayscale(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  s: number,
  _h: number,
  invert: boolean,
) {
  const off = document.createElement("canvas");
  off.width = s;
  off.height = s;
  const o = off.getContext("2d");
  if (!o) return;
  o.drawImage(img, 0, 0, s, s);
  const data = o.getImageData(0, 0, s, s);
  for (let i = 0; i < data.data.length; i += 4) {
    const g = data.data[i] * 0.3 + data.data[i + 1] * 0.59 + data.data[i + 2] * 0.11;
    const v = invert ? 255 - g : g;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
  }
  o.putImageData(data, 0, 0);
  ctx.drawImage(off, x, y, s, s);
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
