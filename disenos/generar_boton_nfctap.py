#!/usr/bin/env python3
"""Botón NFC marca · mismo tamaño que lista nevera.

Círculo Ø38 × 2,0 mm. Tres colores AD5X:
  01_cuerpo  negro  — disco + pozo NFC
  02_acento  blanco — NFC / Tap / .Tech + mira
  03_aro     amarillo — aro exterior

Cara tipográfica (exacto):
  NFC
  Tap
  .Tech

Pegar el reverso (nevera, cajón de filamento, pared). Agrupar las 3, NO Reparar.
"""

from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_freddos import _csg_diff, _mesh_to_tm, _tm_to_mesh  # noqa: E402
from generar_tarjetas import Mesh  # noqa: E402
from instagram_logo import _shapely_extrude, svg_rings  # noqa: E402
from wifi_logo import geom_svg_path  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl" / "boton-nfctap"
HELVETICA = Path("/System/Library/Fonts/Helvetica.ttc")

DIAM = 38.0
FACE_T = 2.00
RELIEF = 0.45

RING_OUTER = DIAM / 2 - 0.6  # 18.4
RING_INNER = RING_OUTER - 1.6  # 16.8
RING_RELIEF = 0.45

STICKER_D = 25.0
WELL_D = 28.0
SEAT_D = 26.0
PAD_D = 24.0
PAD_H = 0.28
MIRA_RING_H = 0.22
Z_FLOOR = 0.80
Z_GUIDE = 1.00
Z_PAUSE = 1.40
FIRST_LAYER = 0.25
LAYER_H = 0.20

# Tipografía: NFC grande · Tap · .Tech (con el punto).
LINE_NFC = "NFC"
LINE_TAP = "Tap"
LINE_TECH = ".Tech"
H_NFC = 6.8
H_TAP = 5.0
H_TECH = 4.6
TRACK_NFC = 0.55
TRACK_TAP = 0.35
TRACK_TECH = 0.30
PAD_LETTER = 0.16  # engorda un poco para que el blanco no salga flaco
GAP_NFC_TAP = 1.55
GAP_TAP_TECH = 1.45

# Chip: marca / materiales impresora (programar en Config).
CHIP_URL = "https://nfctap.tech/taller/casa"

CW = {
    "nombre": "boton-nfctap",
    "cuerpo": "negro",
    "acento": "blanco",
    "aro": "amarillo",
    "hex_cuerpo": "#141416",
    "hex_acento": "#F4F1EA",
    "hex_aro": "#E2B43A",
    "hex_fondo": "#F3EEE4",
    "hex_mira": "#E2B43A",
}


def pause_layer() -> int:
    return 1 + int(round((Z_PAUSE - FIRST_LAYER) / LAYER_H))


def _circle_poly(cx: float, cy: float, r: float, n: int = 64):
    from shapely.geometry import Point

    return Point(cx, cy).buffer(r, resolution=n)


@lru_cache(maxsize=1)
def plate_shape():
    return _circle_poly(0.0, 0.0, DIAM / 2, 64)


@lru_cache(maxsize=1)
def gold_ring_shape():
    return _circle_poly(0.0, 0.0, RING_OUTER, 72).difference(
        _circle_poly(0.0, 0.0, RING_INNER, 64)
    )


def _load_helvetica(bold: bool):
    try:
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.ttLib.ttCollection import TTCollection
    except ImportError as exc:
        raise SystemExit(
            "Falta fonttools. Usa: .venv-mesh/bin/python disenos/generar_boton_nfctap.py"
        ) from exc
    if not HELVETICA.exists():
        raise SystemExit(f"No está {HELVETICA}")
    # 0 Regular · 1 Bold — hace falta Regular para Tap / .Tech
    idx = 1 if bold else 0
    return TTCollection(str(HELVETICA)).fonts[idx], SVGPathPen


