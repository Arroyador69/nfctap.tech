#!/usr/bin/env python3
"""Generador de tarjetas NFC para reseñas de Google.

Crea STL listos para Orca-Flashforge / AD5X:
  - Cuerpo con hueco interno para tira o moneda NFC
  - Estrellas e icono de reseña en otra pieza (segundo color)
  - Texto "TOCA" + "RESEÑA" en tercera pieza
  - Soporte de mesa opcional
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent / "stl"


# ---------------------------------------------------------------------------
# Geometría 2D / 3D
# ---------------------------------------------------------------------------

def rounded_rect(w: float, h: float, r: float, segs: int = 10) -> list[tuple[float, float]]:
    r = min(r, w / 2 - 0.01, h / 2 - 0.01)
    corners = (
        (w / 2 - r, h / 2 - r, 0.0),
        (-w / 2 + r, h / 2 - r, 90.0),
        (-w / 2 + r, -h / 2 + r, 180.0),
        (w / 2 - r, -h / 2 + r, 270.0),
    )
    pts: list[tuple[float, float]] = []
    for cx, cy, start in corners:
        for i in range(segs + 1):
            a = math.radians(start + 90.0 * i / segs)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def circle(cx: float, cy: float, r: float, segs: int = 48) -> list[tuple[float, float]]:
    return [
        (cx + r * math.cos(math.radians(i * 360 / segs)),
         cy + r * math.sin(math.radians(i * 360 / segs)))
        for i in range(segs)
    ]


def rectangle(w: float, h: float, cx: float = 0.0, cy: float = 0.0) -> list[tuple[float, float]]:
    return [
        (cx - w / 2, cy - h / 2),
        (cx + w / 2, cy - h / 2),
        (cx + w / 2, cy + h / 2),
        (cx - w / 2, cy + h / 2),
    ]


def star(cx: float, cy: float, r_out: float, r_in: float | None = None, n: int = 5) -> list[tuple[float, float]]:
    if r_in is None:
        r_in = r_out * 0.42
    pts = []
    for i in range(n * 2):
        ang = math.radians(-90 + i * 180 / n)
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def translate(pts: list[tuple[float, float]], dx: float, dy: float) -> list[tuple[float, float]]:
    return [(x + dx, y + dy) for x, y in pts]


def area(poly: list[tuple[float, float]]) -> float:
    a = 0.0
    for i, (x1, y1) in enumerate(poly):
        x2, y2 = poly[(i + 1) % len(poly)]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def ensure_ccw(poly: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return poly if area(poly) > 0 else list(reversed(poly))


def ensure_cw(poly: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return poly if area(poly) < 0 else list(reversed(poly))


def ear_clip(poly: list[tuple[float, float]]) -> list[tuple[int, int, int]]:
    """Triangula un polígono simple (sin agujeros)."""
    pts = list(poly)
    idx = list(range(len(pts)))
    if area(pts) < 0:
        idx.reverse()
        pts = [pts[i] for i in range(len(pts) - 1, -1, -1)]
        idx = list(range(len(pts)))

    def cross(i, j, k):
        ax, ay = pts[i]
        bx, by = pts[j]
        cx, cy = pts[k]
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

    def inside(p, a, b, c):
        def sign(p1, p2, p3):
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
        b1 = sign(p, a, b) < 0.0
        b2 = sign(p, b, c) < 0.0
        b3 = sign(p, c, a) < 0.0
        return b1 == b2 == b3

    tris = []
    guard = 0
    while len(idx) > 3 and guard < 10000:
        guard += 1
        clipped = False
        m = len(idx)
        for t in range(m):
            i_prev, i, i_next = idx[(t - 1) % m], idx[t], idx[(t + 1) % m]
            if cross(i_prev, i, i_next) <= 1e-9:
                continue
            ear = True
            for j in idx:
                if j in (i_prev, i, i_next):
                    continue
                if inside(pts[j], pts[i_prev], pts[i], pts[i_next]):
                    ear = False
                    break
            if ear:
                tris.append((i_prev, i, i_next))
                del idx[t]
                clipped = True
                break
        if not clipped:
            break
    if len(idx) == 3:
        tris.append((idx[0], idx[1], idx[2]))
    return tris


# ---------------------------------------------------------------------------
# Malla
# ---------------------------------------------------------------------------

class Mesh:
    def __init__(self) -> None:
        self.tris: list[tuple[tuple[float, float, float], ...]] = []

    def add(self, a, b, c) -> None:
        self.tris.append((a, b, c))

    def extend(self, other: "Mesh") -> None:
        self.tris.extend(other.tris)

    def _normal(self, a, b, c):
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx
        l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        return (nx / l, ny / l, nz / l)

    def write_stl(self, path: Path, name: str = "tarjeta") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as f:
            header = name.encode("ascii", "ignore")[:80]
            f.write(header + b"\0" * (80 - len(header)))
            f.write(struct.pack("<I", len(self.tris)))
            for a, b, c in self.tris:
                n = self._normal(a, b, c)
                f.write(struct.pack("<3f", *n))
                f.write(struct.pack("<3f", *a))
                f.write(struct.pack("<3f", *b))
                f.write(struct.pack("<3f", *c))
                f.write(struct.pack("<H", 0))
        print(f"  STL  {path.name:40s}  {len(self.tris):6d} triángulos")


def extrude(poly: list[tuple[float, float]], z0: float, z1: float) -> Mesh:
    """Extruye un polígono simple (sin agujeros) entre z0 y z1."""
    poly = ensure_ccw(poly)
    m = Mesh()
    n = len(poly)
    tris = ear_clip(poly)
    for i, j, k in tris:
        m.add((poly[i][0], poly[i][1], z0), (poly[k][0], poly[k][1], z0), (poly[j][0], poly[j][1], z0))
        m.add((poly[i][0], poly[i][1], z1), (poly[j][0], poly[j][1], z1), (poly[k][0], poly[k][1], z1))
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        m.add((x1, y1, z0), (x2, y2, z0), (x2, y2, z1))
        m.add((x1, y1, z0), (x2, y2, z1), (x1, y1, z1))
    return m


def extrude_ring(outer: list[tuple[float, float]], inner: list[tuple[float, float]], z0: float, z1: float) -> Mesh:
    """Pared entre un contorno exterior y un hueco interior."""
    outer = ensure_ccw(outer)
    inner = ensure_cw(inner)
    m = Mesh()

    def cap(z: float, flip: bool) -> None:
        # Abanico desde el centroide del hueco hacia el anillo: no es robusto
        # para formas cóncavas. Usamos puentes por índice proporcional.
        no, ni = len(outer), len(inner)
        steps = max(no, ni)
        ring = []
        for s in range(steps):
            o = outer[int(s * no / steps) % no]
            i = inner[int(s * ni / steps) % ni]
            ring.append((o, i))
        for s in range(steps):
            o1, i1 = ring[s]
            o2, i2 = ring[(s + 1) % steps]
            if flip:
                m.add((o1[0], o1[1], z), (i1[0], i1[1], z), (o2[0], o2[1], z))
                m.add((o2[0], o2[1], z), (i1[0], i1[1], z), (i2[0], i2[1], z))
            else:
                m.add((o1[0], o1[1], z), (o2[0], o2[1], z), (i1[0], i1[1], z))
                m.add((o2[0], o2[1], z), (i2[0], i2[1], z), (i1[0], i1[1], z))

    cap(z0, flip=True)
    cap(z1, flip=False)

    for i in range(len(outer)):
        x1, y1 = outer[i]
        x2, y2 = outer[(i + 1) % len(outer)]
        m.add((x1, y1, z0), (x2, y2, z0), (x2, y2, z1))
        m.add((x1, y1, z0), (x2, y2, z1), (x1, y1, z1))
    for i in range(len(inner)):
        x1, y1 = inner[i]
        x2, y2 = inner[(i + 1) % len(inner)]
        m.add((x1, y1, z0), (x1, y1, z1), (x2, y2, z1))
        m.add((x1, y1, z0), (x2, y2, z1), (x2, y2, z0))
    return m


# ---------------------------------------------------------------------------
# Fuente bitmap 5x7 (mayúsculas + dígitos + algunos signos)
# ---------------------------------------------------------------------------

FONT: dict[str, list[str]] = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00001", "00001", "00001", "10001", "10001", "01110"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01110", "10001", "10000", "01110", "00001", "10001", "01110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10001", "10101", "11011", "10001"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
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
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
}


def text_pixels(text: str, advance: int = 6) -> list[tuple[int, int]]:
    pixels = []
    x = 0
    for ch in text.upper():
        glyph = FONT.get(ch, FONT[" "])
        for row, line in enumerate(glyph):
            for col, bit in enumerate(line):
                if bit == "1":
                    pixels.append((x + col, 6 - row))
        x += advance
    return pixels


def text_width(text: str, pixel: float, advance: int = 6) -> float:
    pix = text_pixels(text, advance=advance)
    if not pix:
        return 0.0
    return (max(p[0] for p in pix) + 1) * pixel


def text_mesh(
    text: str,
    pixel: float,
    height: float,
    z0: float = 0.0,
    center: bool = True,
    advance: int = 6,
) -> Mesh:
    pix = text_pixels(text, advance=advance)
    if not pix:
        return Mesh()
    xs = [p[0] for p in pix]
    ys = [p[1] for p in pix]
    w = (max(xs) + 1) * pixel
    h = (max(ys) + 1) * pixel
    ox = -w / 2 if center else 0.0
    oy = -h / 2 if center else 0.0
    m = Mesh()
    for col, row in pix:
        x0 = ox + col * pixel
        y0 = oy + row * pixel
        m.extend(extrude(rectangle(pixel * 0.92, pixel * 0.92, x0 + pixel / 2, y0 + pixel / 2), z0, z0 + height))
    return m


def slanted_bar(x0: float, y0: float, x1: float, y1: float, sw: float) -> list[tuple[float, float]]:
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length * sw / 2, dx / length * sw / 2
    return [
        (x0 + nx, y0 + ny),
        (x1 + nx, y1 + ny),
        (x1 - nx, y1 - ny),
        (x0 - nx, y0 - ny),
    ]


def stroke_arc(cx: float, cy: float, r: float, a0: float, a1: float, sw: float, segs: int = 22) -> list[tuple[float, float]]:
    outer, inner = r + sw / 2, max(0.15, r - sw / 2)
    pts: list[tuple[float, float]] = []
    for i in range(segs + 1):
        a = math.radians(a0 + (a1 - a0) * i / segs)
        pts.append((cx + outer * math.cos(a), cy + outer * math.sin(a)))
    for i in range(segs + 1):
        a = math.radians(a1 + (a0 - a1) * i / segs)
        pts.append((cx + inner * math.cos(a), cy + inner * math.sin(a)))
    return pts


def wordmark_nfctap(cx: float, cy: float, h: float, sw: float, gap: float, z0: float, z1: float) -> Mesh:
    """NFCTAP geométrico, tracking amplio. Origen de cada letra = esquina inf. izq."""
    def vert(x, y0, y1):
        return rectangle(sw, y1 - y0, x, (y0 + y1) / 2)

    def horz(x0, x1, y):
        return rectangle(x1 - x0, sw, (x0 + x1) / 2, y)

    def letter_n(w):
        return [vert(sw / 2, 0, h), vert(w - sw / 2, 0, h), slanted_bar(sw, h - sw * 0.35, w - sw, sw * 0.35, sw)]

    def letter_f(w):
        return [vert(sw / 2, 0, h), horz(0, w, h - sw / 2), horz(0, w * 0.72, h * 0.56)]

    def letter_c(w):
        return [stroke_arc(w / 2, h / 2, h / 2 - sw / 2, 48, 312, sw)]

    def letter_t(w):
        return [horz(0, w, h - sw / 2), vert(w / 2, 0, h - sw)]

    def letter_a(w):
        return [
            slanted_bar(sw * 0.15, sw * 0.1, w / 2, h - sw * 0.1, sw),
            slanted_bar(w - sw * 0.15, sw * 0.1, w / 2, h - sw * 0.1, sw),
            horz(w * 0.22, w * 0.78, h * 0.34),
        ]

    def letter_p(w):
        return [
            vert(sw / 2, 0, h),
            horz(0, w - sw * 0.2, h - sw / 2),
            horz(0, w - sw * 0.2, h * 0.50),
            vert(w - sw / 2, h * 0.50, h),
        ]

    specs = [
        (5.35, letter_n),
        (4.55, letter_f),
        (5.05, letter_c),
        (4.95, letter_t),
        (5.55, letter_a),
        (4.55, letter_p),
    ]
    scale = h / 6.4
    widths = [w * scale for w, _ in specs]
    total = sum(widths) + gap * (len(specs) - 1)
    x = cx - total / 2
    y = cy - h / 2
    m = Mesh()
    for width, (_raw, builder) in zip(widths, specs):
        for poly in builder(width):
            m.extend(extrude([(px + x, py + y) for px, py in poly], z0, z1))
        x += width + gap
    return m


def gold_dot(cx: float, cy: float, r: float, z0: float, z1: float) -> Mesh:
    return extrude(circle(cx, cy, r, 28), z0, z1)


# ---------------------------------------------------------------------------
# Tarjeta
# ---------------------------------------------------------------------------

# Stock actual: Timeskey Amazon B08LD99GZT — pegatina PET NTAG215 Ø25 × ~0,2 mm.
# moneda_25 deja ~1,7 mm por lado (Ø28 + extra_clear 0,4 → hueco ~Ø28,4) para meterla
# a mano en la pausa sin que roce. Los presets de tira se quedan por si compras otras.
PRESETS_NFC = {
    "tira_45x15": {"kind": "rect", "w": 47.0, "h": 17.0, "t": 0.80},
    "tira_40x20": {"kind": "rect", "w": 42.0, "h": 22.0, "t": 0.80},
    "tira_35x15": {"kind": "rect", "w": 37.0, "h": 17.0, "t": 0.80},
    "moneda_25": {"kind": "circle", "d": 28.0, "t": 0.80},
    "moneda_30": {"kind": "circle", "d": 31.5, "t": 1.00},
}


def nfc_hole(preset: dict, extra_clear: float = 0.4) -> list[tuple[float, float]]:
    if preset["kind"] == "circle":
        return circle(0.0, 0.0, preset["d"] / 2 + extra_clear / 2)
    return rectangle(preset["w"] + extra_clear, preset["h"] + extra_clear)


def half_rounded_rect(w: float, h: float, r: float, side: str, overlap: float = 0.25, segs: int = 10) -> list[tuple[float, float]]:
    """Mitad izquierda o derecha de la tarjeta, con un poco de solape en el centro."""
    r = min(r, w / 2 - 0.01, h / 2 - 0.01)
    if side == "left":
        pts: list[tuple[float, float]] = [(overlap, h / 2), (-w / 2 + r, h / 2)]
        cx, cy = -w / 2 + r, h / 2 - r
        for i in range(segs + 1):
            a = math.radians(90 + 90 * i / segs)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        cx, cy = -w / 2 + r, -h / 2 + r
        for i in range(1, segs + 1):
            a = math.radians(180 + 90 * i / segs)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        pts.append((overlap, -h / 2))
        return pts
    pts = [(-overlap, -h / 2), (w / 2 - r, -h / 2)]
    cx, cy = w / 2 - r, -h / 2 + r
    for i in range(segs + 1):
        a = math.radians(-90 + 90 * i / segs)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    cx, cy = w / 2 - r, h / 2 - r
    for i in range(1, segs + 1):
        a = math.radians(0 + 90 * i / segs)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    pts.append((-overlap, h / 2))
    return pts


def _closest_pair(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> tuple[int, int]:
    best, ia, ib = 1e18, 0, 0
    for i, (x1, y1) in enumerate(a):
        for j, (x2, y2) in enumerate(b):
            d = (x1 - x2) ** 2 + (y1 - y2) ** 2
            if d < best:
                best, ia, ib = d, i, j
    return ia, ib


def polygon_with_holes(
    outer: list[tuple[float, float]],
    holes: list[list[tuple[float, float]]],
) -> list[tuple[float, float]]:
    """Un polígono con puentes a cada hueco, para extruir sin CSG."""
    poly = ensure_ccw(list(outer))
    for hole in holes:
        hole = ensure_cw(list(hole))
        oi, hi = _closest_pair(poly, hole)
        loop = hole[hi:] + hole[:hi] + [hole[hi]]
        poly = poly[: oi + 1] + loop + [poly[oi]] + poly[oi + 1 :]
    return poly


def dual_nfc_centers(cfg: dict, hole_r: float) -> tuple[float, float]:
    w = cfg["ancho"]
    margin = 7.2
    left = -w / 2 + margin + hole_r
    right = w / 2 - margin - hole_r
    return left, right


def card_body(cfg: dict) -> Mesh:
    w, h, t = cfg["ancho"], cfg["alto"], cfg["grosor"]
    r = cfg["radio"]
    nfc = PRESETS_NFC[cfg["nfc"]]
    z_floor = cfg["nfc_desde_base"]
    z_ceil = z_floor + nfc["t"]
    if z_ceil + 0.8 > t:
        raise SystemExit("El grosor de la tarjeta es demasiado bajo para ese NFC. Sube grosor o baja nfc_desde_base.")

    outer = rounded_rect(w, h, r)
    hole = nfc_hole(nfc)
    body = Mesh()
    gap = 0.002
    body.extend(extrude(outer, 0.0, z_floor - gap))

    if cfg.get("nfc_dual"):
        hole_r = nfc["d"] / 2 + 0.2
        cx_l, cx_r = dual_nfc_centers(cfg, hole_r)
        mid = polygon_with_holes(outer, [translate(hole, cx_l, 0.0), translate(hole, cx_r, 0.0)])
        body.extend(extrude(mid, z_floor, z_ceil))
    else:
        body.extend(extrude(polygon_with_holes(outer, [hole]), z_floor, z_ceil))

    body.extend(extrude(outer, z_ceil + gap, t))
    return body


def card_stars(cfg: dict) -> Mesh:
    """Cinco estrellas en la cara superior (se imprimen como color 2)."""
    t = cfg["grosor"]
    relief = cfg["relieve"]
    n = 5
    vertical = cfg["alto"] > cfg["ancho"]
    gap = 11.0 if vertical else 9.0
    y = cfg["alto"] / 2 - (12.0 if vertical else 10.0)
    m = Mesh()
    for i in range(n):
        x = (i - (n - 1) / 2) * gap
        m.extend(extrude(star(x, y, 4.1 if vertical else 3.6), t, t + relief))
    return m


def card_icon(cfg: dict) -> Mesh:
    """Logo en relieve, G de reseña, o badge."""
    t = cfg["grosor"]
    relief = cfg["relieve"]
    vertical = cfg["alto"] > cfg["ancho"]
    cy = 10.0 if vertical else 0.0
    cx = 0.0 if vertical else -cfg["ancho"] / 2 + 14.0
    mask = "".join(ch for ch in str(cfg.get("logoMask") or "") if ch in "01")
    n = int(len(mask) ** 0.5)
    if n >= 8:
        cell = 28.0 / n
        m = Mesh()
        for row in range(n):
            for col in range(n):
                if mask[row * n + col] != "1":
                    continue
                x = (col - n / 2 + 0.5) * cell + cx
                y = (n / 2 - row - 0.5) * cell + cy
                m.extend(extrude(rectangle(cell * 0.95, cell * 0.95, x, y), t, t + relief))
        return m
    m = Mesh()
    if cfg.get("kind") == "generica":
        m.extend(extrude_ring(circle(cx, cy, 14.0, 40), circle(cx, cy, 10.6, 40), t, t + relief))
        m.extend(shifted(text_mesh("G", pixel=2.1, height=relief, z0=t), cx, cy))
        return m
    m.extend(extrude_ring(circle(cx, cy, 8.2 if not vertical else 12.0, 36), circle(cx, cy, 6.6 if not vertical else 9.6, 36), t, t + relief))
    m.extend(extrude(star(cx, cy, 4.4 if not vertical else 6.2), t, t + relief))
    return m


def card_gold_cartera(cfg: dict) -> Mesh:
    """Cara slim: wordmark centrado, punto + WA/WEB a los lados, firma abajo."""
    t = cfg["grosor"]
    relief = cfg["relieve"]
    mark = cfg.get("relieve_marca", relief + 0.20)
    z1 = t + relief
    m = Mesh()
    m.extend(wordmark_nfctap(0.0, 7.4, h=8.2, sw=0.96, gap=2.45, z0=t, z1=t + mark))
    side_y = -5.2
    dot_r = 0.80
    gap = 1.70
    pixel, adv = 0.46, 7
    wa_w = text_width("WA", pixel, adv)
    web_w = text_width("WEB", pixel, adv)
    left_dot = -36.8
    right_dot = 36.8
    wa_cx = left_dot + dot_r + gap + wa_w / 2
    web_cx = right_dot - dot_r - gap - web_w / 2
    m.extend(gold_dot(left_dot, side_y, dot_r, t, z1))
    m.extend(shifted(text_mesh("WA", pixel=pixel, height=relief, z0=t, advance=adv), wa_cx, side_y))
    m.extend(shifted(text_mesh("WEB", pixel=pixel, height=relief, z0=t, advance=adv), web_cx, side_y))
    m.extend(gold_dot(right_dot, side_y, dot_r, t, z1))
    firma = cfg.get("firma", "DEVELOPED BY NFCTAP.TECH")
    m.extend(shifted(text_mesh(firma, pixel=0.40, height=relief, z0=t, advance=7), 0.0, -21.6))
    # Ancla en z=0: Flash Studio pega el STL a la cama; sin esto el oro cae al suelo.
    m.extend(extrude(rectangle(1.6, 1.6, 0.0, cfg["alto"] / 2 + 4.2), 0.0, 0.20))
    return m


def write_cartera_preview(dest: Path) -> None:
    dest.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F0D78A"/>
      <stop offset="45%" stop-color="#C9A227"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
    <filter id="emboss">
      <feDropShadow dx="0" dy="1" stdDeviation="0.5" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="856" height="540" rx="32" fill="#111111"/>
  <text x="428" y="248" text-anchor="middle" fill="url(#gold)" font-family="Helvetica Neue, Arial, sans-serif" font-size="56" letter-spacing="18" font-weight="500" filter="url(#emboss)">NFCTAP</text>
  <circle cx="62" cy="348" r="8" fill="url(#gold)"/>
  <text x="92" y="354" fill="url(#gold)" font-family="Helvetica Neue, Arial, sans-serif" font-size="14" letter-spacing="6">WA</text>
  <text x="764" y="354" text-anchor="end" fill="url(#gold)" font-family="Helvetica Neue, Arial, sans-serif" font-size="14" letter-spacing="6">WEB</text>
  <circle cx="794" cy="348" r="8" fill="url(#gold)"/>
  <text x="428" y="492" text-anchor="middle" fill="url(#gold)" font-family="Helvetica Neue, Arial, sans-serif" font-size="12" letter-spacing="3.4" filter="url(#emboss)">DEVELOPED BY NFCTAP.TECH</text>
</svg>
""",
        encoding="utf-8",
    )


