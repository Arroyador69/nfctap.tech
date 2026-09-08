import { ATRIL } from "./atril-geom";
import { googleGPoly } from "./google-g";
import { printText } from "./print-spec";

export type V2 = [number, number];
export type V3 = [number, number, number];
export type Tri = [V3, V3, V3];

export const PIXEL_FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  Ñ: ["01010", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01110", "10001", "10000", "01110", "00001", "10001", "01110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10001", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "11110", "10001", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
};

export class Mesh {
  tris: Tri[] = [];
  add(a: V3, b: V3, c: V3) {
    this.tris.push([a, b, c]);
  }
  extend(other: Mesh) {
    this.tris.push(...other.tris);
  }
}

function area(poly: V2[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function ensureCcw(poly: V2[]) {
  return area(poly) > 0 ? poly : [...poly].reverse();
}

function roundedRect(w: number, h: number, r: number, segs = 8): V2[] {
  r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, 90],
    [-w / 2 + r, -h / 2 + r, 180],
    [w / 2 - r, -h / 2 + r, 270],
  ];
  const pts: V2[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segs; i++) {
      const a = ((start + (90 * i) / segs) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
}

function circle(cx: number, cy: number, r: number, segs = 36): V2[] {
  return Array.from({ length: segs }, (_, i) => {
    const a = (i * 360 * Math.PI) / 180 / segs;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as V2;
  });
}

function rectangle(w: number, h: number, cx = 0, cy = 0): V2[] {
  return [
    [cx - w / 2, cy - h / 2],
    [cx + w / 2, cy - h / 2],
    [cx + w / 2, cy + h / 2],
    [cx - w / 2, cy + h / 2],
  ];
}

function starPoly(cx: number, cy: number, rOut: number, rIn = rOut * 0.42): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = ((-90 + i * 36) * Math.PI) / 180;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return pts;
}

function slantedBar(x0: number, y0: number, x1: number, y1: number, sw: number): V2[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (sw / 2);
  const ny = (dx / length) * (sw / 2);
  return [
    [x0 + nx, y0 + ny],
    [x1 + nx, y1 + ny],
    [x1 - nx, y1 - ny],
    [x0 - nx, y0 - ny],
  ];
}

function strokeArc(cx: number, cy: number, r: number, a0: number, a1: number, sw: number, segs = 18): V2[] {
  const outer = r + sw / 2;
  const inner = Math.max(0.15, r - sw / 2);
  const pts: V2[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = ((a0 + (a1 - a0) * (i / segs)) * Math.PI) / 180;
    pts.push([cx + outer * Math.cos(a), cy + outer * Math.sin(a)]);
  }
  for (let i = 0; i <= segs; i++) {
    const a = ((a1 + (a0 - a1) * (i / segs)) * Math.PI) / 180;
    pts.push([cx + inner * Math.cos(a), cy + inner * Math.sin(a)]);
  }
  return pts;
}

const SANS_W: Record<string, number> = {
  A: 0.92,
  C: 0.88,
  E: 0.78,
  F: 0.74,
  H: 0.9,
  N: 0.9,
  Ñ: 0.9,
  P: 0.8,
  R: 0.84,
  S: 0.82,
  T: 0.84,
  ".": 0.38,
  " ": 0.42,
};

function sansGlyph(ch: string, h: number, sw: number, w: number): V2[][] {
  const vert = (x: number, y0: number, y1: number) => rectangle(sw, Math.max(0.2, y1 - y0), x, (y0 + y1) / 2);
  const horz = (x0: number, x1: number, y: number) => rectangle(Math.max(0.2, x1 - x0), sw, (x0 + x1) / 2, y);
  switch (ch) {
    case "A":
      return [
        slantedBar(sw * 0.2, sw * 0.08, w / 2, h - sw * 0.08, sw),
        slantedBar(w - sw * 0.2, sw * 0.08, w / 2, h - sw * 0.08, sw),
        horz(w * 0.24, w * 0.76, h * 0.36),
      ];
    case "C":
      return [strokeArc(w / 2, h / 2, h / 2 - sw / 2, 48, 312, sw, 20)];
    case "E":
      return [vert(sw / 2, 0, h), horz(0, w, h - sw / 2), horz(0, w * 0.78, h * 0.5), horz(0, w, sw / 2)];
    case "F":
      return [vert(sw / 2, 0, h), horz(0, w, h - sw / 2), horz(0, w * 0.72, h * 0.52)];
    case "H":
      return [vert(sw / 2, 0, h), vert(w - sw / 2, 0, h), horz(0, w, h * 0.5)];
    case "N":
      return [vert(sw / 2, 0, h), vert(w - sw / 2, 0, h), slantedBar(sw, h - sw * 0.3, w - sw, sw * 0.3, sw)];
    case "P":
      return [
        vert(sw / 2, 0, h),
        horz(0, w - sw * 0.15, h - sw / 2),
        horz(0, w - sw * 0.15, h * 0.48),
        vert(w - sw / 2, h * 0.48, h),
      ];
    case "R":
      return [
        vert(sw / 2, 0, h),
        horz(0, w - sw * 0.15, h - sw / 2),
        horz(0, w - sw * 0.15, h * 0.5),
        vert(w - sw / 2, h * 0.5, h),
        slantedBar(w * 0.42, h * 0.48, w - sw * 0.15, sw * 0.12, sw),
      ];
    case "S":
      return [
        strokeArc(w / 2, h * 0.72, w * 0.36, 210, 20, sw, 16),
        strokeArc(w / 2, h * 0.28, w * 0.36, 30, -160, sw, 16),
      ];
    case "T":
      return [horz(0, w, h - sw / 2), vert(w / 2, 0, h - sw)];
    case "Ñ":
      return [
        vert(sw / 2, 0, h * 0.86),
        vert(w - sw / 2, 0, h * 0.86),
        slantedBar(sw, h * 0.86 - sw * 0.3, w - sw, sw * 0.25, sw),
        strokeArc(w / 2, h * 0.94, w * 0.28, 200, 340, sw * 0.7, 10),
      ];
    case ".":
      return [rectangle(sw * 1.1, sw * 1.1, w / 2, sw * 0.55)];
    default:
      return [];
  }
}

export function sansWord(text: string, cx: number, cy: number, h: number, tracking: number, z0: number, z1: number) {
  const sw = Math.max(0.85, h * 0.16);
  const glyphs = [...text.toUpperCase()].map((ch) => {
    const w = (SANS_W[ch] ?? 0.8) * h;
    return { w, polys: sansGlyph(ch, h, sw, w) };
  });
  const total = glyphs.reduce((s, g) => s + g.w, 0) + tracking * Math.max(0, glyphs.length - 1);
  let x = cx - total / 2;
  const y = cy - h / 2;
  const m = new Mesh();
  for (const g of glyphs) {
    for (const poly of g.polys) {
      m.extend(extrude(poly.map(([px, py]) => [px + x, py + y] as V2), z0, z1));
    }
    x += g.w + tracking;
  }
  return m;
}

function starLayout(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2;
    out.push([(i - 2) * 11.4, ATRIL.STAR_Y - t * t * 3.4, 4]);
  }
  return out;
}

