/** Mismo path que disenos/google_g.py (icono oficial Google 2015). */
export const GOOGLE_G_D =
  "M9.001 10.71V7.362h8.424c.126.567.225 1.098.225 1.845 0 5.139-3.447 8.793-8.64 8.793-4.968 0-9-4.032-9-9s4.032-9 9-9c2.43 0 4.464.891 6.021 2.349l-2.556 2.484c-.648-.612-1.782-1.332-3.465-1.332-2.979 0-5.409 2.475-5.409 5.508s2.43 5.508 5.409 5.508c3.447 0 4.716-2.385 4.95-3.798H9.001v-.009z";

export const GOOGLE_G_BOX = 18;

type V2 = [number, number];

function cubic(p0: V2, p1: V2, p2: V2, p3: V2, steps: number): V2[] {
  const pts: V2[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1],
    ]);
  }
  return pts;
}

const TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/g;

/** Contorno del path oficial. `size` = diámetro. flipY = coordenadas 3D (Y arriba). */
export function googleGPoly(cx: number, cy: number, size: number, flipY = true): V2[] {
  const raw = svgPathPoints(GOOGLE_G_D);
  const s = size / GOOGLE_G_BOX;
  return raw.map(([x, y]) => [
    cx + (x - GOOGLE_G_BOX / 2) * s,
    flipY ? cy - (y - GOOGLE_G_BOX / 2) * s : cy + (y - GOOGLE_G_BOX / 2) * s,
  ]);
}

function svgPathPoints(d: string, steps = 10): V2[] {
  const tokens: { cmd?: string; num?: number }[] = [];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(d))) {
    if (m[1]) tokens.push({ cmd: m[1] });
    else if (m[2]) tokens.push({ num: Number(m[2]) });
  }
  let i = 0;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let prev = "";
  let ctrl: V2 | null = null;
  const pts: V2[] = [];

  const take = (n: number) => {
    const out: number[] = [];
    while (out.length < n && i < tokens.length && tokens[i].num !== undefined) {
      out.push(tokens[i].num as number);
      i += 1;
    }
    return out;
  };

  while (i < tokens.length) {
    let cmd: string;
    if (tokens[i].cmd) {
      cmd = tokens[i].cmd as string;
      i += 1;
    } else if (prev) {
      cmd = prev;
    } else {
      i += 1;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toLowerCase();
    if (c === "m") {
      const a = take(2);
      if (a.length < 2) break;
      x = rel ? x + a[0] : a[0];
      y = rel ? y + a[1] : a[1];
      sx = x;
      sy = y;
      pts.push([x, y]);
      prev = cmd === "m" ? "l" : "L";
      ctrl = null;
      while (true) {
        const b = take(2);
        if (b.length < 2) break;
        x = rel ? x + b[0] : b[0];
        y = rel ? y + b[1] : b[1];
        pts.push([x, y]);
      }
      continue;
    }
    if (c === "z") {
      if (pts.length && (Math.abs(pts[pts.length - 1][0] - sx) > 1e-6 || Math.abs(pts[pts.length - 1][1] - sy) > 1e-6)) {
        pts.push([sx, sy]);
      }
      x = sx;
      y = sy;
      prev = "";
      ctrl = null;
      continue;
    }
    if (c === "l") {
      while (true) {
        const a = take(2);
        if (a.length < 2) break;
        x = rel ? x + a[0] : a[0];
        y = rel ? y + a[1] : a[1];
        pts.push([x, y]);
        ctrl = null;
      }
      prev = cmd;
      continue;
    }
    if (c === "h") {
      while (true) {
        const a = take(1);
        if (a.length < 1) break;
        x = rel ? x + a[0] : a[0];
        pts.push([x, y]);
        ctrl = null;
      }
      prev = cmd;
      continue;
    }
    if (c === "v") {
      while (true) {
        const a = take(1);
        if (a.length < 1) break;
        y = rel ? y + a[0] : a[0];
        pts.push([x, y]);
        ctrl = null;
      }
      prev = cmd;
      continue;
    }
    if (c === "c") {
      while (true) {
        const a = take(6);
        if (a.length < 6) break;
        const p1: V2 = rel ? [x + a[0], y + a[1]] : [a[0], a[1]];
        const p2: V2 = rel ? [x + a[2], y + a[3]] : [a[2], a[3]];
        const p3: V2 = rel ? [x + a[4], y + a[5]] : [a[4], a[5]];
        pts.push(...cubic([x, y], p1, p2, p3, steps));
        ctrl = p2;
        x = p3[0];
        y = p3[1];
      }
      prev = cmd;
      continue;
    }
    if (c === "s") {
      while (true) {
        const a = take(4);
        if (a.length < 4) break;
        const p1: V2 =
          "cs".includes(prev.toLowerCase()) && ctrl ? [2 * x - ctrl[0], 2 * y - ctrl[1]] : [x, y];
        const p2: V2 = rel ? [x + a[0], y + a[1]] : [a[0], a[1]];
        const p3: V2 = rel ? [x + a[2], y + a[3]] : [a[2], a[3]];
        pts.push(...cubic([x, y], p1, p2, p3, steps));
        ctrl = p2;
        x = p3[0];
        y = p3[1];
        prev = cmd;
      }
      continue;
    }
    i += 1;
    prev = cmd;
  }
  if (
    pts.length >= 2 &&
    Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-4 &&
    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-4
  ) {
    pts.pop();
  }
  return pts;
}

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
