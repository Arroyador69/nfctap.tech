#!/usr/bin/env python3
"""Generador de tarjetas NFC para reseñas de Google.

Crea STL listos para Orca-Flashforge / AD5X:
  - Cuerpo con hueco interno para tira o moneda NFC
  - Estrellas e icono de reseña en otra pieza (segundo color)
  - Texto "TOCA" + "RESEÑA" en tercera pieza
  - Soporte de mesa opcional
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent / "stl"


# ---------------------------------------------------------------------------
# Geometría 2D / 3D
# ---------------------------------------------------------------------------

def rounded_rect(w: float, h: float, r: float, segs: int = 10) -> list[tuple[float, float]]:
    r = min(r, w / 2 - 0.01, h / 2 - 0.01)
    corners = (
        (w / 2 - r, h / 2 - r, 0.0),
        (-w / 2 + r, h / 2 - r, 90.0),
        (-w / 2 + r, -h / 2 + r, 180.0),
        (w / 2 - r, -h / 2 + r, 270.0),
    )
    pts: list[tuple[float, float]] = []
    for cx, cy, start in corners:
        for i in range(segs + 1):
            a = math.radians(start + 90.0 * i / segs)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def circle(cx: float, cy: float, r: float, segs: int = 48) -> list[tuple[float, float]]:
    return [
        (cx + r * math.cos(math.radians(i * 360 / segs)),
         cy + r * math.sin(math.radians(i * 360 / segs)))
        for i in range(segs)
    ]


def rectangle(w: float, h: float, cx: float = 0.0, cy: float = 0.0) -> list[tuple[float, float]]:
    return [
        (cx - w / 2, cy - h / 2),
        (cx + w / 2, cy - h / 2),
        (cx + w / 2, cy + h / 2),
        (cx - w / 2, cy + h / 2),
    ]


def star(cx: float, cy: float, r_out: float, r_in: float | None = None, n: int = 5) -> list[tuple[float, float]]:
    if r_in is None:
        r_in = r_out * 0.42
    pts = []
    for i in range(n * 2):
        ang = math.radians(-90 + i * 180 / n)
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def translate(pts: list[tuple[float, float]], dx: float, dy: float) -> list[tuple[float, float]]:
    return [(x + dx, y + dy) for x, y in pts]


def area(poly: list[tuple[float, float]]) -> float:
    a = 0.0
    for i, (x1, y1) in enumerate(poly):
        x2, y2 = poly[(i + 1) % len(poly)]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def ensure_ccw(poly: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return poly if area(poly) > 0 else list(reversed(poly))


def ensure_cw(poly: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return poly if area(poly) < 0 else list(reversed(poly))


def ear_clip(poly: list[tuple[float, float]]) -> list[tuple[int, int, int]]:
    """Triangula un polígono simple (sin agujeros)."""
    pts = list(poly)
    idx = list(range(len(pts)))
    if area(pts) < 0:
        idx.reverse()
        pts = [pts[i] for i in range(len(pts) - 1, -1, -1)]
        idx = list(range(len(pts)))

    def cross(i, j, k):
        ax, ay = pts[i]
        bx, by = pts[j]
        cx, cy = pts[k]
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

    def inside(p, a, b, c):
        def sign(p1, p2, p3):
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
        b1 = sign(p, a, b) < 0.0
        b2 = sign(p, b, c) < 0.0
        b3 = sign(p, c, a) < 0.0
        return b1 == b2 == b3

    tris = []
    guard = 0
    while len(idx) > 3 and guard < 10000:
        guard += 1
        clipped = False
        m = len(idx)
        for t in range(m):
            i_prev, i, i_next = idx[(t - 1) % m], idx[t], idx[(t + 1) % m]
            if cross(i_prev, i, i_next) <= 1e-9:
                continue
            ear = True
            for j in idx:
                if j in (i_prev, i, i_next):
                    continue
                if inside(pts[j], pts[i_prev], pts[i], pts[i_next]):
                    ear = False
                    break
            if ear:
                tris.append((i_prev, i, i_next))
                del idx[t]
                clipped = True
                break
        if not clipped:
            break
    if len(idx) == 3:
        tris.append((idx[0], idx[1], idx[2]))
    return tris


# ---------------------------------------------------------------------------
# Malla
# ---------------------------------------------------------------------------

class Mesh:
    def __init__(self) -> None:
        self.tris: list[tuple[tuple[float, float, float], ...]] = []

    def add(self, a, b, c) -> None:
        self.tris.append((a, b, c))

    def extend(self, other: "Mesh") -> None:
        self.tris.extend(other.tris)

    def _normal(self, a, b, c):
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx
        l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        return (nx / l, ny / l, nz / l)

    def write_stl(self, path: Path, name: str = "tarjeta") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as f:
            header = name.encode("ascii", "ignore")[:80]
            f.write(header + b"\0" * (80 - len(header)))
            f.write(struct.pack("<I", len(self.tris)))
            for a, b, c in self.tris:
                n = self._normal(a, b, c)
                f.write(struct.pack("<3f", *n))
                f.write(struct.pack("<3f", *a))
                f.write(struct.pack("<3f", *b))
                f.write(struct.pack("<3f", *c))
                f.write(struct.pack("<H", 0))
        print(f"  STL  {path.name:40s}  {len(self.tris):6d} triángulos")


def extrude(poly: list[tuple[float, float]], z0: float, z1: float) -> Mesh:
    """Extruye un polígono simple (sin agujeros) entre z0 y z1."""
    poly = ensure_ccw(poly)
    m = Mesh()
    n = len(poly)
    tris = ear_clip(poly)
    for i, j, k in tris:
        m.add((poly[i][0], poly[i][1], z0), (poly[k][0], poly[k][1], z0), (poly[j][0], poly[j][1], z0))
        m.add((poly[i][0], poly[i][1], z1), (poly[j][0], poly[j][1], z1), (poly[k][0], poly[k][1], z1))
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        m.add((x1, y1, z0), (x2, y2, z0), (x2, y2, z1))
        m.add((x1, y1, z0), (x2, y2, z1), (x1, y1, z1))
    return m


def extrude_ring(outer: list[tuple[float, float]], inner: list[tuple[float, float]], z0: float, z1: float) -> Mesh:
    """Pared entre un contorno exterior y un hueco interior."""
    outer = ensure_ccw(outer)
    inner = ensure_cw(inner)
    m = Mesh()

    def cap(z: float, flip: bool) -> None:
        # Abanico desde el centroide del hueco hacia el anillo: no es robusto
        # para formas cóncavas. Usamos puentes por índice proporcional.
        no, ni = len(outer), len(inner)
        steps = max(no, ni)
        ring = []
        for s in range(steps):
            o = outer[int(s * no / steps) % no]
            i = inner[int(s * ni / steps) % ni]
            ring.append((o, i))
        for s in range(steps):
            o1, i1 = ring[s]
            o2, i2 = ring[(s + 1) % steps]
            if flip:
                m.add((o1[0], o1[1], z), (i1[0], i1[1], z), (o2[0], o2[1], z))
                m.add((o2[0], o2[1], z), (i1[0], i1[1], z), (i2[0], i2[1], z))
            else:
                m.add((o1[0], o1[1], z), (o2[0], o2[1], z), (i1[0], i1[1], z))
                m.add((o2[0], o2[1], z), (i2[0], i2[1], z), (i1[0], i1[1], z))

    cap(z0, flip=True)
    cap(z1, flip=False)

    for i in range(len(outer)):
        x1, y1 = outer[i]
        x2, y2 = outer[(i + 1) % len(outer)]
        m.add((x1, y1, z0), (x2, y2, z0), (x2, y2, z1))
        m.add((x1, y1, z0), (x2, y2, z1), (x1, y1, z1))
    for i in range(len(inner)):
        x1, y1 = inner[i]
        x2, y2 = inner[(i + 1) % len(inner)]
        m.add((x1, y1, z0), (x1, y1, z1), (x2, y2, z1))
        m.add((x1, y1, z0), (x2, y2, z1), (x2, y2, z0))
    return m


# ---------------------------------------------------------------------------
# Fuente bitmap 5x7 (mayúsculas + dígitos + algunos signos)
# ---------------------------------------------------------------------------

FONT: dict[str, list[str]] = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00001", "00001", "00001", "10001", "10001", "01110"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01110", "10001", "10000", "01110", "00001", "10001", "01110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10001", "10101", "11011", "10001"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["01110", "10000", "11110", "10001", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
}


def text_pixels(text: str) -> list[tuple[int, int]]:
    pixels = []
    x = 0
    for ch in text.upper():
        glyph = FONT.get(ch, FONT[" "])
        for row, line in enumerate(glyph):
            for col, bit in enumerate(line):
                if bit == "1":
                    pixels.append((x + col, 6 - row))
        x += 6
    return pixels


def text_mesh(text: str, pixel: float, height: float, z0: float = 0.0, center: bool = True) -> Mesh:
    pix = text_pixels(text)
    if not pix:
        return Mesh()
    xs = [p[0] for p in pix]
    ys = [p[1] for p in pix]
    w = (max(xs) + 1) * pixel
    h = (max(ys) + 1) * pixel
    ox = -w / 2 if center else 0.0
    oy = -h / 2 if center else 0.0
    m = Mesh()
    for col, row in pix:
        x0 = ox + col * pixel
        y0 = oy + row * pixel
        m.extend(extrude(rectangle(pixel * 0.92, pixel * 0.92, x0 + pixel / 2, y0 + pixel / 2), z0, z0 + height))
    return m


# ---------------------------------------------------------------------------
# Tarjeta
# ---------------------------------------------------------------------------

PRESETS_NFC = {
    "tira_45x15": {"kind": "rect", "w": 47.0, "h": 17.0, "t": 0.80},
    "tira_40x20": {"kind": "rect", "w": 42.0, "h": 22.0, "t": 0.80},
    "tira_35x15": {"kind": "rect", "w": 37.0, "h": 17.0, "t": 0.80},
    "moneda_25": {"kind": "circle", "d": 26.5, "t": 1.00},
    "moneda_30": {"kind": "circle", "d": 31.5, "t": 1.00},
}


def nfc_hole(preset: dict, extra_clear: float = 0.4) -> list[tuple[float, float]]:
    if preset["kind"] == "circle":
        return circle(0.0, 0.0, preset["d"] / 2 + extra_clear / 2)
    return rectangle(preset["w"] + extra_clear, preset["h"] + extra_clear)


def card_body(cfg: dict) -> Mesh:
    w, h, t = cfg["ancho"], cfg["alto"], cfg["grosor"]
    r = cfg["radio"]
    nfc = PRESETS_NFC[cfg["nfc"]]
    z_floor = cfg["nfc_desde_base"]
    z_ceil = z_floor + nfc["t"]
    if z_ceil + 0.8 > t:
        raise SystemExit("El grosor de la tarjeta es demasiado bajo para ese NFC. Sube grosor o baja nfc_desde_base.")

    outer = rounded_rect(w, h, r)
    hole = nfc_hole(nfc)

    body = Mesh()
    body.extend(extrude(outer, 0.0, z_floor))
    body.extend(extrude_ring(outer, hole, z_floor, z_ceil))
    body.extend(extrude(outer, z_ceil, t))
    return body


def card_stars(cfg: dict) -> Mesh:
    """Cinco estrellas en la cara superior (se imprimen como color 2)."""
    t = cfg["grosor"]
    relief = cfg["relieve"]
    n = 5
    gap = 9.0
    y = cfg["alto"] / 2 - 10.0
    m = Mesh()
    for i in range(n):
        x = (i - (n - 1) / 2) * gap
        m.extend(extrude(star(x, y, 3.6), t, t + relief))
    return m


def card_icon(cfg: dict) -> Mesh:
    """Badge circular con una estrella (icono genérico de reseña, no logo de Google)."""
    t = cfg["grosor"]
    relief = cfg["relieve"]
    cx, cy = -cfg["ancho"] / 2 + 14.0, 0.0
    m = Mesh()
    m.extend(extrude_ring(circle(cx, cy, 8.2, 36), circle(cx, cy, 6.6, 36), t, t + relief))
    m.extend(extrude(star(cx, cy, 4.4), t, t + relief))
    return m


def card_text(cfg: dict) -> Mesh:
    t = cfg["grosor"]
    relief = cfg["relieve"]
    m = Mesh()
    m.extend(shifted(text_mesh(cfg.get("linea1", "TOCA PARA"), pixel=1.05, height=relief, z0=t), 6.0, 4.5))
    m.extend(shifted(text_mesh(cfg.get("linea2", "RESENA"), pixel=1.35, height=relief, z0=t), 6.0, -6.5))
    return m


def shifted(mesh: Mesh, dx: float, dy: float, dz: float = 0.0) -> Mesh:
    out = Mesh()
    for a, b, c in mesh.tris:
        out.add((a[0] + dx, a[1] + dy, a[2] + dz),
                (b[0] + dx, b[1] + dy, b[2] + dz),
                (c[0] + dx, c[1] + dy, c[2] + dz))
    return out


def stand(cfg: dict) -> Mesh:
    """Soporte tipo atril. La tarjeta se desliza por una ranura."""
    card_w, card_h, card_t = cfg["ancho"], cfg["alto"], cfg["grosor"]
    base_w = card_w + 8.0
    base_d = 28.0
    base_h = 3.0
    wall = 3.0
    slot = card_t + 0.5
    back_h = card_h * 0.55
    tilt = 18.0

    m = Mesh()
    m.extend(extrude(rounded_rect(base_w, base_d, 3.0), 0.0, base_h))

    # Pared trasera inclinada: la aproximamos con un bloque vertical + labio
    back = rounded_rect(base_w, wall + slot + wall, 1.2)
    back_mesh = extrude(back, 0.0, back_h)
    # Empujar la pared hacia atrás de la base
    back_mesh = shifted(back_mesh, 0.0, -base_d / 2 + (wall + slot + wall) / 2 + 2.0)
    m.extend(back_mesh)

    # Labios de la ranura (dos paredes finas)
    lip = rectangle(base_w - 4.0, wall, 0.0, 0.0)
    front_lip = extrude(lip, base_h, base_h + 8.0)
    m.extend(shifted(front_lip, 0.0, -base_d / 2 + wall / 2 + 2.0 + slot + wall))
    return m


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

DEFAULTS = {
    "nombre": "demo-restaurante",
    "ancho": 86.0,
    "alto": 54.0,
    "grosor": 3.6,
    "radio": 4.0,
    "nfc": "tira_45x15",
    "nfc_desde_base": 1.20,
    "relieve": 0.40,
    "colores": {
        "cuerpo": "negro",
        "estrellas": "amarillo-oro",
        "texto": "blanco",
        "icono": "blanco",
    },
}


def write_pause_note(cfg: dict, path: Path) -> None:
    nfc = PRESETS_NFC[cfg["nfc"]]
    z_pause = cfg["nfc_desde_base"] + nfc["t"]
    layer = round(z_pause / 0.20)
    path.write_text(
        (
            f"Pausa de inserción NFC\n"
            f"======================\n"
            f"Preset NFC: {cfg['nfc']}\n"
            f"Altura de pausa: {z_pause:.2f} mm\n"
            f"Capa (a 0.20 mm): {layer}\n\n"
            f"En Orca-Flashforge:\n"
            f"1. Rebana la placa.\n"
            f"2. Pestaña Vista previa.\n"
            f"3. Slider derecho -> capa {layer} (acaba el hueco).\n"
            f"4. Clic derecho -> Añadir pausa.\n"
            f"5. Vuelve a rebanar y envía a la AD5X.\n"
            f"6. Cuando pause, coloca la tira NFC plana en el hueco y pulsa Reanudar.\n"
        ),
        encoding="utf-8",
    )


def generate(cfg: dict) -> None:
    name = cfg["nombre"]
    dest = OUT / name
    dest.mkdir(parents=True, exist_ok=True)

    print(f"\nGenerando '{name}'  ({cfg['ancho']}x{cfg['alto']}x{cfg['grosor']} mm, NFC={cfg['nfc']})")
    card_body(cfg).write_stl(dest / "01_cuerpo.stl", "cuerpo")
    card_stars(cfg).write_stl(dest / "02_estrellas.stl", "estrellas")
    card_text(cfg).write_stl(dest / "03_texto.stl", "texto")
    card_icon(cfg).write_stl(dest / "04_icono.stl", "icono")
    stand(cfg).write_stl(dest / "05_soporte.stl", "soporte")
    write_pause_note(cfg, dest / "PAUSA_NFC.txt")
    (dest / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  -> {dest}")


def main() -> None:
    import argparse

    p = argparse.ArgumentParser(description="Genera STL de tarjetas NFC para reseñas.")
    p.add_argument("--nombre", help="Nombre del cliente / carpeta de salida")
    p.add_argument("--linea1", default="TOCA PARA")
    p.add_argument("--linea2", default="RESENA")
    p.add_argument("--nfc", default="tira_45x15", choices=sorted(PRESETS_NFC))
    p.add_argument("--ancho", type=float)
    p.add_argument("--alto", type=float)
    p.add_argument("--grosor", type=float)
    p.add_argument("--todas", action="store_true", help="Genera las 3 variantes demo")
    args = p.parse_args()

    if args.nombre:
        cfg = {**DEFAULTS, "nombre": args.nombre, "nfc": args.nfc, "linea1": args.linea1, "linea2": args.linea2}
        if args.ancho:
            cfg["ancho"] = args.ancho
        if args.alto:
            cfg["alto"] = args.alto
        if args.grosor:
            cfg["grosor"] = args.grosor
        generate(cfg)
        return

    variants = [
        {**DEFAULTS, "nombre": "demo-tira-clasica", "nfc": "tira_45x15"},
        {**DEFAULTS, "nombre": "demo-moneda-25", "nfc": "moneda_25", "grosor": 4.0, "nfc_desde_base": 1.20},
        {
            **DEFAULTS,
            "nombre": "mostrador-grande",
            "ancho": 110.0,
            "alto": 70.0,
            "grosor": 4.0,
            "radio": 6.0,
            "nfc": "tira_45x15",
        },
    ]
    if args.todas or not args.nombre:
        for cfg in variants:
            generate(cfg)
    print("\nListo. Importa 01_cuerpo + 02/03/04 en Orca-Flashforge, asigna 1 color a cada pieza.")


if __name__ == "__main__":
    main()
