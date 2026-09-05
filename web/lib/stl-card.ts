import { pauseLayer, type PrintSpec } from "./print-spec";

type V2 = [number, number];
type V3 = [number, number, number];
type Tri = [V3, V3, V3];

const FONT: Record<string, string[]> = {
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

class Mesh {
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

function ensureCw(poly: V2[]) {
  return area(poly) < 0 ? poly : [...poly].reverse();
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
    const ang = ((-90 + i * 18) * Math.PI) / 180;
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

function extrude(polyIn: V2[], z0: number, z1: number) {
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

function extrudeRing(outerIn: V2[], innerIn: V2[], z0: number, z1: number) {
  const outer = ensureCcw(outerIn);
  const inner = ensureCw(innerIn);
  const m = new Mesh();
  const steps = Math.max(outer.length, inner.length);
  const ring: [V2, V2][] = [];
  for (let s = 0; s < steps; s++) {
    ring.push([outer[Math.floor((s * outer.length) / steps) % outer.length], inner[Math.floor((s * inner.length) / steps) % inner.length]]);
  }
  const cap = (z: number, flip: boolean) => {
    for (let s = 0; s < steps; s++) {
      const [o1, i1] = ring[s];
      const [o2, i2] = ring[(s + 1) % steps];
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
  for (let i = 0; i < outer.length; i++) {
    const [x1, y1] = outer[i];
    const [x2, y2] = outer[(i + 1) % outer.length];
    m.add([x1, y1, z0], [x2, y2, z0], [x2, y2, z1]);
    m.add([x1, y1, z0], [x2, y2, z1], [x1, y1, z1]);
  }
  for (let i = 0; i < inner.length; i++) {
    const [x1, y1] = inner[i];
    const [x2, y2] = inner[(i + 1) % inner.length];
    m.add([x1, y1, z0], [x1, y1, z1], [x2, y2, z1]);
    m.add([x1, y1, z0], [x2, y2, z1], [x2, y2, z0]);
  }
  return m;
}

function shifted(mesh: Mesh, dx: number, dy: number, dz = 0) {
  const out = new Mesh();
  for (const [a, b, c] of mesh.tris) {
    out.add([a[0] + dx, a[1] + dy, a[2] + dz], [b[0] + dx, b[1] + dy, b[2] + dz], [c[0] + dx, c[1] + dy, c[2] + dz]);
  }
  return out;
}

function textMesh(text: string, pixel: number, height: number, z0: number) {
  const pixels: [number, number][] = [];
  let x = 0;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[" "];
    glyph.forEach((line, row) => {
      [...line].forEach((bit, col) => {
        if (bit === "1") pixels.push([x + col, 6 - row]);
      });
    });
    x += 6;
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

function body(spec: PrintSpec) {
  const { ancho: w, alto: h, grosor: t, radio: r, nfc_desde_base: zFloor } = spec;
  const zCeil = zFloor + 0.8;
  const outer = roundedRect(w, h, r);
  const hole = rectangle(47.4, 17.4);
  const m = new Mesh();
  m.extend(extrude(outer, 0, zFloor));
  m.extend(extrudeRing(outer, hole, zFloor, zCeil));
  m.extend(extrude(outer, zCeil, t));
  return m;
}

function stars(spec: PrintSpec) {
  const m = new Mesh();
  const y = spec.alto / 2 - 12;
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 11;
    m.extend(extrude(starPoly(x, y, 4.1), spec.grosor, spec.grosor + spec.relieve));
  }
  return m;
}

function texts(spec: PrintSpec) {
  const m = new Mesh();
  const t = spec.grosor;
  const rel = spec.relieve;
  m.extend(shifted(textMesh(spec.linea1.slice(0, 16), 1.05, rel, t), 0, -8));
  m.extend(shifted(textMesh(spec.linea2.slice(0, 22), 0.72, rel, t), 0, -22));
  return m;
}

function icon(spec: PrintSpec) {
  const t = spec.grosor;
  const rel = spec.relieve;
  const cy = 10;
  if (spec.logoMask && spec.logoMask.length >= 16) {
    const bits = spec.logoMask.replace(/[^01]/g, "");
    const n = Math.floor(Math.sqrt(bits.length));
    if (n >= 8) {
      const cell = 28 / n;
      const m = new Mesh();
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          if (bits[row * n + col] !== "1") continue;
          const x = (col - n / 2 + 0.5) * cell;
          const y = (n / 2 - row - 0.5) * cell + cy;
          m.extend(extrude(rectangle(cell * 0.95, cell * 0.95, x, y), t, t + rel));
        }
      }
      return m;
    }
  }
  const m = new Mesh();
  if (spec.kind === "generica") {
    m.extend(extrudeRing(circle(0, cy, 14, 40), circle(0, cy, 10.6, 40), t, t + rel));
    m.extend(shifted(textMesh("G", 2.1, rel, t), 0, cy));
  } else {
    m.extend(extrudeRing(circle(0, cy, 12, 36), circle(0, cy, 9.6, 36), t, t + rel));
    m.extend(extrude(starPoly(0, cy, 6.2), t, t + rel));
  }
  return m;
}

function stand(spec: PrintSpec) {
  const baseW = spec.ancho + 8;
  const baseD = 30;
  const baseH = 3.2;
  const wall = 3;
  const slot = spec.grosor + 0.5;
  const m = new Mesh();
  m.extend(extrude(roundedRect(baseW, baseD, 3), 0, baseH));
  const back = extrude(roundedRect(baseW, wall + slot + wall, 1.2), 0, spec.alto * 0.52);
  m.extend(shifted(back, 0, -baseD / 2 + (wall + slot + wall) / 2 + 2));
  const lip = extrude(rectangle(baseW - 4, wall), baseH, baseH + 8);
  m.extend(shifted(lip, 0, -baseD / 2 + wall / 2 + 2 + slot + wall));
  return m;
}

function toStl(mesh: Mesh, name: string) {
  const buf = Buffer.alloc(84 + mesh.tris.length * 50);
  buf.write(name.slice(0, 80));
  buf.writeUInt32LE(mesh.tris.length, 80);
  let o = 84;
  for (const [a, b, c] of mesh.tris) {
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const write = (v: number) => {
      buf.writeFloatLE(v, o);
      o += 4;
    };
    write(nx);
    write(ny);
    write(nz);
    for (const p of [a, b, c]) {
      write(p[0]);
      write(p[1]);
      write(p[2]);
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

export function buildCardStls(spec: PrintSpec) {
  return {
    "01_cuerpo.stl": toStl(body(spec), "cuerpo"),
    "02_estrellas.stl": toStl(stars(spec), "estrellas"),
    "03_texto.stl": toStl(texts(spec), "texto"),
    "04_icono.stl": toStl(icon(spec), "icono"),
    "05_soporte.stl": toStl(stand(spec), "soporte"),
  };
}

export function pauseNote(spec: PrintSpec) {
  const { z, layer } = pauseLayer(spec);
  return `Pausa de inserción NFC
======================
Pedido: ${spec.orderId}
Preset: ${spec.nfc}
Altura: ${z.toFixed(2)} mm
Capa (0.20 mm): ${layer}

En Orca-Flashforge:
1. Importa 01 a 05, selecciónalos y Ensamblar.
2. Asigna color según COLORES.txt
3. Vista previa → capa ${layer} → Añadir pausa.
4. Imprime. Al pausar, mete la tira NFC y reanuda.
5. Programa el chip con el enlace de NFC.txt
`;
}
