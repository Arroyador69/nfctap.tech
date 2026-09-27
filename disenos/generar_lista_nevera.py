#!/usr/bin/env python3
"""Botón NFC para nevera · lista de la compra.

Círculo Ø38 × 2,0 mm (fina como el Wi‑Fi DINO). Negro + relieve blanco:
icono de lista (portapapeles + líneas). NFC Timeskey Ø25 en el centro.
Pegar el reverso a la nevera (cinta 3M).

2 STL: 01_cuerpo + 02_acento. Agrupar, no Reparar.
"""

from __future__ import annotations

import json
import math
import sys
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_freddos import _csg_diff, _mesh_to_tm, _tm_to_mesh  # noqa: E402
from generar_tarjetas import Mesh  # noqa: E402
from instagram_logo import _shapely_extrude, svg_rings  # noqa: E402
from wifi_logo import geom_svg_path  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl" / "lista-nevera"

# Círculo compacto (mitad de ancho del Wi‑Fi pared 70 mm).
DIAM = 38.0
FACE_T = 2.00
RELIEF = 0.45

STICKER_D = 25.0
WELL_D = 28.0
SEAT_D = 26.0
PAD_D = 24.0
PAD_H = 0.28
RING_H = 0.22
Z_FLOOR = 0.80
Z_GUIDE = 1.00
Z_PAUSE = 1.40
FIRST_LAYER = 0.25
LAYER_H = 0.20

# URL que va en el chip (grabar con NFC Tools / NFCTap Config → URL).
LISTA_URL = "https://nfctap.tech/lista/casa"

CW = {
    "nombre": "lista-nevera",
    "cuerpo": "negro",
    "acento": "blanco",
    "hex_cuerpo": "#141416",
    "hex_acento": "#F4F1EA",
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
def list_icon_shape():
    """Portapapeles con 3 líneas · se lee como «lista» a Ø38."""
    from shapely.geometry import box
    from shapely.ops import unary_union

    # Tablero
    board = box(-7.2, -9.0, 7.2, 8.2).buffer(1.6, resolution=16)
    # Clip superior
    clip = box(-3.2, 7.0, 3.2, 10.4).buffer(1.1, resolution=12)
    # Hueco interior del tablero (marco)
    hole = box(-5.0, -6.8, 5.0, 5.6).buffer(0.9, resolution=12)
    frame = board.difference(hole).union(clip)

    # Tres líneas de ítems (+ marcas a la izquierda)
    lines = []
    for i, y in enumerate((-4.2, -0.4, 3.4)):
        mark = box(-4.0, y - 0.85, -2.2, y + 0.85).buffer(0.35, resolution=8)
        bar = box(-1.2, y - 0.7, 4.2, y + 0.7).buffer(0.35, resolution=8)
        lines.append(mark.union(bar))

    icon = unary_union([frame, *lines])
    # Margen respecto al borde del círculo
    safe = plate_shape().buffer(-3.2)
    icon = icon.intersection(safe)
    if icon.is_empty:
        raise SystemExit("icono lista vacío")
    return icon


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
    m.extend(_shapely_extrude(ring, Z_GUIDE, Z_GUIDE + RING_H))
    return m


def accent() -> Mesh:
    m = nfc_mira()
    m.extend(_shapely_extrude(list_icon_shape(), FACE_T, FACE_T + RELIEF))
    return m


def write_preview(dest: Path) -> None:
    plate = plate_shape()
    mark = list_icon_shape()
    sc = 14.0
    pad = 80.0
    vw = DIAM * sc + pad * 2
    vh = 720.0
    ox, oy = vw / 2, 280.0

    def sx(x: float) -> float:
        return ox + x * sc

    def sy(y: float) -> float:
        return oy - y * sc

    layer = pause_layer()
    cover = FACE_T - Z_PAUSE
    nfc = (
        f'<circle cx="{sx(0):.1f}" cy="{sy(0):.1f}" r="{(WELL_D / 2) * sc:.1f}" '
        f'fill="none" stroke="{CW["hex_mira"]}" stroke-width="2" stroke-dasharray="6 4"/>'
        f'<circle cx="{sx(0):.1f}" cy="{sy(0):.1f}" r="{(PAD_D / 2) * sc:.1f}" '
        f'fill="{CW["hex_mira"]}" fill-opacity="0.35"/>'
    )
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.0f} {vh:.0f}" width="{vw:.0f}" height="{vh:.0f}">
  <rect width="100%" height="100%" fill="{CW["hex_fondo"]}"/>
  <text x="{vw/2:.0f}" y="48" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="28">NFCTap · Lista nevera</text>
  <text x="{vw/2:.0f}" y="78" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="15">botón circular · icono lista · {CW["cuerpo"]} + {CW["acento"]}</text>
  {geom_svg_path(plate, sx, sy, CW["hex_cuerpo"])}
  {geom_svg_path(mark, sx, sy, CW["hex_acento"])}
  {nfc}
  <text x="{vw/2:.0f}" y="520" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="15">Ø{DIAM:.0f} × {FACE_T:.1f} mm · NFC Ø{STICKER_D:.0f} · pausa capa {layer}</text>
  <text x="{vw/2:.0f}" y="548" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="13">TAP → {LISTA_URL}</text>
  <text x="{vw/2:.0f}" y="580" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="13">pegar reverso a la nevera · tapa {cover:.2f} mm</text>