def _word_poly(
    text: str,
    *,
    h: float,
    bold: bool,
    tracking: float,
    xy_pad: float,
    cx: float = 0.0,
    cy: float = 0.0,
):
    from shapely.affinity import translate
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    font, SVGPathPen = _load_helvetica(bold)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    os2 = font["OS/2"]
    cap = float(getattr(os2, "sCapHeight", 0) or 1474.0)
    scale = h / cap
    pen_x = 0.0
    parts = []
    letters = list(text)
    for i, ch in enumerate(letters):
        if ch == " ":
            pen_x += h * 0.34
            continue
        gid = cmap.get(ord(ch))
        if gid is None:
            pen_x += h * 0.28
            continue
        glyph = gs[gid]
        pen = SVGPathPen(gs)
        glyph.draw(pen)
        rings = [
            [(pen_x + px * scale, py * scale) for px, py in ring]
            for ring in svg_rings(pen.getCommands(), steps=10)
        ]
        if rings:
            areas = [
                abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(r, r[1:] + r[:1])))
                for r in rings
            ]
            outer_i = max(range(len(rings)), key=lambda j: areas[j])
            outer = rings[outer_i]
            holes = [rings[j] for j in range(len(rings)) if j != outer_i]
            try:
                poly = Polygon(outer, holes)
            except Exception:
                poly = Polygon(outer)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if not poly.is_empty:
                parts.append(poly)
        pen_x += glyph.width * scale
        if i < len(letters) - 1 and letters[i + 1] != " ":
            pen_x += tracking

    if not parts:
        raise SystemExit(f"Texto vacío: {text!r}")
    geom = unary_union(parts)
    if xy_pad:
        geom = geom.buffer(xy_pad)
        if not geom.is_valid:
            geom = geom.buffer(0)
    minx, miny, maxx, maxy = geom.bounds
    return translate(geom, xoff=cx - (minx + maxx) / 2, yoff=cy - (miny + maxy) / 2)


@lru_cache(maxsize=1)
def brand_mark_shape():
    """NFC / Tap / .Tech centrados, dentro del aro."""
    from shapely.ops import unary_union

    # Centro del bloque tipográfico en y=0.
    # NFC arriba, Tap, .Tech abajo.
    nfc_h = H_NFC
    tap_h = H_TAP
    tech_h = H_TECH
    total = nfc_h + GAP_NFC_TAP + tap_h + GAP_TAP_TECH + tech_h
    top = total / 2
    nfc_cy = top - nfc_h / 2
    tap_cy = nfc_cy - nfc_h / 2 - GAP_NFC_TAP - tap_h / 2
    tech_cy = tap_cy - tap_h / 2 - GAP_TAP_TECH - tech_h / 2

    nfc = _word_poly(
        LINE_NFC, h=H_NFC, bold=True, tracking=TRACK_NFC, xy_pad=PAD_LETTER, cy=nfc_cy
    )
    tap = _word_poly(
        LINE_TAP, h=H_TAP, bold=True, tracking=TRACK_TAP, xy_pad=PAD_LETTER * 0.9, cy=tap_cy
    )
    tech = _word_poly(
        LINE_TECH,
        h=H_TECH,
        bold=True,
        tracking=TRACK_TECH,
        xy_pad=PAD_LETTER * 0.85,
        cy=tech_cy,
    )
    mark = unary_union([nfc, tap, tech])
    safe = _circle_poly(0.0, 0.0, RING_INNER - 1.4, 48)
    clipped = mark.intersection(safe)
    if clipped.is_empty or clipped.area < mark.area * 0.92:
        raise SystemExit(
            f"Letras salen del aro (área {clipped.area:.1f}/{mark.area:.1f}). Baja altos."
        )
    # Sin pinholes: el blanco tiene que ser sólido.
    clipped = clipped.buffer(0.05).buffer(-0.05)
    if not clipped.is_valid:
        clipped = clipped.buffer(0)
    if clipped.is_empty:
        raise SystemExit("Marca NFCTap vacía tras limpiar")
    return clipped


def body() -> Mesh:
    from shapely.geometry import Point

    plate = plate_shape()
    wall = float(Point(0.0, 0.0).distance(plate.exterior))
    if wall < WELL_D / 2 + 3.0:
        raise SystemExit(f"NFC Ø{WELL_D:.0f} no cabe (pared {wall:.1f} mm)")
    solid = _mesh_to_tm(_shapely_extrude(plate, 0.0, FACE_T))
    seat = _mesh_to_tm(
        _shapely_extrude(_circle_poly(0.0, 0.0, SEAT_D / 2, 28), Z_FLOOR, Z_GUIDE + 0.05)
    )
    well = _mesh_to_tm(
        _shapely_extrude(_circle_poly(0.0, 0.0, WELL_D / 2, 32), Z_GUIDE - 0.05, Z_PAUSE)
    )
    return _tm_to_mesh(_csg_diff(solid, [seat, well], "cuerpo"), "cuerpo")


