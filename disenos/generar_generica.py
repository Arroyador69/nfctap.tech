#!/usr/bin/env python3
"""Atril genérico NFCTap de 15 €: reseña Google, G de un color, pie integrado.

Misma geometría, tres colorways de stock AD5X:
  generica-negra-amarillo   (la que más se imprime)
  generica-blanca-negra
  generica-negra-roja

2 STL: 01_cuerpo + 02_acento. Agrupar, no Reparar.
Personalizada = este cuerpo + logo y textos, sin rediseñar el atril.
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
    extrude,
    extrude_ring,
    rectangle,
    rounded_rect,
    shifted,
    star,
    text_mesh,
)

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl"

FACE_W = 76.0
FACE_H = 108.0
FACE_T = 8.0
FACE_R = 6.0
FOOT_Y = 8.0
FOOT_Z = 54.0
FOOT_W = 88.0

# Pegatina Ø25: pozo holgado + asiento. Si el hueco es justo, al reanudar
# se forma la "montañita" sobre el borde de la pegatina.
STICKER_D = 25.0
WELL_D = 36.0
SEAT_D = 30.0
Z_FLOOR = 3.20
Z_GUIDE = 3.60
Z_PAUSE = 4.80
COVER = FACE_T - Z_PAUSE
NFC_Y = FOOT_Y + FACE_H * 0.54
RELIEF = 0.50

COLORWAYS = (
    {
        "nombre": "generica-negra-amarillo",
        "cuerpo": "negro",
        "acento": "amarillo",
        "hex_cuerpo": "#141416",
        "hex_acento": "#E2B43A",
        "hex_fondo": "#F3EEE4",
        "nota": "Bares y resto. La de 15 € que más se pide.",
    },
    {
        "nombre": "generica-blanca-negra",
        "cuerpo": "blanco",
        "acento": "negro",
        "hex_cuerpo": "#F4F1EA",
        "hex_acento": "#141416",
        "hex_fondo": "#F7F4EE",
        "nota": "Clínicas, hoteles, recepciones.",
    },
    {
        "nombre": "generica-negra-roja",
        "cuerpo": "negro",
        "acento": "rojo",
        "hex_cuerpo": "#141416",
        "hex_acento": "#C42B34",
        "hex_fondo": "#F3EEE4",
        "nota": "Hostelería, más punch.",
    },
)


def plaque_outline() -> list[tuple[float, float]]:
    return [(x, y + FOOT_Y + FACE_H / 2) for x, y in rounded_rect(FACE_W, FACE_H, FACE_R)]


def body() -> Mesh:
    outer = plaque_outline()
    well = circle(0.0, NFC_Y, WELL_D / 2, 56)
    seat = circle(0.0, NFC_Y, SEAT_D / 2, 48)
    m = Mesh()
    m.extend(extrude(outer, 0.0, Z_FLOOR))
    m.extend(extrude_ring(outer, well, Z_FLOOR, Z_GUIDE))
    m.extend(extrude_ring(outer, seat, Z_GUIDE, Z_PAUSE))
    m.extend(extrude(outer, Z_PAUSE, FACE_T))
    m.extend(
        shifted(
            extrude(rounded_rect(FOOT_W, FOOT_Y + 2.4, 2.2, 8), 0.0, FOOT_Z),
            0.0,
            FOOT_Y / 2 + 0.15,
        )
    )
    return m


def accent() -> Mesh:
    m = Mesh()
    z0, z1 = FACE_T, FACE_T + RELIEF
    star_y = FOOT_Y + FACE_H - 13.0
    for i in range(5):
        m.extend(extrude(star((i - 2) * 12.2, star_y, 4.3), z0, z1))

    m.extend(extrude_ring(circle(0.0, NFC_Y, 17.2, 48), circle(0.0, NFC_Y, 13.4, 40), z0, z1))
    m.extend(shifted(text_mesh("G", pixel=2.35, height=RELIEF + 0.08, z0=z0), 0.0, NFC_Y))

    m.extend(shifted(text_mesh("TAP", pixel=1.55, height=RELIEF, z0=z0), 0.0, NFC_Y - 28.0))
    m.extend(shifted(text_mesh("RESEÑA", pixel=1.15, height=RELIEF, z0=z0), 0.0, NFC_Y - 40.5))

    m.extend(
        shifted(
            text_mesh("NFCTAP.TECH", pixel=0.62, height=0.70, z0=FOOT_Z, advance=6),
            0.0,
            FOOT_Y / 2 + 0.15,
        )
    )
    m.extend(extrude(rectangle(1.6, 1.6, 0.0, FOOT_Y + FACE_H + 5.0), 0.0, 0.20))
    return m


def write_preview(path: Path, cw: dict) -> None:
    body_c, acc, bg = cw["hex_cuerpo"], cw["hex_acento"], cw["hex_fondo"]
    ink = "#F6F1E7" if cw["cuerpo"] == "negro" else "#1C1915"
    stars = " ".join(
        f'<polygon points="{_star_svg(540 + (i - 2) * 52, 210, 16)}" fill="{acc}"/>' for i in range(5)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" width="1080" height="1440">
  <rect width="1080" height="1440" fill="{bg}"/>
  <text x="540" y="78" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="40">NFCTap</text>
  <text x="540" y="118" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="20">Genérica 15 € · {cw["cuerpo"]} + {cw["acento"]}</text>
  <rect x="330" y="168" width="420" height="980" rx="28" fill="{body_c}"/>
  {stars}
  <circle cx="540" cy="520" r="92" fill="none" stroke="{acc}" stroke-width="16"/>
  <text x="540" y="548" text-anchor="middle" fill="{acc}" font-family="Georgia, serif" font-size="120" font-weight="700">G</text>
  <text x="540" y="720" text-anchor="middle" fill="{acc}" font-family="Georgia, serif" font-size="54" font-weight="700">TAP</text>
  <text x="540" y="790" text-anchor="middle" fill="{acc}" font-family="Georgia, serif" font-size="40">RESEÑA</text>
  <rect x="300" y="1148" width="480" height="52" rx="8" fill="{body_c}"/>
  <text x="540" y="1184" text-anchor="middle" fill="{acc}" font-family="Georgia, serif" font-size="22" letter-spacing="3">NFCTAP.TECH</text>
  <text x="540" y="1290" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="22">TAP para dejar tu reseña en Google</text>
  <text x="540" y="1330" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="16">{cw["nota"]}</text>
  <text x="540" y="1388" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="14">Atril integrado · PLA {cw["cuerpo"]} + {cw["acento"]} · NFCTap.tech</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")
    _ = ink


def _star_svg(cx: float, cy: float, r: float) -> str:
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rr = r if i % 2 == 0 else r * 0.42
        pts.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    return " ".join(pts)


LEEME = """Atril genérico NFCTap — reseña Google (15 €)
============================================

