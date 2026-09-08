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
    extrude_plate_hole,
    google_g_mesh,
    google_g_pil,
    google_g_svg,
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

# Pegatina Ø25: pozo ABIERTO abajo. G/logo grande con holgura, como en Flash.
STICKER_D = 25.0
WELL_D = 28.0
SEAT_D = 26.0
Z_FLOOR = 3.20
Z_GUIDE = 3.60
STAR_Y = 99.0
MARK_Y = 73.0
MARK_R = 15.2
TAP_Y = 50.0
RESE_Y = 41.0
TAP_PX = 1.42
RESE_PX = 1.08
NFC_Y = 23.0
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
    m.extend(extrude_plate_hole(outer, seat, Z_FLOOR, Z_GUIDE))
    m.extend(extrude_plate_hole(outer, well, Z_GUIDE, FACE_T))
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
    for i in range(5):
        m.extend(extrude(star((i - 2) * 12.2, STAR_Y, 4.3), z0, z1))

    m.extend(google_g_mesh(0.0, MARK_Y, MARK_R, z0, z1 + 0.08))

    m.extend(shifted(text_mesh("TAP", pixel=TAP_PX, height=RELIEF, z0=z0), 0.0, TAP_Y))
    m.extend(shifted(text_mesh("RESEÑA", pixel=RESE_PX, height=RELIEF, z0=z0), 0.0, RESE_Y))

    m.extend(
        shifted(
            text_mesh("NFCTAP.TECH", pixel=0.62, height=0.70, z0=FOOT_Z, advance=6),
            0.0,
            FOOT_Y / 2 + 0.15,
        )
    )
    return m


def write_preview(path: Path, cw: dict) -> None:
    body_c, acc, bg = cw["hex_cuerpo"], cw["hex_acento"], cw["hex_fondo"]
    sc = 420 / FACE_W
    top = 200.0

    def sx(x: float) -> float:
        return 540 + x * sc

    def sy(y: float) -> float:
        return top + (FOOT_Y + FACE_H - y) * sc

    stars = " ".join(
        f'<polygon points="{_star_svg(sx((i - 2) * 12.2), sy(STAR_Y), 4.3 * sc)}" fill="{acc}"/>'
        for i in range(5)
    )
    well_fill = "#2a2a2e" if cw["cuerpo"] == "negro" else "#d8d2c6"
    seat_fill = "#1a1a1c" if cw["cuerpo"] == "negro" else "#c4bdb0"
    face_x = sx(-FACE_W / 2)
    face_y = sy(FOOT_Y + FACE_H)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" width="1080" height="1440">
  <rect width="1080" height="1440" fill="{bg}"/>
  <text x="540" y="78" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="40">NFCTap</text>
  <text x="540" y="118" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="20">Genérica 15 € · {cw["cuerpo"]} + {cw["acento"]}</text>
  <rect x="{face_x:.1f}" y="{face_y:.1f}" width="{FACE_W * sc:.1f}" height="{FACE_H * sc:.1f}" rx="{FACE_R * sc:.1f}" fill="{body_c}"/>
  {stars}
  {google_g_svg(sx(0), sy(MARK_Y), MARK_R * sc, acc)}
  <text x="540" y="{sy(TAP_Y) + 18:.1f}" text-anchor="middle" fill="{acc}" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="44" font-weight="700">TAP</text>
  <text x="540" y="{sy(RESE_Y) + 14:.1f}" text-anchor="middle" fill="{acc}" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="32">RESEÑA</text>
  <circle cx="540" cy="{sy(NFC_Y):.1f}" r="{WELL_D / 2 * sc:.1f}" fill="{well_fill}"/>
  <circle cx="540" cy="{sy(NFC_Y):.1f}" r="{SEAT_D / 2 * sc:.1f}" fill="{seat_fill}"/>
  <circle cx="540" cy="{sy(NFC_Y):.1f}" r="{STICKER_D / 2 * sc:.1f}" fill="none" stroke="{acc}" stroke-width="1.5" stroke-dasharray="6 5" opacity="0.45"/>
  <rect x="{sx(-FOOT_W / 2):.1f}" y="{sy(FOOT_Y) + 4:.1f}" width="{FOOT_W * sc:.1f}" height="48" rx="8" fill="{body_c}"/>
  <text x="540" y="{sy(FOOT_Y) + 36:.1f}" text-anchor="middle" fill="{acc}" font-family="Georgia, serif" font-size="20" letter-spacing="3">NFCTAP.TECH</text>
  <text x="540" y="1288" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="22">Hueco NFC abierto · TAP para tu reseña en Google</text>
  <text x="540" y="1328" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="16">{cw["nota"]}</text>
  <text x="540" y="1386" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="14">Atril integrado · PLA {cw["cuerpo"]} + {cw["acento"]} · NFCTap.tech</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


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
Placa vertical + pie integrado. G de Google, TAP / RESEÑA y
hueco NFC ABIERTO (se ve, más grande que la pegatina).
Nada de acento encima del hueco: no hay montañita.

  01_cuerpo.stl / 02_acento.stl     una pieza (agrupar, no Reparar)
  01_cuerpo_a/b.stl + 02_acento_a/b.stl   dos SUELTAS en la cama

