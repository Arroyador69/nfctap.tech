"""Logo WhatsApp (globo + teléfono con huecos reales) + wordmark Helvetica Bold."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from instagram_logo import (  # noqa: E402
    _poly,
    _shapely_extrude,
    svg_rings,
)
from generar_tarjetas import Mesh  # noqa: E402

Poly = list[tuple[float, float]]

HERE = Path(__file__).resolve().parent
GLYPHS = HERE / "whatsapp_logo.json"
HELVETICA = Path("/System/Library/Fonts/Helvetica.ttc")
HELVETICA_FACE = 1  # Helvetica Bold ≈ wordmark de la referencia
WORD = "WhatsApp"


def _load_raw() -> tuple[Poly, Poly, Poly]:
    data = json.loads(GLYPHS.read_text(encoding="utf-8"))
    bubble, phone = data
    return bubble["outer"], bubble["holes"][0], phone["outer"]


def _xform(pts: Poly, s: float, ox: float, oy: float, cx: float, cy: float) -> Poly:
    return [((x - ox) * s + cx, (y - oy) * s + cy) for x, y in pts]


def wa_logo_parts(cx: float, cy: float, size: float) -> dict[str, Poly]:
    outer, hole, phone = _load_raw()
    ys = [p[1] for p in outer]
    h = max(ys) - min(ys)
    s = size / h
    # Centro = centro del hueco interior (sitio del NFC).
    hx = sum(p[0] for p in hole) / len(hole)
    hy = sum(p[1] for p in hole) / len(hole)
    return {
        "outer": _xform(outer, s, hx, hy, cx, cy),
        "inner": _xform(hole, s, hx, hy, cx, cy),
        "phone": _xform(phone, s, hx, hy, cx, cy),
    }


def wa_logo_shape(cx: float, cy: float, size: float):
    from shapely.ops import unary_union

    p = wa_logo_parts(cx, cy, size)
    ring = _poly(p["outer"]).difference(_poly(p["inner"]))
    return unary_union([ring, _poly(p["phone"])])


def wa_logo_mesh(cx: float, cy: float, size: float, z0: float, z1: float) -> Mesh:
    return _shapely_extrude(wa_logo_shape(cx, cy, size), z0, z1)


def wa_logo_svg_placed(parts_px: dict[str, list[tuple[float, float]]], color: str) -> str:
    def d(poly: list[tuple[float, float]]) -> str:
        return "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in poly) + " Z"

    bubble = d(parts_px["outer"]) + " " + d(parts_px["inner"])
    return (
        f'<path d="{bubble}" fill="{color}" fill-rule="evenodd"/>'
        f'<path d="{d(parts_px["phone"])}" fill="{color}"/>'
    )


def wa_logo_pil(draw, parts_px: dict[str, list[tuple[float, float]]], acc, body) -> None:
    draw.polygon(parts_px["outer"], fill=acc)
    draw.polygon(parts_px["inner"], fill=body)
    draw.polygon(parts_px["phone"], fill=acc)


def _load_face():
    try:
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.ttLib.ttCollection import TTCollection
    except ImportError as exc:
        raise SystemExit(
            "Falta fonttools. Usa: .venv-mesh/bin/python disenos/generar_generica.py whatsapp"
        ) from exc
    if not HELVETICA.exists():
        raise SystemExit(f"No está {HELVETICA}")
    return TTCollection(str(HELVETICA)).fonts[HELVETICA_FACE], SVGPathPen


def _word_layout(h: float, tracking: float = 0.0) -> tuple[float, list[list[Poly]]]:
    font, SVGPathPen = _load_face()
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    os2 = font["OS/2"]
    cap = float(getattr(os2, "sCapHeight", 0) or 1474.0)
    scale = h / cap
    glyphs: list[list[Poly]] = []
    pen_x = 0.0
    letters = list(WORD)
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


def wa_word_glyphs(cx: float, cy: float, h: float, tracking: float = 0.0) -> list[tuple[Poly, list[Poly]]]:
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


def wa_word_mesh(cx: float, cy: float, h: float, tracking: float, z0: float, z1: float) -> Mesh:
    from shapely.geometry import Polygon

    m = Mesh()
    for outer, holes in wa_word_glyphs(cx, cy, h, tracking):
        try:
            poly = Polygon(outer, holes)
        except Exception:
            poly = _poly(outer)
        m.extend(_shapely_extrude(poly, z0, z1))
    return m


def wa_word_width(h: float, tracking: float) -> float:
    width, _glyphs = _word_layout(h, tracking)
    return width