Que es
------
Placa vertical + pie integrado (una pieza). TAP en la G
y se abre Google Reviews. G de UN color (no hay azul/verde en stock).

  01_cuerpo.stl   placa + pie + hueco NFC
  02_acento.stl   5 estrellas + G + TAP / RESEÑA + NFCTAP.TECH
  01_cuerpo_x2.stl + 02_acento_x2.stl   dos en la cama 220 mm

Personalizada (30 €): el MISMO cuerpo. Se cambia el logo y los
textos. No se rediseña el atril.

Imprime
-------
Agrupar 01 + 02. NO Reparar el modelo.
Capa 0,20 mm, 3 perímetros, gyroid 15 %, Arachne.
Pausa NFC: capa {capa} ({pause:.2f} mm).
Pozo Ø36, asiento Ø30: la pegatina Ø25 queda HUNDIDA.
Adhesivo a la cama. Si sobresale, no reanudes (montañita).
Se imprime tumbada (cara arriba). Se pone de pie (el pie en la mesa).

Colores de esta carpeta: cuerpo = {cuerpo}, acento = {acento}.
"""


def write_notes(dest: Path, cw: dict) -> None:
    capa = int(round(Z_PAUSE / 0.20))
    (dest / "LEEME.txt").write_text(
        LEEME.format(capa=capa, pause=Z_PAUSE, cuerpo=cw["cuerpo"], acento=cw["acento"]),
        encoding="utf-8",
    )
    (dest / "PAUSA_NFC.txt").write_text(
        (
            "Pausa NFC — atril genérico\n"
            "==========================\n"
            f"Altura: {Z_PAUSE:.2f} mm · capa {capa} a 0,20 mm\n"
            f"Pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Tapa encima: {COVER:.2f} mm\n\n"
            f"Capa {capa} -> Añadir pausa.\n"
            "Pegatina Timeskey NTAG215 Ø25, plana, adhesivo hacia la cama.\n"
            "Centrada en el asiento (hundida, no al ras). Reanudar.\n"
            "Si sobresale, no reanudes: la capa de encima hace montañita.\n"
        ),
        encoding="utf-8",
    )
    (dest / "NFC.txt").write_text(
        (
            "Genérica 15 € — un NFC\n\n"
            "Cualquier enlace → URL de Google Reviews del local.\n"
            "NFC Tap Config. No grabar hasta tener el enlace.\n"
        ),
        encoding="utf-8",
    )
    cfg = {
        "nombre": cw["nombre"],
        "kind": "generica",
        "precio": 15,
        "cuerpo": cw["cuerpo"],
        "acento": cw["acento"],
        "face": [FACE_W, FACE_H, FACE_T],
        "pie_z": FOOT_Z,
        "nfc": {
            "sticker": STICKER_D,
            "well": WELL_D,
            "seat": SEAT_D,
            "z_pause": Z_PAUSE,
        },
        "textos": ["TAP", "RESEÑA", "NFCTAP.TECH"],
        "nota": cw["nota"],
    }
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def raster_preview(svg_path: Path) -> None:
    png = svg_path.with_suffix(".png")
    jpg = svg_path.with_name("propuesta.jpg")
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return
    cw_name = svg_path.parent.name
    cw = next(c for c in COLORWAYS if c["nombre"] == cw_name)
    w, h = 1080, 1440
    img = Image.new("RGB", (w, h), tuple(int(cw["hex_fondo"][i : i + 2], 16) for i in (1, 3, 5)))
    draw = ImageDraw.Draw(img)
    body = tuple(int(cw["hex_cuerpo"][i : i + 2], 16) for i in (1, 3, 5))
    acc = tuple(int(cw["hex_acento"][i : i + 2], 16) for i in (1, 3, 5))
    georgia = Path("/System/Library/Fonts/Supplemental/Georgia.ttf")
    bold = Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
    title = ImageFont.truetype(str(bold if bold.exists() else georgia), 42)
    sub = ImageFont.truetype(str(georgia), 22)
    gfont = ImageFont.truetype(str(bold if bold.exists() else georgia), 130)
    toca = ImageFont.truetype(str(bold if bold.exists() else georgia), 52)
    rese = ImageFont.truetype(str(georgia), 36)
    firm = ImageFont.truetype(str(georgia), 22)
    tiny = ImageFont.truetype(str(georgia), 16)
    draw.text((540, 70), "NFCTap", font=title, fill=(28, 25, 21), anchor="mt")
    draw.text((540, 118), f"Genérica 15 € · {cw['cuerpo']} + {cw['acento']}", font=sub, fill=(122, 106, 82), anchor="mt")
    draw.rounded_rectangle((330, 168, 750, 1148), 28, fill=body)
    for i in range(5):
        cx, cy, r = 540 + (i - 2) * 52, 210, 16
        pts = []
        for k in range(10):
            a = math.radians(-90 + k * 36)
            rr = r if k % 2 == 0 else r * 0.42
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        draw.polygon(pts, fill=acc)
    draw.ellipse((540 - 92, 520 - 92, 540 + 92, 520 + 92), outline=acc, width=16)
    draw.text((540, 520), "G", font=gfont, fill=acc, anchor="mm")
    draw.text((540, 700), "TAP", font=toca, fill=acc, anchor="mt")
    draw.text((540, 768), "RESEÑA", font=rese, fill=acc, anchor="mt")
    draw.rounded_rectangle((300, 1148, 780, 1200), 8, fill=body)
    draw.text((540, 1174), "NFCTAP.TECH", font=firm, fill=acc, anchor="mm")
    draw.text((540, 1288), "TAP para dejar tu reseña en Google", font=sub, fill=(28, 25, 21), anchor="mt")
    draw.text((540, 1330), cw["nota"], font=tiny, fill=(122, 106, 82), anchor="mt")
    draw.text((540, 1386), f"Atril integrado · PLA {cw['cuerpo']} + {cw['acento']} · NFCTap.tech", font=tiny, fill=(122, 106, 82), anchor="mt")
    img.save(png, "PNG")
    img.save(jpg, "JPEG", quality=92, optimize=True)
    print(f"  JPG  {jpg.name}")


BED = 220.0
BED_MARGIN = 6.0
BED_GAP = 8.0


def _bbox_xy(mesh: Mesh) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for a, b, c in mesh.tris:
        for v in (a, b, c):
            xs.append(v[0])
            ys.append(v[1])
    return min(xs), max(xs), min(ys), max(ys)


def pack_bed(src: Mesh) -> tuple[Mesh, int, int, int]:
    """Máximas copias en cama AD5X 220×220, misma orientación (tumbadas)."""
    x0, x1, y0, y1 = _bbox_xy(src)
    w, h = x1 - x0, y1 - y0
    usable = BED - 2 * BED_MARGIN
    nx = max(1, int((usable + BED_GAP) // (w + BED_GAP)))
    ny = max(1, int((usable + BED_GAP) // (h + BED_GAP)))
    out = Mesh()
    tw = nx * w + (nx - 1) * BED_GAP
    th = ny * h + (ny - 1) * BED_GAP
    ox = -tw / 2 - x0
    oy = -th / 2 - y0
    n = 0
    for iy in range(ny):
        for ix in range(nx):
            out.extend(shifted(src, ox + ix * (w + BED_GAP), oy + iy * (h + BED_GAP)))
            n += 1
    return out, n, nx, ny


def generate_one(cw: dict) -> None:
    dest = OUT / cw["nombre"]
    dest.mkdir(parents=True, exist_ok=True)
    print(f"\nGenérica {cw['nombre']}  {cw['cuerpo']}+{cw['acento']}")
    cuerpo = body()
    acento = accent()
    cuerpo.write_stl(dest / "01_cuerpo.stl", "cuerpo")
    acento.write_stl(dest / "02_acento.stl", "acento")
    placa_c, n, nx, ny = pack_bed(cuerpo)
    placa_a, _, _, _ = pack_bed(acento)
    if n > 1:
        placa_c.write_stl(dest / f"01_cuerpo_x{n}.stl", "cuerpo_placa")
        placa_a.write_stl(dest / f"02_acento_x{n}.stl", "acento_placa")
        (dest / "PLACA.txt").write_text(
            (
                f"Cama AD5X 220×220: {n} genéricas ({nx}×{ny}).\n"
                f"Importa 01_cuerpo_x{n}.stl + 02_acento_x{n}.stl, agrupa, no Reparar.\n"
                f"Misma pausa capa 24 en TODAS (están a la misma altura).\n"
                "Una pegatina por hueco, hundida, adhesivo a la cama.\n"
            ),
            encoding="utf-8",
        )
        print(f"  placa {n} uds  ({nx}×{ny}) en 220 mm")
    write_notes(dest, cw)
    svg = dest / "vista-previa.svg"
    write_preview(svg, cw)
    raster_preview(svg)
    print(f"  OK  {dest}")


def generate() -> None:
    print(f"\nAtril genérico  {FACE_W:.0f}x{FACE_H:.0f}x{FACE_T:.0f} mm  pie {FOOT_Z:.0f} mm")
    print(f"Pausa NFC {Z_PAUSE:.2f} mm  tapa {COVER:.2f} mm")
    for cw in COLORWAYS:
        generate_one(cw)


if __name__ == "__main__":
    generate()
