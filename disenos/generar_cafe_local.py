#!/usr/bin/env python3
"""Café Local Fuengirola — O tipográfica NFC en base ranura Ø110.

La O del logo LOCAL (Ravi), hueco central, carne unida alrededor.
No es atril: cae de CANTO en la base estándar (misma que copa/wifi-palo).
Se pone y se quita en un segundo.

Cara (de arriba a abajo en cada barra):
  LOCAL
  G Google + TAP HERE + NFC     |     Instagram + TAP HERE + NFC
  SIN RODEOS
  tetón → ranura base Ø110

Piezas AD5X
-----------
  01_base.stl           disco Ø110 negro + ranura
  05_base_tap.stl       nfctap.tech blanco · AGRUPAR 01
  03_cara_negro.stl     O + palo + tetón + pozos
  04_cara_blanco.stl    LOCAL · G · IG · TAP HERE · SIN RODEOS · miras

Agrupar 03+04 (cara). Agrupar 01+05 (base). Pausa NFC en la cara.
"""

from __future__ import annotations

import json
import math
import struct
import sys
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generar_copa_nfc import (  # noqa: E402
    BASE_D,
    BOSS_H,
    FACE_T,
    FIRST_LAYER,
    HELVETICA,
    LAYER_H,
    PLATE_T,
    SEAT_D,
    SLOT_COPA_CLEAR,
    SLOT_COPA_DEPTH,
    SLOT_COPA_LEN,
    SLOT_COPA_W,
    TENON_H,
    TENON_W,
    WELL_D,
    Z_FLOOR,
    Z_GUIDE,
    Z_PAUSE,
    _mesh_to_tm,
    _poly,
    _shapely_extrude,
    _tm_to_mesh,
    mesh_base,
    mesh_base_tap,
    pause_layer,
)
from generar_freddos import (  # noqa: E402
    _csg_diff,
    _placed_word_poly,
    _ttf_word_mesh,
)
from generar_tarjetas import Mesh, circle, google_g_mesh  # noqa: E402
from instagram_logo import ig_camera_mesh  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl" / "cafe-local-fuengirola"
SRC = OUT / "fuente-ravi"
O_STL = SRC / "Cafe-Local-Logo-Azul.stl"
LETRAS_STL = SRC / "Cafe-Local-Letras-Blancas.stl"

# O de Ravi 32×51; pared ~9,6 mm. Pozo Ø28 + carne → escala ≥ 3,55.
SRC_WALL = 9.573
WALL_MARGIN = 3.2
SCALE = (WELL_D + 2.0 * WALL_MARGIN) / SRC_WALL  # ≈ 3.593

CARA_T = FACE_T  # 3.40 — contrato ranura
RELIEF = 0.70
PAD_D = 24.0
PAD_H = 0.35
RING_H = 0.30
STICKER_D = 25.0

STEM_W = 6.0
STEM_H = 30.0
STEM_INTO = 5.0
STEM_FLARE = 3.0

LOCAL_H = 10.5
LOGO_SIZE = 22.0  # G Ø y cámara IG (caben en la barra ~34 mm)
TAP_H = 4.6
TAP_TRACK = 0.45
SLOGAN_H = 6.0
SLOGAN_TRACK = 0.75

CW = {
    "nombre": "cafe-local-fuengirola",
    "cuerpo": "negro",
    "acento": "blanco",
    "hex_cuerpo": "#141416",
    "hex_acento": "#F4F1EA",
    "hex_fondo": "#E8EEF0",
    "hex_nfc": "#2A9B9B",
    "soporte": "ranura-estable",
    "base_d": BASE_D,
}


# ---------------------------------------------------------------------------
# Contornos Ravi
# ---------------------------------------------------------------------------

def _stl_top_loops(path: Path) -> list[list[tuple[float, float]]]:
    data = path.read_bytes()
    n = struct.unpack_from("<I", data, 80)[0]
    edges: dict[tuple, int] = defaultdict(int)
    z_top = None
    off = 84
    tris = []
    for _ in range(n):
        nx, ny, nz = struct.unpack_from("<fff", data, off)
        vs = []
        for j in range(3):
            x, y, z = struct.unpack_from("<fff", data, off + 12 + j * 12)
            vs.append((x, y, z))
            if z_top is None or z > z_top:
                z_top = z
        tris.append((nz, vs))
        off += 50
    assert z_top is not None
    for nz, vs in tris:
        if nz < 0.45 or any(abs(v[2] - z_top) > 0.08 for v in vs):
            continue
        pts = [(round(v[0], 4), round(v[1], 4)) for v in vs]
        for a, b in ((0, 1), (1, 2), (2, 0)):
            e = tuple(sorted((pts[a], pts[b])))
            edges[e] += 1
    boundary = [e for e, c in edges.items() if c == 1]
    adj: dict[tuple, list] = defaultdict(list)
    for a, b in boundary:
        adj[a].append(b)
        adj[b].append(a)

    def trace(start):
        loop = [start]
        prev = None
        cur = start
        for _ in range(5000):
            nbrs = adj[cur]
            nxt = next((c for c in nbrs if c != prev), None)
            if nxt is None or nxt == start:
                break
            loop.append(nxt)
            prev, cur = cur, nxt
        return loop

    used: set = set()
    loops = []
    for a, _b in boundary:
        if a in used:
            continue
        loop = trace(a)
        for p in loop:
            used.add(p)
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def _area(loop: list[tuple[float, float]]) -> float:
    return abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(loop, loop[1:] + loop[:1]))) / 2.0


