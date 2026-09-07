#!/usr/bin/env python3
"""Foto clara para WhatsApp + GLB 3D del conjunto Freddo's montado."""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

from generar_freddos import (
    BEAN_T,
    SLOT_Z0,
    SLOT_Z1,
    bean_body,
    bean_gold,
    logo_on_baseline,
    stand_black,
    stand_gold,
    _bean_envelope,
)
from generar_tarjetas import Mesh, shifted

# PLA de stock que se imprime de verdad.
PLA_NEGRO = (44, 42, 40)
PLA_AMARILLO = (250, 204, 18)

HERE = Path(__file__).resolve().parent
OUT = HERE / "stl" / "freddos-fuengirola" / "whatsapp"
GEORGIA = Path("/System/Library/Fonts/Supplemental/Georgia.ttf")
GEORGIA_BOLD = Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")


def _assembly() -> tuple[Mesh, Mesh, float]:
    _letters, letter_top = logo_on_baseline()
    _env, ymin = _bean_envelope()
    nest_y0 = letter_top - 2.5
    lift = (nest_y0 + 3.0) - ymin
    dz = (SLOT_Z0 + SLOT_Z1) / 2.0 - BEAN_T / 2.0

    negro = stand_black()
    negro.extend(shifted(bean_body(), 0.0, lift, dz))

    def _sin_ancla(src: Mesh) -> Mesh:
        out = Mesh()
        for a, b, c in src.tris:
            cz = (a[2] + b[2] + c[2]) / 3.0
            if cz < 0.45:
                continue
            out.add(a, b, c)
        return out

    oro = _sin_ancla(stand_gold())
    oro.extend(_sin_ancla(shifted(bean_gold(), 0.0, lift, dz)))
    return negro, oro, lift


def _write_glb(path: Path, parts: list[tuple[str, Mesh, list[float]]]) -> None:
    bin_buf = bytearray()
    views = []
    accessors = []
    meshes = []
    nodes = []
    materials = []

    def add_f32(data: list[float]) -> tuple[int, int]:
        start = len(bin_buf)
        raw = struct.pack(f"<{len(data)}f", *data)
        bin_buf.extend(raw)
        pad = (4 - len(raw) % 4) % 4
        bin_buf.extend(b"\x00" * pad)
        return start, len(raw)

    def add_u32(data: list[int]) -> tuple[int, int]:
        start = len(bin_buf)
        raw = struct.pack(f"<{len(data)}I", *data)
        bin_buf.extend(raw)
        pad = (4 - len(raw) % 4) % 4
        bin_buf.extend(b"\x00" * pad)
        return start, len(raw)

    # mm → metros: si no, el visor pone la cámara dentro de un modelo de 200 m.
    scale = 0.001

    for name, mesh, color in parts:
        if not mesh.tris:
            continue
        pos: list[float] = []
        nrm: list[float] = []
        idx: list[int] = []
        vmin = [1e9, 1e9, 1e9]
        vmax = [-1e9, -1e9, -1e9]
        for a, b, c in mesh.tris:
            nx, ny, nz = mesh._normal(a, b, c)
            for v in (a, b, c):
                i = len(pos) // 3
                sv = (v[0] * scale, v[1] * scale, v[2] * scale)
                pos.extend(sv)
                nrm.extend((nx, ny, nz))
                idx.append(i)
                for k in range(3):
                    vmin[k] = min(vmin[k], sv[k])
                    vmax[k] = max(vmax[k], sv[k])
        po, pl = add_f32(pos)
        no, nl = add_f32(nrm)
        io, il = add_u32(idx)
        bv0 = len(views)
        views.append({"buffer": 0, "byteOffset": po, "byteLength": pl, "target": 34962})
        views.append({"buffer": 0, "byteOffset": no, "byteLength": nl, "target": 34962})
        views.append({"buffer": 0, "byteOffset": io, "byteLength": il, "target": 34963})
        ac0 = len(accessors)
        accessors.append(
            {
                "bufferView": bv0,
                "componentType": 5126,
                "count": len(pos) // 3,
                "type": "VEC3",
                "min": vmin,
                "max": vmax,
            }
        )
        accessors.append({"bufferView": bv0 + 1, "componentType": 5126, "count": len(nrm) // 3, "type": "VEC3"})
        accessors.append({"bufferView": bv0 + 2, "componentType": 5125, "count": len(idx), "type": "SCALAR"})
        amarillo = name == "amarillo"
        materials.append(
            {
                "name": name,
                "pbrMetallicRoughness": {
                    "baseColorFactor": color,
                    "metallicFactor": 0.06 if amarillo else 0.03,
                    "roughnessFactor": 0.48 if amarillo else 0.74,
                },
            }
        )
        meshes.append(
            {
                "name": name,
                "primitives": [
                    {
                        "attributes": {"POSITION": ac0, "NORMAL": ac0 + 1},
                        "indices": ac0 + 2,
                        "material": len(materials) - 1,
                    }
                ],
            }
        )
        nodes.append({"mesh": len(meshes) - 1, "name": name})

    gltf = {
        "asset": {"version": "2.0", "generator": "NFCTap Freddo's"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes))), "name": "Freddos"}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(bin_buf)}],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    blob = bytes(bin_buf)
    blob += b"\x00" * ((4 - len(blob) % 4) % 4)

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        total = 12 + 8 + len(js) + 8 + len(blob)
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON"))
        f.write(js)
        f.write(struct.pack("<I4s", len(blob), b"BIN\x00"))
        f.write(blob)
    print(f"  GLB  {path.name}  {path.stat().st_size / 1024:.0f} KB")