function starPoly(cx: number, cy: number, rOut: number, rIn = rOut * 0.42): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = ((-90 + i * 36) * Math.PI) / 180;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return pts;
}

function earClip(poly: V2[]): [number, number, number][] {
  const pts = [...poly];
  if (area(pts) < 0) pts.reverse();
  const idx = pts.map((_, i) => i);
  const cross = (i: number, j: number, k: number) => {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[j];
    const [cx, cy] = pts[k];
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  };
  const sign = (p: V2, a: V2, b: V2) => (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
  const inside = (p: V2, a: V2, b: V2, c: V2) => {
    const b1 = sign(p, a, b) < 0;
    const b2 = sign(p, b, c) < 0;
    const b3 = sign(p, c, a) < 0;
    return b1 === b2 && b2 === b3;
  };
  const tris: [number, number, number][] = [];
  let guard = 0;
  while (idx.length > 3 && guard < 8000) {
    guard += 1;
    let clipped = false;
    const m = idx.length;
    for (let t = 0; t < m; t++) {
      const iPrev = idx[(t - 1 + m) % m];
      const i = idx[t];
      const iNext = idx[(t + 1) % m];
      if (cross(iPrev, i, iNext) <= 1e-9) continue;
      let ear = true;
      for (const j of idx) {
        if (j === iPrev || j === i || j === iNext) continue;
        if (inside(pts[j], pts[iPrev], pts[i], pts[iNext])) {
          ear = false;
          break;
        }
      }
      if (ear) {
        tris.push([iPrev, i, iNext]);
        idx.splice(t, 1);
        clipped = true;
        break;
      }
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

export function extrude(polyIn: V2[], z0: number, z1: number) {
  const poly = ensureCcw(polyIn);
  const m = new Mesh();
  const faces = earClip(poly);
  for (const [i, j, k] of faces) {
    m.add([poly[i][0], poly[i][1], z0], [poly[k][0], poly[k][1], z0], [poly[j][0], poly[j][1], z0]);
    m.add([poly[i][0], poly[i][1], z1], [poly[j][0], poly[j][1], z1], [poly[k][0], poly[k][1], z1]);
  }
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    m.add([x1, y1, z0], [x2, y2, z0], [x2, y2, z1]);
    m.add([x1, y1, z0], [x2, y2, z1], [x1, y1, z1]);
  }
  return m;
}

function rayHitPoly(ox: number, oy: number, dx: number, dy: number, poly: V2[]): V2 | null {
  let bestT = 1e18;
  let hit: V2 | null = null;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax;
    const ey = by - ay;
    const det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-12) continue;
    const tx = ax - ox;
    const ty = ay - oy;
    const t = (tx * ey - ty * ex) / det;
    const u = (tx * dy - ty * dx) / det;
    if (t > 1e-8 && u >= -1e-6 && u <= 1 + 1e-6 && t < bestT) {
      bestT = t;
      hit = [ox + t * dx, oy + t * dy];
    }
  }
  return hit;
}

function extrudeMatchedRing(outerPts: V2[], innerPts: V2[], z0: number, z1: number) {
  const n = innerPts.length;
  const m = new Mesh();
  const cap = (z: number, flip: boolean) => {
    for (let s = 0; s < n; s++) {
      const [o1, i1] = [outerPts[s], innerPts[s]];
      const [o2, i2] = [outerPts[(s + 1) % n], innerPts[(s + 1) % n]];
      if (flip) {
        m.add([o1[0], o1[1], z], [i1[0], i1[1], z], [o2[0], o2[1], z]);
        m.add([o2[0], o2[1], z], [i1[0], i1[1], z], [i2[0], i2[1], z]);
      } else {
        m.add([o1[0], o1[1], z], [o2[0], o2[1], z], [i1[0], i1[1], z]);
        m.add([o2[0], o2[1], z], [i2[0], i2[1], z], [i1[0], i1[1], z]);
      }
    }
  };
  cap(z0, true);
  cap(z1, false);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = outerPts[i];
    const [x2, y2] = outerPts[(i + 1) % n];
    m.add([x1, y1, z0], [x2, y2, z0], [x2, y2, z1]);
    m.add([x1, y1, z0], [x2, y2, z1], [x1, y1, z1]);
    const [ix1, iy1] = innerPts[i];
    const [ix2, iy2] = innerPts[(i + 1) % n];
    m.add([ix1, iy1, z0], [ix1, iy1, z1], [ix2, iy2, z1]);
    m.add([ix1, iy1, z0], [ix2, iy2, z1], [ix2, iy2, z0]);
  }
  return m;
}