def _bbox(loop: list[tuple[float, float]]):
    xs = [p[0] for p in loop]
    ys = [p[1] for p in loop]
    return min(xs), max(xs), min(ys), max(ys)


def _pip(x: float, y: float, poly: list[tuple[float, float]]) -> bool:
    ok = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-18) + x1:
            ok = not ok
    return ok


@lru_cache(maxsize=1)
def o_rings_src() -> tuple[list[tuple[float, float]], list[tuple[float, float]]]:
    loops = _stl_top_loops(O_STL)
    if len(loops) < 2:
        raise SystemExit("La O de Ravi debe tener contorno + hueco")
    loops = sorted(loops, key=_area, reverse=True)
    return loops[0], loops[1]


@lru_cache(maxsize=1)
def local_letter_polys_src():
    loops = _stl_top_loops(LETRAS_STL)
    outers, holes = [], []
    for L in loops:
        (outers if _area(L) >= 10.0 else holes).append(L)
    glyphs = []
    for outer in sorted(outers, key=lambda L: (_bbox(L)[0] + _bbox(L)[1]) / 2):
        own = []
        for h in holes:
            cx = sum(p[0] for p in h) / len(h)
            cy = sum(p[1] for p in h) / len(h)
            if _pip(cx, cy, outer):
                own.append(h)
        glyphs.append((outer, own))
    if len(glyphs) != 5:
        raise SystemExit(f"LOCAL: esperaba 5 letras, hay {len(glyphs)}")
    return glyphs


def _o_y_offset() -> float:
    """Desplaza la O para que su base quede sobre el palo (tetón en Y=0)."""
    outer, _ = o_rings_src()
    _, _, oy0, _ = _bbox(outer)
    return TENON_H + STEM_H - oy0 * SCALE


def _map_pt(p: tuple[float, float]) -> tuple[float, float]:
    return (p[0] * SCALE, p[1] * SCALE + _o_y_offset())