def nfc_mira() -> Mesh:
    from shapely.geometry import Point

    pad = Point(0.0, 0.0).buffer(PAD_D / 2, resolution=32)
    ring = Point(0.0, 0.0).buffer(WELL_D / 2 - 0.20, resolution=32).difference(
        Point(0.0, 0.0).buffer(SEAT_D / 2 + 0.20, resolution=28)
    )
    m = Mesh()
    m.extend(_shapely_extrude(pad, Z_FLOOR, Z_FLOOR + PAD_H))
    m.extend(_shapely_extrude(ring, Z_GUIDE, Z_GUIDE + MIRA_RING_H))
    return m


def accent_white() -> Mesh:
    m = nfc_mira()
    m.extend(_shapely_extrude(brand_mark_shape(), FACE_T, FACE_T + RELIEF))
    return m


def accent_gold() -> Mesh:
    m = Mesh()
    m.extend(_shapely_extrude(gold_ring_shape(), FACE_T, FACE_T + RING_RELIEF))
    return m


def write_preview(dest: Path) -> None:
    plate = plate_shape()
    mark = brand_mark_shape()
    ring = gold_ring_shape()
    sc = 14.0
    pad = 80.0
    vw = DIAM * sc + pad * 2
    vh = 780.0
    ox, oy = vw / 2, 310.0

    def sx(x: float) -> float:
        return ox + x * sc

    def sy(y: float) -> float:
        return oy - y * sc

    layer = pause_layer()
    cover = FACE_T - Z_PAUSE
    nfc = (
        f'<circle cx="{sx(0):.1f}" cy="{sy(0):.1f}" r="{(WELL_D / 2) * sc:.1f}" '
        f'fill="none" stroke="#8a8173" stroke-width="1.5" stroke-dasharray="5 4"/>'
    )
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.0f} {vh:.0f}" width="{vw:.0f}" height="{vh:.0f}">
  <rect width="100%" height="100%" fill="{CW["hex_fondo"]}"/>
  <text x="{vw/2:.0f}" y="48" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="28">NFCTap · Botón marca</text>
  <text x="{vw/2:.0f}" y="78" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="15">NFC / Tap / .Tech · negro + blanco + aro amarillo</text>
  {geom_svg_path(plate, sx, sy, CW["hex_cuerpo"])}
  {geom_svg_path(ring, sx, sy, CW["hex_aro"])}
  {geom_svg_path(mark, sx, sy, CW["hex_acento"])}
  {nfc}
  <text x="{vw/2:.0f}" y="580" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="15">Ø{DIAM:.0f} × {FACE_T:.1f} mm · NFC Ø{STICKER_D:.0f} · pausa capa {layer}</text>
  <text x="{vw/2:.0f}" y="608" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="13">Programar: materiales / Wi‑Fi · {CHIP_URL}</text>
  <text x="{vw/2:.0f}" y="636" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="13">01 negro · 02 blanco · 03 amarillo · tapa {cover:.2f} mm</text>
