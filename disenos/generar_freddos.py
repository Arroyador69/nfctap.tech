#!/usr/bin/env python3
"""Grano NFC + posado Freddo's (Fuengirola) para AD5X.

El grano es el de la O del logo: ovalo tipo rugby, inclinado a la derecha,
hendidura en S. Dos NFC (reseña Google / club de puntos) con texto TAP.

Piezas
------
  01_grano_negro.stl         cuerpo del grano + TAP / iconos negros
  02_grano_oro.stl           discos amarillos de los dos TAP
  03_cuna_letras_negras.stl  letras + pie + ranura del grano
  04_letras_oro.stl          wordmark + NFCTAP.TECH bajo las letras

Colores en stock: negro + amarillo (el rojo y el blanco no son de marca).
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_tarjetas import (  # noqa: E402
    Mesh,
    circle,
    ensure_ccw,
    extrude,
    extrude_ring,
    polygon_with_holes,
    rectangle,
    rounded_rect,
    shifted,
    slanted_bar,
    star,
    stroke_arc,
    text_mesh,
    translate,
)

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl" / "freddos-fuengirola"
WORDMARK_JSON = HERE / "freddos_wordmark.json"

# Rugby del logo, inclinado a la derecha. Escala maxima en cama 220 mm.
BEAN_TILT = math.radians(-33.0)
RX, RY = 80.0, 108.0
BEAN_T = 8.0

WELL_D = 36.0
SEAT_D = 30.0
STICKER_D = 25.0
Z_FLOOR = 3.20
Z_GUIDE = 3.60
Z_PAUSE = 4.80
COVER = BEAN_T - Z_PAUSE

# Lobulos en ejes locales (antes de inclinar).
NFC_L_LOCAL = (-38.0, 10.0)
NFC_R_LOCAL = (38.0, -10.0)

CREASE_W = 8.2
CREASE_SPAN = 0.988
RELIEF_RING = 0.70
RELIEF_TYPE = 0.80
PAD_Z0 = BEAN_T
PAD_Z1 = BEAN_T + 0.55
TYPE_Z0 = PAD_Z1
TYPE_Z1 = PAD_Z1 + 0.80
PAD_R = 19.6

LETTER_RELIEF = 0.90
LETTER_H = 52.0
WORD_W = 148.0

# Pie + letras = cuna. Z = profundidad (apoyo en mesa). Y = alto.
# 64 mm de fondo: el grano es alto (~25 cm) y el peso va delante.
FOOT_Y = 8.0
FOOT_Z = 64.0
LETTER_Z0 = 24.0
LETTER_Z1 = 38.0
SLOT_W = 10.2
SLOT_Z1 = LETTER_Z1 - 1.6
SLOT_Z0 = SLOT_Z1 - SLOT_W
NEST = 24.0
LIP = 2.2


def rotate(x: float, y: float, a: float) -> tuple[float, float]:
    ca, sa = math.cos(a), math.sin(a)
    return (x * ca - y * sa, x * sa + y * ca)


def xfrm(pts: list[tuple[float, float]], dx: float = 0.0, dy: float = 0.0, rot: float = 0.0) -> list[tuple[float, float]]:
    return [(px + dx, py + dy) for px, py in (rotate(x, y, rot) for x, y in pts)]


def ellipse(cx: float, cy: float, rx: float, ry: float, segs: int = 96, rot: float = 0.0) -> list[tuple[float, float]]:
    pts = []
    for i in range(segs):
        a = 2.0 * math.pi * i / segs
        pts.append(rotate(rx * math.cos(a), ry * math.sin(a), rot))
    return [(x + cx, y + cy) for x, y in pts]


def bean_outline(segs: int = 96) -> list[tuple[float, float]]:
    return ellipse(0.0, 0.0, RX, RY, segs, BEAN_TILT)


def bean_bbox() -> tuple[float, float, float, float]:
    xs, ys = zip(*bean_outline(120))
    return min(xs), max(xs), min(ys), max(ys)


def nfc_world(local: tuple[float, float]) -> tuple[float, float]:
    return rotate(local[0], local[1], BEAN_TILT)


NFC_L = nfc_world(NFC_L_LOCAL)
NFC_R = nfc_world(NFC_R_LOCAL)
BB = bean_bbox()
BEAN_W = BB[1] - BB[0]
BEAN_H = BB[3] - BB[2]


def s_centerline(n: int = 56) -> list[tuple[float, float]]:
    """S del logo en ejes locales: de punta a punta."""
    pts: list[tuple[float, float]] = []
    for i in range(n + 1):
        t = -CREASE_SPAN + 2.0 * CREASE_SPAN * i / n
        y = t * RY
        x = math.sin(t * math.pi) * RX * 0.24 + t * RX * 0.05
        pts.append((x, y))
    return pts


def s_edges(width: float = CREASE_W) -> tuple[list[tuple[float, float]], list[tuple[float, float]]]:
    center = s_centerline()
    half = width / 2
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    n = len(center)
    for i, (x, y) in enumerate(center):
        if i == 0:
            dx, dy = center[1][0] - x, center[1][1] - y
        elif i == n - 1:
            dx, dy = x - center[i - 1][0], y - center[i - 1][1]
        else:
            dx, dy = center[i + 1][0] - center[i - 1][0], center[i + 1][1] - center[i - 1][1]
        length = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / length, dx / length
        left.append((x + nx * half, y + ny * half))
        right.append((x - nx * half, y - ny * half))
    return left, right


def bean_lobe(side: str, segs: int = 56) -> list[tuple[float, float]]:
    """Un lobulo del grano. La S los separa de lado a lado, como el logo."""
    left_e, right_e = s_edges()
    pts: list[tuple[float, float]] = []
    if side == "left":
        for i in range(segs + 1):
            a = math.pi / 2 + math.pi * i / segs
            pts.append(rotate(RX * math.cos(a), RY * math.sin(a), BEAN_TILT))
        pts.extend(rotate(x, y, BEAN_TILT) for x, y in left_e)
    else:
        for i in range(segs + 1):
            a = -math.pi / 2 + math.pi * i / segs
            pts.append(rotate(RX * math.cos(a), RY * math.sin(a), BEAN_TILT))
        pts.extend(rotate(x, y, BEAN_TILT) for x, y in reversed(right_e))
    return pts


def extrude_along_y(poly_xz: list[tuple[float, float]], y0: float, y1: float) -> Mesh:
    xz = ensure_ccw(poly_xz)
    m = extrude([(x, z) for x, z in xz], y0, y1)
    out = Mesh()
    for a, b, c in m.tris:
        out.add((a[0], a[2], a[1]), (b[0], b[2], b[1]), (c[0], c[2], c[1]))
    return out


def box(x0: float, y0: float, x1: float, y1: float) -> list[tuple[float, float]]:
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


# ---------------------------------------------------------------------------
# Grano
# ---------------------------------------------------------------------------

def bean_body() -> Mesh:
    well = circle(0.0, 0.0, WELL_D / 2, 56)
    seat = circle(0.0, 0.0, SEAT_D / 2, 48)
    left, right = bean_lobe("left"), bean_lobe("right")
    m = Mesh()
    m.extend(extrude(left, 0.0, Z_FLOOR))
    m.extend(extrude(right, 0.0, Z_FLOOR))
    m.extend(extrude_ring(left, translate(well, *NFC_L), Z_FLOOR, Z_GUIDE))
    m.extend(extrude_ring(right, translate(well, *NFC_R), Z_FLOOR, Z_GUIDE))
    m.extend(extrude_ring(left, translate(seat, *NFC_L), Z_GUIDE, Z_PAUSE))
    m.extend(extrude_ring(right, translate(seat, *NFC_R), Z_GUIDE, Z_PAUSE))
    m.extend(extrude(left, Z_PAUSE, BEAN_T))
    m.extend(extrude(right, Z_PAUSE, BEAN_T))
    m.extend(label_reseña())
    m.extend(label_puntos())
    return m


def _extrude_polys(polys: list[list[tuple[float, float]]], z0: float, z1: float) -> Mesh:
    m = Mesh()
    for poly in polys:
        m.extend(extrude(poly, z0, z1))
    return m


def bean_gold() -> Mesh:
    m = Mesh()
    for cx, cy in (NFC_L, NFC_R):
        m.extend(
            extrude_ring(
                circle(cx, cy, WELL_D / 2 - 0.35, 48),
                circle(cx, cy, SEAT_D / 2 + 0.25, 40),
                Z_FLOOR,
                Z_FLOOR + 0.50,
            )
        )
    for cx, cy in (NFC_L, NFC_R):
        m.extend(extrude(circle(cx, cy, PAD_R, 48), PAD_Z0, PAD_Z1))
    m.extend(extrude(rectangle(2.0, 2.0, 0.0, BB[3] + 8.0), 0.0, 0.20))
    return m


def label_reseña() -> Mesh:
    """Izquierda: estrella + TAP + RESEÑA. Texto horizontal, grano inclinado."""
    return _stack_label(
        NFC_L,
        icon=star(0.0, 0.0, 3.6),
        title="TAP",
        sub="RESEÑA",
    )


def label_puntos() -> Mesh:
    """Derecha: tarjeta + TAP + PUNTOS. Texto horizontal, grano inclinado."""
    card = rounded_rect(8.2, 5.4, 1.1)
    return _stack_label(NFC_R, icon=card, title="TAP", sub="PUNTOS")


def _stack_label(origin: tuple[float, float], icon: list[tuple[float, float]], title: str, sub: str) -> Mesh:
    """Icono y letras en negro, encima del disco amarillo. Siempre horizontales."""
    m = Mesh()
    m.extend(extrude(xfrm(icon, origin[0], origin[1] + 10.0), TYPE_Z0, TYPE_Z1))
    for poly in didot_word(title, 8.6):
        m.extend(extrude(xfrm(poly, origin[0], origin[1] + 1.6), TYPE_Z0, TYPE_Z1 + 0.05))
    for poly in didot_word(sub, 6.0):
        m.extend(extrude(xfrm(poly, origin[0], origin[1] - 7.4), TYPE_Z0, TYPE_Z1))
    return m


# ---------------------------------------------------------------------------
# Didot (estilo Freddo's)
# ---------------------------------------------------------------------------

def _glyph_box(polys: list[list[tuple[float, float]]]) -> tuple[float, list[list[tuple[float, float]]]]:
    xs = [p[0] for poly in polys for p in poly]
    minx = min(xs)
    return max(xs) - minx, [[(x - minx, y) for x, y in poly] for poly in polys]


def letter_F(h: float) -> list[list[tuple[float, float]]]:
    stem, thin, w = h * 0.145, h * 0.058, h * 0.60
    return [
        box(0, 0, stem, h),
        box(0, h - thin, w, h),
        box(w - thin, h - thin - h * 0.08, w, h),
        box(0, h * 0.54, w * 0.66, h * 0.54 + thin),
        box(0, 0, stem + h * 0.08, thin * 0.72),
    ]


def letter_T(h: float) -> list[list[tuple[float, float]]]:
    thin, w, stem = h * 0.058, h * 0.62, h * 0.13
    return [
        box(0, h - thin, w, h),
        box(0, h - thin - h * 0.07, thin, h),
        box(w - thin, h - thin - h * 0.07, w, h),
        box(w / 2 - stem / 2, 0, w / 2 + stem / 2, h - thin),
        box(w / 2 - stem / 2 - h * 0.05, 0, w / 2 + stem / 2 + h * 0.05, thin * 0.7),
    ]


def letter_A(h: float) -> list[list[tuple[float, float]]]:
    w, sw = h * 0.62, h * 0.12
    return [
        slanted_bar(sw * 0.2, 0.0, w / 2, h, sw),
        slanted_bar(w - sw * 0.2, 0.0, w / 2, h, sw),
        box(w * 0.22, h * 0.34, w * 0.78, h * 0.34 + h * 0.07),
        box(0, 0, sw + h * 0.06, h * 0.07),
        box(w - sw - h * 0.06, 0, w, h * 0.07),
    ]


def letter_P(h: float) -> list[list[tuple[float, float]]]:
    stem, thin, w = h * 0.14, h * 0.058, h * 0.52
    return [
        box(0, 0, stem, h),
        box(0, 0, stem + h * 0.07, thin * 0.7),
        box(0, h - thin, w * 0.78, h),
        box(0, h * 0.48, w * 0.78, h * 0.48 + thin),
        box(w - stem, h * 0.48, w, h),
    ]


def letter_R(h: float) -> list[list[tuple[float, float]]]:
    stem, thin, w = h * 0.14, h * 0.058, h * 0.56
    return [
        box(0, 0, stem, h),
        box(0, 0, stem + h * 0.07, thin * 0.7),
        box(0, h - thin, w * 0.76, h),
        box(0, h * 0.50, w * 0.76, h * 0.50 + thin),
        box(w - stem, h * 0.50, w, h),
        slanted_bar(stem, h * 0.52, w - h * 0.04, h * 0.02, stem * 0.8),
    ]


def letter_E(h: float) -> list[list[tuple[float, float]]]:
    stem, thin, w = h * 0.14, h * 0.058, h * 0.54
    return [
        box(0, 0, stem, h),
        box(0, h - thin, w, h),
        box(0, h * 0.48, w * 0.72, h * 0.48 + thin),
        box(0, 0, w, thin),
        box(w - thin, h - thin - h * 0.07, w, h),
        box(w - thin, 0, w, thin + h * 0.07),
    ]


def letter_S(h: float) -> list[list[tuple[float, float]]]:
    thin, w = h * 0.062, h * 0.46
    return [
        stroke_arc(w * 0.52, h * 0.72, h * 0.24, 20, 210, thin * 1.35, 16),
        stroke_arc(w * 0.48, h * 0.28, h * 0.24, 200, 390, thin * 1.35, 16),
    ]


def letter_N(h: float) -> list[list[tuple[float, float]]]:
    stem, w = h * 0.13, h * 0.56
    return [
        box(0, 0, stem, h),
        box(w - stem, 0, w, h),
        slanted_bar(stem * 0.6, h - stem * 0.2, w - stem * 0.6, stem * 0.2, stem),
        box(0, 0, stem + h * 0.05, h * 0.06),
        box(w - stem - h * 0.05, h - h * 0.06, w, h),
    ]


def letter_O(h: float) -> list[list[tuple[float, float]]]:
    return [stroke_arc(h * 0.26, h * 0.50, h * 0.40, 0, 360, h * 0.12, 32)]


def letter_U(h: float) -> list[list[tuple[float, float]]]:
    stem, w = h * 0.13, h * 0.52
    return [
        box(0, h * 0.28, stem, h),
        box(w - stem, h * 0.28, w, h),
        stroke_arc(w / 2, h * 0.32, w * 0.38, 188, 352, stem, 18),
        box(0, h - h * 0.06, stem + h * 0.05, h),
        box(w - stem - h * 0.05, h - h * 0.06, w, h),
    ]


def letter_I(h: float) -> list[list[tuple[float, float]]]:
    stem = h * 0.14
    return [
        box(h * 0.08, 0, h * 0.08 + stem, h),
        box(0, 0, h * 0.30, h * 0.07),
        box(0, h - h * 0.07, h * 0.30, h),
    ]


def letter_r(h: float, xh: float) -> list[list[tuple[float, float]]]:
    stem, thin = h * 0.13, h * 0.052
    ear_r = xh * 0.22
    return [
        box(0, 0, stem, xh),
        box(0, 0, stem + h * 0.07, thin * 0.7),
        stroke_arc(stem + ear_r * 0.15, xh - ear_r * 0.35, ear_r, 8, 155, thin * 1.2, 16),
    ]


def letter_e(h: float, xh: float) -> list[list[tuple[float, float]]]:
    thin, w = h * 0.058, h * 0.48
    r = min(w * 0.42, xh * 0.42)
    return [
        stroke_arc(w * 0.50, xh * 0.50, r, 28, 332, thin * 1.4, 26),
        box(w * 0.14, xh * 0.47, w * 0.80, xh * 0.47 + thin),
    ]


def letter_d(h: float, xh: float) -> list[list[tuple[float, float]]]:
    stem, thin, w = h * 0.13, h * 0.058, h * 0.52
    r = min((w - stem) * 0.46, xh * 0.42)
    cx, cy = r + thin * 0.6, xh * 0.50
    return [
        box(w - stem, 0, w, h),
        box(w - stem - h * 0.05, 0, w, thin * 0.7),
        box(w - stem - h * 0.04, h - thin * 0.7, w, h),
        stroke_arc(cx, cy, r, 55, 305, thin * 1.4, 24),
        box(cx + r * 0.35, cy - thin * 0.7, w - stem, cy + thin * 0.7),
    ]


def letter_s(h: float, xh: float) -> list[list[tuple[float, float]]]:
    thin, w = h * 0.058, h * 0.40
    return [
        stroke_arc(w * 0.52, xh * 0.72, xh * 0.24, 25, 205, thin * 1.35, 16),
        stroke_arc(w * 0.48, xh * 0.28, xh * 0.24, 205, 385, thin * 1.35, 16),
    ]


def letter_apostrophe(h: float) -> list[list[tuple[float, float]]]:
    w = h * 0.13
    return [
        box(w * 0.20, h * 0.76, w * 0.80, h * 0.98),
        [(w * 0.20, h * 0.76), (w * 0.80, h * 0.76), (w * 0.42, h * 0.56), (w * 0.08, h * 0.60)],
    ]


def letter_bean_o(h: float, xh: float) -> list[list[tuple[float, float]]]:
    rx, ry = xh * 0.28, xh * 0.40
    rot = math.radians(-33)
    w = (rx * abs(math.cos(rot)) + ry * abs(math.sin(rot))) * 2
    return [ellipse(w / 2, xh * 0.50, rx, ry, 40, rot)]


def letter_ENYE(h: float) -> list[list[tuple[float, float]]]:
    polys = letter_N(h)
    w = h * 0.56
    polys.append(stroke_arc(w / 2, h + h * 0.10, w * 0.22, 20, 160, h * 0.07, 10))
    return polys


def didot_word(text: str, h: float) -> list[list[tuple[float, float]]]:
    xh = h * 0.64
    gap = h * 0.12
    glyphs: dict[str, list[list[tuple[float, float]]]] = {
        "A": letter_A(h),
        "E": letter_E(h),
        "F": letter_F(h),
        "I": letter_I(h),
        "N": letter_N(h),
        "Ñ": letter_ENYE(h),
        "O": letter_O(h),
        "P": letter_P(h),
        "R": letter_R(h),
        "S": letter_S(h),
        "T": letter_T(h),
        "U": letter_U(h),
        "e": letter_e(h, xh),
        "d": letter_d(h, xh),
        "r": letter_r(h, xh),
        "s": letter_s(h, xh),
        "'": letter_apostrophe(h),
    }
    raw = [glyphs[ch] for ch in text]
    parts = [_glyph_box(p) for p in raw]
    total = sum(w for w, _ in parts) + gap * (len(parts) - 1)
    x = -total / 2
    out: list[list[tuple[float, float]]] = []
    for w, polys in parts:
        for poly in polys:
            out.append([(px + x, py - h / 2) for px, py in poly])
        x += w + gap
    return out


def wordmark_polys(h: float = LETTER_H, target_w: float = 148.0) -> list[list[tuple[float, float]]]:
    xh = h * 0.64
    gap = h * 0.055
    raw = [
        letter_F(h),
        letter_r(h, xh),
        letter_e(h, xh),
        letter_d(h, xh),
        letter_d(h, xh),
        letter_bean_o(h, xh),
        letter_apostrophe(h),
        letter_s(h, xh),
    ]
    parts = [_glyph_box(polys) for polys in raw]
    total = sum(w for w, _ in parts) + gap * (len(parts) - 1)
    sx = target_w / total
    x = -total / 2
    out: list[list[tuple[float, float]]] = []
    for w, polys in parts:
        for poly in polys:
            out.append([((px + x) * sx, py - h / 2) for px, py in poly])
        x += w + gap
    return out


def logo_wordmark_polys(target_w: float = 148.0) -> list[list[tuple[float, float]]]:
    """Letras exactas del logo Freddo's (trazadas de freddos_logo.png)."""
    if not WORDMARK_JSON.exists():
        raise SystemExit(f"Falta {WORDMARK_JSON.name}. Ejecuta trazar_logo_freddos.py")
    glyphs = json.loads(WORDMARK_JSON.read_text(encoding="utf-8"))
    xs: list[float] = []
    ys: list[float] = []
    for g in glyphs:
        for ring in [g["outer"], *g["holes"]]:
            xs.extend(p[0] for p in ring)
            ys.extend(p[1] for p in ring)
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    scale = target_w / (maxx - minx)
    cx, cy = (minx + maxx) / 2.0, (miny + maxy) / 2.0

    def sc(pts: list[list[float]]) -> list[tuple[float, float]]:
        return [((p[0] - cx) * scale, (p[1] - cy) * scale) for p in pts]

    out: list[list[tuple[float, float]]] = []
    for g in glyphs:
        outer = sc(g["outer"])
        holes = [sc(h) for h in g["holes"]]
        out.append(polygon_with_holes(outer, holes) if holes else outer)
    return out