function extrudePlateHole(outerIn: V2[], holeIn: V2[], z0: number, z1: number) {
  const outer = ensureCcw(outerIn);
  const hole = ensureCcw(holeIn);
  const cx = hole.reduce((s, p) => s + p[0], 0) / hole.length;
  const cy = hole.reduce((s, p) => s + p[1], 0) / hole.length;
  const hits: V2[] = hole.map(([x, y]) => rayHitPoly(cx, cy, x - cx, y - cy, outer) ?? [x, y]);
  return extrudeMatchedRing(hits, hole, z0, z1);
}

function extrudeRing(outerIn: V2[], innerIn: V2[], z0: number, z1: number) {
  const outer = ensureCcw(outerIn);
  const inner = ensureCcw(innerIn);
  const n = Math.max(outer.length, inner.length);
  const sample = (poly: V2[], i: number): V2 => poly[Math.floor((i * poly.length) / n) % poly.length];
  const outerPts = Array.from({ length: n }, (_, i) => sample(outer, i));
  const innerPts = Array.from({ length: n }, (_, i) => sample(inner, i));
  return extrudeMatchedRing(outerPts, innerPts, z0, z1);
}

export function shifted(mesh: Mesh, dx: number, dy: number, dz = 0) {
  const out = new Mesh();
  for (const [a, b, c] of mesh.tris) {
    out.add(
      [a[0] + dx, a[1] + dy, a[2] + dz],
      [b[0] + dx, b[1] + dy, b[2] + dz],
      [c[0] + dx, c[1] + dy, c[2] + dz],
    );
  }
  return out;
}

