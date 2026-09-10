"""Logo Instagram (cámara con hueco real) + wordmark Avenir Next Demi.

FlashPrint rellenaba el icono porque el anillo no era un hueco de verdad.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_tarjetas import (  # noqa: E402
    Mesh,
    circle,
    rounded_rect,
    translate,
)

Poly = list[tuple[float, float]]

AVENIR = Path("/System/Library/Fonts/Avenir Next.ttc")
AVENIR_FACE = 5  # Medium: más cerca del wordmark oficial que el Demi Bold
CAM_STROKE = 0.088  # grosor del icono fino (el de la referencia)
_TOKEN = re.compile(r"([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)")


def _quad(p0, p1, p2, steps: int) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1.0 - t
        pts.append(
            (
                u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
            )
        )
    return pts


def _cubic(p0, p1, p2, p3, steps: int) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1.0 - t
        pts.append(
            (
                u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
            )
        )
    return pts


def svg_rings(d: str, steps: int = 7) -> list[Poly]:
    tokens = _TOKEN.findall(d)
    i = 0
    x = y = 0.0
    sx = sy = 0.0
    prev_cmd = ""
    prev_ctrl: tuple[float, float] | None = None
    ring: Poly = []
    rings: list[Poly] = []

    def take(n: int) -> list[float]:
        nonlocal i
        out: list[float] = []
        while len(out) < n and i < len(tokens):
            if tokens[i][1]:
                out.append(float(tokens[i][1]))
                i += 1
            else:
                break
        return out

    def close_ring() -> None:
        nonlocal ring
        if len(ring) >= 3:
            if abs(ring[0][0] - ring[-1][0]) < 1e-4 and abs(ring[0][1] - ring[-1][1]) < 1e-4:
                ring = ring[:-1]
            rings.append(ring)
        ring = []

    while i < len(tokens):
        kind, _num = tokens[i]
        if kind:
            cmd = kind
            i += 1
        elif prev_cmd:
            cmd = prev_cmd
        else:
            i += 1
            continue
        rel = cmd.islower()
        c = cmd.lower()
        if c == "m":
            close_ring()
            a = take(2)
            if len(a) < 2:
                break
            x = x + a[0] if rel else a[0]
            y = y + a[1] if rel else a[1]
            sx, sy = x, y
            ring.append((x, y))
            prev_cmd = "l" if cmd == "m" else "L"
            prev_ctrl = None
            while True:
                a = take(2)
                if len(a) < 2:
                    break
                x = x + a[0] if rel else a[0]
                y = y + a[1] if rel else a[1]
                ring.append((x, y))
            continue
        if c == "z":
            x, y = sx, sy
            close_ring()
            prev_cmd = ""
            prev_ctrl = None
            continue
        if c == "l":
            while True:
                a = take(2)
                if len(a) < 2:
                    break
                x = x + a[0] if rel else a[0]
                y = y + a[1] if rel else a[1]
                ring.append((x, y))
                prev_ctrl = None
            prev_cmd = cmd
            continue
        if c == "h":
            while True:
                a = take(1)
                if len(a) < 1:
                    break
                x = x + a[0] if rel else a[0]
                ring.append((x, y))
                prev_ctrl = None
            prev_cmd = cmd
            continue
        if c == "v":
            while True:
                a = take(1)
                if len(a) < 1:
                    break
                y = y + a[0] if rel else a[0]
                ring.append((x, y))
                prev_ctrl = None
            prev_cmd = cmd
            continue
        if c == "c":
            while True:
                a = take(6)
                if len(a) < 6:
                    break
                if rel:
                    p1, p2, p3 = (x + a[0], y + a[1]), (x + a[2], y + a[3]), (x + a[4], y + a[5])
                else:
                    p1, p2, p3 = (a[0], a[1]), (a[2], a[3]), (a[4], a[5])
                ring.extend(_cubic((x, y), p1, p2, p3, steps))
                prev_ctrl = p2
                x, y = p3
            prev_cmd = cmd
            continue
        if c == "q":
            while True:
                a = take(4)
                if len(a) < 4:
                    break
                if rel:
                    p1, p2 = (x + a[0], y + a[1]), (x + a[2], y + a[3])
                else:
                    p1, p2 = (a[0], a[1]), (a[2], a[3])
                ring.extend(_quad((x, y), p1, p2, steps))
                prev_ctrl = p1
                x, y = p2
            prev_cmd = cmd
            continue
        if c == "t":
            while True:
                a = take(2)
                if len(a) < 2:
                    break
                if prev_cmd.lower() in "qt" and prev_ctrl is not None:
                    p1 = (2 * x - prev_ctrl[0], 2 * y - prev_ctrl[1])
                else:
                    p1 = (x, y)
                p2 = (x + a[0], y + a[1]) if rel else (a[0], a[1])
                ring.extend(_quad((x, y), p1, p2, steps))
                prev_ctrl = p1
                x, y = p2
            prev_cmd = cmd
            continue
        i += 1
        prev_cmd = cmd
    close_ring()
    return rings


def _shapely_extrude(poly, z0: float, z1: float) -> Mesh:
    """Extruye un polígono (con huecos, cóncavo). La g ya no se corta."""
    import trimesh

    if poly is None or poly.is_empty:
        return Mesh()
    if not poly.is_valid:
        poly = poly.buffer(0)
    if poly.geom_type == "MultiPolygon":
        m = Mesh()
        for part in poly.geoms:
            m.extend(_shapely_extrude(part, z0, z1))
        return m
    if poly.geom_type != "Polygon" or poly.area < 0.05:
        return Mesh()
    tm = trimesh.creation.extrude_polygon(poly, height=z1 - z0)
    tm.apply_translation([0.0, 0.0, z0])
    out = Mesh()
    verts = tm.vertices
    for a, b, c in tm.faces:
        out.add(tuple(float(x) for x in verts[a]), tuple(float(x) for x in verts[b]), tuple(float(x) for x in verts[c]))
    return out


def _poly(pts: Poly):
    from shapely.geometry import Polygon

    p = Polygon(pts)
    if not p.is_valid:
        p = p.buffer(0)
    return p


def ig_camera_parts(cx: float, cy: float, size: float) -> dict[str, Poly]:
    segs = 18
    n = 56
    sw = size * CAM_STROKE
    r = size * 0.22
    inner_side = size - 2.0 * sw
    inner_r = max(0.6, r - sw)
    lens_out = size * 0.27
    lens_in = max(1.2, lens_out - sw)
    return {
        "outer": translate(rounded_rect(size, size, r, segs), cx, cy),
        "inner": translate(rounded_rect(inner_side, inner_side, inner_r, segs), cx, cy),
        "lens_out": circle(cx, cy, lens_out, n),
        "lens_in": circle(cx, cy, lens_in, n),
        "dot": circle(cx + size * 0.23, cy + size * 0.23, max(1.05, size * 0.048), 20),
    }


def ig_camera_mesh(cx: float, cy: float, size: float, z0: float, z1: float) -> Mesh:
    from shapely.ops import unary_union

    p = ig_camera_parts(cx, cy, size)
    frame = _poly(p["outer"]).difference(_poly(p["inner"]))
    lens = _poly(p["lens_out"]).difference(_poly(p["lens_in"]))
    dot = _poly(p["dot"])
    return _shapely_extrude(unary_union([frame, lens, dot]), z0, z1)


def ig_camera_svg(cx: float, cy: float, size: float, color: str) -> str:
    r = size * 0.22
    sw = size * CAM_STROKE
    x, y = cx - size / 2, cy - size / 2
    lens_r = size * 0.27 - sw / 2
    fx, fy = cx + size * 0.23, cy - size * 0.23
    dr = max(1.05, size * 0.048)
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{size:.1f}" height="{size:.1f}" rx="{r:.1f}" '
        f'fill="none" stroke="{color}" stroke-width="{sw:.1f}"/>'
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{lens_r:.1f}" fill="none" stroke="{color}" '
        f'stroke-width="{sw:.1f}"/>'
        f'<circle cx="{fx:.1f}" cy="{fy:.1f}" r="{dr:.1f}" fill="{color}"/>'
    )


def ig_camera_pil(draw, cx: float, cy: float, size: float, color: tuple[int, int, int]) -> None:
    r = size * 0.22
    sw = max(2, int(round(size * CAM_STROKE)))
    x0, y0 = cx - size / 2, cy - size / 2
    draw.rounded_rectangle((x0, y0, x0 + size, y0 + size), radius=r, outline=color, width=sw)
    lens_r = size * 0.27 - size * CAM_STROKE / 2
    draw.ellipse((cx - lens_r, cy - lens_r, cx + lens_r, cy + lens_r), outline=color, width=sw)
    dr = max(1.4, size * 0.048)
    fx, fy = cx + size * 0.23, cy - size * 0.23
    draw.ellipse((fx - dr, fy - dr, fx + dr, fy + dr), fill=color)


def _load_face():
    try:
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.ttLib.ttCollection import TTCollection
    except ImportError as exc:
        raise SystemExit(
            "Falta fonttools. Usa: .venv-mesh/bin/python disenos/generar_generica.py instagram"
        ) from exc
    if not AVENIR.exists():
        raise SystemExit(f"No está {AVENIR}")
    return TTCollection(str(AVENIR)).fonts[AVENIR_FACE], SVGPathPen


def _word_layout(h: float, tracking: float = 0.0) -> tuple[float, list[list[Poly]]]:
    font, SVGPathPen = _load_face()
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    os2 = font["OS/2"]
    cap = float(getattr(os2, "sCapHeight", 0) or 708.0)
    scale = h / cap
    glyphs: list[list[Poly]] = []
    pen_x = 0.0
    letters = list("Instagram")
    for i, ch in enumerate(letters):
        glyph = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        glyph.draw(pen)
        rings = [[(pen_x + px * scale, py * scale) for px, py in ring] for ring in svg_rings(pen.getCommands(), steps=8)]
        glyphs.append(rings)
        pen_x += glyph.width * scale
        if i < len(letters) - 1:
            pen_x += tracking
    return pen_x, glyphs


def ig_word_glyphs(cx: float, cy: float, h: float, tracking: float = 0.0) -> list[tuple[Poly, list[Poly]]]:
    width, glyphs = _word_layout(h, tracking)
    ox, oy = cx - width / 2.0, cy - h / 2.0
    out: list[tuple[Poly, list[Poly]]] = []
    for rings in glyphs:
        placed = [[(px + ox, py + oy) for px, py in ring] for ring in rings]
        if not placed:
            continue
        areas = [abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(r, r[1:] + r[:1]))) for r in placed]
        outer_i = max(range(len(placed)), key=lambda i: areas[i])
        out.append((placed[outer_i], [placed[i] for i in range(len(placed)) if i != outer_i]))
    return out


def ig_word_polys(cx: float, cy: float, h: float, tracking: float) -> list[Poly]:
    polys: list[Poly] = []
    for outer, holes in ig_word_glyphs(cx, cy, h, tracking):
        polys.append(outer)
        polys.extend(holes)
    return polys


def ig_word_mesh(cx: float, cy: float, h: float, tracking: float, z0: float, z1: float) -> Mesh:
    from shapely.geometry import Polygon

    m = Mesh()
    for outer, holes in ig_word_glyphs(cx, cy, h, tracking):
        try:
            poly = Polygon(outer, holes)
        except Exception:
            poly = _poly(outer)
        m.extend(_shapely_extrude(poly, z0, z1))
    return m


def ig_word_width(h: float, tracking: float) -> float:
    width, _glyphs = _word_layout(h, tracking)
    return width