def card_text(cfg: dict) -> Mesh:
    t = cfg["grosor"]
    relief = cfg["relieve"]
    m = Mesh()
    if cfg["alto"] > cfg["ancho"]:
        m.extend(shifted(text_mesh(cfg.get("linea1", "TOCA PARA")[:16], pixel=1.05, height=relief, z0=t), 0.0, -8.0))
        m.extend(shifted(text_mesh(cfg.get("linea2", "DEJAR TU RESENA")[:22], pixel=0.72, height=relief, z0=t), 0.0, -22.0))
        return m
    m.extend(shifted(text_mesh(cfg.get("linea1", "TOCA PARA"), pixel=1.05, height=relief, z0=t), 6.0, 4.5))
    m.extend(shifted(text_mesh(cfg.get("linea2", "RESENA"), pixel=1.35, height=relief, z0=t), 6.0, -6.5))
    return m


def shifted(mesh: Mesh, dx: float, dy: float, dz: float = 0.0) -> Mesh:
    out = Mesh()
    for a, b, c in mesh.tris:
        out.add((a[0] + dx, a[1] + dy, a[2] + dz),
                (b[0] + dx, b[1] + dy, b[2] + dz),
                (c[0] + dx, c[1] + dy, c[2] + dz))
    return out


def stand(cfg: dict) -> Mesh:
    """Soporte tipo atril. La tarjeta se desliza por una ranura."""
    card_w, card_h, card_t = cfg["ancho"], cfg["alto"], cfg["grosor"]
    base_w = card_w + 8.0
    base_d = 28.0
    base_h = 3.0
    wall = 3.0
    slot = card_t + 0.5
    back_h = card_h * 0.55
    tilt = 18.0

    m = Mesh()
    m.extend(extrude(rounded_rect(base_w, base_d, 3.0), 0.0, base_h))

    # Pared trasera inclinada: la aproximamos con un bloque vertical + labio
    back = rounded_rect(base_w, wall + slot + wall, 1.2)
    back_mesh = extrude(back, 0.0, back_h)
    # Empujar la pared hacia atrás de la base
    back_mesh = shifted(back_mesh, 0.0, -base_d / 2 + (wall + slot + wall) / 2 + 2.0)
    m.extend(back_mesh)

    # Labios de la ranura (dos paredes finas)
    lip = rectangle(base_w - 4.0, wall, 0.0, 0.0)
    front_lip = extrude(lip, base_h, base_h + 8.0)
    m.extend(shifted(front_lip, 0.0, -base_d / 2 + wall / 2 + 2.0 + slot + wall))
    return m


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