export function textPixels(text: string): [number, number][] {
  const pixels: [number, number][] = [];
  let x = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = PIXEL_FONT[ch] ?? PIXEL_FONT[" "];
    glyph.forEach((line, row) => {
      [...line].forEach((bit, col) => {
        if (bit === "1") pixels.push([x + col, 6 - row]);
      });
    });
    x += 6;
  }
  return pixels;
}

export function textMesh(text: string, pixel: number, height: number, z0: number, advance = 6) {
  const pixels: [number, number][] = [];
  let x = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = PIXEL_FONT[ch] ?? PIXEL_FONT[" "];
    glyph.forEach((line, row) => {
      [...line].forEach((bit, col) => {
        if (bit === "1") pixels.push([x + col, 6 - row]);
      });
    });
    x += advance;
  }
  if (!pixels.length) return new Mesh();
  const xs = pixels.map((p) => p[0]);
  const ys = pixels.map((p) => p[1]);
  const w = (Math.max(...xs) + 1) * pixel;
  const h = (Math.max(...ys) + 1) * pixel;
  const ox = -w / 2;
  const oy = -h / 2;
  const m = new Mesh();
  for (const [col, row] of pixels) {
    const x0 = ox + col * pixel;
    const y0 = oy + row * pixel;
    m.extend(extrude(rectangle(pixel * 0.92, pixel * 0.92, x0 + pixel / 2, y0 + pixel / 2), z0, z0 + height));
  }
  return m;
}

function plaqueOutline() {
  return roundedRect(ATRIL.FACE_W, ATRIL.FACE_H, ATRIL.FACE_R).map(
    ([x, y]) => [x, y + ATRIL.FOOT_Y + ATRIL.FACE_H / 2] as V2,
  );
}

export function atrilBody(opts?: { shopView?: boolean }) {
  const outer = plaqueOutline();
  const m = new Mesh();
  if (opts?.shopView) {
    m.extend(extrude(outer, 0, ATRIL.FACE_T));
  } else {
    const well = circle(0, ATRIL.NFC_Y, ATRIL.WELL_D / 2, 56);
    const seat = circle(0, ATRIL.NFC_Y, ATRIL.SEAT_D / 2, 48);
    m.extend(extrude(outer, 0, ATRIL.Z_FLOOR));
    m.extend(extrudePlateHole(outer, seat, ATRIL.Z_FLOOR, ATRIL.Z_GUIDE));
    m.extend(extrudePlateHole(outer, well, ATRIL.Z_GUIDE, ATRIL.Z_PAUSE));
    m.extend(extrude(outer, ATRIL.Z_PAUSE, ATRIL.FACE_T));
  }
  m.extend(
    shifted(extrude(roundedRect(ATRIL.FOOT_W, ATRIL.FOOT_Y + 2.4, 2.2, 8), 0, ATRIL.FOOT_Z), 0, ATRIL.FOOT_Y / 2 + 0.15),
  );
  return m;
}

