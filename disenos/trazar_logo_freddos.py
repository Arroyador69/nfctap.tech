#!/usr/bin/env python3
"""Traza el wordmark del logo Freddo's (PNG) a poligonos JSON."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "freddos_logo.png"
OUT = ROOT / "freddos_wordmark.json"


def rdp(pts: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a
    lab = np.hypot(*ab) or 1.0
    nrm = np.array([-ab[1], ab[0]]) / lab
    d = [abs(float(np.dot(np.array(p) - a, nrm))) for p in pts]
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(pts[: i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def contour_from(mask: np.ndarray, start: tuple[int, int]) -> list[tuple[int, int]]:
    """Moore-neighbor, 8-conectado, en sentido horario sobre el borde."""
    h, w = mask.shape
    y0, x0 = start
    # primer paso: vecino negro a la izquierda del primer pixel blanco
    back = (0, -1)
    dirs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    path = [(y0, x0)]
    y, x = y0, x0
    for _ in range(mask.size):
        bi = dirs.index(back)
        found = None
        for k in range(8):
            dy, dx = dirs[(bi + 1 + k) % 8]
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx]:
                found = (ny, nx, (-dy, -dx))
                break
        if found is None:
            break
        y, x, back = found
        if (y, x) == (y0, x0) and len(path) > 2:
            break
        path.append((y, x))
    return path


def all_contours(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    m = mask.copy()
    h, w = m.shape
    seen = np.zeros_like(m, dtype=bool)
    contours: list[list[tuple[int, int]]] = []
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if not m[y, x] or seen[y, x]:
                continue
            if m[y, x - 1]:
                continue
            path = contour_from(m, (y, x))
            if len(path) < 12:
                continue
            for py, px in path:
                seen[py, px] = True
            contours.append(path)
    return contours


def area(poly: list[tuple[float, float]]) -> float:
    a = 0.0
    for i, (x1, y1) in enumerate(poly):
        x2, y2 = poly[(i + 1) % len(poly)]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def point_in(poly: list[tuple[float, float]], x: float, y: float) -> bool:
    n = len(poly)
    inside = False
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xin = (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-9) + x1
            if x < xin:
                inside = not inside
    return inside


def extract() -> list[dict]:
    im = Image.open(SRC).convert("RGB")
    # Sin dilatar: la S del grano es un hueco fino y se cerraria.
    gray = im.convert("L")
    a = np.array(gray)
    mask = a > 115

    raw = all_contours(mask)
    simplified: list[list[tuple[float, float]]] = []
    for path in raw:
        # imagen: y crece hacia abajo. En STL y crece hacia arriba.
        pts = [(float(x), -float(y)) for y, x in path]
        pts = rdp(pts, 0.65)
        if len(pts) < 4:
            continue
        if abs(area(pts)) < 18:
            continue
        simplified.append(pts)

    simplified.sort(key=lambda p: abs(area(p)), reverse=True)
    used = [False] * len(simplified)
    glyphs: list[dict] = []
    for i, outer in enumerate(simplified):
        if used[i]:
            continue
        if area(outer) < 0:
            outer = list(reversed(outer))
        cx = sum(p[0] for p in outer) / len(outer)
        cy = sum(p[1] for p in outer) / len(outer)
        holes = []
        for j, cand in enumerate(simplified):
            if j == i or used[j]:
                continue
            qx, qy = sum(p[0] for p in cand) / len(cand), sum(p[1] for p in cand) / len(cand)
            if point_in(outer, qx, qy) and abs(area(cand)) < abs(area(outer)) * 0.8:
                hole = cand if area(cand) < 0 else list(reversed(cand))
                holes.append(hole)
                used[j] = True
        used[i] = True
        glyphs.append({"outer": outer, "holes": holes})

    # Orden de lectura (izquierda -> derecha).
    glyphs.sort(key=lambda g: min(p[0] for p in g["outer"]))
    return glyphs


def main() -> None:
    glyphs = extract()
    print(f"{len(glyphs)} glifos")
    for i, g in enumerate(glyphs):
        xs = [p[0] for p in g["outer"]]
        ys = [p[1] for p in g["outer"]]
        print(
            f"  {i} pts={len(g['outer']):4d} holes={len(g['holes'])} "
            f"x={min(xs):.0f}-{max(xs):.0f} y={min(ys):.0f}-{max(ys):.0f}"
        )
    OUT.write_text(json.dumps(glyphs), encoding="utf-8")
    print(f"OK {OUT}")


if __name__ == "__main__":
    main()