CARTERA_LEEME = """Tu primera tarjeta NFCTap (cartera slim, 2 NFC)
================================================

Que es
------
Tarjeta de cartera 85,6 x 54 x 3,4 mm. Cuerpo negro. Relieve oro:
NFCTAP grande al centro (relieve 0,60 mm, un pelo mas alto),
punto + WA / WEB a los lados (0,40 mm) y firma abajo.
Dos huecos INTERNOS (no se ven) para Timeskey NTAG215 Ø25 mm.
Izquierda = WhatsApp. Derecha = https://nfctap.tech
La pausa a mitad de impresion esta calculada: capa 10 (2,00 mm).
El NFC se lee bien a traves de ~1,4 mm de PLA (sin carbono ni metal).

NO uses la web nfctap.tech/personalizar para esta pieza
(esa web hace el atril de reseñas, otro formato).

Colores (2 bobinas, lo mas facil para empezar)
----------------------------------------------
Canal A: PLA mate negro  -> 01_cuerpo.stl
Canal B: PLA silk/mate oro -> 02_oro.stl
El blanco y el rojo los guardas para el siguiente pedido.

Antes de imprimir (AD5X)
------------------------
1. Cama PEI limpia (agua + jabon, seca).
2. Carga negro y oro en el IFS.
3. Abre Flash Studio Desktop y elige impresora AD5X.
4. Archivo -> Importar -> 01_cuerpo.stl y 02_oro.stl (los dos).
   El oro ya lleva un ancla en la cama para que las letras queden arriba.
5. Clic cuerpo, Mayus+clic oro -> clic derecho -> Ensamblar.
6. Cuerpo = negro. Oro = silk/oro. El cuadradito de ancla se imprime
   fuera de la tarjeta: lo rompes al acabar.
7. Ajustes: capa 0.20 mm, 3 perimetros, relleno 15% gyroid,
   paredes Arachne, PLA ~210/60 C (mira el carrete).
8. Rebana. Vista previa -> slider a la CAPA 10 (2.00 mm).
9. Clic derecho en esa capa -> Anadir pausa.
10. Enable IFS, mapea canales, envia a la AD5X.

Cuando pause
------------
No apagues. Coloca las dos pegatinas en los huecos,
planas, adhesivo HACIA ABAJO (hacia la cama).
Izquierda WA, derecha WEB. Pulsa Reanudar.
El plastico de encima son ~1,4 mm de PLA: el movil
lee el chip sin problema. No uses filamento de carbono.

Programar (app NFC Tap Config en TestFlight)
--------------------------------------------
1. IZQUIERDA: WhatsApp -> 34 + tu numero + mensaje
   (ej. Hola, soy Alberto de NFCTap).
2. DERECHA: Cualquier enlace -> https://nfctap.tech
3. Comprueba con otro movil, no con el que grabas.

Si falla la primera
-------------------
Normal. Mira la primera capa: si no pega, lava la cama.
Si el hueco queda pequeno, la pegatina entra igual con
un poco de cuidado. Si el texto oro se ve flojo, sube
relieve a 0.5 y regenera.
"""