def logo_on_baseline(target_w: float = WORD_W) -> tuple[list[list[tuple[float, float]]], float]:
    """Wordmark con la baselina en y=0 (letras abajo)."""
    polys = logo_wordmark_polys(target_w)
    ys = [p[1] for poly in polys for p in poly]
    dy = -min(ys)
    top = max(ys) + dy
    return [[(x, y + dy + FOOT_Y) for x, y in poly] for poly in polys], top + FOOT_Y


def _bean_envelope() -> tuple[dict[float, float], float]:
    xmin, xmax, ymin, ymax = BB
    env: dict[float, float] = {}
    for i in range(180):
        a = 2.0 * math.pi * i / 180
        x, y = rotate(RX * math.cos(a), RY * math.sin(a), BEAN_TILT)
        if y > ymin + NEST + 4.0:
            continue
        k = round(x, 1)
        if k not in env or y < env[k]:
            env[k] = y
    return env, ymin


def stand_black() -> Mesh:
    """Letras negras + pie estable + ranura que sujeta el grano."""
    letters, letter_top = logo_on_baseline()
    env, ymin = _bean_envelope()
    nest_y0 = letter_top - 2.5
    nest_y1 = letter_top + NEST
    # El punto mas bajo del grano se sienta a nest_y0 + 3.
    lift = (nest_y0 + 3.0) - ymin

    m = Mesh()
    foot_w = max(WORD_W + 14.0, BEAN_W + 8.0)
    m.extend(shifted(extrude(rounded_rect(foot_w, FOOT_Y + 3.0, 2.4, 8), 0.0, FOOT_Z), 0.0, FOOT_Y / 2 + 0.2))

    # Cuerpo de las letras (grosor hacia el cliente).
    for poly in letters:
        m.extend(extrude(poly, LETTER_Z0, LETTER_Z1))

    # Lintel / cuna encima de las letras.
    xs = sorted(env)
    if xs:
        x0, x1 = xs[0] - 7.0, xs[-1] + 7.0
        # Solido trasero (respaldo).
        m.extend(extrude(rectangle(x1 - x0, nest_y1 - nest_y0, (x0 + x1) / 2, (nest_y0 + nest_y1) / 2), 0.0, SLOT_Z0))
        # Suelo curvo + paredes laterales en la zona de la ranura.
        valley: list[tuple[float, float]] = [(x0, nest_y0), (x1, nest_y0)]
        for x in reversed(xs):
            yb = env[x] + lift
            valley.append((x, max(nest_y0, min(nest_y1, yb))))
        m.extend(extrude(valley, SLOT_Z0, SLOT_Z1))
        # Labio delantero: el grano no se cae hacia el cliente.
        m.extend(extrude(rectangle(x1 - x0, LIP, (x0 + x1) / 2, nest_y1 - LIP / 2), SLOT_Z1, LETTER_Z1))
        # Topes izq / der.
        m.extend(extrude(rectangle(5.0, nest_y1 - nest_y0, x0 + 2.5, (nest_y0 + nest_y1) / 2), SLOT_Z0, LETTER_Z1))
        m.extend(extrude(rectangle(5.0, nest_y1 - nest_y0, x1 - 2.5, (nest_y0 + nest_y1) / 2), SLOT_Z0, LETTER_Z1))

    return m


