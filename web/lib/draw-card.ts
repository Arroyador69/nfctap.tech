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
  const generic = design.kind === "generica";
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

  for (let i = 0; i < 5; i++) {
    star(ctx, w / 2 + (i - 2) * 78, 168, 22, accent);
  }

  if (generic) {
    drawGoogleMark(ctx, w / 2, 470, 210);
    ctx.textAlign = "center";
    ctx.fillStyle = ink;
    ctx.font = "700 44px Outfit, Arial, sans-serif";
    wrap(ctx, "TOCA PARA DEJAR TU RESEÑA", w / 2, 720, w - 100, 52);
  } else {
    const logoY = 400;
    if (logo) {
      const s = 188;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, logoY, s / 2 + 6, 0, Math.PI * 2);
      ctx.clip();
      grayscale(ctx, logo, w / 2 - s / 2, logoY - s / 2, s, s, light);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(w / 2, logoY, 86, 0, Math.PI * 2);
      ctx.strokeStyle = muted;
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = muted;
      ctx.textAlign = "center";
      ctx.font = "600 22px Outfit, Arial, sans-serif";
      ctx.fillText("LOGO", w / 2, logoY + 8);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = ink;
    ctx.font = "700 50px Outfit, Arial, sans-serif";
    wrap(ctx, (design.line1 || "TU NEGOCIO").toUpperCase(), w / 2, 620, w - 100, 56);

    ctx.fillStyle = muted;
    ctx.font = "500 28px Outfit, Arial, sans-serif";
    wrap(ctx, (design.line2 || "TOCA PARA DEJAR TU RESEÑA").toUpperCase(), w / 2, 760, w - 120, 36);
  }

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 40, 890);
  ctx.lineTo(w / 2 + 40, 890);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = "600 22px Outfit, Arial, sans-serif";
  ctx.fillText("ACERCA EL MÓVIL", w / 2, 950);

  ctx.fillStyle = muted;
  ctx.font = "500 18px Outfit, Arial, sans-serif";
  ctx.fillText(BRAND.domain, w / 2, h - 70);
}

/** G de cuatro colores (marca de reseñas). No es el archivo oficial de Google. */
function drawGoogleMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const outer = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outer + 16, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const line = outer * 0.22;
  const r = outer - line / 2;
  ctx.lineWidth = line;
  ctx.lineCap = "butt";

  const arcs: [number, number, string][] = [
    [-28, 52, "#4285F4"],
    [52, 138, "#34A853"],
    [138, 214, "#FBBC05"],
    [214, 292, "#EA4335"],
  ];
  for (const [a0, a1, color] of arcs) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.arc(cx, cy, r, (a0 * Math.PI) / 180, (a1 * Math.PI) / 180);
    ctx.stroke();
  }

  ctx.fillStyle = "#4285F4";
  ctx.fillRect(cx - 2, cy - line / 2, r + line * 0.12, line);
  ctx.restore();
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
