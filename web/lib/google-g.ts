/** Mismo path que disenos/google_g.py (icono oficial Google 2015). */
export const GOOGLE_G_D =
  "M9.001 10.71V7.362h8.424c.126.567.225 1.098.225 1.845 0 5.139-3.447 8.793-8.64 8.793-4.968 0-9-4.032-9-9s4.032-9 9-9c2.43 0 4.464.891 6.021 2.349l-2.556 2.484c-.648-.612-1.782-1.332-3.465-1.332-2.979 0-5.409 2.475-5.409 5.508s2.43 5.508 5.409 5.508c3.447 0 4.716-2.385 4.95-3.798H9.001v-.009z";

export const GOOGLE_G_BOX = 18;

/** G de Google en el color de acento (igual que el PLA). */
export function drawGoogleG(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const s = size / GOOGLE_G_BOX;
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-GOOGLE_G_BOX / 2, -GOOGLE_G_BOX / 2);
  ctx.fill(new Path2D(GOOGLE_G_D));
  ctx.restore();
}