</svg>
"""
    dest.write_text(svg, encoding="utf-8")
    print(f"  SVG  {dest.name}")
    try:
        from PIL import Image, ImageDraw, ImageFont

        png = dest.with_suffix(".png")
        w, h = 900, 1140
        img = Image.new("RGB", (w, h), tuple(int(CW["hex_fondo"][i : i + 2], 16) for i in (1, 3, 5)))
        draw = ImageDraw.Draw(img)
        body_c = tuple(int(CW["hex_cuerpo"][i : i + 2], 16) for i in (1, 3, 5))
        acc = tuple(int(CW["hex_acento"][i : i + 2], 16) for i in (1, 3, 5))
        gold = tuple(int(CW["hex_aro"][i : i + 2], 16) for i in (1, 3, 5))
        georgia = Path("/System/Library/Fonts/Supplemental/Georgia.ttf")
        bold = Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
        title = ImageFont.truetype(str(bold if bold.exists() else georgia), 36)
        sub = ImageFont.truetype(str(georgia), 20)
        draw.text((450, 48), "NFCTap · Botón marca", font=title, fill=(28, 25, 21), anchor="mt")
        draw.text((450, 95), "NFC / Tap / .Tech · aro amarillo", font=sub, fill=(122, 106, 82), anchor="mt")
        cx, cy, scp = 450, 500, 16.0
        r = DIAM / 2 * scp
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=body_c)
        ro = RING_OUTER * scp
        ring_w = max(3, int((RING_OUTER - RING_INNER) * scp))
        draw.ellipse((cx - ro, cy - ro, cx + ro, cy + ro), outline=gold, width=ring_w)

        def draw_geom(g, fill):
            geoms = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
            for poly in geoms:
                pts = [(cx + x * scp, cy - y * scp) for x, y in poly.exterior.coords]
                draw.polygon(pts, fill=fill)
                for hole in poly.interiors:
                    hpts = [(cx + x * scp, cy - y * scp) for x, y in hole.coords]
                    draw.polygon(hpts, fill=body_c)

        draw_geom(mark, acc)
        wr = WELL_D / 2 * scp
        draw.ellipse((cx - wr, cy - wr, cx + wr, cy + wr), outline=(138, 129, 115), width=2)
        draw.text((450, 800), f"Ø{DIAM:.0f} × {FACE_T:.1f} mm · NFC Ø{STICKER_D:.0f}", font=sub, fill=(28, 25, 21), anchor="mt")
        draw.text((450, 840), "NFC · Tap · .Tech", font=sub, fill=(122, 106, 82), anchor="mt")
        draw.text(
            (450, 880),
            f"pausa capa {layer} · negro + blanco + amarillo",
            font=sub,
            fill=(122, 106, 82),
            anchor="mt",
        )
        img.save(png, "PNG")
        print(f"  PNG  {png.name}")
    except ImportError:
        pass


def write_notes(dest: Path) -> None:
    layer = pause_layer()
    cover = FACE_T - Z_PAUSE
    (dest / "LEEME.txt").write_text(
        (
            "Botón NFCTap — marca (NFC / Tap / .Tech)\n"
            "========================================\n\n"
            f"Mismo tamaño que la lista nevera: Ø{DIAM:.0f} × {FACE_T:.1f} mm.\n"
            "Cara: NFC arriba, Tap, .Tech (con el punto). Aro amarillo.\n"
            "NFC Timeskey Ø25 en el centro. Pausa a mitad.\n\n"
            "  01_cuerpo.stl   negro\n"
            "  02_acento.stl   blanco  (letras + mira NFC)\n"
            "  03_aro.stl      amarillo (aro exterior)\n\n"
            "Agrupar las 3. NO Reparar.\n\n"
            "Uso\n"
            "---\n"
            "Pegar en el cajón de filamento / taller. Programar el chip\n"
            f"con NFCTap Config → URL {CHIP_URL}\n"
            "(misma clave que la lista nevera; solo Wi‑Fi de casa).\n\n"
            "Imprime\n"
            "-------\n"
            f"Pausa OBLIGATORIA capa {layer} ({Z_PAUSE:.2f} mm). Ver PAUSA_NFC.txt.\n"
            f"Pozo Ø{WELL_D:.0f}, asiento Ø{SEAT_D:.0f}, pegatina Ø{STICKER_D:.0f}.\n"
            "REVERSO en la cama. Pegar ese lado (cinta 3M).\n"
        ),
        encoding="utf-8",
    )
    (dest / "PAUSA_NFC.txt").write_text(
        (
            "Pausa NFC — botón NFCTap (círculo fino)\n"
            "======================================\n"
            f"Altura: {Z_PAUSE:.2f} mm · capa {layer} (primera 0,25 + 0,20 mm)\n"
            "Centro del pozo = centro del círculo.\n"
            f"Pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · mira Ø{PAD_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Tapa encima: {cover:.2f} mm. Luego relieves blanco + amarillo.\n\n"
            "Proyecto NUEVO en Flash.\n"
            "Importa 01_cuerpo + 02_acento + 03_aro → Agrupar → NO Reparar.\n"
            "Colores: 01 negro · 02 blanco · 03 amarillo.\n"
            "Rebanar 0,20 mm Standard @FF AD5X.\n\n"
            f"La mira blanca se imprime ANTES de la pausa: disco Ø{PAD_D:.0f}.\n\n"
            "En Previsualización:\n"
            f"1. Slider DERECHO BAJA hasta la capa {layer} (~{Z_PAUSE:.2f} mm).\n"
            "   HUECO REDONDO + círculo blanco en el CENTRO.\n"
            "2. Clic derecho en esa capa → Añadir pausa.\n"
            "3. Imprime.\n\n"
            "Cuando pare:\n"
            "- Timeskey Ø25 ENCIMA del círculo blanco, adhesivo ABAJO.\n"
            "- Que no sobresalga. Continuar.\n"
        ),
        encoding="utf-8",
    )
    (dest / "NFC.txt").write_text(
        (
            "Botón NFCTap — un NFC (Timeskey Ø25)\n\n"
            "URL del chip (materiales del taller):\n"
            f"  {CHIP_URL}\n\n"
            "Misma clave que el dashboard / lista nevera.\n"
            "Primera vez: Wi‑Fi de casa + clave. Luego el TAP abre directo.\n\n"
            "Escribe el chip DESPUÉS de imprimir y meter la pegatina.\n"
        ),
        encoding="utf-8",
    )
    (dest / "IMPRIME.txt").write_text(
        (
            "CAMA — botón NFCTap (marca)\n"
            "===========================\n"
            "Reverso a la cama (cara lisa = pegar).\n"
            f"Ø{DIAM:.0f} × {FACE_T:.1f} mm + relieve {RELIEF:.1f} mm.\n"
            "01_cuerpo.stl (negro)\n"
            "02_acento.stl (blanco)  NFC / Tap / .Tech\n"
            "03_aro.stl (amarillo)\n"
            "Agrupar las 3. NO Reparar.\n"
            f"Pausa capa {layer}. Ver PAUSA_NFC.txt.\n"
        ),
        encoding="utf-8",
    )
    cfg = {
        "nombre": CW["nombre"],
        "kind": "boton-nfctap",
        "forma": "circulo",
        "cuerpo": CW["cuerpo"],
        "acento": CW["acento"],
        "aro": CW["aro"],
        "archivos": ["01_cuerpo.stl", "02_acento.stl", "03_aro.stl"],
        "placa": [DIAM, DIAM, FACE_T],
        "relieve": RELIEF,
        "aro_mm": [round(RING_INNER * 2, 2), round(RING_OUTER * 2, 2)],
        "cara": [LINE_NFC, LINE_TAP, LINE_TECH],
        "tipografia": {
            "nfc_h": H_NFC,
            "tap_h": H_TAP,
            "tech_h": H_TECH,
        },
        "url": CHIP_URL,
        "nfc": {
            "sticker": STICKER_D,
            "well": WELL_D,
            "seat": SEAT_D,
            "pad": PAD_D,
            "y": 0.0,
            "z_floor": Z_FLOOR,
            "z_pause": Z_PAUSE,
            "layer": layer,
            "cover": cover,
        },
        "uso": "pegar reverso · materiales / marca",
        "nota": "Mismo tamaño que lista-nevera. Letras sólidas blancas + aro amarillo.",
    }
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def generate() -> None:
    dest = OUT
    dest.mkdir(parents=True, exist_ok=True)
    brand_mark_shape.cache_clear()
    gold_ring_shape.cache_clear()
    plate_shape.cache_clear()
    mark = brand_mark_shape()
    print(f"Botón NFCTap  Ø{DIAM:.0f} × {FACE_T:.1f} mm  relieve {RELIEF:.1f}")
    print(f"cara  {LINE_NFC} / {LINE_TAP} / {LINE_TECH}")
    print(f"letras área {mark.area:.1f} mm²  bounds {tuple(round(v, 2) for v in mark.bounds)}")
    print("colores  negro + blanco + amarillo (aro)")
    print(f"pausa capa {pause_layer()} @ {Z_PAUSE:.2f} mm")
    cuerpo = body()
    blanco = accent_white()
    oro = accent_gold()
    cuerpo.write_stl(dest / "01_cuerpo.stl", "01_cuerpo")
    blanco.write_stl(dest / "02_acento.stl", "02_acento")
    oro.write_stl(dest / "03_aro.stl", "03_aro")
    write_notes(dest)
    write_preview(dest / "vista-previa.svg")
    print(f"OK  {dest}")


if __name__ == "__main__":
    generate()
