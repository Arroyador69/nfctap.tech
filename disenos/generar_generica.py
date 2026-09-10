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
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from instagram_logo import (  # noqa: E402
    ig_camera_mesh,
    ig_camera_pil,
    ig_camera_svg,
    ig_word_mesh,
    ig_word_glyphs,
    ig_word_width,
)
from whatsapp_logo import (  # noqa: E402
    wa_logo_mesh,
    wa_logo_parts,
    wa_logo_pil,
    wa_logo_svg_placed,
    wa_word_glyphs,
    wa_word_mesh,
    wa_word_width,
)
from letras_sans import sans_word, word_polys  # noqa: E402
from generar_tarjetas import (  # noqa: E402
    Mesh,
    circle,
    extrude,
    extrude_plate_hole,
    extrude_ring,
    google_g_mesh,
    google_g_pil,
    google_g_svg,
    rounded_rect,
    shifted,
    star,
)

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl"

FACE_W = 76.0
FACE_H = 86.0
FACE_T = 8.0
FACE_R = 6.0
FOOT_Y = 8.0
FOOT_Z = 54.0
FOOT_W = 88.0

# Pegatina Ø25: pozo interno con pausa. Disco + anillo de acento = mira.
STICKER_D = 25.0
WELL_D = 28.0
SEAT_D = 26.0
PAD_D = 24.0
PAD_H = 0.50
Z_FLOOR = 3.20
Z_GUIDE = 3.60
Z_PAUSE = 4.80
RING_H = 0.45
FIRST_LAYER = 0.25
LAYER_H = 0.20


def pause_layer() -> int:
    """Capa de Flash a 0,20 mm (primera 0,25 mm) donde el pozo aún se ve."""
    return 1 + int(round((Z_PAUSE - FIRST_LAYER) / LAYER_H))


STAR_Y = 87.0
MARK_Y = 56.0
MARK_R = 16.5
TAP_Y = 22.0
TAP_H = 7.0
TAP_TRACK = 2.4
NFC_Y = MARK_Y  # bajo la G / el logo de Instagram
RELIEF = 0.50
IG_WORD_Y = STAR_Y
IG_WORD_H = 8.0
IG_WORD_TRACK = 0.35
IG_SIZE = 33.0  # mismo tamaño que la G; el trazo es más fino
WA_WORD_Y = STAR_Y
WA_WORD_H = 8.0
WA_WORD_TRACK = 0.35
WA_SIZE = 33.0


# Genérica de stock: flotante + TAP (misma letra que NFCTAP.TECH).
ESTILOS = (
    {
        "id": "v4-flotante",
        "titulo": "Flotante",
        "nota": "Estrellas flotantes, G y TAP debajo. La genérica.",
        "stars": "flotante",
        "g_r": 16.5,
    },
)

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

IG_ESTILOS = (
    {
        "id": "v4-instagram",
        "titulo": "Instagram",
        "nota": "Wordmark Instagram, logo cámara y TAP. Mismas medidas que la G.",
        "marca": "instagram",
        "ig_size": IG_SIZE,
    },
)

IG_COLORWAYS = (
    {**COLORWAYS[0], "nombre": "generica-instagram-negra-amarillo", "nota": "Perfil Instagram. Negro + amarillo."},
)

WA_ESTILOS = (
    {
        "id": "v4-whatsapp",
        "titulo": "WhatsApp",
        "nota": "Wordmark WhatsApp, globo + teléfono y TAP. Mismas medidas que la G.",
        "marca": "whatsapp",
        "wa_size": WA_SIZE,
    },
)