def stand_gold() -> Mesh:
    """Relieve del logo en la cara + firma pequena bajo las letras."""
    letters, _letter_top = logo_on_baseline()
    m = Mesh()
    for poly in letters:
        m.extend(extrude(poly, LETTER_Z1, LETTER_Z1 + LETTER_RELIEF))
    # Firma en la cara delantera del pie, debajo de Freddo's (visible al cliente).
    m.extend(
        shifted(
            text_mesh("NFCTAP.TECH", pixel=0.70, height=0.80, z0=FOOT_Z, advance=6),
            0.0,
            FOOT_Y / 2 + 0.2,
        )
    )
    return m


# ---------------------------------------------------------------------------
# Preview + notas
# ---------------------------------------------------------------------------

def write_preview(path: Path) -> None:
    left_d = " ".join(f"{x:.1f},{-y:.1f}" for x, y in bean_lobe("left"))
    right_d = " ".join(f"{x:.1f},{-y:.1f}" for x, y in bean_lobe("right"))
    nl, nr = NFC_L, NFC_R
    letter_parts = []
    for poly in logo_on_baseline()[0]:
        pts = " ".join(f"{x:.2f},{-y:.2f}" for x, y in poly)
        letter_parts.append(f'<polygon points="{pts}" fill="#E6C36A"/>')
    letter_svg = "\n    ".join(letter_parts)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 860" width="900" height="860">
  <rect width="900" height="860" fill="#1c120c"/>
  <text x="40" y="40" fill="#E6C36A" font-family="Georgia, serif" font-size="22">Freddo's — el wordmark es la cuna</text>
  <text x="40" y="62" fill="#9a7a48" font-family="Georgia, serif" font-size="12">Letras abajo · grano encajado arriba · TAP horizontal</text>

  <g transform="translate(230,280) scale(0.92)">
    <polygon points="{left_d}" fill="#111" stroke="#E6C36A" stroke-width="1.2"/>
    <polygon points="{right_d}" fill="#111" stroke="#E6C36A" stroke-width="1.2"/>
    <circle cx="{nl[0]}" cy="{-nl[1]}" r="18" fill="none" stroke="#E6C36A" stroke-width="2"/>
    <circle cx="{nr[0]}" cy="{-nr[1]}" r="18" fill="none" stroke="#E6C36A" stroke-width="2"/>
    <text x="{nl[0]}" y="{-nl[1] - 8}" text-anchor="middle" fill="#E6C36A" font-family="Georgia, serif" font-size="7">TAP RESEÑA</text>
    <text x="{nr[0]}" y="{-nr[1] - 8}" text-anchor="middle" fill="#E6C36A" font-family="Georgia, serif" font-size="7">TAP PUNTOS</text>
  </g>
  <text x="230" y="500" text-anchor="middle" fill="#E6C36A" font-family="Georgia, serif" font-size="13">Grano {BEAN_W:.0f} x {BEAN_H:.0f} x {BEAN_T:.0f} mm</text>

  <rect x="500" y="96" width="360" height="230" rx="8" fill="#2a1c12"/>
  <text x="680" y="122" text-anchor="middle" fill="#E6C36A" font-family="Georgia, serif" font-size="14">Mostrador (lado)</text>
  <ellipse cx="620" cy="175" rx="16" ry="58" fill="#111" stroke="#E6C36A" stroke-width="1.4" transform="rotate(-33 620 175)"/>
  <rect x="602" y="228" width="12" height="36" fill="#E6C36A"/>
  <rect x="590" y="262" width="80" height="18" rx="2" fill="#111" stroke="#E6C36A"/>
  <text x="700" y="170" fill="#9a7a48" font-size="11">grano en la ranura</text>
  <text x="700" y="248" fill="#9a7a48" font-size="11">Freddo's = cuna</text>
  <text x="700" y="274" fill="#9a7a48" font-size="11">pie 64 mm, no vuelca</text>

  <g transform="translate(680,430) scale(0.9)">
    {letter_svg}
  </g>
  <text x="680" y="500" text-anchor="middle" fill="#9a7a48" font-size="10">NFCTAP.TECH (bajo las letras)</text>

  <text x="40" y="560" fill="#E6C36A" font-family="Georgia, serif" font-size="13">Pausa NFC · capa 24 (4,80 mm)</text>
  <text x="40" y="582" fill="#9a7a48" font-size="12">Hoyos Ø36 · pegatina hundida · 16 capas encima.</text>
  <text x="40" y="610" fill="#9a7a48" font-size="12">Negro = 01 + 03. Amarillo = 02 + 04.</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


