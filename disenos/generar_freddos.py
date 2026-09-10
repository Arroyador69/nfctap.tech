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

# Rugby del logo, 80 % del original. El pozo NFC NO se escala.
SCALE = 0.80
BEAN_TILT = math.radians(-33.0)
RX, RY = 80.0 * SCALE, 108.0 * SCALE
BEAN_T = 8.0

# Mismo sistema que la genérica que imprimió bien. Un poco más holgado.
WELL_D = 36.0
SEAT_D = 30.0
STICKER_D = 25.0
PAD_D = 24.0
PAD_H = 0.50
Z_FLOOR = 3.20
Z_GUIDE = 3.60
Z_PAUSE = 4.80
FIRST_LAYER = 0.25
LAYER_H = 0.20
COVER = BEAN_T - Z_PAUSE

# Lóbulos: posición a escala. El Ø del pozo se queda.
NFC_L_LOCAL = (-38.0 * SCALE, 10.0 * SCALE)
NFC_R_LOCAL = (38.0 * SCALE, -10.0 * SCALE)

CREASE_W = 8.2 * SCALE
# S hueca como el logo. 0,93 deja ~6 mm de carne en cada punta: un solo grano.
CREASE_SPAN = 0.93
RELIEF_RING = 0.70
RELIEF_TYPE = 0.80
PAD_Z0 = BEAN_T
PAD_Z1 = BEAN_T + 0.55
TYPE_Z0 = PAD_Z1
TYPE_Z1 = PAD_Z1 + 0.80
# Disco TAP en la cara: no se encoge, que se lea.
PAD_R = 19.6

LETTER_RELIEF = 0.90
LETTER_H = 52.0 * SCALE
WORD_W = 148.0 * SCALE

# Pie + letras = cuna. Z = profundidad (apoyo en mesa). Y = alto.
FOOT_Y = 8.0
FOOT_Z = 72.0
FOOT_PLATE_Y = 14.0
LETTER_Z0 = 19.2
LETTER_Z1 = 30.4
# Ranura como la genérica: 0,6 mm de holgura, labio de verdad.
SLOT_W = 8.6
LIP = 8.5
LIP_T = 3.0
SLOT_Z1 = LETTER_Z1 - LIP_T
SLOT_Z0 = SLOT_Z1 - SLOT_W
NEST = 34.0
SIT = 6.0
# 0: el nido empieza en lo alto de las letras. Si es >0, el suelo negro las corta.
NEST_OVERLAP = 0.0
STOP_W = 6.0
MAX_ALTO = 200.0

# Tetones en el canto (caen en la cuna). Eje = grosor del grano.
PEG_D = 5.8
PEG_HOLE_D = 6.6
PEG_LEN = 7.0
PEG_CORNER = 1.2

# Enlace corto de la S solo dentro del nido (oculto). El resto, al aire.
NEST_WEB_H = 26.0
# Tuerca M8: ~13 mm cara a cara, ~15 mm punta a punta, 6,5 mm de alto.
LASTRE_R = 8.0
LASTRE_H = 8.0


def pause_layer() -> int:
    return 1 + int(round((Z_PAUSE - FIRST_LAYER) / LAYER_H))


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


def _pip(x: float, y: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-18) + x1:
            inside = not inside
    return inside


def _outline_low_y(x_target: float) -> float | None:
    ring = bean_outline(200)
    best: float | None = None
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (x1 - x_target) * (x2 - x_target) > 0:
            continue
        if abs(x2 - x1) < 1e-9:
            y = min(y1, y2)
        else:
            y = y1 + (x_target - x1) / (x2 - x1) * (y2 - y1)
        if best is None or y < best:
            best = y
    return best


def peg_sites() -> list[tuple[float, float]]:
    """Centros de las pestañas (XY del grano), colgando hacia abajo."""
    left, right = bean_lobe("left"), bean_lobe("right")
    ring = bean_outline(240)
    bot_x, bot_y = min(ring, key=lambda p: p[1])
    sites: list[tuple[float, float]] = []
    for xt in (bot_x - 22.0, bot_x, bot_x + 24.0):
        oy = _outline_low_y(xt)
        if oy is None:
            continue
        if not (_pip(xt, oy + 1.2, left) or _pip(xt, oy + 1.2, right)):
            continue
        sites.append((xt, oy - PEG_LEN / 2.0))
    if len(sites) < 2:
        sites = [
            (bot_x - 16.0, bot_y - PEG_LEN / 2.0),
            (bot_x + 10.0, bot_y - PEG_LEN / 2.0 + 2.5),
        ]
    return sites


def peg_polys() -> list[list[tuple[float, float]]]:
    r = min(PEG_CORNER, PEG_D / 2 - 0.15)
    return [translate(rounded_rect(PEG_D, PEG_LEN, r, 8), cx, cy) for cx, cy in peg_sites()]