def _map_loop(loop: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return [_map_pt(p) for p in loop]


@lru_cache(maxsize=1)
def o_shape():
    from shapely.geometry import Polygon

    outer, hole = o_rings_src()
    poly = Polygon(_map_loop(outer), [_map_loop(hole)])
    if not poly.is_valid:
        poly = poly.buffer(0)
    if poly.is_empty:
        raise SystemExit("O vacía")
    return poly


@lru_cache(maxsize=1)
def o_bbox() -> tuple[float, float, float, float]:
    minx, miny, maxx, maxy = o_shape().bounds
    return float(minx), float(maxx), float(miny), float(maxy)


def stem_and_tenon_shape():
    """Palo + tetón + flare bajo la O (una pieza con la cara)."""
    from shapely.geometry import box
    from shapely.ops import unary_union

    x0, x1, y0, _y1 = o_bbox()
    tenon = box(-TENON_W / 2, 0.0, TENON_W / 2, TENON_H)
    stem = box(-STEM_W / 2, TENON_H - 0.2, STEM_W / 2, y0 + STEM_INTO)
    flare = box(-STEM_W / 2 - STEM_FLARE, y0 - 0.5, STEM_W / 2 + STEM_FLARE, y0 + 6.0)
    # Puente ancho bajo la O: tapa el hueco raro pie/muesca en el centro
    bridge = box(x0 * 0.22, y0 - 1.0, x1 * 0.22, y0 + 4.5)
    geom = unary_union([tenon, stem, flare, bridge])
    if geom.is_empty:
        raise SystemExit("palo vacío")
    return geom


def cara_outline():
    """O + palo = silueta negra de la cara (hueco central intacto)."""
    from shapely.ops import unary_union

    o = o_shape()
    stem = stem_and_tenon_shape()
    union = unary_union([o, stem])
    # El hueco central de la O debe seguir abierto
    if union.geom_type != "Polygon" or not union.interiors:
        # Reaplicar el hueco
        from shapely.geometry import Polygon

        outer, hole = o_rings_src()
        hole_p = Polygon(_map_loop(hole))
        union = union.difference(hole_p.buffer(0))
    overlap = stem.intersection(o).area
    if overlap < 20.0:
        raise SystemExit(f"palo no engrana con la O (solape {overlap:.1f})")
    return union.buffer(0)


def nfc_centers() -> tuple[tuple[float, float], tuple[float, float]]:
    """Centros en barras laterales, bajo TAP HERE (G/IG arriba)."""
    outer, hole = o_rings_src()
    ox0, ox1, oy0, oy1 = _bbox(outer)
    hx0, hx1, hy0, hy1 = _bbox(hole)
    lx = (ox0 + hx0) / 2.0
    rx = (ox1 + hx1) / 2.0
    # Entre muescas: izq ~-14…-5, der ~8…14. Un poco bajo el 0 = carne limpia
    # y sitio arriba para logo + TAP sin entrar en la barra de LOCAL.
    cy = -1.0
    return (_map_pt((lx, cy)), _map_pt((rx, cy)))


def layout_y() -> dict[str, float]:
    """Y de textos/logos derivados de los NFC y barras."""
    (lx, ly), (_rx, _ry) = nfc_centers()
    outer, hole = o_rings_src()
    _ox0, _ox1, oy0, oy1 = _bbox(outer)
    _hx0, _hx1, hy0, hy1 = _bbox(hole)
    top_cy = _map_pt((0.0, (hy1 + oy1) / 2.0))[1]
    bot_cy = _map_pt((0.0, (oy0 + hy0) / 2.0))[1]
    tap_cy = ly + WELL_D / 2 + 6.5
    logo_cy = tap_cy + TAP_H * 2.05 + LOGO_SIZE / 2 + 1.2
    # No subir el logo a la barra de LOCAL (borde superior del hueco)
    hole_top = _map_pt((0.0, hy1))[1]
    if logo_cy + LOGO_SIZE / 2 > hole_top - 1.5:
        logo_cy = hole_top - 1.5 - LOGO_SIZE / 2
    return {
        "local": top_cy,
        "logo": logo_cy,
        "tap": tap_cy,
        "nfc": ly,
        "slogan": bot_cy,
        "lx": lx,
        "rx": nfc_centers()[1][0],
    }


def local_wordmark_shape(cx: float, cy: float, height: float):
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    glyphs = local_letter_polys_src()
    all_pts = [p for outer, _ in glyphs for p in outer]
    _, _, y0, y1 = _bbox(all_pts)
    s = height / (y1 - y0)
    xs = [p[0] for p in all_pts]
    src_cx = (min(xs) + max(xs)) / 2.0
    src_cy = (y0 + y1) / 2.0
    parts = []
    for outer, holes in glyphs:
        o = [((x - src_cx) * s + cx, (y - src_cy) * s + cy) for x, y in outer]
        hs = [[((x - src_cx) * s + cx, (y - src_cy) * s + cy) for x, y in h] for h in holes]
        poly = Polygon(o, hs)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if not poly.is_empty:
            parts.append(poly)
    mark = unary_union(parts).buffer(0.10)
    if mark.is_empty:
        raise SystemExit("LOCAL vacío")
    return mark


def _circle(cx: float, cy: float, r: float, n: int = 48):
    from shapely.geometry import Point

    return Point(cx, cy).buffer(r, resolution=n)


# ---------------------------------------------------------------------------
# Sólidos
# ---------------------------------------------------------------------------

def _nfc_cuts():
    cuts = []
    for cx, cy in nfc_centers():
        cuts.append(
            _mesh_to_tm(_shapely_extrude(_poly(circle(cx, cy, SEAT_D / 2, 32)), Z_FLOOR, Z_GUIDE + 0.05))
        )
        cuts.append(
            _mesh_to_tm(_shapely_extrude(_poly(circle(cx, cy, WELL_D / 2, 40)), Z_GUIDE - 0.05, Z_PAUSE))
        )
    return cuts


def mesh_cara_negro() -> Mesh:
    from shapely.geometry import Point

    plate = cara_outline()
    for name, (cx, cy) in (("izq", nfc_centers()[0]), ("der", nfc_centers()[1])):
        ring = Point(cx, cy).buffer(WELL_D / 2 + 0.2, resolution=40)
        if plate.intersection(ring).area < ring.area * 0.97:
            raise SystemExit(f"NFC {name} Ø{WELL_D:.0f} no cabe en la barra")
    solid = _mesh_to_tm(_shapely_extrude(plate, 0.0, CARA_T))
    return _tm_to_mesh(_csg_diff(solid, _nfc_cuts(), "cara_negro"), "cara_negro")


def nfc_mira() -> Mesh:
    m = Mesh()
    for cx, cy in nfc_centers():
        pad = _circle(cx, cy, PAD_D / 2, 36)
        ring = _circle(cx, cy, WELL_D / 2 - 0.20, 40).difference(
            _circle(cx, cy, SEAT_D / 2 + 0.20, 36)
        )
        m.extend(_shapely_extrude(pad, Z_FLOOR, Z_FLOOR + PAD_H))
        m.extend(_shapely_extrude(ring, Z_GUIDE, Z_GUIDE + RING_H))
    return m


def mesh_cara_blanco() -> Mesh:
    """Blanco: LOCAL · G · IG · TAP HERE ×2 · SIN RODEOS · miras."""
    from shapely.ops import unary_union

    lay = layout_y()
    o = o_shape()
    safe = o.buffer(-0.35)
    z0, z1 = CARA_T, CARA_T + RELIEF
    m = nfc_mira()

    # LOCAL
    local = local_wordmark_shape(0.0, lay["local"], LOCAL_H).intersection(safe)
    if local.is_empty or local.area < 80:
        raise SystemExit("LOCAL no cabe en la barra superior")
    m.extend(_shapely_extrude(local, z0, z1))

    # G Google (izquierda) + Instagram (derecha)
    g_r = LOGO_SIZE / 2
    m.extend(google_g_mesh(lay["lx"], lay["logo"], g_r, z0, z1 + 0.05))
    m.extend(ig_camera_mesh(lay["rx"], lay["logo"], LOGO_SIZE, z0, z1 + 0.05))

    # TAP HERE apilado bajo cada logo
    for cx in (lay["lx"], lay["rx"]):
        y = lay["tap"] + TAP_H * 0.55
        parts = []
        for word in ("TAP", "HERE"):
            poly = _placed_word_poly(
                word, cx, y, TAP_H, HELVETICA, face=1, tracking=TAP_TRACK, xy_pad=0.08
            )
            clipped = poly.intersection(safe)
            if clipped.is_empty or clipped.area < poly.area * 0.5:
                raise SystemExit(f"'{word}' se sale en x={cx:.1f}")
            parts.append(clipped)
            y -= TAP_H + 0.95
        m.extend(_shapely_extrude(unary_union(parts), z0, z1))

    # SIN RODEOS
    slogan = _placed_word_poly(
        "SIN RODEOS", 0.0, lay["slogan"], SLOGAN_H, HELVETICA, face=1, tracking=SLOGAN_TRACK, xy_pad=0.10
    ).intersection(safe)
    if slogan.is_empty:
        raise SystemExit("SIN RODEOS no cabe")
    m.extend(_shapely_extrude(slogan, z0, z1))
    return m


def _map_mesh(src: Mesh, fn) -> Mesh:
    out = Mesh()
    for a, b, c in src.tris:
        out.add(fn(a), fn(b), fn(c))
    return out


def mesh_cara_montada(src: Mesh) -> Mesh:
    """Cara mirando +Y. Grosor → eje Y (cae de canto en la ranura)."""
    return _map_mesh(src, lambda p: (p[0], p[2] - CARA_T / 2, p[1]))


def meshes_montados() -> dict[str, Mesh]:
    def yup(m: Mesh) -> Mesh:
        return _map_mesh(m, lambda p: (p[0], p[2], -p[1]))

    negro = Mesh()
    negro.extend(mesh_base())
    negro.extend(mesh_cara_montada(mesh_cara_negro()))
    blanco = Mesh()
    blanco.extend(mesh_cara_montada(mesh_cara_blanco()))
    blanco.extend(mesh_base_tap())
    return {"negro": yup(negro), "blanco": yup(blanco)}


# ---------------------------------------------------------------------------
# Docs / preview / propuesta
# ---------------------------------------------------------------------------

def write_preview_png(path: Path) -> None:
    from PIL import Image, ImageDraw

    lay = layout_y()
    x0, x1, y0, y1 = o_bbox()
    (lx, ly), (rx, ry) = nfc_centers()
    pad, sc = 24.0, 3.8
    y_min = 0.0
    W = int((x1 - x0 + pad * 2 + 20) * sc)
    H = int((y1 - y_min + pad * 2 + BASE_D * 0.15) * sc)
    img = Image.new("RGB", (W, H), CW["hex_fondo"])
    dr = ImageDraw.Draw(img)

    def sx(x: float) -> float:
        return (x - x0 + pad + 10) * sc

    def sy(y: float) -> float:
        return (y1 + pad - y) * sc

    def draw_poly(poly, fill: str) -> None:
        if poly is None or poly.is_empty:
            return
        geoms = list(poly.geoms) if poly.geom_type == "MultiPolygon" else [poly]
        for g in geoms:
            dr.polygon([(sx(x), sy(y)) for x, y in g.exterior.coords], fill=fill)
            for ring in g.interiors:
                dr.polygon([(sx(x), sy(y)) for x, y in ring.coords], fill=CW["hex_fondo"])

    # Base disco (vista frontal esquemática)
    br = BASE_D / 2 * 0.55 * sc
    bx, by = sx(0), sy(-8)
    dr.ellipse([bx - br, by - br * 0.22, bx + br, by + br * 0.22], fill=CW["hex_cuerpo"])

    draw_poly(cara_outline(), CW["hex_cuerpo"])
    for cx, cy in ((lx, ly), (rx, ry)):
        r = WELL_D / 2 * sc
        dr.ellipse([sx(cx) - r, sy(cy) - r, sx(cx) + r, sy(cy) + r], fill="#0a0a0a", outline=CW["hex_nfc"], width=2)
        r2 = PAD_D / 2 * sc
        dr.ellipse([sx(cx) - r2, sy(cy) - r2, sx(cx) + r2, sy(cy) + r2], fill=CW["hex_acento"])

    # Textos aproximados
    from PIL import ImageFont

    try:
        font_l = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(LOCAL_H * sc * 0.9))
        font_t = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(TAP_H * sc))
        font_s = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(SLOGAN_H * sc * 0.85))
    except OSError:
        font_l = font_t = font_s = ImageFont.load_default()
    acc = CW["hex_acento"]
    dr.text((sx(0), sy(lay["local"])), "LOCAL", fill=acc, font=font_l, anchor="mm")
    dr.text((sx(0), sy(lay["slogan"])), "SIN RODEOS", fill=acc, font=font_s, anchor="mm")
    for cx in (lx, rx):
        dr.text((sx(cx), sy(lay["tap"] + TAP_H)), "TAP", fill=acc, font=font_t, anchor="mm")
        dr.text((sx(cx), sy(lay["tap"] - 0.5)), "HERE", fill=acc, font=font_t, anchor="mm")
    # Logos esquemáticos
    gr = LOGO_SIZE / 2 * sc
    dr.ellipse([sx(lx) - gr, sy(lay["logo"]) - gr, sx(lx) + gr, sy(lay["logo"]) + gr], outline=acc, width=max(2, int(sc * 0.7)))
    dr.text((sx(lx), sy(lay["logo"])), "G", fill=acc, font=font_l, anchor="mm")
    ig = LOGO_SIZE / 2 * sc
    dr.rounded_rectangle(
        [sx(rx) - ig, sy(lay["logo"]) - ig, sx(rx) + ig, sy(lay["logo"]) + ig],
        radius=ig * 0.25,
        outline=acc,
        width=max(2, int(sc * 0.7)),
    )
    img.save(path)
    print(f"  PNG  {path.name}  {img.size[0]}×{img.size[1]}")