export type AtrilAccentInput = {
  kind?: "generica" | "personalizada" | "unica";
  logoMask?: string;
  line1?: string;
  /** Cara lisa en la tienda: el hueco NFC no se enseña al cliente. */
  shopView?: boolean;
};

function logoMesh(mask: string, z0: number, z1: number) {
  const bits = mask.replace(/[^01]/g, "");
  const n = Math.floor(Math.sqrt(bits.length));
  const m = new Mesh();
  if (n < 8) return m;
  const cell = (ATRIL.MARK_R * 2) / n;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (bits[row * n + col] !== "1") continue;
      const x = (col - n / 2 + 0.5) * cell;
      const y = (n / 2 - row - 0.5) * cell + ATRIL.MARK_Y;
      m.extend(extrude(rectangle(cell * 0.95, cell * 0.95, x, y), z0, z1));
    }
  }
  return m;
}

function nfcMira() {
  const cx = 0;
  const cy = ATRIL.NFC_Y;
  const m = new Mesh();
  m.extend(extrude(circle(cx, cy, ATRIL.PAD_D / 2, 48), ATRIL.Z_FLOOR, ATRIL.Z_FLOOR + ATRIL.PAD_H));
  m.extend(
    extrudeRing(
      circle(cx, cy, ATRIL.WELL_D / 2 - 0.2, 48),
      circle(cx, cy, ATRIL.SEAT_D / 2 + 0.2, 40),
      ATRIL.Z_GUIDE,
      ATRIL.Z_GUIDE + ATRIL.RING_H,
    ),
  );
  return m;
}

export function atrilAccent(input: AtrilAccentInput = {}): Mesh {
  const m = new Mesh();
  if (!input.shopView) {
    m.extend(nfcMira());
  }
  const z0 = ATRIL.FACE_T;
  const z1 = ATRIL.FACE_T + ATRIL.RELIEF;
  for (const [x, y, r] of starLayout()) {
    m.extend(extrude(starPoly(x, y, r), z0, z1 + 0.12));
  }
  const generic = input.kind !== "personalizada";
  if (generic) {
    m.extend(extrude(googleGPoly(0, ATRIL.MARK_Y, ATRIL.MARK_R * 2, true), z0, z1 + 0.08));
  } else if (input.logoMask) {
    m.extend(logoMesh(input.logoMask, z0, z1));
  }
  const name = !generic ? printText(input.line1 || "").slice(0, 16) : "";
  const tapY = name ? ATRIL.TAP_Y + 1.2 : ATRIL.TAP_Y;
  m.extend(sansWord("TAP", 0, tapY, ATRIL.TAP_H, ATRIL.TAP_TRACK, z0, z1));
  if (name) {
    m.extend(sansWord(name, 0, ATRIL.NAME_Y, ATRIL.NAME_H, ATRIL.NAME_TRACK, z0, z1));
  }
  m.extend(sansWord("RESEÑA", 0, ATRIL.RESE_Y, ATRIL.RESE_H, ATRIL.RESE_TRACK, z0, z1));
  m.extend(sansWord("NFCTAP.TECH", 0, ATRIL.FOOT_Y / 2 + 0.15, 3.4, 1.15, ATRIL.FOOT_Z, ATRIL.FOOT_Z + 0.7));
  return m;
}

export function buildAtrilMeshes(input: AtrilAccentInput = {}) {
  return { cuerpo: atrilBody({ shopView: input.shopView }), acento: atrilAccent(input) };
}