def _rotate(v: tuple[float, float, float], yaw: float, pitch: float) -> tuple[float, float, float]:
    x, y, z = v
    cy, sy = math.cos(yaw), math.sin(yaw)
    x, z = x * cy + z * sy, -x * sy + z * cy
    cp, sp = math.cos(pitch), math.sin(pitch)
    y, z = y * cp - z * sp, y * sp + z * cp
    return x, y, z


def _shade(n: tuple[float, float, float], rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    l1 = (0.38, 0.72, 0.58)
    l2 = (-0.52, 0.28, 0.80)
    n1 = math.sqrt(sum(c * c for c in l1))
    n2 = math.sqrt(sum(c * c for c in l2))
    d1 = max(0.0, (n[0] * l1[0] + n[1] * l1[1] + n[2] * l1[2]) / n1)
    d2 = max(0.0, (n[0] * l2[0] + n[1] * l2[1] + n[2] * l2[2]) / n2)
    wrap = 0.30 + 0.58 * d1 + 0.28 * d2
    spec = (d1**20) * (0.70 if rgb[0] > 180 else 0.16)
    return tuple(max(0, min(255, int(rgb[i] * wrap + 255 * spec))) for i in range(3))


def _render_real(negro: Mesh, amarillo: Mesh, width: int, height: int) -> "object":
    """Render del STL montado: cuna + grano, PLA negro y amarillo."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter

    yaw = math.radians(48.0)
    pitch = math.radians(-14.0)
    faces: list[tuple] = []
    xs: list[float] = []
    ys: list[float] = []
    for mesh, rgb in ((negro, PLA_NEGRO), (amarillo, PLA_AMARILLO)):
        for a, b, c in mesh.tris:
            pa, pb, pc = _rotate(a, yaw, pitch), _rotate(b, yaw, pitch), _rotate(c, yaw, pitch)
            ux, uy, uz = pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]
            vx, vy, vz = pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            nl = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nx, ny, nz = nx / nl, ny / nl, nz / nl
            if nz <= 0.02:
                continue
            col = _shade((nx, ny, nz), rgb)
            faces.append((pa, pb, pc, col))
            for p in (pa, pb, pc):
                xs.append(p[0])
                ys.append(p[1])

    cx = (min(xs) + max(xs)) / 2.0
    cy = (min(ys) + max(ys)) / 2.0
    span = max(max(xs) - min(xs), max(ys) - min(ys), 1.0)
    scale = (min(width, height) * 0.78) / span
    ox, oy = width * 0.50, height * 0.54

    def proj(p: tuple[float, float, float]) -> tuple[float, float, float]:
        return ox + (p[0] - cx) * scale, oy - (p[1] - cy) * scale, p[2]

    pix = np.zeros((height, width, 3), dtype=np.uint8)
    t = np.linspace(0, 1, height)[:, None]
    pix[:, :, 0] = (243 - 18 * t).astype(np.uint8)
    pix[:, :, 1] = (238 - 20 * t).astype(np.uint8)
    pix[:, :, 2] = (228 - 22 * t).astype(np.uint8)
    zbuf = np.full((height, width), -1.0e9, dtype=np.float32)

    for a, b, c, col in faces:
        pa, pb, pc = proj(a), proj(b), proj(c)
        x0, x1 = int(min(pa[0], pb[0], pc[0])), int(max(pa[0], pb[0], pc[0]))
        y0, y1 = int(min(pa[1], pb[1], pc[1])), int(max(pa[1], pb[1], pc[1]))
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(width - 1, x1), min(height - 1, y1)
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
    sd = ImageDraw.Draw(shadow)
    sx, sy = ox, oy + (0 - cy) * scale + 28
    sd.ellipse((sx - scale * 90, sy - 18, sx + scale * 90, sy + 36), fill=90)
    img.paste((210, 200, 186), (0, 0), shadow.filter(ImageFilter.GaussianBlur(26)))
    img.paste(Image.fromarray(pix, "RGB"), (0, 0), Image.fromarray((zbuf > -1.0e8).astype(np.uint8) * 255, "L"))
    return img


def write_whatsapp_jpg(path: Path, negro: Mesh, amarillo: Mesh) -> None:
    from PIL import ImageDraw, ImageFont

    w, h = 1080, 1440
    raw = _render_real(negro, amarillo, w * 2, h * 2).resize((w, h))
    draw = ImageDraw.Draw(raw)
    title = ImageFont.truetype(str(GEORGIA_BOLD if GEORGIA_BOLD.exists() else GEORGIA), 52)
    subf = ImageFont.truetype(str(GEORGIA), 24)
    cap = ImageFont.truetype(str(GEORGIA), 22)
    tiny = ImageFont.truetype(str(GEORGIA), 16)
    ink, mute = (28, 26, 24), (90, 80, 62)
    draw.text((540, 70), "Freddo's", font=title, fill=ink, anchor="mt")
    draw.text((540, 128), "Fuengirola  ·  propuesta NFC", font=subf, fill=mute, anchor="mt")
    draw.text((540, 1292), "Un toque: reseña Google", font=cap, fill=ink, anchor="mt")
    draw.text((540, 1328), "Otro toque: tarjeta de puntos", font=cap, fill=ink, anchor="mt")
    draw.text((540, 1386), "Impreso en PLA negro + amarillo  ·  NFCTap.tech", font=tiny, fill=mute, anchor="mt")
    raw.save(path, "JPEG", quality=93, optimize=True, progressive=True)
    raw.save(path.with_suffix(".png"), "PNG")
    print(f"  JPG  {path.name}  {path.stat().st_size / 1024:.0f} KB")


def write_html_viewer(path: Path) -> None:
    path.write_text(
        """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Freddo's · propuesta NFC</title>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
  <style>
    html, body { margin: 0; height: 100%; background: #F3EEE4; color: #2A1C14;
      font-family: Georgia, Times, serif; }
    header { position: absolute; top: 16px; left: 0; right: 0; text-align: center; z-index: 2;
      pointer-events: none; }
    h1 { margin: 0; font-size: 28px; font-weight: 400; }
    p { margin: 6px 0 0; font-size: 14px; color: #7A6240; }
    model-viewer { width: 100%; height: 100%; }
    footer { position: absolute; bottom: 18px; left: 16px; right: 16px; text-align: center;
      font-size: 14px; color: #5C4630; pointer-events: none; }
  </style>
</head>
<body>
  <header>
    <h1>Freddo's</h1>
    <p>Gira con el ratón o el dedo</p>
  </header>
  <model-viewer
    src="./Freddos-NFC-3D.glb"
    poster="./Freddos-NFC-propuesta.jpg"
    alt="Grano NFC Freddo's sobre las letras del logo"
    camera-controls
    auto-rotate
    auto-rotate-delay="800"
    rotation-per-second="8deg"
    shadow-intensity="0.55"
    exposure="1.55"
    environment-image="neutral"
    camera-orbit="48deg 72deg 0.50m"
    min-camera-orbit="auto 45deg auto"
    max-camera-orbit="auto 105deg auto"
    interaction-prompt="auto"
    style="background-color: #F3EEE4">
  </model-viewer>
  <footer>Un toque reseña Google · otro toque puntos · NFCTap.tech</footer>
</body>
</html>
""",
        encoding="utf-8",
    )
    print(f"  HTML {path.name}")


def write_opener(path: Path) -> None:
    path.write_text(
        "#!/bin/bash\n"
        'cd "$(dirname "$0")"\n'
        "PORT=8765\n"
        "python3 -m http.server \"$PORT\" >/tmp/freddos-3d.log 2>&1 &\n"
        "sleep 0.4\n"
        'open "http://127.0.0.1:$PORT/ver-en-3d.html"\n',
        encoding="utf-8",
    )
    path.chmod(0o755)
    print(f"  CMD  {path.name}")


def write_mensaje(path: Path) -> None:
    path.write_text(
        (
            "Mensaje para WhatsApp (copia y pega)\n"
            "====================================\n\n"
            "Hola Cristian, te mando la propuesta del expositor NFC de Freddo's.\n\n"
            "Es exactamente la pieza que imprimimos: grano del logo encajado "
            "en las letras Freddo's (la cuna), PLA negro y amarillo, de pie en el mostrador.\n"
            "Un lado: TAP reseña Google. El otro: TAP puntos / club.\n\n"
            "Si te encaja, lo fabricamos.\n"
        ),
        encoding="utf-8",
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("\nPropuesta WhatsApp Freddo's")
    negro, amarillo, _lift = _assembly()
    print(f"  mesh negro {len(negro.tris)}  amarillo {len(amarillo.tris)}")
    _write_glb(
        OUT / "Freddos-NFC-3D.glb",
        [
            ("negro", negro, [0.08, 0.08, 0.07, 1.0]),
            ("amarillo", amarillo, [0.96, 0.78, 0.08, 1.0]),
        ],
    )
    write_whatsapp_jpg(OUT / "Freddos-NFC-propuesta.jpg", negro, amarillo)
    write_html_viewer(OUT / "ver-en-3d.html")
    write_opener(OUT / "ABRIR_3D.command")
    write_mensaje(OUT / "MENSAJE_WHATSAPP.txt")
    print(f"  OK   {OUT}")


if __name__ == "__main__":
    main()
