#!/usr/bin/env python3
"""GLB /negocio: mismo bloque Markos 01, SIN sello marKo's, con asiento logo_pad.

El visor 3D busca el nodo `logo_pad` y pone encima el PNG/JPG subido.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from exportar_propuesta_freddos import _write_glb  # noqa: E402
from generar_copa_nfc import FACE_T, _shapely_extrude  # noqa: E402
from generar_markos_peluqueros import (  # noqa: E402
    ALETA_H_01,
    ALETA_REAR_01,
    ALETA_W_01,
    FOOT_FRONT_01,
    FOOT_FRONT_T_01,
    GROUND_T,
    RELIEF,
    _RELIEF_GAP,
    _cta_acercar,
    _extrude_face,
    _icons_row,
    _labels_above,
    _mapm,
    _mount_monopieza,
    _nfctap_on_foot_print,
    _one,
    _phrase_with_nfc_icon,
    _three_zones,
    _union,
    CTA_ICON_GAP,
    CTA_ICON_MULT,
    CTA_PHRASE,
)
from generar_tarjetas import Mesh  # noqa: E402

WEB_MODELS = HERE.parent / "web" / "public" / "models"
OUT_GLB = WEB_MODELS / "negocio.glb"
OUT_META = WEB_MODELS / "negocio-seal.json"


def _bloque_sin_markos():
    from shapely.geometry import Point, box
    from shapely.ops import unary_union

    y0 = 0.0
    seal_d = 58.0
    rim = 3.6
    body_w = 172.0
    icon_sz = 32.0
    label_h = 3.6
    cta_h = 5.8
    circle_r = seal_d / 2 + rim

    cta_cy = y0 + 24.0
    cta = _cta_acercar(0.0, cta_cy, h=cta_h)
    cta_w = cta.bounds[2] - cta.bounds[0]
    max_cta = body_w - 10.0
    if cta_w < max_cta - 2.0:
        extra = (max_cta - cta_w) / 2
        cta = _phrase_with_nfc_icon(
            CTA_PHRASE,
            0.0,
            cta_cy,
            cta_h,
            icon_side="both",
            track=0.03,
            gap=CTA_ICON_GAP + extra,
            icon_mult=CTA_ICON_MULT,
        )
    cta_half = (cta.bounds[3] - cta.bounds[1]) / 2
    cy_icons = cta_cy + cta_half + 10.0 + icon_sz / 2
    icon_pitch = min(58.0, (body_w - icon_sz) / 2 - 6.0)
    centers = _three_zones(cy_icons, pitch=icon_pitch)
    icons = _icons_row(centers, icon_sz)
    labels = _labels_above(centers, icon_sz, h=label_h)
    icon_top = cy_icons + icon_sz / 2 + label_h * 2.2 + 4.0
    body_top = icon_top + 3.0
    neck_gap = 12.0
    circle_bot = body_top + neck_gap
    seal_cy = circle_bot + circle_r

    # Anillo de acento alrededor del asiento (sin tipografía Markos)
    outer = Point(0.0, seal_cy).buffer(circle_r, resolution=64)
    inner = Point(0.0, seal_cy).buffer(seal_d / 2 - 0.4, resolution=64)
    ring = outer.difference(inner)

    circle = Point(0.0, seal_cy).buffer(circle_r, resolution=64)
    body = box(-body_w / 2, y0, body_w / 2, body_top).buffer(10.0, join_style=1)
    neck = box(-16.0, body_top - 1.0, 16.0, circle_bot + 2.0).buffer(7.0, join_style=1)
    outline = unary_union([circle, neck, body])
    outline = _one(outline.intersection(box(-400.0, y0, 400.0, 400.0)), "bloque")

    accents = unary_union([ring, icons, labels, cta]).buffer(0.22).buffer(-0.08)
    negro = _one(outline, "bloque-n")
    blanco = _union(accents.intersection(outline), "bloque-b")
    ob = outline.bounds
    foot_w = min(max(ob[2] - ob[0] + 2.0, 120.0), 210.0 - 8)

    return {
        "negro": negro,
        "blanco": blanco,
        "centers": list(centers),
        "y0": y0,
        "foot_w": foot_w,
        "seal_cy": seal_cy,
        "seal_d": seal_d,
        "circle_r": circle_r,
    }


def _logo_pad_print(seal_cy: float, seal_d: float) -> Mesh:
    """Disco fino en la cara: asiento del logo (espacio impresión)."""
    from shapely.geometry import Point

    disc = Point(0.0, seal_cy).buffer(seal_d / 2 * 0.96, resolution=72)
    # Encima del negro, bajo el relieve blanco del anillo
    z0 = FACE_T + 0.02
    z1 = FACE_T + _RELIEF_GAP + RELIEF * 0.35
    return _shapely_extrude(disc, z0, z1)


def _to_glb_space(mesh: Mesh, y0_face: float, aleta_rear: float) -> Mesh:
    y_face = aleta_rear - FACE_T / 2 - 2.0

    def cara(p):
        x, y, z = p
        return (x, y_face - (z - FACE_T / 2), (y - y0_face) + GROUND_T)

    def yup(p):
        return (p[0], p[2], -p[1])

    return _mapm(_mapm(mesh, cara), yup)


def _seal_meta(seal_cy: float, seal_d: float, y0: float) -> dict:
    """Centro y radio del asiento en metros GLB (Y-up), normal +Z."""
    y_face = ALETA_REAR_01 - FACE_T / 2 - 2.0
    # Cara del disco (frente)
    z_print = FACE_T + _RELIEF_GAP + RELIEF * 0.25
    x, y, z = 0.0, seal_cy, z_print
    x1, y1, z1 = x, y_face - (z - FACE_T / 2), (y - y0) + GROUND_T
    gx, gy, gz = x1 * 0.001, z1 * 0.001, -y1 * 0.001
    return {
        "x": round(gx, 6),
        "y": round(gy, 6),
        "z": round(gz, 6),
        "r": round((seal_d / 2) * 0.001 * 0.96, 6),
        "seal_d_mm": seal_d,
        "seal_cy_mm": round(seal_cy, 3),
        "note": "logo_pad node + estos mm; normal cara ≈ +Z en GLB",
    }


def main() -> None:
    g = _bloque_sin_markos()
    n_face, b_face = _extrude_face(g["negro"], g["blanco"], g["centers"])
    brand_foot = _nfctap_on_foot_print(
        g["foot_w"],
        g["y0"],
        foot_front=FOOT_FRONT_01,
        foot_front_t=FOOT_FRONT_T_01,
        text_h=7.4,
    )

    parts = _mount_monopieza(
        n_face,
        b_face,
        g["foot_w"],
        g["y0"],
        blanco_foot=brand_foot,
        foot_front=FOOT_FRONT_01,
        foot_front_t=FOOT_FRONT_T_01,
        aleta_rear=ALETA_REAR_01,
        aleta_h=ALETA_H_01,
        aleta_w=ALETA_W_01,
        shoe_t=0.0,
    )

    pad_print = _logo_pad_print(g["seal_cy"], g["seal_d"])
    logo_pad = _to_glb_space(pad_print, g["y0"], ALETA_REAR_01)

    WEB_MODELS.mkdir(parents=True, exist_ok=True)
    _write_glb(
        OUT_GLB,
        [
            ("negro", parts["negro"], [44 / 255, 42 / 255, 40 / 255, 1.0]),
            ("blanco", parts["blanco"], [245 / 255, 242 / 255, 235 / 255, 1.0]),
            ("logo_pad", logo_pad, [17 / 255, 17 / 255, 19 / 255, 1.0]),
        ],
    )
    # Alias estable que ya usa la web
    alias = WEB_MODELS / "markos-negocio.glb"
    alias.write_bytes(OUT_GLB.read_bytes())

    meta = _seal_meta(g["seal_cy"], g["seal_d"], g["y0"])
    meta["glb"] = "negocio.glb"
    OUT_META.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"  meta {OUT_META.name}: {meta}")
    print(f"  alias → {alias.name}")
    print("  OK /negocio sin sello Markos + nodo logo_pad")


if __name__ == "__main__":
    main()