def nest_spec(lay: dict | None = None) -> dict:
    """Grano y cuna salen de aquí. Agujeros = bolsillos que abren ARRIBA, no de cara."""
    lay = lay or nest_layout()
    lift, dz = lay["lift"], lay["dz"]
    nest_y0 = lay["nest_y0"]
    floor_y1 = nest_y0 + SIT - 0.35
    floor_y0 = nest_y0
    fits: list[dict] = []
    for cx, cy in peg_sites():
        peg = {
            "x0": cx - PEG_D / 2.0,
            "x1": cx + PEG_D / 2.0,
            "y0": cy + lift - PEG_LEN / 2.0,
            "y1": cy + lift + PEG_LEN / 2.0,
            "z0": dz,
            "z1": dz + BEAN_T,
        }
        hole = {
            "x0": cx - PEG_HOLE_D / 2.0,
            "x1": cx + PEG_HOLE_D / 2.0,
            "y0": peg["y0"] - 0.80,
            "y1": floor_y1 + 1.60,
            "z0": SLOT_Z0 + 0.05,
            "z1": SLOT_Z1 - 0.05,
        }
        fits.append({"cx": cx, "cy": cy, "peg": peg, "hole": hole})
    return {
        "lay": lay,
        "floor_y0": floor_y0,
        "floor_y1": floor_y1,
        "fits": fits,
        "grain_z0": dz,
        "grain_z1": dz + BEAN_T,
    }


def s_nest_web_poly() -> list[tuple[float, float]]:
    """Rellena solo el tramo bajo de la S, el que queda dentro de la cuna."""
    left_e, right_e = s_edges()
    cut = BB[2] + NEST_WEB_H
    le = [rotate(x, y, BEAN_TILT) for x, y in left_e]
    re = [rotate(x, y, BEAN_TILT) for x, y in right_e]
    keep_l = [p for p in le if p[1] <= cut]
    keep_r = [p for p in re if p[1] <= cut]
    if len(keep_l) < 3 or len(keep_r) < 3:
        return []
    return keep_l + list(reversed(keep_r))