DEFAULTS = {
    "nombre": "demo-restaurante",
    "ancho": 86.0,
    "alto": 54.0,
    "grosor": 3.6,
    "radio": 4.0,
    "nfc": "moneda_25",
    "nfc_desde_base": 1.20,
    "relieve": 0.40,
    "colores": {
        "cuerpo": "negro",
        "estrellas": "amarillo-oro",
        "texto": "blanco",
        "icono": "blanco",
    },
}


def write_pause_note(cfg: dict, path: Path) -> None:
    nfc = PRESETS_NFC[cfg["nfc"]]
    z_pause = cfg["nfc_desde_base"] + nfc["t"]
    layer = round(z_pause / 0.20)
    dual = "dos pegatinas (izquierda WA, derecha WEB)" if cfg.get("nfc_dual") else "la pegatina NFC (Ø25 mm) plana y centrada"
    path.write_text(
        (
            f"Pausa de inserción NFC\n"
            f"======================\n"
            f"Preset NFC: {cfg['nfc']}\n"
            f"Altura de pausa: {z_pause:.2f} mm\n"
            f"Capa (a 0.20 mm): {layer}\n\n"
            f"En Orca-Flashforge:\n"
            f"1. Rebana la placa.\n"
            f"2. Pestaña Vista previa.\n"
            f"3. Slider derecho -> capa {layer} (acaba el hueco).\n"
            f"4. Clic derecho -> Añadir pausa.\n"
            f"5. Vuelve a rebanar y envía a la AD5X.\n"
            f"6. Cuando pause, coloca {dual},\n"
            f"   adhesivo hacia abajo, y pulsa Reanudar.\n"
        ),
        encoding="utf-8",
    )