Personalizada (30 €): el MISMO cuerpo. Logo en acento en vez de la G.

Imprime
-------
Agrupar 01 + 02. NO Reparar el modelo.
Capa 0,20 mm, 3 perímetros, gyroid 15 %, Arachne.
NO hace falta pausa: el pozo queda abierto.
Pozo Ø{well:.0f}, asiento Ø{seat:.0f}, pegatina Ø{sticker:.0f} HUNDIDA.
Al terminar, mete la pegatina en el hueco (adhesivo al asiento).
Se imprime tumbada (cara arriba). Se pone de pie.

Colores de esta carpeta: cuerpo = {cuerpo}, acento = {acento}.
"""


def write_notes(dest: Path, cw: dict) -> None:
    (dest / "LEEME.txt").write_text(
        LEEME.format(
            well=WELL_D,
            seat=SEAT_D,
            sticker=STICKER_D,
            cuerpo=cw["cuerpo"],
            acento=cw["acento"],
        ),
        encoding="utf-8",
    )
    (dest / "PAUSA_NFC.txt").write_text(
        (
            "Hueco NFC — abierto, sin pausa\n"
            "==============================\n"
            f"Pozo Ø{WELL_D:.0f} (se ve) · asiento Ø{SEAT_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Suelo del pozo: {Z_FLOOR:.2f} mm. La cara no tapa el hueco.\n\n"
            "Imprime entero. Al terminar, mete la pegatina Timeskey Ø25\n"
            "en el asiento (hundida, adhesivo abajo). No hay filamento encima.\n"
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
            "open": True,
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
    arial = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    arial_b = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    sans = arial if arial.exists() else georgia
    sans_b = arial_b if arial_b.exists() else (bold if bold.exists() else georgia)
    title = ImageFont.truetype(str(bold if bold.exists() else georgia), 42)
    sub = ImageFont.truetype(str(georgia), 22)
    toca = ImageFont.truetype(str(sans_b), 52)
    rese = ImageFont.truetype(str(sans), 36)
    firm = ImageFont.truetype(str(sans), 22)
    tiny = ImageFont.truetype(str(georgia), 16)
    sc = 420 / FACE_W
    top = 200.0

    def sx(x: float) -> float:
        return 540 + x * sc

    def sy(y: float) -> float:
        return top + (FOOT_Y + FACE_H - y) * sc

    well_c = (42, 42, 46) if cw["cuerpo"] == "negro" else (216, 210, 198)
    seat_c = (26, 26, 28) if cw["cuerpo"] == "negro" else (196, 189, 176)
    draw.text((540, 70), "NFCTap", font=title, fill=(28, 25, 21), anchor="mt")
    draw.text((540, 118), f"Genérica 15 € · {cw['cuerpo']} + {cw['acento']}", font=sub, fill=(122, 106, 82), anchor="mt")
    draw.rounded_rectangle(
        (sx(-FACE_W / 2), sy(FOOT_Y + FACE_H), sx(FACE_W / 2), sy(FOOT_Y)),
        FACE_R * sc,
        fill=body,
    )
    for i in range(5):
        cx, cy, r = sx((i - 2) * 12.2), sy(STAR_Y), 4.3 * sc
        pts = []
        for k in range(10):
            a = math.radians(-90 + k * 36)
            rr = r if k % 2 == 0 else r * 0.42
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        draw.polygon(pts, fill=acc)
    google_g_pil(draw, sx(0), sy(MARK_Y), MARK_R * sc, acc, cut=body)
    draw.text((540, sy(TAP_Y)), "TAP", font=toca, fill=acc, anchor="mm")
    draw.text((540, sy(RESE_Y)), "RESEÑA", font=rese, fill=acc, anchor="mm")
    nx, ny = sx(0), sy(NFC_Y)
    draw.ellipse((nx - WELL_D / 2 * sc, ny - WELL_D / 2 * sc, nx + WELL_D / 2 * sc, ny + WELL_D / 2 * sc), fill=well_c)
    draw.ellipse((nx - SEAT_D / 2 * sc, ny - SEAT_D / 2 * sc, nx + SEAT_D / 2 * sc, ny + SEAT_D / 2 * sc), fill=seat_c)
    draw.rounded_rectangle((sx(-FOOT_W / 2), sy(FOOT_Y) + 4, sx(FOOT_W / 2), sy(FOOT_Y) + 52), 8, fill=body)
    draw.text((540, sy(FOOT_Y) + 28), "NFCTAP.TECH", font=firm, fill=acc, anchor="mm")
    draw.text((540, 1288), "Hueco NFC abierto · TAP para tu reseña en Google", font=sub, fill=(28, 25, 21), anchor="mt")
    draw.text((540, 1328), cw["nota"], font=tiny, fill=(122, 106, 82), anchor="mt")
    draw.text((540, 1386), f"Atril integrado · PLA {cw['cuerpo']} + {cw['acento']} · NFCTap.tech", font=tiny, fill=(122, 106, 82), anchor="mt")
    img.save(png, "PNG")
    img.save(jpg, "JPEG", quality=92, optimize=True)
    print(f"  JPG  {jpg.name}")


BED = 220.0
BED_MARGIN = 6.0
BED_GAP = 14.0


def _bbox_xy(mesh: Mesh) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for a, b, c in mesh.tris:
        for v in (a, b, c):
            xs.append(v[0])
            ys.append(v[1])
    return min(xs), max(xs), min(ys), max(ys)


def plate_offsets(src: Mesh, copies: int = 2) -> list[tuple[float, float]]:
    """Desplazamientos para N piezas SUELTAS. Siempre se miden sobre el cuerpo."""
    x0, x1, y0, y1 = _bbox_xy(src)
    w, h = x1 - x0, y1 - y0
    usable = BED - 2 * BED_MARGIN
    if copies * w + (copies - 1) * BED_GAP > usable:
        copies = 1
    tw = copies * w + (copies - 1) * BED_GAP
    ox = -tw / 2 - x0
    oy = -h / 2 - y0
    return [(ox + i * (w + BED_GAP), oy) for i in range(copies)]


def generate_one(cw: dict) -> None:
    dest = OUT / cw["nombre"]
    dest.mkdir(parents=True, exist_ok=True)
    print(f"\nGenérica {cw['nombre']}  {cw['cuerpo']}+{cw['acento']}")
    cuerpo = body()
    acento = accent()
    cuerpo.write_stl(dest / "01_cuerpo.stl", "cuerpo")
    acento.write_stl(dest / "02_acento.stl", "acento")
    for stale in dest.glob("*_x2.stl"):
        stale.unlink()
    offs = plate_offsets(cuerpo, 2)
    labels = ("a", "b")
    if len(offs) > 1:
        x0, x1, _, _ = _bbox_xy(cuerpo)
        gap = offs[1][0] - offs[0][0] - (x1 - x0)
        for lab, (dx, dy) in zip(labels, offs):
            shifted(cuerpo, dx, dy).write_stl(dest / f"01_cuerpo_{lab}.stl", f"cuerpo_{lab}")
            shifted(acento, dx, dy).write_stl(dest / f"02_acento_{lab}.stl", f"acento_{lab}")
        (dest / "PLACA.txt").write_text(
            (
                "Cama AD5X 220×220: 2 genéricas SUELTAS (no pegadas).\n"
                f"Hueco entre pies: {gap:.1f} mm.\n\n"
                "Importa los 4 STL:\n"
                "  01_cuerpo_a.stl + 02_acento_a.stl  → Agrupar (pieza 1)\n"
                "  01_cuerpo_b.stl + 02_acento_b.stl  → Agrupar (pieza 2)\n"
                "NO Reparar. No uses un STL x2 viejo.\n"
                "Hueco abierto: una pegatina por pozo al terminar, sin pausa.\n"
            ),
            encoding="utf-8",
        )
        print(f"  placa 2 sueltas  hueco {gap:.1f} mm")
    write_notes(dest, cw)
    svg = dest / "vista-previa.svg"
    write_preview(svg, cw)
    raster_preview(svg)
    print(f"  OK  {dest}")


def generate() -> None:
    print(f"\nAtril genérico  {FACE_W:.0f}x{FACE_H:.0f}x{FACE_T:.0f} mm  pie {FOOT_Z:.0f} mm")
    print(f"Hueco NFC abierto Ø{WELL_D:.0f}  asiento Ø{SEAT_D:.0f}")
    for cw in COLORWAYS:
        generate_one(cw)


if __name__ == "__main__":
    generate()