def nest_layout() -> dict:
    letters, letter_top = logo_on_baseline()
    env, ymin = _bean_envelope()
    nest_y0 = letter_top - NEST_OVERLAP
    nest_y1 = letter_top + NEST
    lift = (nest_y0 + SIT) - ymin
    xs = sorted(env)
    x0, x1 = (xs[0] - 7.0, xs[-1] + 7.0) if xs else (-80.0, 80.0)
    return {
        "letters": letters,
        "letter_top": letter_top,
        "env": env,
        "ymin": ymin,
        "nest_y0": nest_y0,
        "nest_y1": nest_y1,
        "lift": lift,
        "foot_w": max(WORD_W + 14.0, BEAN_W + 8.0),
        "x0": x0,
        "x1": x1,
        "dz": (SLOT_Z0 + SLOT_Z1) / 2.0 - BEAN_T / 2.0,
    }


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
    web = s_nest_web_poly()
    if web:
        m.extend(extrude(web, 0.0, BEAN_T))
    for poly in peg_polys():
        m.extend(extrude(poly, 0.0, BEAN_T))
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
        m.extend(extrude(circle(cx, cy, PAD_D / 2, 48), Z_FLOOR, Z_FLOOR + PAD_H))
        m.extend(
            extrude_ring(
                circle(cx, cy, WELL_D / 2 - 0.20, 48),
                circle(cx, cy, SEAT_D / 2 + 0.20, 40),
                Z_GUIDE,
                Z_GUIDE + 0.45,
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
    m.extend(extrude(xfrm(icon, origin[0], origin[1] + 10.5), TYPE_Z0, TYPE_Z1))
    for poly in didot_word(title, 9.4):
        m.extend(extrude(xfrm(poly, origin[0], origin[1] + 1.8), TYPE_Z0, TYPE_Z1 + 0.05))
    for poly in didot_word(sub, 6.6):
        m.extend(extrude(xfrm(poly, origin[0], origin[1] - 7.8), TYPE_Z0, TYPE_Z1))
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


def _wordmark_raw(target_w: float) -> tuple[list[dict], float, float]:
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

    def sc(pts: list) -> list[tuple[float, float]]:
        return [((p[0] - cx) * scale, (p[1] - cy) * scale) for p in pts]

    out = [{"outer": sc(g["outer"]), "holes": [sc(h) for h in g["holes"]]} for g in glyphs]
    return out, miny * scale - cy * scale, maxy * scale - cy * scale


def logo_wordmark_polys(target_w: float = 148.0) -> list[list[tuple[float, float]]]:
    """Contorno para SVG (con puentes si hay huecos)."""
    glyphs, _, _ = _wordmark_raw(target_w)
    out: list[list[tuple[float, float]]] = []
    for g in glyphs:
        out.append(polygon_with_holes(g["outer"], g["holes"]) if g["holes"] else g["outer"])
    return out


def logo_on_baseline(target_w: float = WORD_W) -> tuple[list[list[tuple[float, float]]], float]:
    """Wordmark con la baselina en y=0 (letras abajo)."""
    polys = logo_wordmark_polys(target_w)
    ys = [p[1] for poly in polys for p in poly]
    dy = -min(ys)
    top = max(ys) + dy
    return [[(x, y + dy + FOOT_Y) for x, y in poly] for poly in polys], top + FOOT_Y


def logo_glyphs_on_baseline(target_w: float = WORD_W) -> tuple[list[dict], float]:
    glyphs, ymin, ymax = _wordmark_raw(target_w)
    dy = -ymin + FOOT_Y
    placed = []
    for g in glyphs:
        placed.append(
            {
                "outer": [(x, y + dy) for x, y in g["outer"]],
                "holes": [[(x, y + dy) for x, y in h] for h in g["holes"]],
            }
        )
    return placed, ymax + dy


def _letter_tm(outer: list[tuple[float, float]], holes: list, z0: float, z1: float):
    from shapely.geometry import Polygon
    from instagram_logo import _shapely_extrude

    poly = Polygon(outer, holes)
    if not poly.is_valid:
        poly = poly.buffer(0)
    return _mesh_to_tm(_shapely_extrude(poly, z0, z1))


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


def _clip_y(poly: list[tuple[float, float]], ycut: float, below: bool) -> list[tuple[float, float]]:
    """Corta un polígono por y = ycut (Sutherland–Hodgman)."""
    if len(poly) < 3:
        return []
    out: list[tuple[float, float]] = []
    n = len(poly)
    for i in range(n):
        a = poly[i]
        b = poly[(i + 1) % n]
        ain = a[1] <= ycut if below else a[1] >= ycut
        bin_ = b[1] <= ycut if below else b[1] >= ycut
        if ain:
            out.append(a)
        if ain != bin_:
            dy = b[1] - a[1]
            t = (ycut - a[1]) / (dy if abs(dy) > 1e-12 else 1e-12)
            out.append((a[0] + t * (b[0] - a[0]), ycut))
    return out if len(out) >= 3 else []


def _require_trimesh():
    try:
        import numpy as np
        import trimesh
    except ImportError as exc:
        raise SystemExit(
            "Falta trimesh. Usa: .venv-mesh/bin/python disenos/generar_freddos.py"
        ) from exc
    return np, trimesh


def _tm_box(x0: float, y0: float, z0: float, x1: float, y1: float, z1: float):
    """Caja alineada a los ejes. Un sólido de verdad, no un recorte de triángulos."""
    _, trimesh = _require_trimesh()
    dx, dy, dz = x1 - x0, y1 - y0, z1 - z0
    if dx < 0.05 or dy < 0.05 or dz < 0.05:
        raise SystemExit(f"  caja degenerada {dx:.2f}×{dy:.2f}×{dz:.2f}")
    m = trimesh.creation.box(extents=[dx, dy, dz])
    m.apply_translation([(x0 + x1) / 2.0, (y0 + y1) / 2.0, (z0 + z1) / 2.0])
    return m


def _mesh_to_tm(mesh: Mesh):
    np, trimesh = _require_trimesh()
    verts = np.array([p for tri in mesh.tris for p in tri], dtype=np.float64)
    faces = np.arange(len(verts)).reshape((-1, 3))
    tm = trimesh.Trimesh(vertices=verts, faces=faces, process=True)
    tm.merge_vertices()
    if tm.volume < 0:
        tm.invert()
    return tm


def _tm_to_mesh(tm, nombre: str) -> Mesh:
    _, trimesh = _require_trimesh()
    if not tm.is_watertight:
        trimesh.repair.fill_holes(tm)
        tm.process()
    print(f"  {nombre}: watertight={tm.is_watertight}  {len(tm.faces)} tri  {tm.volume:.0f} mm³")
    if not tm.is_watertight:
        raise SystemExit(f"  {nombre}: sigue sin ser un sólido cerrado. No imprimir.")
    out = Mesh()
    v = tm.vertices
    for a, b, c in tm.faces:
        out.add(tuple(float(x) for x in v[a]), tuple(float(x) for x in v[b]), tuple(float(x) for x in v[c]))
    return out


def _csg_union(parts: list, nombre: str):
    _, trimesh = _require_trimesh()
    vols = [p for p in parts if p is not None and not p.is_empty]
    if not vols:
        raise SystemExit(f"  {nombre}: nada que unir")
    print(f"  {nombre}: uniendo {len(vols)} piezas…")
    u = vols[0]
    skipped = 0
    for i, p in enumerate(vols[1:], 1):
        if p.volume < 0:
            p.invert()
        try:
            nxt = trimesh.boolean.union([u, p], engine="manifold", check_volume=False)
        except Exception as err:
            print(f"  {nombre}: salto {i}: {err}")
            skipped += 1
            continue
        if nxt is None or nxt.is_empty:
            skipped += 1
            continue
        u = nxt
    if skipped:
        print(f"  {nombre}: {skipped} piezas no se unieron")
    return u


def _csg_diff(body, cuts: list, nombre: str):
    _, trimesh = _require_trimesh()
    u = body
    for i, cut in enumerate(cuts, 1):
        if cut is None or cut.is_empty:
            continue
        try:
            nxt = trimesh.boolean.difference([u, cut], engine="manifold", check_volume=False)
        except Exception as err:
            raise SystemExit(f"  {nombre}: no pude restar hueco {i}: {err}") from err
        if nxt is None or nxt.is_empty:
            raise SystemExit(f"  {nombre}: restar hueco {i} vació la pieza")
        u = nxt
    return u


def build_cuna_tm(with_letters: bool):
    """Cuna: letras enteras en la cara; nido DETRÁS/ARRIBA, sin cruzar el wordmark."""
    spec = nest_spec()
    lay = spec["lay"]
    x0, x1 = lay["x0"], lay["x1"]
    nest_y0, nest_y1 = lay["nest_y0"], lay["nest_y1"]
    letter_top = lay["letter_top"]
    fw = lay["foot_w"] + 8.0
    fy0, fy1 = spec["floor_y0"], spec["floor_y1"]
    nombre = "cuna" if with_letters else "cuna_test"
    # Frente del nido (z > SLOT_Z1) solo por ENCIMA de las letras.
    nest_front_y0 = max(nest_y0, letter_top)
    parts = [
        _tm_box(-fw / 2.0, 0.0, 0.0, fw / 2.0, FOOT_PLATE_Y, FOOT_Z),
        _tm_box(x0, 0.0, 0.0, x1, nest_y1, SLOT_Z0),
        # Placa detrás de las letras (no llega a la cara: no las rellena ni las corta).
        _tm_box(x0, FOOT_PLATE_Y - 0.4, SLOT_Z0, x1, letter_top + 0.2, SLOT_Z1),
        # Suelo del nido: grosor del grano, no la cara Freddo's.
        _tm_box(x0, fy0 - 0.4, SLOT_Z0 - 0.4, x1, fy1, SLOT_Z1),
        _tm_box(x0 + STOP_W, nest_y1 - LIP, SLOT_Z1 - 0.4, x1 - STOP_W, nest_y1, LETTER_Z1),
        _tm_box(x0, nest_front_y0, SLOT_Z0, x0 + STOP_W, nest_y1, LETTER_Z1),
        _tm_box(x1 - STOP_W, nest_front_y0, SLOT_Z0, x1, nest_y1, LETTER_Z1),
    ]
    if with_letters:
        glyphs, _top = logo_glyphs_on_baseline()
        for g in glyphs:
            letter = _letter_tm(g["outer"], g["holes"], SLOT_Z1 - 0.4, LETTER_Z1)
            if abs(letter.volume) >= 0.05:
                parts.append(letter)
            else:
                print("  cuna: letra sin volumen, la placa negra la cubre")
    body = _csg_union(parts, nombre)
    cuts = [
        _tm_box(f["hole"]["x0"], f["hole"]["y0"], f["hole"]["z0"], f["hole"]["x1"], f["hole"]["y1"], f["hole"]["z1"])
        for f in spec["fits"]
    ]
    cuts.append(_tm_box(-35.0, -0.6, FOOT_Z - 26.0, 35.0, LASTRE_H, FOOT_Z - 8.0))
    return _csg_diff(body, cuts, nombre)


def assert_encaje() -> None:
    """Si grano y cuna no encajan en números, no hay STL."""
    spec = nest_spec()
    z0, z1 = spec["grain_z0"], spec["grain_z1"]
    if z0 < SLOT_Z0 - 0.05 or z1 > SLOT_Z1 + 0.05:
        raise SystemExit(f"  Grano Z [{z0:.2f},{z1:.2f}] no cabe en ranura [{SLOT_Z0:.2f},{SLOT_Z1:.2f}]")
    holgura_z = min(z0 - SLOT_Z0, SLOT_Z1 - z1)
    if holgura_z < 0.15:
        raise SystemExit(f"  Holgura ranura {holgura_z:.2f} mm: el grano no entra")
    fy1 = spec["floor_y1"]
    for i, fit in enumerate(spec["fits"], 1):
        p, h = fit["peg"], fit["hole"]
        if h["z1"] > SLOT_Z1 + 0.02:
            raise SystemExit(f"  Agujero {i} atraviesa la cara (mal: iría de frente)")
        if h["z0"] < SLOT_Z0 - 0.02:
            raise SystemExit(f"  Agujero {i} atraviesa el respaldo")
        if h["y1"] <= fy1:
            raise SystemExit(f"  Agujero {i} no abre hacia arriba")
        if p["x0"] < h["x0"] + 0.25 or p["x1"] > h["x1"] - 0.25:
            raise SystemExit(f"  Tetón {i} no cabe en X")
        if p["z0"] < h["z0"] + 0.02 or p["z1"] > h["z1"] - 0.02:
            raise SystemExit(f"  Tetón {i} no cabe en el grosor de la ranura")
        if p["y0"] < h["y0"] + 0.25:
            raise SystemExit(f"  Tetón {i} no cabe en el bolsillo")
        if p["y0"] >= fy1:
            raise SystemExit(f"  Tetón {i} no llega al suelo del nido")
    top = spec["lay"]["letter_top"]
    if spec["lay"]["nest_y0"] < top - 0.05:
        raise SystemExit(
            f"  Nido Y0 {spec['lay']['nest_y0']:.2f} corta las letras (alto {top:.2f} mm)"
        )
    print(
        f"  Encaje OK  ranura {SLOT_W:.1f} (grano {BEAN_T:.1f}, holgura Z {holgura_z:.2f} mm)  "
        f"{len(spec['fits'])} tetones Ø{PEG_D} en bolsillos Ø{PEG_HOLE_D} (abren ARRIBA)"
    )


def assert_encaje_mesh() -> None:
    """Grano montado no se come la cuna; tetones caen en los bolsillos."""
    spec = nest_spec()
    lay = spec["lay"]
    _, trimesh = _require_trimesh()
    grain = _mesh_to_tm(shifted(bean_body(), 0.0, lay["lift"], lay["dz"]))
    cuna = build_cuna_tm(True)
    try:
        inter = trimesh.boolean.intersection([grain, cuna], engine="manifold", check_volume=False)
    except Exception as err:
        raise SystemExit(f"  Encaje mesh: no pude cruzar grano y cuna: {err}") from err
    vol = 0.0 if inter is None or inter.is_empty else abs(float(inter.volume))
    print(f"  Encaje mesh: solape grano∩cuna = {vol:.1f} mm³")
    if vol > 120.0:
        raise SystemExit(f"  Grano y cuna se pisan ({vol:.0f} mm³). No imprimir.")
    for i, fit in enumerate(spec["fits"], 1):
        h = fit["hole"]
        p = fit["peg"]
        mx = 0.5 * (p["x0"] + p["x1"])
        mz = 0.5 * (p["z0"] + p["z1"])
        # El tetón sobresale al aire del nido; lo que importa es la raíz en el bolsillo.
        my = p["y0"] + 1.2
        if not (h["x0"] < mx < h["x1"] and h["y0"] < my < h["y1"] and h["z0"] < mz < h["z1"]):
            raise SystemExit(f"  Tetón {i} raíz ({mx:.1f},{my:.1f},{mz:.1f}) fuera del bolsillo")
    print("  Encaje mesh OK  tetones dentro · solape bajo")


def encaje_report() -> str:
    spec = nest_spec()
    lay = spec["lay"]
    z0, z1 = spec["grain_z0"], spec["grain_z1"]
    holgura_z = min(z0 - SLOT_Z0, SLOT_Z1 - z1)
    lines = [
        "Encaje grano ↔ cuna (mismas cifras, no adivinar)",
        "===============================================",
        "",
        "Montaje: cuna DE PIE. Grano de CANTO, se deja CAER de ARRIBA.",
        "Los tetones entran en bolsillos del suelo del nido. Abren hacia ARRIBA.",
        "No son agujeros de cara al cliente: delante hay pared (labio + frente).",
        "",
        f"Ranura Z  {SLOT_Z0:.2f} → {SLOT_Z1:.2f} mm  (hueco {SLOT_W:.2f})",
        f"Grano  Z  {z0:.2f} → {z1:.2f} mm  (grosor {BEAN_T:.2f}, holgura {holgura_z:.2f})",
        f"Suelo nido Y {spec['floor_y0']:.2f} → {spec['floor_y1']:.2f} mm",
        f"Nido Y     {lay['nest_y0']:.2f} → {lay['nest_y1']:.2f} mm",
        "",
    ]
    for i, fit in enumerate(spec["fits"], 1):
        p, h = fit["peg"], fit["hole"]
        lines.append(
            f"Tetón {i}  peg X[{p['x0']:.2f},{p['x1']:.2f}] Y[{p['y0']:.2f},{p['y1']:.2f}] Z[{p['z0']:.2f},{p['z1']:.2f}]"
        )
        lines.append(
            f"         hole X[{h['x0']:.2f},{h['x1']:.2f}] Y[{h['y0']:.2f},{h['y1']:.2f}] Z[{h['z0']:.2f},{h['z1']:.2f}]"
            f"  abre↑ y1={h['y1']:.2f} > suelo {spec['floor_y1']:.2f}"
        )
    lines.extend(
        [
            "",
            "Corte de lado (Z →, Y ↑). El cliente mira desde la derecha.",
            "",
            " Y",
            " |          labio",
            " |         #####          cara Freddo's",
            " |  ##      #   #         ranura (grano de canto)",
            " |  ##  ___ #   #",
            " |  ## |o o|#####         o = bolsillo ABRE ARRIBA (tetón cae aquí)",
            " |  ## |___|              frente tapado: no se ve de cara",
            " |  ##########            letras / placa",
            " |  ####################  pie",
            " +---------------------- Z",
            "  espalda              cara",
            "",
            "NO imprimir comprobar/conjunto-NO-IMPRIMIR.stl — solo para verlo montado.",
        ]
    )
    return "\n".join(lines) + "\n"


def verify_solid_stl(path: Path) -> None:
    _, trimesh = _require_trimesh()
    tm = trimesh.load(path, force="mesh")
    print(f"  check {path.name}: watertight={tm.is_watertight}  {len(tm.faces)} tri")
    if not tm.is_watertight:
        raise SystemExit(f"  {path.name} no es un sólido cerrado. No imprimir.")


def stand_black() -> Mesh:
    """Letras negras + pie + ranura. Un sólido cerrado para el slicer."""
    return _tm_to_mesh(build_cuna_tm(True), "cuna")


def conjunto_montado(cuna: Mesh | None = None) -> Mesh:
    """Grano ya metido en la cuna. Solo para ver. No imprimir."""
    lay = nest_layout()
    m = Mesh()
    m.extend(cuna if cuna is not None else stand_black())
    m.extend(shifted(bean_body(), 0.0, lay["lift"], lay["dz"]))
    return m


def stand_nest_only() -> Mesh:
    """Cuna de prueba: pie + nido, sin wordmark."""
    return _tm_to_mesh(build_cuna_tm(False), "cuna_test")


def bean_stub() -> Mesh:
    """Capó inferior del grano + tetones. Impresión corta para probar el encaje."""
    cut = BB[2] + 46.0
    ring = bean_outline(180)
    pts: list[tuple[float, float]] = []
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        in1, in2 = y1 <= cut, y2 <= cut
        if in1:
            pts.append((x1, y1))
        if in1 != in2:
            t = (cut - y1) / (y2 - y1 + 1e-18)
            pts.append((x1 + t * (x2 - x1), cut))
    m = Mesh()
    if len(pts) >= 4:
        m.extend(extrude(pts, 0.0, BEAN_T))
    for poly in peg_polys():
        m.extend(extrude(poly, 0.0, BEAN_T))
    return m


def stand_gold() -> Mesh:
    """Relieve del logo en la cara + firma pequena bajo las letras."""
    from instagram_logo import _shapely_extrude
    from shapely.geometry import Polygon

    glyphs, _letter_top = logo_glyphs_on_baseline()
    m = Mesh()
    for g in glyphs:
        poly = Polygon(g["outer"], g["holes"])
        if not poly.is_valid:
            poly = poly.buffer(0)
        m.extend(_shapely_extrude(poly, LETTER_Z1, LETTER_Z1 + LETTER_RELIEF))
    # Firma en la cara delantera del pie, debajo de Freddo's (visible al cliente).
    m.extend(
        shifted(
            text_mesh("NFCTAP.TECH", pixel=0.70, height=0.80, z0=FOOT_Z, advance=6),
            0.0,
            FOOT_PLATE_Y / 2,
        )
    )
    return m


# ---------------------------------------------------------------------------
# Preview + notas
# ---------------------------------------------------------------------------

def mounted_size() -> dict[str, float]:
    """Medidas del conjunto de pie (cuna + grano encajado)."""
    lay = nest_layout()
    ymin_m = lay["ymin"] + lay["lift"]
    ymax_m = BB[3] + lay["lift"]
    return {
        "alto": ymax_m,
        "letras_alto": lay["letter_top"],
        "nido_alto": NEST,
        "grano_alto": BEAN_H,
        "grano_ancho": BEAN_W,
        "ancho_pie": lay["foot_w"] + 8.0,
        "fondo_pie": FOOT_Z,
        "grano_grosor": BEAN_T,
        "holgura_ranura": SLOT_W - BEAN_T,
        "tetones": len(peg_sites()),
        "y_min": ymin_m,
        "y_max": ymax_m,
        "x_min": BB[0],
        "x_max": BB[1],
    }


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
  <text x="700" y="170" fill="#9a7a48" font-size="11">tetones + ranura 8,6 mm</text>
  <text x="700" y="248" fill="#9a7a48" font-size="11">Freddo's = cuna</text>
  <text x="700" y="274" fill="#9a7a48" font-size="11">pie {FOOT_Z:.0f} mm + cinta 3M</text>

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
1. GRANO rugby inclinado, S HUECA como el logo (se ve el aire).
   Los lóbulos son UNA pieza: carne en las puntas + enlace oculto en el nido.
   Disco amarillo + TAP negro. Dos NFC Ø25. Abajo: tetones.
2. CUNA = las letras del logo ENTERAS (no cortadas). Freddo's abajo.
   El grano CAE de arriba, nido DETRÁS/ENCIMA del wordmark:
   ranura 8,6 mm, labio 8,5 mm, nido 34 mm, agujeros de los tetones.
3. Firma en el pie, debajo de Freddo's: NFCTAP.TECH

Montaje
-------
        [        GRANO (de lado)        ]
        [   tetones → agujeros del nido ]
        [   ranura en lo alto de Freddo's ]
        [  F r e d d o ' s              ]
        [  NFCTAP.TECH                  ]
        [=========== pie {foot:.0f} mm =========]

Imprime
-------
ANTES de las 8 h: test-encaje/ (stub + cuna sin letras). Prueba el tap.

GRANO: solo 01 + 02. Agrupar. Pausa capa 24. NO Reparar.
CUNA:  solo 03 + 04. Agrupar. Negro=03, amarillo=04. Sin pausa.
       NO mezclar el grano en la misma cama.
       Coloca la cuna APOYADA EN LA ESPALDA (la cara plana trasera
       en la cama). Amarillo = último, la cara de Freddo's arriba.
       Sin soportes. Si avisa de regiones flotantes, está mal girada.

Al acabar: cuna DE PIE. Grano de canto, de ARRIBA, tetones primero. Clac.
Los agujeros del nido abren HACIA ARRIBA (caen los tetones). De cara al
cliente no se ven: delante hay pared. Si FlashPrint avisa de contornos
con geometría incorrecta, NO imprimas — el STL está mal.

Pie
---
Fondo 72 mm. Hueco único debajo, delante: caben 3 tuercas M8.
No se ve de cara. Se tapa con cinta 3M. Lastre + el stand pegado.
Sin cinta, un empujón alto vuelca cualquier PLA de 20 cm.

Colores: negro + amarillo. Los dos como PLA.
"""


def write_notes(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    dim = mounted_size()
    layer = pause_layer()
    (dest / "LEEME.txt").write_text(
        LEEME.format(foot=FOOT_Z) + (
            f"\nMedidas (80 % del original, NFC igual)\n"
            f"--------------------------------------\n"
            f"Alto montado sobre mesa: {dim['alto']:.0f} mm\n"
            f"Letras Freddo's (hasta la ranura): {dim['letras_alto']:.0f} mm\n"
            f"Grano suelto: {dim['grano_ancho']:.0f} × {dim['grano_alto']:.0f} × {dim['grano_grosor']:.0f} mm\n"
            f"Pie: {dim['ancho_pie']:.0f} mm de ancho × {dim['fondo_pie']:.0f} mm de fondo\n"
            f"Nido {NEST:.0f} mm · ranura {SLOT_W:.1f} mm (holgura {SLOT_W - BEAN_T:.1f}) · labio {LIP:.1f} mm\n"
            f"Tetones: {len(peg_sites())} × Ø{PEG_D:.1f} / agujero Ø{PEG_HOLE_D:.1f} × {PEG_LEN:.0f} mm\n"
            f"NFC: pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · pegatina Ø{STICKER_D:.0f} (no escala)\n"
        ),
        encoding="utf-8",
    )
    (dest / "PAUSA_NFC.txt").write_text(
        (
            "Pausa NFC — grano Freddo's (rugby)\n"
            "=================================\n"
            f"Altura: {Z_PAUSE:.2f} mm · capa {layer} (primera 0,25 + 0,20 mm)\n"
            f"Dos pozos: IZQ reseña · DER puntos. Mismo sistema que la genérica.\n"
            f"Pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · mira Ø{PAD_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Tapa encima: {COVER:.2f} mm\n\n"
            "Proyecto NUEVO. Importa 01_grano_negro + 02_grano_oro → Agrupar → NO Reparar.\n"
            "Rebanar 0,20 mm Standard @FF AD5X.\n"
            f"Slider a la capa {layer} (~{Z_PAUSE:.2f} mm): dos huecos + círculos amarillos.\n"
            f"Clic derecho → Añadir pausa.\n\n"
            "Cuando pare (mira desde ARRIBA):\n"
            "- Círculo amarillo = aquí la pegatina Timeskey Ø25.\n"
            "- Hundida, adhesivo ABAJO. Que no sobresalga. Continuar.\n"
            "- IZQ = RESEÑA (Google). DER = PUNTOS (club).\n"
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
        "escala": SCALE,
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
            "pad": PAD_D,
            "z_pause": Z_PAUSE,
            "layer": pause_layer(),
            "left": "TAP RESEÑA / Google",
            "right": "TAP PUNTOS / club",
        },
        "encaje": {
            "slot_w": SLOT_W,
            "lip": LIP,
            "nest": NEST,
            "sit": SIT,
            "peg_d": PEG_D,
            "peg_hole": PEG_HOLE_D,
            "peg_len": PEG_LEN,
            "pegs": [[round(x, 2), round(y, 2)] for x, y in peg_sites()],
            "s_hueca": True,
            "crease_span": CREASE_SPAN,
            "nest_web": NEST_WEB_H,
            "lastre_m8": LASTRE_R * 2,
        },
        "montado": {k: round(v, 1) for k, v in mounted_size().items()},
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
    dim = mounted_size()
    print(f"\nGenerando Freddo's  {SCALE:.0%}  rugby {BEAN_W:.0f}x{BEAN_H:.0f}x{BEAN_T:.0f} mm  tilt {math.degrees(BEAN_TILT):.0f}°")
    if dim["alto"] > MAX_ALTO + 0.05:
        raise SystemExit(f"  Alto montado {dim['alto']:.1f} mm > {MAX_ALTO:.0f} mm")
    print(f"  Montado alto {dim['alto']:.0f} mm (máx {MAX_ALTO:.0f})  pie {dim['ancho_pie']:.0f}x{dim['fondo_pie']:.0f} mm")
    print(f"  Encaje: ranura {SLOT_W}  labio {LIP}  nido {NEST}  tetones {len(peg_sites())}  S hueca")
    assert_encaje()
    print(f"  Pausa NFC capa {pause_layer()}  ({Z_PAUSE:.2f} mm)  pozo Ø{WELL_D:.0f} (no escala)")
    bean_body().write_stl(dest / "01_grano_negro.stl", "grano_negro")
    bean_gold().write_stl(dest / "02_grano_oro.stl", "grano_oro")
    cuna = stand_black()
    cuna.write_stl(dest / "03_cuna_letras_negras.stl", "cuna_letras")
    verify_solid_stl(dest / "03_cuna_letras_negras.stl")
    assert_encaje_mesh()
    stand_gold().write_stl(dest / "04_letras_oro.stl", "freddos")
    ver = dest / "comprobar"
    ver.mkdir(parents=True, exist_ok=True)
    conjunto_montado(cuna).write_stl(ver / "conjunto-NO-IMPRIMIR.stl", "conjunto")
    (ver / "ENCAJE.txt").write_text(encaje_report(), encoding="utf-8")
    (ver / "LEEME.txt").write_text(
        "NO IMPRIMIR este STL.\n"
        "Es el grano YA metido en la cuna, para verlo en FlashPrint.\n"
        "Si se ve el óvalo encajado de canto, tetones en el suelo del nido, OK.\n"
        "Lee ENCAJE.txt (mismas cifras del grano y de la cuna).\n"
        "Para fabricar: 01+02 (grano) y 03+04 (cuna), en dos camas.\n",
        encoding="utf-8",
    )
    test = dest / "test-encaje"
    test.mkdir(parents=True, exist_ok=True)
    bean_stub().write_stl(test / "01_stub_grano.stl", "stub_grano")
    stand_nest_only().write_stl(test / "02_cuna_nido.stl", "cuna_nido")
    verify_solid_stl(test / "02_cuna_nido.stl")
    (test / "LEEME.txt").write_text(
        "Test de encaje Freddo's (30-40 min, SIN NFC)\n"
        "===========================================\n"
        "01_stub_grano + 02_cuna_nido. Negro los dos.\n"
        "Cuna de pie. Stub de canto, tetones primero.\n"
        "Prueba: encajar, tap con un móvil, tirar hacia arriba, empujar.\n"
        "Si no sale ni baila, imprime la pieza buena (01-04).\n"
        "Pega cinta 3M bajo el pie ANTES de juzgar el vuelco.\n",
        encoding="utf-8",
    )
    write_preview(dest / "vista-previa.svg")
    write_notes(dest)
    for old in ("03_cuna_negra.stl", "04_letras_negras.stl", "05_letras_oro.stl"):
        p = dest / old
        if p.exists():
            p.unlink()
    print(f"  OK  {dest}")
    print(f"  Test encaje  {test}")


if __name__ == "__main__":
    generate()