def generate(cfg: dict) -> None:
    name = cfg["nombre"]
    dest = OUT / name
    dest.mkdir(parents=True, exist_ok=True)

    print(f"\nGenerando '{name}'  ({cfg['ancho']}x{cfg['alto']}x{cfg['grosor']} mm, NFC={cfg['nfc']})")
    body = card_body(cfg)
    body.write_stl(dest / "01_cuerpo.stl", "cuerpo")
    if cfg.get("nfc_dual"):
        gold = card_gold_cartera(cfg)
        gold.write_stl(dest / "02_oro.stl", "oro")
        (dest / "NFC.txt").write_text(
            (
                "Dos pegatinas Timeskey Ø25 mm en la misma tarjeta.\n\n"
                "IZQUIERDA (WA) — WhatsApp, en NFC Tap Config:\n"
                "  Plantilla WhatsApp → prefijo 34 → tu número → mensaje\n"
                "  Ejemplo de mensaje: Hola, soy Alberto de NFCTap.\n\n"
                "DERECHA (WEB):\n"
                "  Cualquier enlace → https://nfctap.tech\n"
            ),
            encoding="utf-8",
        )
        (dest / "LEEME_PRIMERA_IMPRESION.txt").write_text(CARTERA_LEEME, encoding="utf-8")
        write_cartera_preview(dest / "vista-previa.svg")
    else:
        card_stars(cfg).write_stl(dest / "02_estrellas.stl", "estrellas")
        card_text(cfg).write_stl(dest / "03_texto.stl", "texto")
        card_icon(cfg).write_stl(dest / "04_icono.stl", "icono")
        stand(cfg).write_stl(dest / "05_soporte.stl", "soporte")
        if cfg.get("googleUrl"):
            (dest / "NFC.txt").write_text(
                f"URL a grabar (NFC Tools → URL):\n{cfg['googleUrl']}\n",
                encoding="utf-8",
            )
    write_pause_note(cfg, dest / "PAUSA_NFC.txt")
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  -> {dest}")