LEEME = """Freddo's Fuengirola — grano NFC + cuna-letras
=============================================

Que es
------
1. GRANO rugby inclinado, S que lo corta. Disco amarillo + TAP negro
   (RESEÑA / PUNTOS, horizontal). Dos NFC Ø25.
2. CUNA = las letras del logo. Freddo's abajo, el grano se ENCAJA
   arriba en una ranura con labio, respaldo y topes. No se cae.
3. Firma en el pie, debajo de Freddo's: NFCTAP.TECH

Montaje
-------
        [        GRANO (de lado)        ]
        [   ranura en lo alto de Freddo's ]
        [  F r e d d o ' s              ]
        [  NFCTAP.TECH                  ]
        [=========== pie 64 mm =========]

Imprime
-------
Grano: 01 + 02 agrupados. Pausa capa 24. NO Reparar.
Cuna:  03 + 04 agrupados. Negro=03, amarillo=04. Sin pausa.
Al acabar, la cuna se pone DE PIE (el pie en la mesa).
El grano entra de canto en la ranura de ARRIBA.

Colores: negro + amarillo. Los dos como PLA.
"""


def write_notes(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "LEEME.txt").write_text(LEEME, encoding="utf-8")
    layer = int(round(Z_PAUSE / 0.20))
    (dest / "PAUSA_NFC.txt").write_text(
        (
            "Pausa NFC — grano Freddo's (rugby)\n"
            "=================================\n"
            f"Altura: {Z_PAUSE:.2f} mm · capa {layer} a 0,20 mm\n"
            f"Hueco Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Tapa encima: {COVER:.2f} mm\n\n"
            "Capa 24 -> Anadir pausa.\n"
            "Anillo amarillo = mira. Pegatina hundida, adhesivo a la cama.\n"
            "IZQ = RESEÑA (Google). DER = PUNTOS (club).\n"
        ),
        encoding="utf-8",
    )
    (dest / "NFC.txt").write_text(
        (
            "Freddo's Fuengirola — dos NFC en el grano\n\n"
            "IZQUIERDA — TAP / RESEÑA\n"
            "  Google Reviews del local. Pedir el enlace al cliente.\n"
            "  NFC Tap Config → Cualquier enlace → URL de reseña.\n\n"
            "DERECHA — TAP / PUNTOS\n"
            "  Alta o tarjeta de fidelidad / club de puntos.\n"
            "  Pedir URL (web, app, formulario).\n\n"
            "No grabar hasta tener las dos URLs.\n"
        ),
        encoding="utf-8",
    )
    cfg = {
        "nombre": "freddos-fuengirola",
        "grano": {
            "rx": RX,
            "ry": RY,
            "tilt_deg": round(math.degrees(BEAN_TILT), 1),
            "bbox": [round(BEAN_W, 1), round(BEAN_H, 1), BEAN_T],
        },
        "nfc": {
            "sticker": STICKER_D,
            "well": WELL_D,
            "seat": SEAT_D,
            "z_pause": Z_PAUSE,
            "left": "TAP RESEÑA / Google",
            "right": "TAP PUNTOS / club",
        },
        "colores": {
            "cuerpo": "negro",
            "acento": "amarillo",
            "no_usar": ["rojo", "blanco"],
            "nota": "No hay marron ni beige en stock. Negro+amarillo es lo mas cerca.",
        },
    }
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def generate() -> None:
    dest = OUT
    dest.mkdir(parents=True, exist_ok=True)
    print(f"\nGenerando Freddo's  rugby {BEAN_W:.0f}x{BEAN_H:.0f}x{BEAN_T:.0f} mm  tilt {math.degrees(BEAN_TILT):.0f}°")
    bean_body().write_stl(dest / "01_grano_negro.stl", "grano_negro")
    bean_gold().write_stl(dest / "02_grano_oro.stl", "grano_oro")
    stand_black().write_stl(dest / "03_cuna_letras_negras.stl", "cuna_letras")
    stand_gold().write_stl(dest / "04_letras_oro.stl", "freddos")
    write_preview(dest / "vista-previa.svg")
    write_notes(dest)
    for old in ("03_cuna_negra.stl", "04_letras_negras.stl", "05_letras_oro.stl"):
        p = dest / old
        if p.exists():
            p.unlink()
    print(f"  OK  {dest}")
    print(f"  Pausa NFC: {Z_PAUSE:.2f} mm  (capa {int(round(Z_PAUSE / 0.20))})")


if __name__ == "__main__":
    generate()
