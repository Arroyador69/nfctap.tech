"""Sans geométrico con tracking: TAP / RESEÑA se leen, no son píxeles."""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_tarjetas import (  # noqa: E402
    Mesh,
    circle,
    extrude,
    rectangle,
    slanted_bar,
    stroke_arc,
)

Poly = list[tuple[float, float]]


def _verts(h: float, sw: float, w: float) -> dict[str, list[Poly]]:
    def vert(x: float, y0: float, y1: float) -> Poly:
        return rectangle(sw, max(0.2, y1 - y0), x, (y0 + y1) / 2)

    def horz(x0: float, x1: float, y: float) -> Poly:
        return rectangle(max(0.2, x1 - x0), sw, (x0 + x1) / 2, y)

    return {
        "A": [
            slanted_bar(sw * 0.2, sw * 0.08, w / 2, h - sw * 0.08, sw),
            slanted_bar(w - sw * 0.2, sw * 0.08, w / 2, h - sw * 0.08, sw),
            horz(w * 0.24, w * 0.76, h * 0.36),
        ],
        "C": [stroke_arc(w / 2, h / 2, h / 2 - sw / 2, 48, 312, sw, 20)],
        "E": [
            vert(sw / 2, 0, h),
            horz(0, w, h - sw / 2),
            horz(0, w * 0.78, h * 0.50),
            horz(0, w, sw / 2),
        ],
        "F": [
            vert(sw / 2, 0, h),
            horz(0, w, h - sw / 2),
            horz(0, w * 0.72, h * 0.52),
        ],
        "H": [
            vert(sw / 2, 0, h),
            vert(w - sw / 2, 0, h),
            horz(0, w, h * 0.50),
        ],
        "N": [
            vert(sw / 2, 0, h),
            vert(w - sw / 2, 0, h),
            slanted_bar(sw, h - sw * 0.3, w - sw, sw * 0.3, sw),
        ],
        "P": [
            vert(sw / 2, 0, h),
            horz(0, w - sw * 0.15, h - sw / 2),
            horz(0, w - sw * 0.15, h * 0.48),
            vert(w - sw / 2, h * 0.48, h),
        ],
        "R": [
            vert(sw / 2, 0, h),
            horz(0, w - sw * 0.15, h - sw / 2),
            horz(0, w - sw * 0.15, h * 0.50),
            vert(w - sw / 2, h * 0.50, h),
            slanted_bar(w * 0.42, h * 0.48, w - sw * 0.15, sw * 0.12, sw),
        ],
        "S": [
            stroke_arc(w / 2, h * 0.72, w * 0.36, 210, 20, sw, 16),
            stroke_arc(w / 2, h * 0.28, w * 0.36, 30, -160, sw, 16),
        ],
        "T": [horz(0, w, h - sw / 2), vert(w / 2, 0, h - sw)],
        "Ñ": [
            vert(sw / 2, 0, h * 0.86),
            vert(w - sw / 2, 0, h * 0.86),
            slanted_bar(sw, h * 0.86 - sw * 0.3, w - sw, sw * 0.25, sw),
            stroke_arc(w / 2, h * 0.94, w * 0.28, 200, 340, sw * 0.7, 10),
        ],
        ".": [rectangle(sw * 1.1, sw * 1.1, w / 2, sw * 0.55)],
        " ": [],
    }


_WIDTH = {
    "A": 0.92,
    "C": 0.88,
    "E": 0.78,
    "F": 0.74,
    "H": 0.90,
    "N": 0.90,
    "Ñ": 0.90,
    "P": 0.80,
    "R": 0.84,
    "S": 0.82,
    "T": 0.84,
    ".": 0.38,
    " ": 0.42,
}


def sans_word(text: str, cx: float, cy: float, h: float, tracking: float, z0: float, z1: float) -> Mesh:
    """Texto centrado. `tracking` = hueco extra entre letras (mm)."""
    sw = max(0.85, h * 0.16)
    glyphs: list[tuple[float, list[Poly]]] = []
    for ch in text.upper():
        unit = _WIDTH.get(ch, 0.8)
        w = unit * h
        glyphs.append((w, _verts(h, sw, w).get(ch, [])))
    if not glyphs:
        return Mesh()
    total = sum(w for w, _ in glyphs) + tracking * (len(glyphs) - 1)
    x = cx - total / 2
    y = cy - h / 2
    m = Mesh()
    for w, polys in glyphs:
        for poly in polys:
            m.extend(extrude([(px + x, py + y) for px, py in poly], z0, z1))
        x += w + tracking
    return m