def write_docs() -> None:
    x0, x1, y0, y1 = o_bbox()
    (lx, ly), (rx, ry) = nfc_centers()
    lay = layout_y()
    alto = y1
    (OUT / "LEEME.txt").write_text(
        f"""Café Local Fuengirola — O tipográfica NFC
==========================================

Qué es
------
La O del logo LOCAL (Ravi), con hueco en el medio y carne unida.
Ampliada ×{SCALE:.2f}. Dos chips: reseña Google (izq) e Instagram (der).

  LOCAL
  [G]  TAP HERE     [IG]  TAP HERE
  [NFC]             [NFC]
  SIN RODEOS
       |
     tetón → base Ø{BASE_D:.0f} ranura (se pone y se quita)

NO es atril: la cara cae de canto en la base estándar NFCTap
(misma que copa-nfc / wifi-palo). Se acerca al cliente a mano.

Colores: negro (cara+base) + blanco (textos, logos, nfctap.tech).

Montaje
-------
1. Base en mesa (cuello arriba, nfctap.tech al cliente).
2. Cara de canto: tetón CAE en la ranura.
3. Para enseñar al cliente: se saca, se acerca, se vuelve a poner.

Imprime
-------
BASE:  Agrupar 01 + 05. Negro=01, blanco=05. Sin pausa.
CARA:  Agrupar 03 + 04. Negro=03, blanco=04.
       Pausa capa {pause_layer()} ({Z_PAUSE:.2f} mm) → 2× Timeskey Ø25.

Medidas
-------
O: {x1-x0:.0f} × {y1-y0:.0f} × {CARA_T:.2f} mm
Alto total cara (con palo): {alto:.0f} mm
Base Ø{BASE_D:.0f} · ranura {SLOT_COPA_W:.2f} · tetón {TENON_W:.0f}×{TENON_H:.0f}
NFC: pozo Ø{WELL_D:.0f} @ izq ({lx:.1f},{ly:.1f}) · der ({rx:.1f},{ry:.1f})
Logos Y={lay['logo']:.1f} · TAP Y={lay['tap']:.1f}
""",
        encoding="utf-8",
    )
    (OUT / "IMPRIME.txt").write_text(
        f"""Café Local — cómo imprimir (AD5X)
=================================

BASE (misma que copa):
  1. Abrir 01_base.stl + 05_base_tap.stl → Agrupar
  2. Negro=01 · Blanco=05 · sin soportes · sin pausa

CARA:
  1. Abrir 03_cara_negro.stl + 04_cara_blanco.stl → Agrupar (NO Reparar)
  2. Negro=03 · Blanco=04
  3. Espalda plana en cama (Z=0). Cara con LOCAL arriba.
  4. Pausa capa {pause_layer()} ({Z_PAUSE:.2f} mm) → 2× Timeskey Ø25
  5. Sin soportes. Capa 0,20 · primera 0,25

Montaje: base en mesa → cara de CANTO, tetón cae en la ranura.
""",
        encoding="utf-8",
    )
    (OUT / "NFC.txt").write_text(
        f"""Pozos NFC en la CARA (no en la base)
====================================
Izquierda → Google Reviews  ({lx:.1f}, {ly:.1f})  G + TAP HERE encima
Derecha   → Instagram       ({rx:.1f}, {ry:.1f})  cámara + TAP HERE encima
Timeskey Ø{STICKER_D:.0f} · pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f}
Pausa capa {pause_layer()} ({Z_PAUSE:.2f} mm)
""",
        encoding="utf-8",
    )
    (OUT / "PAUSA_NFC.txt").write_text(
        f"Pausa NFC: capa {pause_layer()}  ({Z_PAUSE:.2f} mm)\n"
        f"Dos chips Timeskey Ø{STICKER_D:.0f} (Google izq · Instagram der).\n",
        encoding="utf-8",
    )
    (OUT / "MONTAJE.txt").write_text(
        f"""MONTAJE Café Local — ranura estable
===================================

  [ O LOCAL ]
     |  tetón {TENON_W:.0f}×{TENON_H:.0f} mm · grosor {CARA_T:.2f}
     v  de CANTO (LOCAL / logos al cliente)
  [ BASE Ø{BASE_D:.0f} ]
     cuello {BOSS_H:.0f} mm · ranura {SLOT_COPA_W:.2f}×{SLOT_COPA_LEN:.0f}×{SLOT_COPA_DEPTH:.0f}
     holgura {SLOT_COPA_CLEAR:.2f} mm · nfctap.tech DE FRENTE

1. Base en la mesa.
2. Cara de canto: tetón CAE en la ranura.
3. Listo. Se saca y se acerca al cliente cuando haga falta.
""",
        encoding="utf-8",
    )
    (OUT / "comprobar").mkdir(exist_ok=True)
    (OUT / "comprobar" / "ENCAJE.txt").write_text(
        f"""TEST Café Local ↔ base ranura Ø{BASE_D:.0f}
=========================================
Montaje: base → O de CANTO en la ranura. Sin 02_encaje.

  Ranura  {SLOT_COPA_W:.3f} × {SLOT_COPA_LEN:.1f} × prof {SLOT_COPA_DEPTH:.1f}
  Cara    grosor {CARA_T:.3f}  tetón {TENON_W:.1f}×{TENON_H:.1f}
  Holgura {SLOT_COPA_CLEAR:.3f} mm

  [OK] mismo contrato que copa-nfc / wifi-palo
""",
        encoding="utf-8",
    )
    cfg = {
        "nombre": "cafe-local-fuengirola",
        "fuente": "diseños ravi / Cafe-Local-3D",
        "escala": round(SCALE, 4),
        "o": {"ancho": round(x1 - x0, 2), "alto": round(y1 - y0, 2), "grosor": CARA_T},
        "nfc": {
            "sticker": STICKER_D,
            "well": WELL_D,
            "seat": SEAT_D,
            "z_pause": Z_PAUSE,
            "layer": pause_layer(),
            "left": {"xy": [round(lx, 2), round(ly, 2)], "marca": "Google Reviews"},
            "right": {"xy": [round(rx, 2), round(ry, 2)], "marca": "Instagram"},
        },
        "soporte": {
            "tipo": "ranura-estable",
            "base_d": BASE_D,
            "tenon": [TENON_W, TENON_H],
            "slot": [SLOT_COPA_W, SLOT_COPA_LEN, SLOT_COPA_DEPTH],
        },
        "montado": {"alto_cara": round(alto, 2), "base_d": BASE_D},
        "colores": {"cuerpo": "negro", "acento": "blanco"},
        "textos": {
            "arriba": "LOCAL",
            "izq": "G Google + TAP HERE",
            "der": "Instagram + TAP HERE",
            "abajo": "SIN RODEOS",
        },
    }
    (OUT / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def export_propuesta() -> None:
    from exportar_propuesta_freddos import _rotate, _shade, _write_glb
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    out = OUT / "whatsapp"
    out.mkdir(parents=True, exist_ok=True)
    parts = meshes_montados()
    # Cara con relieve en −Z tras yup → espejar Z para GLB/model-viewer de frente.
    parts = {
        k: _map_mesh(m, lambda p: (p[0], p[1], -p[2])) for k, m in parts.items()
    }
    pla_n = (44, 42, 40)
    pla_b = (252, 250, 245)
    _write_glb(
        out / "Cafe-Local-3D.glb",
        [
            ("negro", parts["negro"], [c / 255 for c in pla_n] + [1.0]),
            ("blanco", parts["blanco"], [c / 255 for c in pla_b] + [1.0]),
        ],
    )
    print("  GLB  Cafe-Local-3D.glb")

    width, height = 1080, 1440
    # Tras el espejo Z, la cara ya mira a +Z.
    yaw, pitch = math.radians(12.0), math.radians(24.0)
    faces, xs, ys = [], [], []
    for mesh, rgb in ((parts["negro"], pla_n), (parts["blanco"], pla_b)):
        for a, b, c in mesh.tris:
            pa, pb, pc = (
                _rotate(a, yaw, pitch),
                _rotate(b, yaw, pitch),
                _rotate(c, yaw, pitch),
            )
            ux, uy, uz = pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]
            vx, vy, vz = pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            nl = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nx, ny, nz = nx / nl, ny / nl, nz / nl
            if nz <= 0.02:
                continue
            col = _shade((nx, ny, nz), rgb)
            if rgb[0] > 200:
                col = tuple(min(255, int(v * 1.14 + 18)) for v in col)
            faces.append((pa, pb, pc, col))
            for p in (pa, pb, pc):
                xs.append(p[0])
                ys.append(p[1])
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2
    span = max(max(xs) - min(xs), max(ys) - min(ys), 1.0)
    scale = (min(width, height) * 0.70) / span
    ox, oy = width * 0.50, height * 0.56

    def proj(p):
        return ox + (p[0] - cx) * scale, oy - (p[1] - cy) * scale, p[2]

    pix = np.zeros((height, width, 3), dtype=np.uint8)
    t = np.linspace(0, 1, height)[:, None]
    pix[:, :, 0] = (232 - 14 * t).astype(np.uint8)
    pix[:, :, 1] = (236 - 12 * t).astype(np.uint8)
    pix[:, :, 2] = (238 - 10 * t).astype(np.uint8)
    zbuf = np.full((height, width), -1e9, dtype=np.float32)
    for a, b, c, col in faces:
        pa, pb, pc = proj(a), proj(b), proj(c)
        x0, x1 = max(0, int(min(pa[0], pb[0], pc[0]))), min(width - 1, int(max(pa[0], pb[0], pc[0])))
        y0, y1 = max(0, int(min(pa[1], pb[1], pc[1]))), min(height - 1, int(max(pa[1], pb[1], pc[1])))
        if x1 <= x0 or y1 <= y0:
            continue
        ax, ay, az = pa
        bx, by, bz = pb
        cx_, cy_, cz = pc
        den = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
        if abs(den) < 1e-8:
            continue
        grid_x, grid_y = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1), indexing="xy")
        w1 = ((by - cy_) * (grid_x - cx_) + (cx_ - bx) * (grid_y - cy_)) / den
        w2 = ((cy_ - ay) * (grid_x - cx_) + (ax - cx_) * (grid_y - cy_)) / den
        w3 = 1.0 - w1 - w2
        mask = (w1 >= -0.001) & (w2 >= -0.001) & (w3 >= -0.001)
        if not mask.any():
            continue
        z = w1 * az + w2 * bz + w3 * cz
        view = zbuf[y0 : y1 + 1, x0 : x1 + 1]
        closer = mask & (z > view)
        view[closer] = z[closer]
        pix[y0 : y1 + 1, x0 : x1 + 1][closer] = col
    img = Image.fromarray(pix, "RGB")
    shadow = Image.new("L", (width, height), 0)
    ImageDraw.Draw(shadow).ellipse(
        (ox - scale * 52, oy + (0 - cy) * scale + 18, ox + scale * 52, oy + (0 - cy) * scale + 48),
        fill=85,
    )
    img.paste((200, 208, 210), (0, 0), shadow.filter(ImageFilter.GaussianBlur(24)))
    img.paste(Image.fromarray(pix, "RGB"), (0, 0), Image.fromarray((zbuf > -1e8).astype(np.uint8) * 255, "L"))
    draw = ImageDraw.Draw(img)
    georgia = Path("/System/Library/Fonts/Supplemental/Georgia.ttf")
    bold = Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
    title = ImageFont.truetype(str(bold if bold.exists() else georgia), 48)
    sub = ImageFont.truetype(str(georgia), 24)
    cap = ImageFont.truetype(str(georgia), 22)
    tiny = ImageFont.truetype(str(georgia), 16)
    ink, mute = (28, 26, 24), (80, 88, 90)
    draw.text((540, 58), "NFCTap", font=title, fill=ink, anchor="mt")
    draw.text((540, 112), "Café Local · Fuengirola", font=sub, fill=mute, anchor="mt")
    draw.text(
        (540, 1305),
        f"O tipográfica · Google + Instagram · base Ø{BASE_D:.0f}",
        font=cap,
        fill=ink,
        anchor="mt",
    )
    draw.text(
        (540, 1342),
        "PLA negro + blanco · se pone y se quita",
        font=cap,
        fill=ink,
        anchor="mt",
    )
    draw.text((540, 1392), "NFCTap.tech", font=tiny, fill=mute, anchor="mt")
    img.save(out / "Cafe-Local-propuesta.jpg", "JPEG", quality=93, optimize=True, progressive=True)
    img.save(out / "Cafe-Local-propuesta.png", "PNG")
    print("  JPG  Cafe-Local-propuesta.jpg")

    (out / "ver-en-3d.html").write_text(
        """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>NFCTap · Café Local</title>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  <style>
    html, body { margin: 0; height: 100%; background: #16181a; color: #f4f1ea; font-family: Georgia, serif; }
    model-viewer { width: 100%; height: calc(100% - 64px); background: #22262a; }
    footer { height: 64px; display: flex; align-items: center; justify-content: center; font-size: 15px; opacity: 0.85; }
  </style>
</head>
<body>
  <model-viewer src="./Cafe-Local-3D.glb" alt="Café Local NFC"
    camera-controls touch-action="pan-y" shadow-intensity="0.55" exposure="1.05"
    camera-orbit="12deg 70deg 0.34m" field-of-view="26deg"
    poster="./Cafe-Local-propuesta.jpg"></model-viewer>
  <footer>Café Local · Google + Instagram · NFCTap.tech</footer>
</body>
</html>
""",
        encoding="utf-8",
    )
    opener = out / "ABRIR_3D.command"
    opener.write_text(
        "#!/bin/bash\ncd \"$(dirname \"$0\")\"\nPORT=8772\n"
        "python3 -m http.server $PORT >/tmp/nfctap-cafe-local-3d.log 2>&1 &\nPID=$!\nsleep 0.6\n"
        "open \"http://127.0.0.1:$PORT/ver-en-3d.html\"\nwait $PID\n",
        encoding="utf-8",
    )
    opener.chmod(0o755)
    (out / "MENSAJE_WHATSAPP.txt").write_text(
        "Mensaje para WhatsApp (copia y pega)\n"
        "====================================\n\n"
        "Hola, te mando la propuesta de Café Local.\n\n"
        "Es la O del logo, con LOCAL arriba y SIN RODEOS abajo. "
        "A un lado Google (reseñas) y al otro Instagram, cada uno con TAP HERE y chip NFC. "
        f"Va en base Ø{BASE_D:.0f}: se pone y se quita fácil para acercársela al cliente. "
        "PLA negro + blanco.\n\n"
        "Si te encaja, la fabricamos.\n",
        encoding="utf-8",
    )
    print(f"  WhatsApp → {out}")