</svg>
"""
    dest.write_text(svg, encoding="utf-8")
    print(f"  SVG  {dest.name}")
    try:
        from PIL import Image, ImageDraw, ImageFont

        png = dest.with_suffix(".png")
        w, h = 900, 1100
        img = Image.new("RGB", (w, h), tuple(int(CW["hex_fondo"][i : i + 2], 16) for i in (1, 3, 5)))
        draw = ImageDraw.Draw(img)
        body_c = tuple(int(CW["hex_cuerpo"][i : i + 2], 16) for i in (1, 3, 5))
        acc = tuple(int(CW["hex_acento"][i : i + 2], 16) for i in (1, 3, 5))
        mira = tuple(int(CW["hex_mira"][i : i + 2], 16) for i in (1, 3, 5))
        georgia = Path("/System/Library/Fonts/Supplemental/Georgia.ttf")
        bold = Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
        title = ImageFont.truetype(str(bold if bold.exists() else georgia), 36)
        sub = ImageFont.truetype(str(georgia), 20)
        draw.text((450, 48), "NFCTap · Lista nevera", font=title, fill=(28, 25, 21), anchor="mt")
        draw.text((450, 95), "botón circular · lista de la compra", font=sub, fill=(122, 106, 82), anchor="mt")
        cx, cy, scp = 450, 480, 16.0
        r = DIAM / 2 * scp
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=body_c)
        # icon approx as white clipboard
        bx0, by0 = cx - 7.2 * scp, cy - 9.0 * scp
        bx1, by1 = cx + 7.2 * scp, cy + 8.2 * scp
        draw.rounded_rectangle((bx0, by0, bx1, by1), radius=int(1.6 * scp), outline=acc, width=max(3, int(0.9 * scp)))
        draw.rounded_rectangle(
            (cx - 3.2 * scp, cy - 10.4 * scp, cx + 3.2 * scp, cy - 7.0 * scp),
            radius=int(1.1 * scp),
            fill=acc,
        )
        for y in (-4.2, -0.4, 3.4):
            yy = cy - y * scp
            draw.rounded_rectangle(
                (cx - 4.0 * scp, yy - 0.85 * scp, cx - 2.2 * scp, yy + 0.85 * scp),
                radius=3,
                fill=acc,
            )
            draw.rounded_rectangle(
                (cx - 1.2 * scp, yy - 0.7 * scp, cx + 4.2 * scp, yy + 0.7 * scp),
                radius=3,
                fill=acc,
            )
        wr = WELL_D / 2 * scp
        draw.ellipse((cx - wr, cy - wr, cx + wr, cy + wr), outline=mira, width=2)
        draw.text((450, 760), f"Ø{DIAM:.0f} × {FACE_T:.1f} mm · NFC Ø{STICKER_D:.0f}", font=sub, fill=(28, 25, 21), anchor="mt")
        draw.text((450, 800), LISTA_URL, font=sub, fill=(122, 106, 82), anchor="mt")
        draw.text((450, 840), f"pausa capa {layer} · PLA {CW['cuerpo']} + {CW['acento']}", font=sub, fill=(122, 106, 82), anchor="mt")
        img.save(png, "PNG")
        print(f"  PNG  {png.name}")
    except ImportError:
        pass


def write_notes(dest: Path) -> None:
    layer = pause_layer()
    cover = FACE_T - Z_PAUSE
    (dest / "LEEME.txt").write_text(
        (
            "Botón NFC nevera — lista de la compra\n"
            "=====================================\n\n"
            f"Círculo Ø{DIAM:.0f} × {FACE_T:.1f} mm (fina, como el Wi‑Fi DINO).\n"
            "Cara: icono de lista (portapapeles) en relieve blanco sobre negro.\n"
            "NFC Timeskey Ø25 en el centro. Pausa a mitad.\n\n"
            "  01_cuerpo.stl + 02_acento.stl     Agrupar, NO Reparar\n\n"
            "Imprime\n"
            "-------\n"
            f"Pausa OBLIGATORIA capa {layer} ({Z_PAUSE:.2f} mm). Ver PAUSA_NFC.txt.\n"
            f"Pozo Ø{WELL_D:.0f}, asiento Ø{SEAT_D:.0f}, pegatina Ø{STICKER_D:.0f}.\n"
            "REVERSO en la cama. Pegar ese lado a la nevera (cinta 3M).\n\n"
            f"Colores: cuerpo = {CW['cuerpo']}, acento = {CW['acento']}.\n"
            f"URL del chip: {LISTA_URL}\n"
        ),
        encoding="utf-8",
    )
    (dest / "PAUSA_NFC.txt").write_text(
        (
            "Pausa NFC — lista nevera (círculo fino)\n"
            "======================================\n"
            f"Altura: {Z_PAUSE:.2f} mm · capa {layer} (primera 0,25 + 0,20 mm)\n"
            "Centro del pozo = centro del círculo.\n"
            f"Pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · mira Ø{PAD_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Tapa encima: {cover:.2f} mm. Luego el relieve blanco.\n\n"
            "Proyecto NUEVO en Flash. No reutilices un 3mf viejo.\n"
            "Importa 01_cuerpo.stl + 02_acento.stl → Agrupar → NO Reparar.\n"
            "Rebanar 0,20 mm Standard @FF AD5X.\n\n"
            f"La mira se imprime ANTES de la pausa: disco {CW['acento']} Ø{PAD_D:.0f}.\n\n"
            "En Previsualización:\n"
            f"1. Slider DERECHO BAJA hasta la capa {layer} (~{Z_PAUSE:.2f} mm).\n"
            f"   HUECO REDONDO + círculo {CW['acento']} en el CENTRO.\n"
            "2. Clic derecho en esa capa → Añadir pausa.\n"
            "3. Imprime.\n\n"
            "Cuando pare (mira desde ARRIBA):\n"
            f"- El círculo {CW['acento']} = aquí la pegatina.\n"
            "- Timeskey Ø25 ENCIMA, hundida, adhesivo ABAJO.\n"
            "- Que no sobresalga. Continuar.\n"
        ),
        encoding="utf-8",
    )
    (dest / "NFC.txt").write_text(
        (
            "Lista nevera — un NFC (Timeskey Ø25)\n\n"
            "En NFC Tools / NFCTap Config → grabar URL:\n"
            f"  {LISTA_URL}\n\n"
            "Cualquier móvil de casa que haga TAP abre la lista compartida.\n"
            "Ahí se añade, quita cantidad y se marca lo comprado.\n"
            "Botón «Enviar» / WhatsApp para llevarla al súper.\n\n"
            "noindex · no es una página pública de la tienda.\n"
        ),
        encoding="utf-8",
    )
    (dest / "IMPRIME.txt").write_text(
        (
            "CAMA — botón lista nevera\n"
            "=========================\n"
            "Reverso a la cama (cara lisa = pegar a la nevera).\n"
            f"Ø{DIAM:.0f} × {FACE_T:.1f} mm + relieve {RELIEF:.1f} mm.\n"
            "01_cuerpo.stl (negro) + 02_acento.stl (blanco).\n"
            "Agrupar. NO Reparar.\n"
            f"Pausa capa {layer}. Ver PAUSA_NFC.txt.\n"
        ),
        encoding="utf-8",
    )
    cfg = {
        "nombre": CW["nombre"],
        "kind": "lista-nevera",
        "forma": "circulo",
        "cuerpo": CW["cuerpo"],
        "acento": CW["acento"],
        "archivos": ["01_cuerpo.stl", "02_acento.stl"],
        "placa": [DIAM, DIAM, FACE_T],
        "relieve": RELIEF,
        "url": LISTA_URL,
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
        "uso": "pegar reverso a la nevera",
        "nota": f"Círculo fino {FACE_T:.1f} mm. Icono lista. TAP → lista compartida.",
    }
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def generate() -> None:
    dest = OUT
    dest.mkdir(parents=True, exist_ok=True)
    print(f"Lista nevera  Ø{DIAM:.0f} × {FACE_T:.1f} mm  relieve {RELIEF:.1f}")
    print(f"URL  {LISTA_URL}")
    print(f"pausa capa {pause_layer()} @ {Z_PAUSE:.2f} mm  tapa {FACE_T - Z_PAUSE:.2f} mm")
    cuerpo = body()
    acento = accent()
    cuerpo.write_stl(dest / "01_cuerpo.stl", "01_cuerpo")
    acento.write_stl(dest / "02_acento.stl", "02_acento")
    write_notes(dest)
    write_preview(dest / "vista-previa.svg")
    print(f"OK  {dest}")


if __name__ == "__main__":
    generate()
