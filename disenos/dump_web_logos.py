#!/usr/bin/env python3
"""Vuelca globo WhatsApp + wordmarks Helvetica/Avenir al visor 3D (mismos que el STL)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from instagram_logo import (  # noqa: E402
    _load_face as ig_face,
    ig_camera_parts,
    svg_rings,
)
import whatsapp_logo as wa_mod  # noqa: E402
from whatsapp_logo import (  # noqa: E402
    _load_face as wa_face,
    _subpath_poly,
    _wa_geoms,
    WORD as WA_WORD,
)

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "web" / "lib" / "logo-polys.json"

STAR_Y = 87.0
WORD_H = 8.0
WORD_TRACK = 0.35
WA_SIZE = 33.0
IG_SIZE = 33.0
STEPS = 16


def _r(v: float) -> float:
    return round(float(v), 3)


def densify(pts: list[tuple[float, float]], n: int) -> list[list[float]]:
    from shapely.geometry import LineString

    if len(pts) < 3:
        return [[_r(x), _r(y)] for x, y in pts]
    ring = list(pts)
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    line = LineString(ring)
    if line.length < 1e-6:
        return [[_r(x), _r(y)] for x, y in pts]
    return [[_r(line.interpolate(i / n, normalized=True).x), _r(line.interpolate(i / n, normalized=True).y)] for i in range(n)]


def as_poly(outer, holes):
    from shapely.geometry import Polygon

    p = Polygon(outer, holes)
    if not p.is_valid:
        p = p.buffer(0)
    if p.is_empty:
        return p
    return p.simplify(0.05, preserve_topology=True)


def rings_of(poly) -> tuple[list[list[float]], list[list[list[float]]]]:
    g = poly if poly.geom_type == "Polygon" else max(poly.geoms, key=lambda x: x.area)
    outer = [[_r(x), _r(y)] for x, y in g.exterior.coords[:-1]]
    holes = [[[_r(x), _r(y)] for x, y in r.coords[:-1]] for r in g.interiors]
    return outer, holes


def cap_tris(poly) -> list[list[list[float]]]:
    import trimesh

    if poly is None or poly.is_empty:
        return []
    if not poly.is_valid:
        poly = poly.buffer(0)
    if poly.geom_type == "MultiPolygon":
        out: list[list[list[float]]] = []
        for part in poly.geoms:
            out.extend(cap_tris(part))
        return out
    if poly.geom_type != "Polygon" or poly.area < 0.04:
        return []
    tm = trimesh.creation.extrude_polygon(poly, height=1.0)
    verts = tm.vertices
    zmin = float(verts[:, 2].min())
    faces: list[list[list[float]]] = []
    for a, b, c in tm.faces:
        if abs(float(verts[a][2]) - zmin) > 1e-5:
            continue
        if abs(float(verts[b][2]) - zmin) > 1e-5:
            continue
        if abs(float(verts[c][2]) - zmin) > 1e-5:
            continue
        faces.append(
            [
                [_r(verts[a][0]), _r(verts[a][1])],
                [_r(verts[b][0]), _r(verts[b][1])],
                [_r(verts[c][0]), _r(verts[c][1])],
            ]
        )
    return faces


def _layout(load_face, word: str, h: float, tracking: float):
    font, SVGPathPen = load_face()
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    os2 = font["OS/2"]
    cap = float(getattr(os2, "sCapHeight", 0) or 1000.0)
    scale = h / cap
    glyphs: list[list[list[tuple[float, float]]]] = []
    pen_x = 0.0
    letters = list(word)
    for i, ch in enumerate(letters):
        glyph = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        glyph.draw(pen)
        rings = [
            [(pen_x + px * scale, py * scale) for px, py in ring]
            for ring in svg_rings(pen.getCommands(), steps=STEPS)
        ]
        glyphs.append(rings)
        pen_x += glyph.width * scale
        if i < len(letters) - 1:
            pen_x += tracking
    return pen_x, glyphs


def _glyphs(load_face, word: str, cx: float, cy: float, h: float, tracking: float):
    width, glyphs = _layout(load_face, word, h, tracking)
    ox, oy = cx - width / 2.0, cy - h / 2.0
    out = []
    for rings in glyphs:
        placed = [[(px + ox, py + oy) for px, py in ring] for ring in rings]
        if not placed:
            continue
        areas = [
            abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(r, r[1:] + r[:1])))
            for r in placed
        ]
        outer_i = max(range(len(placed)), key=lambda i: areas[i])
        outer = placed[outer_i]
        holes = [placed[i] for i in range(len(placed)) if i != outer_i]
        poly = as_poly(outer, holes)
        if poly.is_empty:
            continue
        o, hs = rings_of(poly)
        out.append({"outer": o, "holes": hs, "tris": cap_tris(poly)})
    return out


def _ring(geom, n: int) -> list[list[float]]:
    g = geom if geom.geom_type == "Polygon" else max(geom.geoms, key=lambda x: x.area)
    return densify(list(g.exterior.coords), n)


def main() -> None:
    wa_mod._subpath_poly = lambda sub, samples: _subpath_poly(sub, max(samples, 400))
    _wa_geoms.cache_clear()
    bubble, hole, phone = _wa_geoms(WA_SIZE)
    ig = ig_camera_parts(0.0, 0.0, IG_SIZE)
    data = {
        "wa": {
            "outer": _ring(bubble, 96),
            "inner": _ring(hole, 72),
            "phone": _ring(phone, 80),
        },
        "ig": {
            "outer": [[_r(x), _r(y)] for x, y in ig["outer"]],
            "inner": [[_r(x), _r(y)] for x, y in ig["inner"]],
            "lens_out": [[_r(x), _r(y)] for x, y in ig["lens_out"]],
            "lens_in": [[_r(x), _r(y)] for x, y in ig["lens_in"]],
            "dot": [[_r(x), _r(y)] for x, y in ig["dot"]],
        },
        "wa_word": _glyphs(wa_face, WA_WORD, 0.0, STAR_Y, WORD_H, WORD_TRACK),
        "ig_word": _glyphs(ig_face, "Instagram", 0.0, STAR_Y, WORD_H, WORD_TRACK),
    }
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    wa_n = sum(len(g["tris"]) for g in data["wa_word"])
    ig_n = sum(len(g["tris"]) for g in data["ig_word"])
    print(f"OK {OUT}  WA {len(data['wa_word'])} letras/{wa_n} tris  IG {len(data['ig_word'])} letras/{ig_n} tris")


if __name__ == "__main__":
    main()