def main() -> None:
    import argparse

    p = argparse.ArgumentParser(description="Genera STL de tarjetas NFC para reseñas.")
    p.add_argument("--nombre", help="Nombre del cliente / carpeta de salida")
    p.add_argument("--pedido", help="pedido.json bajado del dashboard (mismo modelo que el editor)")
    p.add_argument("--linea1", default="TOCA PARA")
    p.add_argument("--linea2", default="RESENA")
    p.add_argument("--nfc", default="moneda_25", choices=sorted(PRESETS_NFC))
    p.add_argument("--ancho", type=float)
    p.add_argument("--alto", type=float)
    p.add_argument("--grosor", type=float)
    p.add_argument("--todas", action="store_true", help="Genera las 3 variantes demo")
    p.add_argument("--cartera", action="store_true", help="Tarjeta slim de cartera con 2 NFC (WhatsApp + web)")
    args = p.parse_args()

    if args.cartera:
        generate(
            {
                **DEFAULTS,
                "nombre": "alberto-cartera",
                "ancho": 85.6,
                "alto": 54.0,
                "grosor": 3.4,
                "radio": 3.2,
                "nfc": "moneda_25",
                "nfc_desde_base": 1.20,
                "nfc_dual": True,
                "relieve": 0.40,
                "relieve_marca": 0.60,
                "firma": "DEVELOPED BY NFCTAP.TECH",
                "colores": {
                    "cuerpo": "negro mate",
                    "oro": "oro silk/mate",
                },
            }
        )
        return

    if args.pedido:
        spec = json.loads(Path(args.pedido).read_text(encoding="utf-8"))
        cfg = {
            **DEFAULTS,
            "nombre": spec.get("nombre") or "pedido-web",
            "ancho": spec.get("ancho", 70),
            "alto": spec.get("alto", 112),
            "grosor": spec.get("grosor", 4),
            "radio": spec.get("radio", 6),
            "nfc": spec.get("nfc", "moneda_25"),
            "nfc_desde_base": spec.get("nfc_desde_base", 1.2),
            "relieve": spec.get("relieve", 0.4),
            "linea1": spec.get("linea1", "TOCA PARA"),
            "linea2": spec.get("linea2", "DEJAR TU RESENA"),
            "kind": spec.get("kind", "personalizada"),
            "logoMask": spec.get("logoMask"),
            "googleUrl": spec.get("googleUrl", ""),
            "colores": spec.get("colores", DEFAULTS["colores"]),
        }
        generate(cfg)
        return

    if args.nombre:
        cfg = {**DEFAULTS, "nombre": args.nombre, "nfc": args.nfc, "linea1": args.linea1, "linea2": args.linea2}
        if args.ancho:
            cfg["ancho"] = args.ancho
        if args.alto:
            cfg["alto"] = args.alto
        if args.grosor:
            cfg["grosor"] = args.grosor
        generate(cfg)
        return

    variants = [
        {**DEFAULTS, "nombre": "demo-tira-clasica", "nfc": "moneda_25"},
        {**DEFAULTS, "nombre": "demo-moneda-25", "nfc": "moneda_25", "grosor": 4.0, "nfc_desde_base": 1.20},
        {
            **DEFAULTS,
            "nombre": "mostrador-grande",
            "ancho": 110.0,
            "alto": 70.0,
            "grosor": 4.0,
            "radio": 6.0,
            "nfc": "moneda_25",
        },
        {
            **DEFAULTS,
            "nombre": "cliente-demo",
            "nfc": "moneda_25",
            "linea1": "TU NEGOCIO",
            "linea2": "RESENA",
        },
    ]
    if args.todas or not args.nombre:
        for cfg in variants:
            generate(cfg)
    print("\nListo. Importa 01_cuerpo + 02/03/04 en Orca-Flashforge, asigna 1 color a cada pieza.")


if __name__ == "__main__":
    main()
