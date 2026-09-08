"""Sans redondeada: extremos en cápsula, no cortes a 90°. TAP y NFCTAP.TECH."""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_tarjetas import (  # noqa: E402
    Mesh,
    circle,
    extrude,
    slanted_bar,
    stroke_arc,
)

Poly = list[tuple[float, float]]


def _dot(x: float, y: float, sw: float) -> Poly:
    return circle(x, y, sw / 2, 16)


def _bar(x0: float, y0: float, x1: float, y1: float, sw: float) -> list[Poly]:
    return [slanted_bar(x0, y0, x1, y1, sw), _dot(x0, y0, sw), _dot(x1, y1, sw)]


def _arc(cx: float, cy: float, r: float, a0: float, a1: float, sw: float, segs: int = 20) -> list[Poly]:
    e0 = (cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0)))
    e1 = (cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1)))
    return [stroke_arc(cx, cy, r, a0, a1, sw, segs), _dot(*e0, sw), _dot(*e1, sw)]


def _verts(h: float, sw: float, w: float) -> dict[str, list[Poly]]:
    r = sw / 2
    nh = h * 0.78
    tw = max(0.55, sw * 0.70)
    out: dict[str, list[Poly]] = {
        "A": [
            *_bar(sw * 0.20, r, w * 0.50, h - r, sw),
            *_bar(w - sw * 0.20, r, w * 0.50, h - r, sw),
            *_bar(w * 0.26, h * 0.34, w * 0.74, h * 0.34, sw),
        ],
        "C": [*_arc(w / 2, h / 2, h / 2 - r, 42, 318, sw, 22)],
        "E": [
            *_bar(r, r, r, h - r, sw),
            *_bar(r, h - r, w - r, h - r, sw),
            *_bar(r, h * 0.50, w * 0.72, h * 0.50, sw),
            *_bar(r, r, w - r, r, sw),
        ],
        "F": [
            *_bar(r, r, r, h - r, sw),
            *_bar(r, h - r, w - r, h - r, sw),
            *_bar(r, h * 0.52, w * 0.70, h * 0.52, sw),
        ],
        "H": [
            *_bar(r, r, r, h - r, sw),
            *_bar(w - r, r, w - r, h - r, sw),
            *_bar(r, h * 0.50, w - r, h * 0.50, sw),
        ],
        "N": [
            *_bar(r, r, r, h - r, sw),
            *_bar(w - r, r, w - r, h - r, sw),
            *_bar(r, h - r, w - r, r, sw),
        ],
        "P": [
            *_bar(r, r, r, h - r, sw),
            *_arc(r + min(w * 0.36, h * 0.23) * 0.92, h - r - min(w * 0.36, h * 0.23), min(w * 0.36, h * 0.23), 108, -108, sw, 20),
        ],
        "R": [
            *_bar(r, r, r, h - r, sw),
            *_arc(r + min(w * 0.36, h * 0.23), h - r - min(w * 0.36, h * 0.23), min(w * 0.36, h * 0.23), 90, -90, sw, 16),
            *_bar(w * 0.42, h * 0.48, w - r, r, sw),
        ],
        "S": [
            *_arc(w * 0.50, h * 0.70, min(w, h) * 0.30, 195, 15, sw, 16),
            *_arc(w * 0.50, h * 0.30, min(w, h) * 0.30, 15, -165, sw, 16),
        ],
        "T": [
            *_bar(r, h - r, w - r, h - r, sw),
            *_bar(w / 2, r, w / 2, h - r, sw),
        ],
        "Ñ": [
            *_bar(r, r, r, nh - r, sw),
            *_bar(w - r, r, w - r, nh - r, sw),
            *_bar(r, nh - r, w - r, r, sw),
            *_bar(w * 0.08, h * 0.88, w * 0.40, h * 0.99, tw),
            *_bar(w * 0.36, h * 0.99, w * 0.64, h * 0.86, tw),
            *_bar(w * 0.60, h * 0.86, w * 0.92, h * 0.97, tw),
        ],
        ".": [_dot(w / 2, r * 1.05, sw * 1.15)],
        " ": [],
    }
    return out


_WIDTH = {
    "A": 0.90,
    "C": 0.86,
    "E": 0.76,
    "F": 0.72,
    "H": 0.88,
    "N": 0.88,
    "Ñ": 0.88,
    "P": 0.78,
    "R": 0.84,
    "S": 0.78,
    "T": 0.86,
    ".": 0.36,
    " ": 0.40,
}


def word_polys(text: str, cx: float, cy: float, h: float, tracking: float) -> list[Poly]:
    sw = max(0.80, h * 0.145)
    glyphs: list[tuple[float, list[Poly]]] = []
    for ch in text.upper():
        unit = _WIDTH.get(ch, 0.8)
        w = unit * h
        glyphs.append((w, _verts(h, sw, w).get(ch, [])))
    if not glyphs:
        return []
    total = sum(w for w, _ in glyphs) + tracking * (len(glyphs) - 1)
    x = cx - total / 2
    y = cy - h / 2
    out: list[Poly] = []
    for w, polys in glyphs:
        for poly in polys:
            out.append([(px + x, py + y) for px, py in poly])
        x += w + tracking
    return out


def sans_word(text: str, cx: float, cy: float, h: float, tracking: float, z0: float, z1: float) -> Mesh:
    m = Mesh()
    for poly in word_polys(text, cx, cy, h, tracking):
        if len(poly) >= 3:
            m.extend(extrude(poly, z0, z1))
    return m