WA_COLORWAYS = (
    {**COLORWAYS[0], "nombre": "generica-whatsapp-negra-amarillo", "nota": "Perfil WhatsApp. Negro + amarillo."},
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
    m.extend(extrude_plate_hole(outer, well, Z_GUIDE, Z_PAUSE))
    m.extend(extrude(outer, Z_PAUSE, FACE_T))
    m.extend(
        shifted(
            extrude(rounded_rect(FOOT_W, FOOT_Y + 2.4, 2.2, 8), 0.0, FOOT_Z),
            0.0,
            FOOT_Y / 2 + 0.15,
        )
    )
    return m


def nfc_mira() -> Mesh:
    """Disco + anillo de acento en el suelo del pozo. Se imprime ANTES de la pausa."""
    m = Mesh()
    m.extend(extrude(circle(0.0, NFC_Y, PAD_D / 2, 48), Z_FLOOR, Z_FLOOR + PAD_H))
    m.extend(
        extrude_ring(
            circle(0.0, NFC_Y, WELL_D / 2 - 0.20, 48),
            circle(0.0, NFC_Y, SEAT_D / 2 + 0.20, 40),
            Z_GUIDE,
            Z_GUIDE + RING_H,
        )
    )
    return m


def star_layout(estilo: dict) -> list[tuple[float, float, float]]:
    """Cinco estrellas flotantes de distinto tamaño."""
    del estilo
    sizes = (3.1, 3.9, 5.2, 3.9, 3.1)
    lift = (0.0, 2.2, 4.4, 2.2, 0.0)
    return [((i - 2) * 12.0, STAR_Y + lift[i], sizes[i]) for i in range(5)]


def accent(estilo: dict | None = None) -> Mesh:
    e = estilo or ESTILOS[0]
    if e.get("marca") == "instagram":
        return accent_instagram(e)
    if e.get("marca") == "whatsapp":
        return accent_whatsapp(e)
    m = nfc_mira()
    z0, z1 = FACE_T, FACE_T + RELIEF
    for x, y, r in star_layout(e):
        m.extend(extrude(star(x, y, r), z0, z1 + 0.12))

    gr = float(e.get("g_r", MARK_R))
    m.extend(google_g_mesh(0.0, MARK_Y, gr, z0, z1 + 0.08))
    m.extend(sans_word("TAP", 0.0, TAP_Y, TAP_H, TAP_TRACK, z0, z1))
    m.extend(sans_word("NFCTAP.TECH", 0.0, FOOT_Y / 2 + 0.15, 3.4, 1.15, FOOT_Z, FOOT_Z + 0.70))
    return m


def accent_instagram(estilo: dict) -> Mesh:
    size = float(estilo.get("ig_size", IG_SIZE))
    w = ig_word_width(IG_WORD_H, IG_WORD_TRACK)
    if w > FACE_W - 8.0:
        raise SystemExit(f"  Wordmark Instagram {w:.1f} mm no cabe en la placa {FACE_W:.0f} mm")
    m = nfc_mira()
    z0, z1 = FACE_T, FACE_T + RELIEF
    m.extend(ig_word_mesh(0.0, IG_WORD_Y, IG_WORD_H, IG_WORD_TRACK, z0, z1 + 0.08))
    m.extend(ig_camera_mesh(0.0, MARK_Y, size, z0, z1 + 0.08))
    m.extend(sans_word("TAP", 0.0, TAP_Y, TAP_H, TAP_TRACK, z0, z1))
    m.extend(sans_word("NFCTAP.TECH", 0.0, FOOT_Y / 2 + 0.15, 3.4, 1.15, FOOT_Z, FOOT_Z + 0.70))
    return m


def accent_whatsapp(estilo: dict) -> Mesh:
    size = float(estilo.get("wa_size", WA_SIZE))
    w = wa_word_width(WA_WORD_H, WA_WORD_TRACK)
    if w > FACE_W - 8.0:
        raise SystemExit(f"  Wordmark WhatsApp {w:.1f} mm no cabe en la placa {FACE_W:.0f} mm")
    m = nfc_mira()
    z0, z1 = FACE_T, FACE_T + RELIEF
    m.extend(wa_word_mesh(0.0, WA_WORD_Y, WA_WORD_H, WA_WORD_TRACK, z0, z1 + 0.08))
    m.extend(wa_logo_mesh(0.0, MARK_Y, size, z0, z1 + 0.08))
    m.extend(sans_word("TAP", 0.0, TAP_Y, TAP_H, TAP_TRACK, z0, z1))
    m.extend(sans_word("NFCTAP.TECH", 0.0, FOOT_Y / 2 + 0.15, 3.4, 1.15, FOOT_Z, FOOT_Z + 0.70))
    return m


def write_preview(path: Path, cw: dict, estilo: dict | None = None) -> None:
    e = estilo or ESTILOS[0]
    body_c, acc, bg = cw["hex_cuerpo"], cw["hex_acento"], cw["hex_fondo"]
    sc = 420 / FACE_W
    top = 200.0

    def sx(x: float) -> float:
        return 540 + x * sc

    def sy(y: float) -> float:
        return top + (FOOT_Y + FACE_H - y) * sc

    gr = float(e.get("g_r", MARK_R))
    nfc_ring = ""
    if e.get("marca") == "instagram":
        ig_size = float(e.get("ig_size", IG_SIZE))
        word_paths = []
        for outer, holes in ig_word_glyphs(0.0, IG_WORD_Y, IG_WORD_H, IG_WORD_TRACK):
            d = "M " + " L ".join(f"{sx(x):.1f},{sy(y):.1f}" for x, y in outer) + " Z"
            for hole in holes:
                d += " M " + " L ".join(f"{sx(x):.1f},{sy(y):.1f}" for x, y in hole) + " Z"
            word_paths.append(f'<path d="{d}" fill="{acc}" fill-rule="evenodd"/>')
        stars = " ".join(word_paths)
        mark = ig_camera_svg(sx(0), sy(MARK_Y), ig_size * sc, acc)
        nfc_ring = (
            f'<circle cx="{sx(0):.1f}" cy="{sy(NFC_Y):.1f}" r="{WELL_D / 2 * sc:.1f}" '
            f'fill="none" stroke="{acc}" stroke-width="1.8" stroke-dasharray="6 5" opacity="0.45"/>'
        )
        pie_txt = f"NFC Ø{STICKER_D:.0f} (pozo Ø{WELL_D:.0f}) centro del logo · pausa capa {pause_layer()}"
    elif e.get("marca") == "whatsapp":
        wa_size = float(e.get("wa_size", WA_SIZE))
        word_paths = []
        for outer, holes in wa_word_glyphs(0.0, WA_WORD_Y, WA_WORD_H, WA_WORD_TRACK):
            d = "M " + " L ".join(f"{sx(x):.1f},{sy(y):.1f}" for x, y in outer) + " Z"
            for hole in holes:
                d += " M " + " L ".join(f"{sx(x):.1f},{sy(y):.1f}" for x, y in hole) + " Z"
            word_paths.append(f'<path d="{d}" fill="{acc}" fill-rule="evenodd"/>')
        stars = " ".join(word_paths)
        parts = wa_logo_parts(0.0, MARK_Y, wa_size)
        parts_px = {k: [(sx(x), sy(y)) for x, y in poly] for k, poly in parts.items()}
        mark = wa_logo_svg_placed(parts_px, acc)
        nfc_ring = (
            f'<circle cx="{sx(0):.1f}" cy="{sy(NFC_Y):.1f}" r="{WELL_D / 2 * sc:.1f}" '
            f'fill="none" stroke="{acc}" stroke-width="1.8" stroke-dasharray="6 5" opacity="0.45"/>'
        )
        pie_txt = f"NFC Ø{STICKER_D:.0f} (pozo Ø{WELL_D:.0f}) centro del logo · pausa capa {pause_layer()}"
    else:
        stars = " ".join(
            f'<polygon points="{_star_svg(sx(x), sy(y), r * sc)}" fill="{acc}"/>' for x, y, r in star_layout(e)
        )
        mark = google_g_svg(sx(0), sy(MARK_Y), gr * sc, acc)
        pie_txt = f"NFC bajo la G · {e['titulo']}"
    face_x = sx(-FACE_W / 2)
    face_y = sy(FOOT_Y + FACE_H)
    tap = " ".join(
        f'<polygon points="{_poly_svg(poly, sx, sy)}" fill="{acc}"/>'
        for poly in word_polys("TAP", 0.0, TAP_Y, TAP_H, TAP_TRACK)
    )
    bar_cy = sy(FOOT_Y) + 28
    foot = " ".join(
        f'<polygon points="{" ".join(f"{sx(x):.1f},{bar_cy - y * sc:.1f}" for x, y in poly)}" fill="{acc}"/>'
        for poly in word_polys("NFCTAP.TECH", 0.0, 0.0, 3.4, 1.15)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" width="1080" height="1440">
  <rect width="1080" height="1440" fill="{bg}"/>
  <text x="540" y="78" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="40">NFCTap</text>
  <text x="540" y="118" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="20">{e["titulo"]} · {cw["cuerpo"]} + {cw["acento"]}</text>
  <rect x="{face_x:.1f}" y="{face_y:.1f}" width="{FACE_W * sc:.1f}" height="{FACE_H * sc:.1f}" rx="{FACE_R * sc:.1f}" fill="{body_c}"/>
  {stars}
  {nfc_ring}
  {mark}
  {tap}
  <rect x="{sx(-FOOT_W / 2):.1f}" y="{sy(FOOT_Y) + 4:.1f}" width="{FOOT_W * sc:.1f}" height="48" rx="8" fill="{body_c}"/>
  {foot}
  <text x="540" y="1288" text-anchor="middle" fill="#1C1915" font-family="Georgia, serif" font-size="22">{pie_txt}</text>
  <text x="540" y="1328" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="16">{e["nota"]}</text>
  <text x="540" y="1386" text-anchor="middle" fill="#7A6A52" font-family="Georgia, serif" font-size="14">Atril {FACE_W:.0f}×{FACE_H:.0f}×{FACE_T:.0f} mm · PLA {cw["cuerpo"]} + {cw["acento"]} · NFCTap.tech</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def _poly_svg(poly: list[tuple[float, float]], sx, sy) -> str:
    return " ".join(f"{sx(x):.1f},{sy(y):.1f}" for x, y in poly)


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
Placa + pie integrado. Estrellas flotantes, G y TAP debajo.
NFC DENTRO, justo bajo la G (o el logo en personalizada). Pausa a mitad.
Antes de pausar se imprime un disco de acento en el suelo del pozo:
eso es la mira. La pegatina va ENCIMA de ese círculo.

  01_cuerpo.stl / 02_acento.stl     una pieza (agrupar, no Reparar)
  01_cuerpo_a/b.stl + 02_acento_a/b.stl   dos SUELTAS en la cama

Personalizada (30 €): el MISMO cuerpo. Logo en acento en vez de la G.

Imprime
-------
Agrupar 01 + 02. NO Reparar el modelo.
Capa 0,20 mm, 3 perímetros, gyroid 15 %, Arachne.
Pausa OBLIGATORIA capa {layer} ({pause:.2f} mm). Ver PAUSA_NFC.txt.
Pozo Ø{well:.0f}, asiento Ø{seat:.0f}, pegatina Ø{sticker:.0f}.
Se imprime con la cara de la placa hacia arriba (el pie sale hacia Z).
Al acabar se pone de pie.

Colores de esta carpeta: cuerpo = {cuerpo}, acento = {acento}.
"""


LEEME_WA = """Atril genérico NFCTap — WhatsApp (15 €)
=======================================

Que es
------
Mismas medidas que la genérica Google. Arriba el wordmark WhatsApp,
en el centro el logo (globo + teléfono), TAP debajo y NFCTAP.TECH en el pie.
NFC DENTRO, en el centro del logo. Pausa a mitad.
Antes de pausar se imprime un disco de acento en el suelo del pozo:
eso es la mira. La pegatina Timeskey Ø25 va ENCIMA de ese círculo.

  01_cuerpo.stl / 02_acento.stl     una pieza (agrupar, no Reparar)
  01_cuerpo_a/b.stl + 02_acento_a/b.stl   dos SUELTAS en la cama

Imprime
-------
Agrupar 01 + 02. NO Reparar el modelo.
Capa 0,20 mm, 3 perímetros, gyroid 15 %, Arachne.
Pausa OBLIGATORIA capa {layer} ({pause:.2f} mm). Ver PAUSA_NFC.txt.
Pozo Ø{well:.0f}, asiento Ø{seat:.0f}, pegatina Ø{sticker:.0f}.
Se imprime con la cara de la placa hacia arriba (el pie sale hacia Z).
Al acabar se pone de pie.

Colores de esta carpeta: cuerpo = {cuerpo}, acento = {acento}.
"""


LEEME_IG = """Atril genérico NFCTap — Instagram (15 €)
=======================================

Que es
------
Mismas medidas que la genérica Google. Arriba el wordmark Instagram,
en el centro el logo (cámara), TAP debajo y NFCTAP.TECH en el pie.
NFC DENTRO, en el centro del logo. Pausa a mitad.
Antes de pausar se imprime un disco de acento en el suelo del pozo:
eso es la mira. La pegatina Timeskey Ø25 va ENCIMA de ese círculo.

  01_cuerpo.stl / 02_acento.stl     una pieza (agrupar, no Reparar)
  01_cuerpo_a/b.stl + 02_acento_a/b.stl   dos SUELTAS en la cama

Imprime
-------
Agrupar 01 + 02. NO Reparar el modelo.
Capa 0,20 mm, 3 perímetros, gyroid 15 %, Arachne.
Pausa OBLIGATORIA capa {layer} ({pause:.2f} mm). Ver PAUSA_NFC.txt.
Pozo Ø{well:.0f}, asiento Ø{seat:.0f}, pegatina Ø{sticker:.0f}.
Se imprime con la cara de la placa hacia arriba (el pie sale hacia Z).
Al acabar se pone de pie.

Colores de esta carpeta: cuerpo = {cuerpo}, acento = {acento}.
"""


def write_notes(dest: Path, cw: dict, estilo: dict | None = None) -> None:
    e = estilo or ESTILOS[0]
    marca = e.get("marca")
    layer = pause_layer()
    cover = FACE_T - Z_PAUSE
    if marca == "instagram":
        plantilla, titulo, donde, kind, textos, nfc_uso = (
            LEEME_IG,
            "Instagram",
            "logo de Instagram",
            "generica-instagram",
            ["Instagram", "TAP", "NFCTAP.TECH"],
            (
                "Genérica Instagram 15 € — un NFC\n\n"
                "Cualquier enlace → URL del perfil (o bio) de Instagram del local.\n"
                "NFC Tap Config. No grabar hasta tener el enlace.\n"
            ),
        )
    elif marca == "whatsapp":
        plantilla, titulo, donde, kind, textos, nfc_uso = (
            LEEME_WA,
            "WhatsApp",
            "logo de WhatsApp",
            "generica-whatsapp",
            ["WhatsApp", "TAP", "NFCTAP.TECH"],
            (
                "Genérica WhatsApp 15 € — un NFC\n\n"
                "Cualquier enlace → wa.me del local (o URL de WhatsApp).\n"
                "NFC Tap Config. No grabar hasta tener el enlace.\n"
            ),
        )
    else:
        plantilla, titulo, donde, kind, textos, nfc_uso = (
            LEEME,
            "Google",
            "G / logo",
            "generica",
            ["TAP", "NFCTAP.TECH"],
            (
                "Genérica 15 € — un NFC\n\n"
                "Cualquier enlace → URL de Google Reviews del local.\n"
                "NFC Tap Config. No grabar hasta tener el enlace.\n"
            ),
        )
    (dest / "LEEME.txt").write_text(
        plantilla.format(
            well=WELL_D,
            seat=SEAT_D,
            sticker=STICKER_D,
            cuerpo=cw["cuerpo"],
            acento=cw["acento"],
            layer=layer,
            pause=Z_PAUSE,
        ),
        encoding="utf-8",
    )
    (dest / "PAUSA_NFC.txt").write_text(
        (
            f"Pausa NFC — genérica ({titulo})\n"
            "================================================================\n"
            f"Altura: {Z_PAUSE:.2f} mm · capa {layer} (primera 0,25 + 0,20 mm)\n"
            f"Centro del pozo = centro del {donde} (y={NFC_Y:.0f} mm). NO va abajo.\n"
            f"Pozo Ø{WELL_D:.0f} · asiento Ø{SEAT_D:.0f} · mira Ø{PAD_D:.0f} · pegatina Ø{STICKER_D:.0f}\n"
            f"Tapa encima: {cover:.2f} mm. Luego se imprime el {donde} encima.\n\n"
            "Proyecto NUEVO en Flash. No reutilices el 3mf/G-code viejo.\n"
            "Importa 01_cuerpo.stl + 02_acento.stl → Agrupar → NO Reparar.\n"
            "Rebanar 0,20 mm Standard @FF AD5X.\n\n"
            "La mira se imprime ANTES de la pausa (capas ~16–20):\n"
            f"disco de {cw['acento']} Ø{PAD_D:.0f} en el suelo, justo donde irá el {donde}.\n\n"
            "En Previsualización:\n"
            f"1. Slider DERECHO BAJA hasta la capa {layer} (~{Z_PAUSE:.2f} mm).\n"
            f"   Mitad-arriba de la placa: HUECO REDONDO + círculo {cw['acento']}.\n"
            f"   Ese círculo es el sitio del {donde}. No busques el hueco abajo.\n"
            "   Capa 270+ = solo el pie. Baja el slider.\n"
            "2. Clic derecho en esa capa → Añadir pausa.\n"
            "3. Imprime.\n\n"
            "Cuando pare (mira desde ARRIBA):\n"
            f"- El círculo {cw['acento']} (donde irá el {donde}) = aquí la pegatina.\n"
            "- Timeskey Ø25 ENCIMA de ese círculo, hundida, adhesivo ABAJO.\n"
            "- Que no sobresalga. No apagues. Continuar.\n"
            "- Si sobresale, no reanudes (montañita).\n"
        ),
        encoding="utf-8",
    )
    (dest / "NFC.txt").write_text(nfc_uso, encoding="utf-8")
    cfg = {
        "nombre": cw["nombre"],
        "kind": kind,
        "precio": 15,
        "cuerpo": cw["cuerpo"],
        "acento": cw["acento"],
        "face": [FACE_W, FACE_H, FACE_T],
        "pie_z": FOOT_Z,
        "nfc": {
            "sticker": STICKER_D,
            "well": WELL_D,
            "seat": SEAT_D,
            "pad": PAD_D,
            "y": NFC_Y,
            "z_pause": Z_PAUSE,
            "layer": pause_layer(),
        },
        "textos": textos,
        "nota": cw["nota"],
    }
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def raster_preview(svg_path: Path, cw: dict, estilo: dict | None = None) -> None:
    png = svg_path.with_suffix(".png")
    jpg = svg_path.with_name("propuesta.jpg")
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return
    e = estilo or ESTILOS[0]
    w, h = 1080, 1440
    img = Image.new("RGB", (w, h), tuple(int(cw["hex_fondo"][i : i + 2], 16) for i in (1, 3, 5)))
    draw = ImageDraw.Draw(img)
    body = tuple(int(cw["hex_cuerpo"][i : i + 2], 16) for i in (1, 3, 5))
    acc = tuple(int(cw["hex_acento"][i : i + 2], 16) for i in (1, 3, 5))
    georgia = Path("/System/Library/Fonts/Supplemental/Georgia.ttf")
    bold = Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
    arial = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    sans = arial if arial.exists() else georgia
    title = ImageFont.truetype(str(bold if bold.exists() else georgia), 42)
    sub = ImageFont.truetype(str(georgia), 22)
    firm = ImageFont.truetype(str(sans), 22)
    tiny = ImageFont.truetype(str(georgia), 16)
    sc = 420 / FACE_W
    top = 200.0

    def sx(x: float) -> float:
        return 540 + x * sc

    def sy(y: float) -> float:
        return top + (FOOT_Y + FACE_H - y) * sc

    draw.text((540, 70), "NFCTap", font=title, fill=(28, 25, 21), anchor="mt")
    draw.text((540, 118), f"{e['titulo']} · {cw['cuerpo']} + {cw['acento']}", font=sub, fill=(122, 106, 82), anchor="mt")
    draw.rounded_rectangle(
        (sx(-FACE_W / 2), sy(FOOT_Y + FACE_H), sx(FACE_W / 2), sy(FOOT_Y)),
        FACE_R * sc,
        fill=body,
    )
    if e.get("marca") == "instagram":
        for outer, holes in ig_word_glyphs(0.0, IG_WORD_Y, IG_WORD_H, IG_WORD_TRACK):
            draw.polygon([(sx(x), sy(y)) for x, y in outer], fill=acc)
            for hole in holes:
                draw.polygon([(sx(x), sy(y)) for x, y in hole], fill=body)
        cx, cy = sx(0), sy(NFC_Y)
        ig_camera_pil(draw, cx, cy, float(e.get("ig_size", IG_SIZE)) * sc, acc)
        pie = f"NFC Ø{STICKER_D:.0f} (pozo Ø{WELL_D:.0f}) centro del logo · pausa capa {pause_layer()}"
    elif e.get("marca") == "whatsapp":
        for outer, holes in wa_word_glyphs(0.0, WA_WORD_Y, WA_WORD_H, WA_WORD_TRACK):
            draw.polygon([(sx(x), sy(y)) for x, y in outer], fill=acc)
            for hole in holes:
                draw.polygon([(sx(x), sy(y)) for x, y in hole], fill=body)
        parts = wa_logo_parts(0.0, MARK_Y, float(e.get("wa_size", WA_SIZE)))
        parts_px = {k: [(sx(x), sy(y)) for x, y in poly] for k, poly in parts.items()}
        wa_logo_pil(draw, parts_px, acc, body)
        pie = f"NFC Ø{STICKER_D:.0f} (pozo Ø{WELL_D:.0f}) centro del logo · pausa capa {pause_layer()}"
    else:
        for x, y, rr in star_layout(e):
            cx, cy, r = sx(x), sy(y), rr * sc
            pts = []
            for k in range(10):
                a = math.radians(-90 + k * 36)
                rad = r if k % 2 == 0 else r * 0.42
                pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
            draw.polygon(pts, fill=acc)
        google_g_pil(draw, sx(0), sy(MARK_Y), float(e.get("g_r", MARK_R)) * sc, acc, cut=body)
        pie = f"NFC bajo la G · {e['titulo']}"
    for poly in word_polys("TAP", 0.0, TAP_Y, TAP_H, TAP_TRACK):
        draw.polygon([(sx(x), sy(y)) for x, y in poly], fill=acc)
    draw.rounded_rectangle((sx(-FOOT_W / 2), sy(FOOT_Y) + 4, sx(FOOT_W / 2), sy(FOOT_Y) + 52), 8, fill=body)
    draw.text((540, sy(FOOT_Y) + 28), "NFCTAP.TECH", font=firm, fill=acc, anchor="mm")
    draw.text((540, 1288), pie, font=sub, fill=(28, 25, 21), anchor="mt")
    draw.text((540, 1328), e["nota"], font=tiny, fill=(122, 106, 82), anchor="mt")
    draw.text((540, 1386), f"Atril {FACE_W:.0f}×{FACE_H:.0f}×{FACE_T:.0f} mm · PLA {cw['cuerpo']} + {cw['acento']}", font=tiny, fill=(122, 106, 82), anchor="mt")
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


def generate_one(cw: dict, estilo: dict | None = None, plate: bool = True) -> None:
    e = estilo or ESTILOS[0]
    dest = OUT / cw["nombre"]
    dest.mkdir(parents=True, exist_ok=True)
    print(f"\nGenérica {cw['nombre']}  {e['id']}  {cw['cuerpo']}+{cw['acento']}")
    cuerpo = body()
    acento = accent(e)
    cuerpo.write_stl(dest / "01_cuerpo.stl", "cuerpo")
    acento.write_stl(dest / "02_acento.stl", "acento")
    for stale in dest.glob("*_x2.stl"):
        stale.unlink()
    if plate:
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
                    f"Pausa capa {pause_layer()} en las dos: una pegatina por pozo.\n"
                ),
                encoding="utf-8",
            )
            print(f"  placa 2 sueltas  hueco {gap:.1f} mm")
    write_notes(dest, cw, e)
    svg = dest / "vista-previa.svg"
    write_preview(svg, cw, e)
    raster_preview(svg, cw, e)
    print(f"  OK  {dest}")


def generate_instagram() -> None:
    print(f"\nAtril Instagram  {FACE_W:.0f}x{FACE_H:.0f}x{FACE_T:.0f} mm  pie {FOOT_Z:.0f} mm")
    print(f"Pausa NFC capa {pause_layer()}  ({Z_PAUSE:.2f} mm)  pozo Ø{WELL_D:.0f} centro del logo")
    print(f"Wordmark {ig_word_width(IG_WORD_H, IG_WORD_TRACK):.0f} mm · logo {IG_SIZE:.0f} mm")
    dest = OUT / "generica-instagram-negra-amarillo"
    if dest.exists():
        for extra in dest.glob("*_[ab].stl"):
            extra.unlink()
        placa = dest / "PLACA.txt"
        if placa.exists():
            placa.unlink()
    for stale in (
        OUT / "generica-instagram-blanca-negra",
        OUT / "generica-instagram-negra-roja",
        OUT / "opciones" / "v4-instagram",
    ):
        if stale.exists():
            shutil.rmtree(stale)
            print(f"  borrada  {stale.relative_to(OUT)}")
    generate_one(IG_COLORWAYS[0], IG_ESTILOS[0], plate=False)


def generate_whatsapp() -> None:
    print(f"\nAtril WhatsApp  {FACE_W:.0f}x{FACE_H:.0f}x{FACE_T:.0f} mm  pie {FOOT_Z:.0f} mm")
    print(f"Pausa NFC capa {pause_layer()}  ({Z_PAUSE:.2f} mm)  pozo Ø{WELL_D:.0f} centro del logo")
    print(f"Wordmark {wa_word_width(WA_WORD_H, WA_WORD_TRACK):.0f} mm · logo {WA_SIZE:.0f} mm")
    dest = OUT / "generica-whatsapp-negra-amarillo"
    if dest.exists():
        for extra in dest.glob("*_[ab].stl"):
            extra.unlink()
        placa = dest / "PLACA.txt"
        if placa.exists():
            placa.unlink()
    generate_one(WA_COLORWAYS[0], WA_ESTILOS[0], plate=False)


def generate() -> None:
    print(f"\nAtril genérico  {FACE_W:.0f}x{FACE_H:.0f}x{FACE_T:.0f} mm  pie {FOOT_Z:.0f} mm")
    print(f"Pausa NFC capa {pause_layer()}  ({Z_PAUSE:.2f} mm)  pozo Ø{WELL_D:.0f} bajo la G")
    keep = {e["id"] for e in ESTILOS}
    opciones = OUT / "opciones"
    if opciones.exists():
        for old in opciones.iterdir():
            if old.is_dir() and old.name not in keep:
                shutil.rmtree(old)
                print(f"  borrada  opciones/{old.name}")
    flotante = ESTILOS[0]
    for cw in COLORWAYS:
        generate_one(cw, flotante, plate=True)
    gold = COLORWAYS[0]
    for e in ESTILOS:
        opt = dict(gold)
        opt["nombre"] = f"opciones/{e['id']}"
        opt["nota"] = e["nota"]
        generate_one(opt, e, plate=False)
    generate_instagram()
    generate_whatsapp()


if __name__ == "__main__":
    if "instagram" in sys.argv:
        generate_instagram()
    elif "whatsapp" in sys.argv:
        generate_whatsapp()
    else:
        generate()
