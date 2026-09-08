import { ACCENT_HEX, BODY_COLORS } from "./catalog";
import { ATRIL } from "./atril-geom";
import { PIXEL_FONT } from "./atril-mesh";
import { drawGoogleG } from "./google-g";
import { paintAccentLogo } from "./logo";
import { printText } from "./print-spec";
import type { CardDesign } from "./types";

export const CARD_W = 750;
export const CARD_H = 1200;
export const MARK_SIZE = ATRIL.MARK_R * 2;

const PAD_TOP = 72;
const SCALE = CARD_W / ATRIL.FOOT_W;

function px(x: number) {
  return CARD_W / 2 + x * SCALE;
}

function py(y: number) {
  return PAD_TOP + (ATRIL.FOOT_Y + ATRIL.FACE_H - y) * SCALE;
}

export function drawCardFace(
  ctx: CanvasRenderingContext2D,
  design: CardDesign,
  logo?: HTMLImageElement | null,
) {
  const generic = design.kind === "generica";
  const body = BODY_COLORS.find((c) => c.id === design.bodyColor)?.hex ?? "#171513";
  const accent = ACCENT_HEX[design.accentColor] ?? ACCENT_HEX.amarillo;

  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = "#f3eee4";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const faceTop = py(ATRIL.FOOT_Y + ATRIL.FACE_H);
  const faceBot = py(ATRIL.FOOT_Y);
  const faceL = px(-ATRIL.FACE_W / 2);
  const faceR = px(ATRIL.FACE_W / 2);
  roundRect(ctx, faceL, faceTop, faceR - faceL, faceBot - faceTop, ATRIL.FACE_R * SCALE);
  ctx.fillStyle = body;
  ctx.fill();

  const footTop = py(ATRIL.FOOT_Y + 1.2);
  const footBot = footTop + 58;
  roundRect(ctx, px(-ATRIL.FOOT_W / 2), footTop, ATRIL.FOOT_W * SCALE, footBot - footTop, 10);
  ctx.fillStyle = body;
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    star(ctx, px((i - 2) * 12.2), py(ATRIL.STAR_Y), 4.3 * SCALE, accent);
  }

  if (generic) {
    drawGoogleG(ctx, px(0), py(ATRIL.MARK_Y), MARK_SIZE * SCALE, accent);
  } else if (logo) {
    drawAccentLogo(ctx, logo, px(0), py(ATRIL.MARK_Y), MARK_SIZE * SCALE, accent);
  } else {
    ctx.beginPath();
    ctx.arc(px(0), py(ATRIL.MARK_Y), (MARK_SIZE / 2) * SCALE, 0, Math.PI * 2);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  const name = !generic ? printText(design.line1 || "").slice(0, 16) : "";
  const tapY = name ? ATRIL.TAP_Y + 1.8 : ATRIL.TAP_Y;
  drawPixelText(ctx, "TAP", px(0), py(tapY), ATRIL.TAP_PX * SCALE, accent);
  if (name) drawPixelText(ctx, name, px(0), py(ATRIL.NAME_Y), ATRIL.NAME_PX * SCALE, accent);
  drawPixelText(ctx, "RESEÑA", px(0), py(ATRIL.RESE_Y), ATRIL.RESE_PX * SCALE, accent);
  drawPixelText(ctx, "NFCTAP.TECH", px(0), (footTop + footBot) / 2, 0.62 * SCALE, accent);
}

function drawAccentLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const off = paintAccentLogo(img, Math.max(8, Math.round(size)), color);
  ctx.drawImage(off, cx - size / 2, cy - size / 2, size, size);
}

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  pixel: number,
  color: string,
) {
  const cells: [number, number][] = [];
  let x = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = PIXEL_FONT[ch] ?? PIXEL_FONT[" "];
    glyph.forEach((line, row) => {
      [...line].forEach((bit, col) => {
        if (bit === "1") cells.push([x + col, 6 - row]);
      });
    });
    x += 6;
  }
  if (!cells.length) return;
  const xs = cells.map((p) => p[0]);
  const ys = cells.map((p) => p[1]);
  const w = (Math.max(...xs) + 1) * pixel;
  const h = (Math.max(...ys) + 1) * pixel;
  const ox = cx - w / 2;
  const oy = cy - h / 2;
  ctx.fillStyle = color;
  for (const [col, row] of cells) {
    ctx.fillRect(ox + col * pixel, oy + row * pixel, pixel * 0.92, pixel * 0.92);
  }
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
    const rad = i % 2 === 0 ? r : r * 0.42;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
