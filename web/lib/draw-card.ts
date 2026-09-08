import { ACCENT_HEX, BODY_COLORS } from "./catalog";
import { ATRIL } from "./atril-geom";
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
    const t = (i - 2) / 2;
    star(ctx, px((i - 2) * 11.4), py(ATRIL.STAR_Y - t * t * 3.4), 4 * SCALE, accent);
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
  const tapY = name ? ATRIL.TAP_Y + 1.2 : ATRIL.TAP_Y;
  drawSansText(ctx, "TAP", px(0), py(tapY), ATRIL.TAP_H * SCALE, ATRIL.TAP_TRACK * SCALE, accent, 600);
  if (name) {
    drawSansText(ctx, name, px(0), py(ATRIL.NAME_Y), ATRIL.NAME_H * SCALE, ATRIL.NAME_TRACK * SCALE, accent, 600);
  }
  drawSansText(ctx, "RESEÑA", px(0), py(ATRIL.RESE_Y), ATRIL.RESE_H * SCALE, ATRIL.RESE_TRACK * SCALE, accent, 500);
  drawSansText(ctx, "NFCTAP.TECH", px(0), (footTop + footBot) / 2, 3.4 * SCALE, 1.15 * SCALE, accent, 500);
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

function drawSansText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  size: number,
  tracking: number,
  color: string,
  weight: number,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${tracking}px`;
  ctx.fillText(text.toUpperCase(), cx, cy);
  ctx.restore();
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