def main() -> None:
    if not O_STL.exists() or not LETRAS_STL.exists():
        raise SystemExit(f"Faltan STL de Ravi en {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Café Local Fuengirola  ×{SCALE:.3f}  pozo Ø{WELL_D:.0f}  base Ø{BASE_D:.0f}")
    x0, x1, y0, y1 = o_bbox()
    (lx, ly), (rx, ry) = nfc_centers()
    lay = layout_y()
    print(f"  O {x1-x0:.1f}×{y1-y0:.1f} mm  alto cara {y1:.1f} mm")
    print(f"  NFC L ({lx:.1f},{ly:.1f})  R ({rx:.1f},{ry:.1f})")
    print(f"  Logo Y={lay['logo']:.1f}  TAP Y={lay['tap']:.1f}  LOCAL Y={lay['local']:.1f}")
    print(f"  Pausa capa {pause_layer()}  ({Z_PAUSE:.2f} mm)")

    # Borrar atril antiguo si existe
    for old in ("01_cuerpo_negro.stl", "02_acento_blanco.stl"):
        p = OUT / old
        if p.exists():
            p.unlink()
            print(f"  (quitado atril viejo {old})")

    print("\nGenerando base…")
    mesh_base().write_stl(OUT / "01_base.stl", "cafe-local-base")
    mesh_base_tap().write_stl(OUT / "05_base_tap.stl", "cafe-local-base-tap")
    print("Generando cara negra…")
    mesh_cara_negro().write_stl(OUT / "03_cara_negro.stl", "cafe-local-cara-negro")
    print("Generando cara blanca…")
    mesh_cara_blanco().write_stl(OUT / "04_cara_blanco.stl", "cafe-local-cara-blanco")

    write_preview_png(OUT / "vista-previa.png")
    write_docs()
    print("\nExportando propuesta 3D…")
    export_propuesta()
    print(f"\nListo → {OUT}")
    print(f"Ver 3D: abrir {OUT / 'whatsapp' / 'ABRIR_3D.command'}")


if __name__ == "__main__":
    main()
